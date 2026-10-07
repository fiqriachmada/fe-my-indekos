import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import PropertySearchClient from "./property-search-client"

export const metadata = {
  title: "Cari Properti & Kos - My Indekos",
  description: "Cari dan temukan kos idaman Anda dengan mudah di My Indekos.",
}

export default async function PropertiesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // Ambil data properti kos yang berstatus aktif (status_id = 1 atau is_active = true) dan relasi kamar aktif
  const { data: rawProperties, error } = await admin
    .from("properties")
    .select(`
      id,
      name,
      location,
      property_type,
      building_area,
      land_area,
      owner_id,
      created_at,
      status_id,
      is_active,
      rooms (
        id,
        name,
        status_id,
        is_active,
        area,
        bathroom_mode,
        occupant_member_id,
        room_members (
          user_id,
          status_id
        )
      )
    `)
    .or("status_id.eq.1,and(status_id.is.null,is_active.eq.true)")
    .ilike("property_type", "%kos%")
    .order("created_at", { ascending: false })

  // Pastikan hanya kamar yang berstatus aktif (status_id = 1 atau is_active = true) yang ditampilkan kepada publik/calon penyewa
  const properties = (rawProperties ?? []).map((property) => ({
    ...property,
    rooms: (property.rooms ?? []).filter(
      (room) => (room.status_id ? room.status_id === 1 : room.is_active !== false)
    ),
  }))

  return (
    <main className="min-h-screen bg-background px-4 py-12 pb-28 text-foreground transition-colors sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Jelajahi Indekos
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Cari Properti & Kamar Kos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Temukan indekos yang nyaman, strategis, dan sesuai kebutuhan Anda.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Gagal memuat properti: {error.message}
          </div>
        )}

        <PropertySearchClient
          initialProperties={properties ?? []}
          currentUser={user ? { id: user.id, email: user.email ?? null } : null}
        />
      </div>
    </main>
  )
}
