import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvitationActions, type Invitation } from './invitation-actions'

type PropertyRow = { id: string; name: string; location: string | null }
type PropertyMemberRow = { role: { name: string } | null; property: PropertyRow | null; status?: string | null }
type RoomRow = { id: string; name?: string | null; room_number?: string | null; property: { id: string; name: string } | null }
type RoomMemberRow = { room: RoomRow | null }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [ownedRes, memberRes, roomRes, notifRes] = await Promise.all([
    // Properties the user owns directly (owner_id), even without a membership row.
    supabase.from('properties').select('id, name, location').eq('owner_id', user.id),
    // Property-scoped roles: owner, property-admin, guard, occupant.
    supabase
      .from('property_members')
      .select('role:roles(name), property:properties(id, name, location), status')
      .eq('user_id', user.id)
      .returns<PropertyMemberRow[]>(),
    // Room-scoped role: occupant. Independent of property roles.
    supabase
      .from('room_members')
      .select('room:rooms(*, property:properties(id, name))')
      .eq('user_id', user.id)
      .returns<RoomMemberRow[]>(),
    // Pending invitations for occupant/member approval
    supabase
      .from('notifications')
      .select('id, title, description, property_id, status, created_at, property:properties(name)')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .returns<Invitation[]>(),
  ])

  // Separate properties into:
  // 1. Managed: owner, property-admin, guard
  // 2. Assigned: occupant
  const managedProperties = new Map<string, { property: PropertyRow; roles: Set<string> }>()
  const assignedProperties = new Map<string, { property: PropertyRow; roles: Set<string>; status?: string | null }>()

  const addManaged = (property: PropertyRow, role: string) => {
    const entry = managedProperties.get(property.id) ?? { property, roles: new Set<string>() }
    entry.roles.add(role)
    managedProperties.set(property.id, entry)
  }

  const addAssigned = (property: PropertyRow, role: string, status?: string | null) => {
    const entry = assignedProperties.get(property.id) ?? { property, roles: new Set<string>(), status }
    entry.roles.add(role)
    if (status) entry.status = status
    assignedProperties.set(property.id, entry)
  }

  for (const p of (ownedRes.data ?? []) as PropertyRow[]) addManaged(p, 'owner')
  for (const m of memberRes.data ?? []) {
    if (!m.property) continue
    const roleName = m.role?.name ?? 'member'
    if (roleName === 'occupant') {
      addAssigned(m.property, roleName, m.status)
    } else {
      addManaged(m.property, roleName)
    }
  }

  const managedList = [...managedProperties.values()]
  const assignedList = [...assignedProperties.values()]
  const rooms = (roomRes.data ?? []).map((r) => r.room).filter((r): r is RoomRow => !!r)
  const pendingInvitations = (notifRes.data ?? []) as Invitation[]

  // Occupants per property: distinct users in room_members of the property's rooms.
  const occupantCount = new Map<string, number>()
  if (managedList.length > 0) {
    const { data: roomRows } = await supabase
      .from('rooms')
      .select('property_id, room_members(user_id)')
      .in('property_id', managedList.map(({ property }) => property.id))
      .returns<{ property_id: string; room_members: { user_id: string }[] }[]>()
    const perProperty = new Map<string, Set<string>>()
    for (const r of roomRows ?? []) {
      const set = perProperty.get(r.property_id) ?? new Set<string>()
      for (const m of r.room_members) set.add(m.user_id)
      perProperty.set(r.property_id, set)
    }
    for (const [id, set] of perProperty) occupantCount.set(id, set.size)
  }

  const error = ownedRes.error ?? memberRes.error ?? roomRes.error

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground transition-colors">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
        <h1 className="mt-2 text-4xl font-bold">Dashboard</h1>
        <p className="mt-3 text-muted-foreground">Selamat datang kembali, {user.email}.</p>

        {error && (
          <p className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            Gagal memuat data: {error.message}
          </p>
        )}

        {/* Section: Undangan Menunggu Persetujuan */}
        {pendingInvitations.length > 0 && (
          <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-300">
                Undangan Menunggu Persetujuan ({pendingInvitations.length})
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Anda menerima undangan bergabung ke properti berikut. Silakan konfirmasi untuk mengaktifkan akses.
            </p>
            <ul className="mt-4 divide-y divide-border/60">
              {pendingInvitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{invitation.title}</p>
                    {invitation.description && (
                      <p className="text-sm text-muted-foreground">{invitation.description}</p>
                    )}
                  </div>
                  <InvitationActions invitation={invitation} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Section: Properti yang saya kelola (Owner, Admin, Guard) */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-colors">
          <h2 className="text-xl font-semibold">Properti yang saya kelola</h2>
          {managedList.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada properti yang dikelola.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {managedList.map(({ property, roles }) => (
                <li key={property.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{property.name}</p>
                    {property.location && <p className="text-sm text-muted-foreground">{property.location}</p>}
                    <p className="text-sm text-muted-foreground">{occupantCount.get(property.id) ?? 0} occupant</p>
                  </div>
                  <div className="flex gap-2">
                    {[...roles].map((role) => (
                      <span key={role} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {role}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Section: Properti yang di-assign (Occupant / Penghuni) */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-colors">
          <h2 className="text-xl font-semibold">Properti yang di-assign</h2>
          {assignedList.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada properti yang di-assign ke Anda.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {assignedList.map(({ property, roles, status }) => (
                <li key={property.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{property.name}</p>
                    {property.location && <p className="text-sm text-muted-foreground">{property.location}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {status && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {status === 'active' ? 'Aktif' : 'Menunggu Approval'}
                      </span>
                    )}
                    {[...roles].map((role) => (
                      <span key={role} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {role}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Section: Kamar yang saya sewa */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-colors">
          <h2 className="text-xl font-semibold">Kamar yang saya sewa</h2>
          {rooms.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada kamar yang disewa.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {rooms.map((room) => (
                <li key={room.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{room.name ?? room.room_number ?? room.id}</p>
                    {room.property && <p className="text-sm text-muted-foreground">{room.property.name}</p>}
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">occupant</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

