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
import { toast } from 'sonner'

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
  const [selectionMode, setSelectionMode] = useState<'pick' | 'skip'>('skip')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [applicationNote, setApplicationNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // Track applications made in this session
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())

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

  function handleOpenApplyModal(property: PropertyItem, initialRoom: RoomItem | null = null) {
    if (!currentUser) {
      router.push('/login?redirect=/properties')
      return
    }

    setSelectedProperty(property)
    setApplicationNote('')
    setSubmitError(null)
    setSubmitSuccess(null)

    if (initialRoom) {
      setSelectionMode('pick')
      setSelectedRoomId(initialRoom.id)
    } else {
      // Cek apakah ada kamar tersedia
      const availableRooms = (property.rooms ?? []).filter(
        (r) => !Boolean(r.occupant_member_id) && (r.room_members?.length ?? 0) === 0
      )
      if (availableRooms.length > 0) {
        setSelectionMode('pick')
        setSelectedRoomId(availableRooms[0].id)
      } else {
        setSelectionMode('skip')
        setSelectedRoomId(null)
      }
    }

    setModalOpen(true)
  }

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProperty) return

    setIsSubmitting(true)
    setSubmitError(null)

    const chosenRoomId = selectionMode === 'pick' ? selectedRoomId : null

    try {
      const res = await fetch('/api/rooms/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: selectedProperty.id,
          roomId: chosenRoomId,
          note: applicationNote,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim pengajuan sewa.')
      }

      // Tandai pengajuan berhasil
      const key = chosenRoomId ? `${selectedProperty.id}_${chosenRoomId}` : selectedProperty.id
      setAppliedKeys((prev) => new Set(prev).add(key))
      setSubmitSuccess(data.message || 'Pengajuan sewa berhasil dikirim!')

      setTimeout(() => {
        setModalOpen(false)
        setSubmitSuccess(null)
        router.refresh()
      }, 1800)
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat mengajukan.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs transition-colors md:flex-row md:items-center md:justify-between">
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
                  ? 'bg-indigo-600 text-white shadow-xs'
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
                  ? 'bg-indigo-600 text-white shadow-xs'
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
          properti kos
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
            const isAppliedGeneral = appliedKeys.has(property.id)

            return (
              <div
                key={property.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition hover:shadow-md"
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

                  <h3 className="mt-3 text-lg font-bold group-hover:text-indigo-600 transition-colors">
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
                            ? 'Sembunyikan Unit Kamar'
                            : `Lihat Pilihan Kamar (${totalRooms})`}
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
                            const isApplied = appliedKeys.has(
                              `${property.id}_${room.id}`
                            )

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
                                      Terkirim
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
                                      Pilih Kamar
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

                {/* Footer Kartu Properti */}
                <div className="border-t border-border bg-muted/30 px-5 py-3">
                  {isOwner ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                        Properti Milik Anda
                      </span>
                      <Link
                        href="/dashboard"
                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
                      >
                        Kelola di Dashboard
                      </Link>
                    </div>
                  ) : isAppliedGeneral ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 py-2.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Pengajuan Sedang Diproses Pemilik
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenApplyModal(property, null)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Ajukan Sewa Kamar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Pengajuan Sewa Kamar */}
      {modalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Send className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-lg font-bold">Ajukan Sewa Kamar</h3>
                <p className="text-xs text-muted-foreground">
                  Kirim permohonan sewa ke pemilik {selectedProperty.name}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-foreground text-sm">
                {selectedProperty.name}
              </p>
              {selectedProperty.location && (
                <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                  {selectedProperty.location}
                </p>
              )}
            </div>

            {submitSuccess ? (
              <div className="my-6 flex flex-col items-center justify-center rounded-xl bg-emerald-50 p-6 text-center text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 animate-in fade-in">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mb-2" />
                <h4 className="font-bold text-base">Berhasil Mengajukan!</h4>
                <p className="mt-1 text-xs">{submitSuccess}</p>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Menutup jendela secara otomatis...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication} className="mt-4 space-y-4">
                {submitError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <p>{submitError}</p>
                  </div>
                )}

                {/* Tab Pilihan: Mau Pilih Kamar atau Skip Pilih Kamar */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    Metode Pemilihan Kamar
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectionMode('pick')
                        const available = (selectedProperty.rooms ?? []).filter(
                          (r) =>
                            !Boolean(r.occupant_member_id) &&
                            (r.room_members?.length ?? 0) === 0
                        )
                        if (available.length > 0 && !selectedRoomId) {
                          setSelectedRoomId(available[0].id)
                        }
                      }}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                        selectionMode === 'pick'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 font-semibold'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="text-xs flex items-center gap-1.5">
                        <Bed className="h-3.5 w-3.5 text-indigo-600" />
                        Pilih Kamar Tertentu
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                        Pilih unit kamar yang masih kosong
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectionMode('skip')
                        setSelectedRoomId(null)
                      }}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                        selectionMode === 'skip'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 font-semibold'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="text-xs flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                        Skip Pilih Kamar
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                        Bebas / ditentukan oleh pemilik kos
                      </span>
                    </button>
                  </div>
                </div>

                {/* Daftar Pilihan Kamar Spesifik jika mode 'pick' */}
                {selectionMode === 'pick' && (
                  <div className="space-y-2 rounded-xl border border-border bg-background p-3 animate-in fade-in duration-150">
                    <span className="block text-[11px] font-semibold text-foreground">
                      Pilih Unit Kamar yang Tersedia:
                    </span>
                    {(() => {
                      const availableRooms = (selectedProperty.rooms ?? []).filter(
                        (r) =>
                          !Boolean(r.occupant_member_id) &&
                          (r.room_members?.length ?? 0) === 0
                      )

                      if (availableRooms.length === 0) {
                        return (
                          <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            Saat ini belum ada kamar kosong spesifik. Anda dapat memilih opsi{' '}
                            <strong>&quot;Skip Pilih Kamar&quot;</strong> untuk mendaftar antrean/kamar acak ke pemilik.
                          </div>
                        )
                      }

                      return (
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {availableRooms.map((room) => {
                            const isSelected = selectedRoomId === room.id
                            return (
                              <button
                                key={room.id}
                                type="button"
                                onClick={() => setSelectedRoomId(room.id)}
                                className={`flex flex-col items-start rounded-lg border p-2 text-left text-xs transition ${
                                  isSelected
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                                    : 'border-border hover:bg-muted text-foreground'
                                }`}
                              >
                                <span className="font-bold">{room.name ?? 'Kamar'}</span>
                                <span
                                  className={`text-[10px] ${
                                    isSelected ? 'text-indigo-100' : 'text-muted-foreground'
                                  }`}
                                >
                                  {room.area ? `${room.area} m²` : 'Standard'}
                                  {room.bathroom_mode === 'inside' ? ' · KM Dalam' : ''}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Keterangan jika mode 'skip' */}
                {selectionMode === 'skip' && (
                  <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-3 text-xs text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200 animate-in fade-in duration-150">
                    <p className="font-semibold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      Penempatan Kamar Bebas:
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Anda tidak mengunci kamar tertentu. Pemilik kos akan menghubungi dan menentukan
                      penempatan kamar terbaik yang cocok untuk Anda saat menyetujui pengajuan sewa ini.
                    </p>
                  </div>
                )}

                {/* Input Catatan Tambahan */}
                <div>
                  <label
                    htmlFor="note"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Pesan atau Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    id="note"
                    rows={2}
                    value={applicationNote}
                    onChange={(e) => setApplicationNote(e.target.value)}
                    placeholder="Contoh: Rencana masuk tanggal 15 bulan ini, mohon info detail pembayarannya..."
                    className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="rounded-xl bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                  Pemilik properti akan menerima pengajuan ini secara realtime. Anda dapat memantau status
                  persetujuannya di dashboard dan menu notifikasi.
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
                    disabled={isSubmitting || (selectionMode === 'pick' && !selectedRoomId)}
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}
