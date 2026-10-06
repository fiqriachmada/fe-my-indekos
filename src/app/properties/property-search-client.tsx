'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  MapPin,
  Home,
  Bed,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Send,
  Loader2,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react'

type RoomItem = {
  id: string
  name: string | null
  is_active: boolean | null
  area?: number | null
  bathroom_mode?: string | null
  occupant_member_id?: string | null
  room_members: { user_id: string }[] | null
}

type PropertyItem = {
  id: string
  name: string
  location: string | null
  property_type: string | null
  building_area: number | null
  land_area: number | null
  owner_id: string | null
  created_at: string
  is_active: boolean | null
  rooms: RoomItem[] | null
}

type UserInfo = {
  id: string
  email: string | null
}

export default function PropertySearchClient({
  initialProperties,
  currentUser,
}: {
  initialProperties: PropertyItem[]
  currentUser: UserInfo | null
}) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'kosan'>('kosan')

  // Expanded room view per property id
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null)

  // Application modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null)
  const [applicationNote, setApplicationNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // Track rooms applied in this session
  const [appliedRoomIds, setAppliedRoomIds] = useState<Set<string>>(new Set())

  const filteredProperties = useMemo(() => {
    return initialProperties.filter((item) => {
      if (typeFilter === 'kosan') {
        const type = (item.property_type ?? '').toLowerCase()
        if (type && !type.includes('kos')) {
          return false
        }
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchName = item.name.toLowerCase().includes(query)
        const matchLocation = (item.location ?? '').toLowerCase().includes(query)
        if (!matchName && !matchLocation) return false
      }

      if (onlyAvailable) {
        const totalRooms = item.rooms?.length ?? 0
        const occupiedRooms = (item.rooms ?? []).filter(
          (r) =>
            Boolean(r.occupant_member_id) || (r.room_members?.length ?? 0) > 0
        ).length
        const availableRooms = totalRooms - occupiedRooms
        if (availableRooms <= 0) return false
      }

      return true
    })
  }, [initialProperties, searchTerm, onlyAvailable, typeFilter])

  function toggleExpand(propId: string) {
    setExpandedPropertyId((prev) => (prev === propId ? null : propId))
  }

  function handleOpenApplyModal(property: PropertyItem, room: RoomItem) {
    if (!currentUser) {
      router.push('/login?redirect=/properties')
      return
    }
    setSelectedProperty(property)
    setSelectedRoom(room)
    setApplicationNote('')
    setSubmitError(null)
    setModalOpen(true)
  }

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProperty || !selectedRoom) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/rooms/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: selectedProperty.id,
          roomId: selectedRoom.id,
          note: applicationNote,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim pengajuan sewa.')
      }

      // Berhasil
      setAppliedRoomIds((prev) => new Set([...prev, selectedRoom.id]))
      setSubmitSuccess(
        data.message ||
          `Pengajuan untuk ${selectedRoom.name ?? 'kamar'} berhasil dikirim ke pemilik!`
      )
      setModalOpen(false)

      // Hilangkan pesan sukses setelah 6 detik
      setTimeout(() => {
        setSubmitSuccess(null)
      }, 6000)
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Berhasil */}
      {submitSuccess && (
        <div className="fixed top-5 right-5 z-50 flex max-w-md items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 text-emerald-900 shadow-xl backdrop-blur-md dark:border-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Pengajuan Terkirim!</p>
            <p className="mt-0.5 text-xs opacity-90">{submitSuccess}</p>
            <div className="mt-2 flex gap-3">
              <Link
                href="/dashboard"
                className="text-xs font-bold text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-300"
              >
                Cek Status di Dashboard →
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
          Menampilkan{' '}
          <span className="font-semibold text-foreground">
            {filteredProperties.length}
          </span>{' '}
          properti
        </p>
      </div>

      {/* Property Cards Grid */}
      {filteredProperties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Home className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold">
            Tidak ada properti ditemukan
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba ubah kata kunci pencarian atau sesuaikan filter ketersediaan.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => {
            const rooms = property.rooms ?? []
            const totalRooms = rooms.length
            const occupiedRooms = rooms.filter(
              (r) =>
                Boolean(r.occupant_member_id) ||
                (r.room_members?.length ?? 0) > 0
            ).length
            const availableRooms = totalRooms - occupiedRooms
            const isAvailable = availableRooms > 0
            const isExpanded = expandedPropertyId === property.id
            const isOwner = currentUser?.id === property.owner_id

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
                      <span className="text-xs text-muted-foreground">
                        Belum ada kamar
                      </span>
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

                  {/* Expandable Rooms List */}
                  {totalRooms > 0 && (
                    <div className="mt-4 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(property.id)}
                        className="flex w-full items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        <span>
                          {isExpanded
                            ? 'Sembunyikan Daftar Kamar'
                            : `Lihat Unit Kamar (${totalRooms})`}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 rounded-xl bg-muted/40 p-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          {rooms.map((room) => {
                            const roomOccupied =
                              Boolean(room.occupant_member_id) ||
                              (room.room_members?.length ?? 0) > 0
                            const isApplied = appliedRoomIds.has(room.id)

                            return (
                              <div
                                key={room.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card p-2.5 text-xs shadow-xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground">
                                    {room.name ?? 'Kamar'}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {room.area ? `${room.area} m²` : 'Standard'}
                                    {room.bathroom_mode === 'inside'
                                      ? ' · KM Dalam'
                                      : room.bathroom_mode === 'outside'
                                      ? ' · KM Luar'
                                      : ''}
                                  </p>
                                </div>

                                <div className="shrink-0">
                                  {roomOccupied ? (
                                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                      Terisi
                                    </span>
                                  ) : isApplied ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Menunggu Pemilik
                                    </span>
                                  ) : isOwner ? (
                                    <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                      Milik Anda
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenApplyModal(property, room)
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
                                    >
                                      <Send className="h-3 w-3" />
                                      Ajukan Sewa
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-border bg-muted/30 px-5 py-3">
                  <Link
                    href={`/dashboard`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted"
                  >
                    Buka di Dashboard
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Pengajuan Sewa Kamar */}
      {modalOpen && selectedProperty && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Send className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-lg font-bold">Ajukan Sewa Kamar</h3>
                <p className="text-xs text-muted-foreground">
                  Kirim permohonan sewa ke pemilik properti
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs">
              <p className="font-semibold text-foreground">
                {selectedProperty.name}
              </p>
              <p className="text-muted-foreground">
                Kamar:{' '}
                <span className="font-medium text-foreground">
                  {selectedRoom.name ?? 'Kamar'}
                </span>
                {selectedRoom.area ? ` (${selectedRoom.area} m²)` : ''}
              </p>
              {selectedProperty.location && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Lokasi: {selectedProperty.location}
                </p>
              )}
            </div>

            {submitError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <p>{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="note"
                  className="block text-xs font-semibold text-foreground"
                >
                  Pesan atau Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="note"
                  rows={3}
                  value={applicationNote}
                  onChange={(e) => setApplicationNote(e.target.value)}
                  placeholder="Contoh: Rencana mulai masuk tanggal 15 bulan ini, mohon infokan jika ada syarat khusus..."
                  className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="rounded-xl bg-indigo-50/70 p-3 text-[11px] text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                Pemilik properti akan menerima notifikasi Anda dan dapat
                menyetujui atau menolak. Status pengajuan dapat Anda pantau
                langsung di dashboard dan ikon lonceng realtime.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Kirim Pengajuan Sewa
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
