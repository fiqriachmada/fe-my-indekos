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

  // Ambil data properti dan relasi kamar menggunakan admin client agar rooms tidak tersembunyi oleh RLS
  const { data: properties, error } = await admin
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
      is_active,
      rooms (
        id,
        name,
        is_active,
        area,
        bathroom_mode,
        occupant_member_id,
        room_members (
          user_id
        )
      )
    `)
    .order("created_at", { ascending: false })

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
