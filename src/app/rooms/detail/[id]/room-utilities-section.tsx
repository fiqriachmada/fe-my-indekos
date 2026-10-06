'use client'

import { useState } from 'react'
import {
  Zap,
  Droplets,
  Plus,
  Calendar,
  Copy,
  Check,
  Pencil,
  Trash2,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export type UtilityPayment = {
  id: string
  room_id: string
  property_id: string
  utility_type: 'pln' | 'pdam'
  amount: number
  paid_at: string
  token_code?: string | null
  kwh?: number | null
  meter_reading?: number | null
  period_label?: string | null
  note?: string | null
  created_by?: string | null
  created_by_role?: 'owner' | 'occupant' | null
  created_at: string
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatRelative(dateStr: string) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Hari ini'
    if (diffDays === 1) return 'Kemarin'
    if (diffDays < 30) return `${diffDays} hari lalu`
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths} bulan lalu`
  } catch {
    return ''
  }
}

export function RoomUtilitiesSection({
  roomId,
  initialPayments,
  currentUserId,
}: {
  roomId: string
  initialPayments: UtilityPayment[]
  currentUserId: string
}) {
  const [payments, setPayments] = useState<UtilityPayment[]>(initialPayments)
  const [filterType, setFilterType] = useState<'all' | 'pln' | 'pdam'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<UtilityPayment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formType, setFormType] = useState<'pln' | 'pdam'>('pln')
  const [formAmount, setFormAmount] = useState('')
  const [formPaidAt, setFormPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [formToken, setFormToken] = useState('')
  const [formKwh, setFormKwh] = useState('')
  const [formMeter, setFormMeter] = useState('')
  const [formPeriod, setFormPeriod] = useState('')
  const [formNote, setFormNote] = useState('')

  const lastPln = payments.find((p) => p.utility_type === 'pln')
  const lastPdam = payments.find((p) => p.utility_type === 'pdam')

  const filteredPayments = payments.filter((p) => {
    if (filterType === 'all') return true
    return p.utility_type === filterType
  })

  function openAddModal(type: 'pln' | 'pdam' = 'pln') {
    setEditingItem(null)
    setFormType(type)
    setFormAmount('')
    setFormPaidAt(new Date().toISOString().split('T')[0])
    setFormToken('')
    setFormKwh('')
    setFormMeter('')
    setFormPeriod('')
    setFormNote('')
    setIsModalOpen(true)
  }

  function openEditModal(item: UtilityPayment) {
    setEditingItem(item)
    setFormType(item.utility_type)
    setFormAmount(String(item.amount))
    setFormPaidAt(item.paid_at.split('T')[0])
    setFormToken(item.token_code || '')
    setFormKwh(item.kwh !== null && item.kwh !== undefined ? String(item.kwh) : '')
    setFormMeter(
      item.meter_reading !== null && item.meter_reading !== undefined
        ? String(item.meter_reading)
        : ''
    )
    setFormPeriod(item.period_label || '')
    setFormNote(item.note || '')
    setIsModalOpen(true)
  }

  async function handleCopyToken(token: string, id: string) {
    try {
      await navigator.clipboard.writeText(token)
      setCopiedId(id)
      toast.success('Nomor token disalin ke clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Gagal menyalin token')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formAmount || Number(formAmount) <= 0) {
      toast.error('Masukkan nominal yang valid')
      return
    }

    setSubmitting(true)
    try {
      if (editingItem) {
        // Edit existing
        const res = await fetch(`/api/rooms/${roomId}/utilities`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            amount: Number(formAmount),
            paid_at: new Date(formPaidAt).toISOString(),
            token_code: formType === 'pln' ? formToken : null,
            kwh: formType === 'pln' && formKwh ? Number(formKwh) : null,
            meter_reading: formType === 'pdam' && formMeter ? Number(formMeter) : null,
            period_label: formPeriod || null,
            note: formNote || null,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui catatan')

        setPayments((prev) =>
          prev.map((p) => (p.id === editingItem.id ? (data.payment as UtilityPayment) : p))
        )
        toast.success('Catatan utilitas berhasil diperbarui')
      } else {
        // Add new
        const res = await fetch(`/api/rooms/${roomId}/utilities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utility_type: formType,
            amount: Number(formAmount),
            paid_at: new Date(formPaidAt).toISOString(),
            token_code: formType === 'pln' ? formToken : null,
            kwh: formType === 'pln' && formKwh ? Number(formKwh) : null,
            meter_reading: formType === 'pdam' && formMeter ? Number(formMeter) : null,
            period_label: formPeriod || null,
            note: formNote || null,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Gagal menambahkan catatan')

        setPayments((prev) => [data.payment as UtilityPayment, ...prev])
        toast.success('Catatan utilitas berhasil disimpan')
      }

      setIsModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus catatan pembayaran utilitas ini?')) return

    try {
      const res = await fetch(`/api/rooms/${roomId}/utilities?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus catatan')

      setPayments((prev) => prev.filter((p) => p.id !== id))
      toast.success('Catatan utilitas telah dihapus')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error(msg)
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Utilitas Kamar (PLN & PDAM)</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Riwayat pengisian token listrik dan pencatatan meteran air kamar Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAddModal('pln')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 transition"
          >
            <Zap className="size-3.5" />
            + Isi Token PLN
          </button>
          <button
            type="button"
            onClick={() => openAddModal('pdam')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/10 px-3.5 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 transition"
          >
            <Droplets className="size-3.5" />
            + Catat PDAM
          </button>
        </div>
      </div>

      {/* Ringkasan Terakhir PLN & PDAM */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Card Terakhir PLN */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400">
                <Zap className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Listrik (PLN)</h3>
                <span className="text-[11px] text-muted-foreground">Status Pengisian Terakhir</span>
              </div>
            </div>
            {lastPln && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {formatRelative(lastPln.paid_at)}
              </span>
            )}
          </div>

          {lastPln ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Nominal Terakhir</span>
                <span className="text-base font-bold text-foreground">
                  {formatRupiah(lastPln.amount)}
                </span>
              </div>

              {lastPln.token_code && (
                <div className="mt-2 rounded-xl bg-muted/60 p-2.5 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-medium text-muted-foreground uppercase">
                      Nomor Token
                    </span>
                    <span className="font-mono text-xs font-bold tracking-wider text-foreground">
                      {lastPln.token_code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyToken(lastPln.token_code!, lastPln.id)}
                    aria-label="Salin nomor token"
                    className="rounded-lg p-1.5 hover:bg-background text-muted-foreground transition"
                  >
                    {copiedId === lastPln.id ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1 text-muted-foreground">
                <span>Tanggal: {formatDate(lastPln.paid_at)}</span>
                {lastPln.kwh ? <span>{lastPln.kwh} kWh</span> : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Belum ada riwayat pengisian listrik.</p>
              <button
                type="button"
                onClick={() => openAddModal('pln')}
                className="mt-2 text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
              >
                + Catat Pengisian Pertama
              </button>
            </div>
          )}
        </div>

        {/* Card Terakhir PDAM */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-card to-card p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-sky-500/15 p-2 text-sky-600 dark:text-sky-400">
                <Droplets className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Air (PDAM)</h3>
                <span className="text-[11px] text-muted-foreground">Pencatatan / Pembayaran Terakhir</span>
              </div>
            </div>
            {lastPdam && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                {formatRelative(lastPdam.paid_at)}
              </span>
            )}
          </div>

          {lastPdam ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Biaya Terakhir</span>
                <span className="text-base font-bold text-foreground">
                  {formatRupiah(lastPdam.amount)}
                </span>
              </div>

              {lastPdam.meter_reading !== null && lastPdam.meter_reading !== undefined && (
                <div className="mt-2 rounded-xl bg-muted/60 p-2.5 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-medium text-muted-foreground uppercase">
                      Angka Meteran Air
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {lastPdam.meter_reading} m³
                    </span>
                  </div>
                  {lastPdam.period_label && (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Periode {lastPdam.period_label}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1 text-muted-foreground">
                <span>Tanggal: {formatDate(lastPdam.paid_at)}</span>
                <span>{lastPdam.note || 'Air lancar'}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Belum ada riwayat pembayaran air.</p>
              <button
                type="button"
                onClick={() => openAddModal('pdam')}
                className="mt-2 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
              >
                + Catat Pembayaran PDAM
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Daftar Riwayat Utilitas */}
      <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Riwayat Lengkap Pengisian</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {filteredPayments.length}
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-muted/70 p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                filterType === 'all'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pln')}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                filterType === 'pln'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              PLN Listrik
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pdam')}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                filterType === 'pdam'
                  ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              PDAM Air
            </button>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-muted-foreground">Tidak ada riwayat utilitas yang sesuai.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPayments.map((item) => {
              const isPln = item.utility_type === 'pln'
              const canEdit = item.created_by === currentUserId

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-xl p-2 ${
                        isPln
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {isPln ? <Zap className="size-4" /> : <Droplets className="size-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {isPln ? 'Token Listrik PLN' : 'Tagihan PDAM Air'}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.created_by_role === 'occupant'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          }`}
                        >
                          {item.created_by_role === 'occupant' ? 'Oleh Penghuni' : 'Oleh Pemilik'}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatDate(item.paid_at)}</span>
                        {item.token_code && (
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] font-bold text-foreground">
                            Token: {item.token_code}
                          </span>
                        )}
                        {item.kwh && <span>{item.kwh} kWh</span>}
                        {item.meter_reading && <span>Meteran: {item.meter_reading} m³</span>}
                        {item.period_label && <span>Periode: {item.period_label}</span>}
                      </div>

                      {item.note && (
                        <p className="mt-1 text-xs text-muted-foreground/80 italic">
                          &ldquo;{item.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                    <span className="font-bold text-sm text-foreground">
                      {formatRupiah(item.amount)}
                    </span>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Edit Catatan"
                          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Hapus Catatan"
                          className="rounded-lg p-1 text-red-500 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Dialog Form Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base">
                {editingItem ? 'Edit Catatan Utilitas' : 'Catat Pengisian Utilitas'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Jenis Utilitas */}
              <div>
                <label className="block text-xs font-semibold mb-1.5">Jenis Utilitas</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={Boolean(editingItem)}
                    onClick={() => setFormType('pln')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      formType === 'pln'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Zap className="size-4" />
                    PLN (Listrik)
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(editingItem)}
                    onClick={() => setFormType('pdam')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      formType === 'pdam'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Droplets className="size-4" />
                    PDAM (Air)
                  </button>
                </div>
              </div>

              {/* Nominal Pembayaran */}
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Nominal Pembayaran (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="Contoh: 100000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold mb-1">Tanggal Pengisian</label>
                <input
                  type="date"
                  required
                  value={formPaidAt}
                  onChange={(e) => setFormPaidAt(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Form Khusus PLN */}
              {formType === 'pln' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Nomor Token PLN (20 Digit)
                    </label>
                    <input
                      type="text"
                      placeholder="1234-5678-9012-3456-7890"
                      value={formToken}
                      onChange={(e) => setFormToken(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Jumlah kWh yang Didapat (Opsional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Contoh: 65.4"
                      value={formKwh}
                      onChange={(e) => setFormKwh(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </>
              )}

              {/* Form Khusus PDAM */}
              {formType === 'pdam' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Angka Meteran Air (m³)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Contoh: 142.5"
                      value={formMeter}
                      onChange={(e) => setFormMeter(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Periode Tagihan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Oktober 2026 atau 2026-10"
                      value={formPeriod}
                      onChange={(e) => setFormPeriod(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </>
              )}

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-semibold mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan bila ada..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="size-3.5 animate-spin" />}
                  {editingItem ? 'Simpan Perubahan' : 'Catat Utilitas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
