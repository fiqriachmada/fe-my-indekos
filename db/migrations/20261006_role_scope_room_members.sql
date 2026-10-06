-- Model: property = group, room = sub-group (rooms.property_id -> properties.id).
-- Roles are scoped:
--   scope 'property' -> owner, property-admin, guard   (stored in property_members)
--   scope 'room'     -> occupant                        (stored in room_members)
-- A user can hold a property role and a room role at the same time, even in the
-- same property (e.g. owner of A who also rents a room in A), and can be an
-- occupant in a property they have no membership in at all.
-- One role per user per property, and one role per user per room.
--
-- Run in the Supabase SQL Editor. Runs in one transaction: if anything fails
-- (e.g. a policy/view depends on a dropped column) everything rolls back.

begin;

-- 1. Role scope ---------------------------------------------------------------
alter table public.roles add column if not exists scope text;

update public.roles set scope = 'property' where name in ('owner', 'property-admin', 'guard');
update public.roles set scope = 'room'     where name = 'occupant';

alter table public.roles alter column scope set not null;
alter table public.roles add constraint roles_scope_check check (scope in ('property', 'room'));

-- 2. Enforce scope on both membership tables -----------------------------------
create or replace function public.enforce_role_scope() returns trigger
language plpgsql as $$
declare
  expected text := tg_argv[0];
  actual text;
begin
  select scope into actual from public.roles where id = new.role_id;
  if actual is distinct from expected then
    raise exception 'role % has scope %, but % requires scope %',
      new.role_id, actual, tg_table_name, expected;
  end if;
  return new;
end;
$$;

-- Move occupant rows out of property_members BEFORE the trigger is created.
-- 3. Migrate existing occupants: property_members -> room_members ----------------
insert into public.room_members (room_id, user_id, role_id)
select r.id, pm.user_id, pm.role_id
from public.rooms r
join public.property_members pm on pm.id = r.occupant_member_id
join public.roles ro on ro.id = pm.role_id and ro.name = 'occupant'
on conflict do nothing;

-- 4. room_members: one role per user per room ----------------------------------
alter table public.room_members drop constraint room_members_pkey;
alter table public.room_members add primary key (room_id, user_id);

-- 5. rooms.occupant_member_id pointed at property_members; occupants now live in
--    room_members, so it is no longer needed (occupant_name stays for guests
--    without an account).
alter table public.rooms drop column occupant_member_id;

-- Remove occupants that were migrated (same user has a room in that property).
delete from public.property_members pm
using public.roles ro
where ro.id = pm.role_id
  and ro.name = 'occupant'
  and exists (
    select 1 from public.room_members rm
    join public.rooms r on r.id = rm.room_id
    where rm.user_id = pm.user_id and r.property_id = pm.property_id
  );

-- 6. Attach the scope triggers (after cleanup so old rows don't matter) ----------
create trigger property_members_role_scope
  before insert or update of role_id on public.property_members
  for each row execute function public.enforce_role_scope('property');

create trigger room_members_role_scope
  before insert or update of role_id on public.room_members
  for each row execute function public.enforce_role_scope('room');

commit;

-- Afterwards, check for leftovers (occupants never assigned to a room):
--   select pm.* from public.property_members pm
--   join public.roles ro on ro.id = pm.role_id where ro.name = 'occupant';
--
-- Not done on purpose: dropping property_members.role (text). It duplicates
-- role_id, but RLS policies or app code may still read it.
