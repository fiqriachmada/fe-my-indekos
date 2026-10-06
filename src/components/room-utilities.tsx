'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Droplets, Zap, Plus, Loader2, Trash2, X, Clock, AlertCircle } from 'lucide-react'

type Entry = {
  id: string
  utility_type: 'pln' | 'pdam'
  amount: number
  paid_at: string
  token_code: string | null
  kwh: number | null
  meter_reading: number | null
  period_label: string | null
  note: string | null
  created_by_role: 'owner' | 'occupant' | null
  created_by_name: string | null
  can_delete: boolean
}

type Payload = {
  entries: Entry[]
  latest: { pln: Entry | null; pdam: Entry | null }
  permissions: { canAddPln: boolean; canAddPdam: boolean; isManager: boolean; isOccupant: boolean }
  waterMode: string | null
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso)
  )

const todayInput = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function RoomUtilities({ roomId }: { roomId: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formType, setFormType] = useState<'pln' | 'pdam' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ amount: '', paidAt: todayInput(), tokenCode: '', kwh: '', meterReading: '', periodLabel: '', note: '' })

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/utilities`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memuat utilitas.')
      setData(json)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat utilitas.')
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/utilities`, { cache: 'no-store' })
        const json = await res.json()
        if (!ignore) {
          if (!res.ok) throw new Error(json.error || 'Gagal memuat utilitas.')
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (!ignore) {
          setError(e instanceof Error ? e.message : 'Gagal memuat utilitas.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    fetchData()
    return () => {
      ignore = true
    }
  }, [roomId])

  function openForm(type: 'pln' | 'pdam') {
    setForm({ amount: '', paidAt: todayInput(), tokenCode: '', kwh: '', meterReading: '', periodLabel: '', note: '' })
    setFormType(type)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!formType) return
    setSaving(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utilityType: formType, ...form, paidAt: new Date(form.paidAt).toISOString() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan.')
      toast.success(formType === 'pln' ? 'Pengisian token PLN tercatat.' : 'Pembayaran PDAM tercatat.')
      setFormType(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus catatan ini?')) return
    const res = await fetch(`/api/rooms/${roomId}/utilities?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) return toast.error(json.error || 'Gagal menghapus.')
    toast.success('Catatan dihapus.')
    await load()
  }

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat riwayat utilitas...
        </div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-800 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error ?? 'Riwayat utilitas tidak tersedia.'}</span>
        </div>
      </section>
    )
  }

  const { permissions, latest, entries } = data
  const showPdam = data.waterMode !== 'none'

  const renderCard = (type: 'pln' | 'pdam') => {
    const isPln = type === 'pln'
    const last = latest[type]
    const canAdd = isPln ? permissions.canAddPln : permissions.canAddPdam
    const list = entries.filter((e) => e.utility_type === type)
    const Icon = isPln ? Zap : Droplets

    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Icon className="size-4" />
            </div>
            <h3 className="text-base font-semibold">{isPln ? 'Listrik (PLN)' : 'Air (PDAM)'}</h3>
          </div>
          {canAdd && (
            <button
              type="button"
              onClick={() => openForm(type)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus className="size-3.5" /> {isPln ? 'Catat Token' : 'Catat Pembayaran'}
            </button>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" /> {isPln ? 'Pengisian token terakhir' : 'Pembayaran terakhir'}
          </p>
          {last ? (
            <div className="mt-2 space-y-0.5">
              <p className="text-lg font-bold">{rupiah(last.amount)}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(last.paid_at)}</p>
              {isPln && last.token_code && <p className="font-mono text-xs">Token: {last.token_code}</p>}
              {isPln && last.kwh != null && <p className="text-xs">{last.kwh} kWh</p>}
              {!isPln && last.meter_reading != null && <p className="text-xs">Meteran: {last.meter_reading} m³</p>}
              <p className="text-[11px] text-muted-foreground">
                Dicatat oleh {last.created_by_name ?? '-'} ({last.created_by_role === 'owner' ? 'Pemilik' : 'Penghuni'})
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada catatan.</p>
          )}
        </div>

        {!canAdd && !isPln && (
          <p className="mt-3 text-[11px] text-muted-foreground">Pembayaran PDAM hanya dicatat oleh pemilik properti.</p>
        )}

        {list.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {list.slice(0, 10).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {rupiah(e.amount)}
                    {e.period_label && <span className="ml-2 font-normal text-muted-foreground">· {e.period_label}</span>}
                  </p>
                  <p className="text-muted-foreground">{fmtDate(e.paid_at)}</p>
                  {e.token_code && <p className="font-mono text-muted-foreground">{e.token_code}</p>}
                  {e.note && <p className="mt-0.5 text-muted-foreground">“{e.note}”</p>}
                </div>
                {e.can_delete && (
                  <button
                    type="button"
                    onClick={() => remove(e.id)}
                    aria-label="Hapus catatan"
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const input =
    'mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <>
      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold">Riwayat Utilitas</h2>
        <div className={`grid gap-6 ${showPdam ? 'md:grid-cols-2' : ''}`}>
          {renderCard('pln')}
          {showPdam && renderCard('pdam')}
        </div>
      </section>

      {formType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form onSubmit={submit} className="relative w-full max-w-md space-y-3 rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <button type="button" onClick={() => setFormType(null)} className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>
            <h3 className="text-base font-bold">{formType === 'pln' ? 'Catat Pengisian Token PLN' : 'Catat Pembayaran PDAM'}</h3>

            <label className="block text-xs font-semibold">
              Nominal (Rp)
              <input required type="number" min={0} inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={input} />
            </label>
            <label className="block text-xs font-semibold">
              Tanggal & waktu
              <input required type="datetime-local" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} className={input} />
            </label>

            {formType === 'pln' ? (
              <>
                <label className="block text-xs font-semibold">
                  Nomor token (opsional)
                  <input value={form.tokenCode} onChange={(e) => setForm({ ...form, tokenCode: e.target.value })} className={`${input} font-mono`} />
                </label>
                <label className="block text-xs font-semibold">
                  Jumlah kWh (opsional)
                  <input type="number" step="any" min={0} value={form.kwh} onChange={(e) => setForm({ ...form, kwh: e.target.value })} className={input} />
                </label>
              </>
            ) : (
              <>
                <label className="block text-xs font-semibold">
                  Angka meteran (m³, opsional)
                  <input type="number" step="any" min={0} value={form.meterReading} onChange={(e) => setForm({ ...form, meterReading: e.target.value })} className={input} />
                </label>
                <label className="block text-xs font-semibold">
                  Periode tagihan (opsional)
                  <input type="month" value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} className={input} />
                </label>
              </>
            )}

            <label className="block text-xs font-semibold">
              Catatan (opsional)
              <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={input} />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setFormType(null)} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
                Batal
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                {saving && <Loader2 className="size-3.5 animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
