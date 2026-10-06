import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InvitationActions, type Invitation } from './invitation-actions'

type PropertyRow = { id: string; name: string; location: string | null }
type PropertyMemberRow = { id: string; role: { name: string } | null; property: PropertyRow | null }
type RoomRow = { id: string; name?: string | null; property: { id: string; name: string } | null }
type RoomMemberRow = { room_id?: string; room: RoomRow | null }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [ownedRes, memberRes, roomRes, notifRes] = await Promise.all([
    // Properties the user owns directly (owner_id), even without a membership row.
    admin.from('properties').select('id, name, location').eq('owner_id', user.id),
    // Property-scoped roles: owner, property-admin, guard, occupant.
    admin
      .from('property_members')
      .select('id, role:roles(name), property:properties(id, name, location)')
      .eq('user_id', user.id)
      .returns<PropertyMemberRow[]>(),
    // Room-scoped role: occupant via room_members.
    admin
      .from('room_members')
      .select('room_id, room:rooms(id, name, property:properties(id, name))')
      .eq('user_id', user.id)
      .returns<RoomMemberRow[]>(),
    // Notifications / room applications for this user (safely handled)
    admin
      .from('notifications')
      .select('id, title, description, property_id, room_id, status, type, created_at, property:properties(name)')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .returns<Invitation[]>(),
  ])

  // Filter properti yang dikelola:
  // Hanya role manajerial (owner, property-admin, guard) yang masuk ke "Properti yang saya kelola".
  // Role 'occupant' BUKAN pengelola properti (occupant berada di level room).
  const managedProperties = new Map<string, { property: PropertyRow; roles: Set<string> }>()

  const addManaged = (property: PropertyRow, role: string) => {
    const entry = managedProperties.get(property.id) ?? { property, roles: new Set<string>() }
    entry.roles.add(role)
    managedProperties.set(property.id, entry)
  }

  for (const p of (ownedRes.data ?? []) as PropertyRow[]) addManaged(p, 'owner')
  for (const m of memberRes.data ?? []) {
    if (!m.property) continue
    const roleName = m.role?.name ?? 'member'
    // Hanya masukkan role pengelola ke daftar properti yang dikelola
    if (roleName === 'owner' || roleName === 'property-admin' || roleName === 'guard') {
      addManaged(m.property, roleName)
    }
  }

  const managedList = [...managedProperties.values()]

  // Ambil kamar yang disewa baik via room_members maupun penempatan langsung via occupant_member_id
  const userMemberIds = (memberRes.data ?? []).map((m) => m.id).filter(Boolean)
  let directAssignedRooms: RoomRow[] = []
  if (userMemberIds.length > 0) {
    const { data: directRooms } = await admin
      .from('rooms')
      .select('id, name, property:properties(id, name)')
      .in('occupant_member_id', userMemberIds)
    directAssignedRooms = (directRooms ?? []) as unknown as RoomRow[]
  }

  // Gabungkan kamar dari room_members dan dari occupant_member_id (deduplikasi berdasarkan id)
  const roomMap = new Map<string, RoomRow>()
  for (const r of (roomRes.data ?? []).map((r) => r.room).filter((r): r is RoomRow => !!r)) {
    roomMap.set(r.id, r)
  }
  for (const r of directAssignedRooms) {
    roomMap.set(r.id, r)
  }
  const rooms = Array.from(roomMap.values())

  const pendingNotifications = (notifRes.data ?? []) as Invitation[]

  // Occupants per property: distinct users in room_members of the property's rooms.
  const occupantCount = new Map<string, number>()
  if (managedList.length > 0) {
    const { data: roomRows } = await admin
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
            <h1 className="mt-2 text-4xl font-bold">Dashboard</h1>
            <p className="mt-3 text-muted-foreground">Selamat datang kembali, {user.email}.</p>
          </div>
          <div>
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Cari Kamar Tersedia
            </Link>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            Gagal memuat data: {error.message}
          </p>
        )}

        {/* Section: Pengajuan & Undangan Menunggu Persetujuan */}
        {pendingNotifications.length > 0 && (
          <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-300">
                Pengajuan & Undangan Masuk ({pendingNotifications.length})
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ada permohonan atau undangan baru yang memerlukan konfirmasi Anda.
            </p>
            <ul className="mt-4 divide-y divide-border/60">
              {pendingNotifications.map((notif) => (
                <li key={notif.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{notif.title}</p>
                    {notif.description && (
                      <p className="text-sm text-muted-foreground">{notif.description}</p>
                    )}
                  </div>
                  <InvitationActions invitation={notif} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Section: Properti yang saya kelola (Owner, Property-Admin, Guard) */}
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

        {/* Section: Kamar yang saya sewa (Occupant) */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Kamar yang saya sewa</h2>
            <span className="text-xs text-muted-foreground">Peran: Penghuni (Occupant)</span>
          </div>
          {rooms.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Belum ada kamar yang disewa.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cari properti dan kamar yang tersedia, lalu ajukan sewa ke pemilik properti.
              </p>
              <Link
                href="/properties"
                className="mt-4 inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                Jelajahi Kamar Tersedia
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {rooms.map((room) => (
                <li key={room.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{room.name ?? room.id}</p>
                    {room.property && <p className="text-sm text-muted-foreground">{room.property.name}</p>}
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    occupant aktif
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

