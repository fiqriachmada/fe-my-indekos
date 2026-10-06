'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Home, Bed, CheckCircle2, XCircle } from 'lucide-react'

type RoomItem = {
  id: string
  name: string | null
  is_active: boolean | null
  room_members: { user_id: string }[] | null
}

type PropertyItem = {
  id: string
  name: string
  location: string | null
  property_type: string | null
  building_area: number | null
  land_area: number | null
  created_at: string
  is_active: boolean | null
  rooms: RoomItem[] | null
}

export default function PropertySearchClient({
  initialProperties,
}: {
  initialProperties: PropertyItem[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'kosan'>('kosan')

  const filteredProperties = useMemo(() => {
    return initialProperties.filter((item) => {
      // Filter tipe properti: default fokus kosan
      if (typeFilter === 'kosan') {
        const type = (item.property_type ?? '').toLowerCase()
        if (type && !type.includes('kos')) {
          return false
        }
      }

      // Filter nama & lokasi
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchName = item.name.toLowerCase().includes(query)
        const matchLocation = (item.location ?? '').toLowerCase().includes(query)
        if (!matchName && !matchLocation) return false
      }

      // Filter hanya yang ada kamar tersedia
      if (onlyAvailable) {
        const totalRooms = item.rooms?.length ?? 0
        const occupiedRooms = (item.rooms ?? []).filter(
          (r) => (r.room_members?.length ?? 0) > 0
        ).length
        const availableRooms = totalRooms - occupiedRooms
        if (availableRooms <= 0) return false
      }

      return true
    })
  }, [initialProperties, searchTerm, onlyAvailable, typeFilter])

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama kos atau lokasi..."
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-input bg-background p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTypeFilter('kosan')}
              className={`rounded-lg px-3 py-1.5 transition ${
                typeFilter === 'kosan'
                  ? 'bg-indigo-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Kosan Saja
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`rounded-lg px-3 py-1.5 transition ${
                typeFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua Tipe
            </button>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Hanya Kamar Tersedia</span>
          </label>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Menampilkan <span className="font-semibold text-foreground">{filteredProperties.length}</span> properti
        </p>
      </div>

      {/* Property Cards Grid */}
      {filteredProperties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Home className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold">Tidak ada properti ditemukan</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba ubah kata kunci pencarian atau sesuaikan filter ketersediaan.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => {
            const totalRooms = property.rooms?.length ?? 0
            const occupiedRooms = (property.rooms ?? []).filter(
              (r) => (r.room_members?.length ?? 0) > 0
            ).length
            const availableRooms = totalRooms - occupiedRooms
            const isAvailable = availableRooms > 0

            return (
              <div
                key={property.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {property.property_type ?? 'Kosan'}
                    </span>
                    {totalRooms > 0 ? (
                      isAvailable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {availableRooms} Kamar Kosong
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <XCircle className="h-3.5 w-3.5" />
                          Penuh
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum ada kamar</span>
                    )}
                  </div>

                  <h3 className="mt-3 text-lg font-bold group-hover:text-indigo-600">
                    {property.name}
                  </h3>

                  {property.location && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      <span className="line-clamp-1">{property.location}</span>
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Bed className="h-4 w-4 text-indigo-500" />
                      <span>{totalRooms} Total Kamar</span>
                    </div>
                    {property.building_area && (
                      <div className="flex items-center gap-1.5">
                        <Home className="h-4 w-4 text-indigo-500" />
                        <span>{property.building_area} m²</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border bg-muted/30 px-5 py-3">
                  <Link
                    href={`/dashboard`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
                  >
                    Buka di Dashboard
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
