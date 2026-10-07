'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bed, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'

export type RoomItem = {
  id: string
  name: string
  is_active?: boolean | null
  occupant_member_id?: string | null
  room_members?: { user_id: string }[] | null
}

export type Invitation = {
  id: string
  title: string
  description: string | null
  property_id: string | null
  room_id?: string | null
  status: string | null
  type?: string | null
  created_at: string
  property?: {
    id?: string
    name: string
    rooms?: RoomItem[] | null
  } | null
}

export function InvitationActions({ invitation }: { invitation: Invitation }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const router = useRouter()

  const isAssignment = invitation.type === 'room_assignment'
  const isApplication = invitation.type === 'room_application'
  const isPropertyInvitation = invitation.type === 'property_invitation'
  const isSkipRoom = isApplication && !invitation.room_id

  const availableRooms = (invitation.property?.rooms ?? []).filter(
    (r) =>
      r.is_active !== false &&
      !Boolean(r.occupant_member_id) &&
      (r.room_members?.length ?? 0) === 0
  )

  const approveText = isPropertyInvitation
    ? 'Terima Undangan Properti'
    : isAssignment
    ? 'Terima Kamar'
    : isApplication
    ? 'Setujui Sewa'
    : 'Setujui / Terima'

  const rejectText = isPropertyInvitation
    ? 'Tolak Undangan'
    : isAssignment
    ? 'Tolak Penempatan'
    : isApplication
    ? 'Tolak Pengajuan'
    : 'Tolak'

  function handleApproveClick() {
    // Jika calon penghuni skip pilih kamar, owner wajib memilih kamar yang akan di-assign dulu
    if (isSkipRoom) {
      if (availableRooms.length === 0) {
        toast.error('Tidak ada kamar kosong yang tersedia!', {
          description: `Semua kamar di ${invitation.property?.name ?? 'properti ini'} sudah terisi penuh. Anda tidak dapat menyetujui pengajuan tanpa kamar kosong.`,
        })
        return
      }

      // Default pilih kamar kosong pertama
      setSelectedRoomId(availableRooms[0].id)
      setIsRoomPickerOpen(true)
      return
    }

    // Jika sudah ada room_id spesifik atau tipe assignment
    handleResponse('approved', invitation.room_id ?? null)
  }

  async function handleResponse(
    action: 'approved' | 'rejected',
    assignedRoomId: string | null = null
  ) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: invitation.id,
          action,
          assignedRoomId: assignedRoomId ?? undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menanggapi pemberitahuan.')
      }

      if (action === 'approved') {
        const assignedRoom = availableRooms.find((r) => r.id === assignedRoomId)
        const roomName = assignedRoom?.name ?? ''
        toast.success(
          roomName
            ? `Pengajuan disetujui! Kamar ${roomName} berhasil ditempatkan.`
            : 'Pemberitahuan berhasil disetujui!'
        )
      } else {
        toast.info('Permohonan / penempatan telah ditolak.')
      }

      setIsRoomPickerOpen(false)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menanggapi pemberitahuan.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {error && <span className="text-xs text-red-500">{error}</span>}
        <button
          type="button"
          disabled={loading}
          onClick={handleApproveClick}
          className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Memproses...' : approveText}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleResponse('rejected')}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted active:scale-95 disabled:opacity-50"
        >
          {rejectText}
        </button>
      </div>

      {/* Modal Pemilihan Kamar oleh Owner jika Calon Penghuni Skip Pilih Kamar */}
      {isRoomPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsRoomPickerOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Bed className="h-5 w-5" />
              <h3 className="text-base font-bold text-foreground">
                Pilih Kamar untuk Calon Penghuni
              </h3>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Calon penghuni mengajukan sewa kamar bebas (<strong>Skip Pilih Kamar</strong>) di{' '}
              <strong>{invitation.property?.name ?? 'properti ini'}</strong>.
              Tentukan salah satu kamar kosong berikut yang ingin Anda berikan sebelum menyetujui:
            </p>

            <div className="mt-4 space-y-2">
              <span className="block text-[11px] font-semibold text-foreground">
                Kamar Kosong yang Tersedia ({availableRooms.length}):
              </span>

              {availableRooms.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Saat ini tidak ada unit kamar kosong di properti ini. Anda dapat menolak pengajuan ini.
                  </span>
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {availableRooms.map((room) => {
                    const isSelected = selectedRoomId === room.id
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs transition ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-100 ring-2 ring-indigo-500/20'
                            : 'border-border bg-background hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex size-4 items-center justify-center rounded-full border ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-muted-foreground/40'
                            }`}
                          >
                            {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{room.name ?? 'Kamar'}</p>
                            <p className="text-[10px] text-muted-foreground">Status: Kosong & Aktif</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Dipilih
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsRoomPickerOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading || !selectedRoomId || availableRooms.length === 0}
                onClick={() => handleResponse('approved', selectedRoomId)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Setujui & Tempatkan Kamar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
