'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

type Phone = { id: string; phone_number: string; label: string | null; is_primary: boolean; verified_at: string | null }
const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

async function loadPhones() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi login tidak ditemukan.')
  const { data, error } = await supabase.from('user_phone_numbers').select('id, phone_number, label, is_primary, verified_at').eq('user_id', user.id).order('is_primary', { ascending: false }).order('created_at', { ascending: true })
  if (error) throw error
  return data as Phone[]
}

export default function PhoneSettingsPage() {
  const queryClient = useQueryClient()
  const { data: phones, error, isLoading } = useQuery({
    queryKey: ['user-phone-numbers'],
    queryFn: loadPhones,
  })

  async function mutate() {
    await queryClient.invalidateQueries({ queryKey: ['user-phone-numbers'] })
  }

  const [phone, setPhone] = useState('')
  const [label, setLabel] = useState('')
  const [editing, setEditing] = useState<Phone | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [otp, setOtp] = useState('')
  const [pendingVerification, setPendingVerification] = useState<{ phone: string; label: string; isPrimary: boolean } | null>(null)

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null)
    const supabase = createClient()
    const normalizedPhone = phone.trim()
    const { error: updateError } = await supabase.auth.updateUser({ phone: normalizedPhone })
    setBusy(false)
    if (updateError) { setMessage('Kode OTP belum dapat dikirim. Pastikan nomor menggunakan format internasional, misalnya +62812...'); return }
    setPendingVerification({ phone: normalizedPhone, label: label.trim(), isPrimary: !phones?.length || editing?.is_primary === true })
    setMessage(`Kode OTP sudah dikirim ke ${normalizedPhone}.`)
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !pendingVerification) { setMessage('Sesi verifikasi tidak ditemukan.'); setBusy(false); return }
    const { error: verifyError } = await supabase.auth.verifyOtp({ phone: pendingVerification.phone, token: otp.trim(), type: 'phone_change' })
    if (verifyError) { setMessage('Kode OTP salah atau sudah kedaluwarsa.'); setBusy(false); return }
    const values = { phone_number: pendingVerification.phone, label: pendingVerification.label || null, is_primary: pendingVerification.isPrimary, user_id: user.id, verified_at: new Date().toISOString() }
    const result = editing ? await supabase.from('user_phone_numbers').update(values).eq('id', editing.id).eq('user_id', user.id) : await supabase.from('user_phone_numbers').insert(values)
    setBusy(false)
    if (result.error) { setMessage(result.error.code === '23505' ? 'Nomor tersebut sudah tersimpan.' : 'Nomor belum dapat disimpan.'); return }
    setPhone(''); setLabel(''); setOtp(''); setEditing(null); setPendingVerification(null); setMessage(editing ? 'Nomor berhasil diperbarui.' : 'Nomor berhasil ditambahkan dan diverifikasi.'); await mutate()
  }

  async function deletePhone(id: string) {
    if (!window.confirm('Hapus nomor telepon ini?')) return
    const { error: deleteError } = await createClient().from('user_phone_numbers').delete().eq('id', id)
    if (deleteError) { setMessage('Nomor belum dapat dihapus.'); return }
    setMessage('Nomor berhasil dihapus.'); await mutate()
  }

  async function makePrimary(item: Phone) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMessage('Sesi login tidak ditemukan.'); return }
    const clearResult = await supabase.from('user_phone_numbers').update({ is_primary: false }).eq('user_id', user.id)
    if (clearResult.error) { setMessage('Nomor utama belum dapat diubah.'); return }
    const { error: updateError } = await supabase.from('user_phone_numbers').update({ is_primary: true }).eq('id', item.id).eq('user_id', user.id)
    if (updateError) { setMessage('Nomor utama belum dapat diubah.'); return }
    setMessage('Nomor utama berhasil diubah.'); await mutate()
  }

  return <div className="max-w-2xl space-y-6">
    <div><h2 className="text-xl font-semibold">Nomor telepon</h2><p className="mt-1 text-sm text-muted-foreground">Tambahkan lebih dari satu nomor untuk akun Anda.</p></div>
    <form onSubmit={pendingVerification ? verifyOtp : sendOtp} className="space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
      {!pendingVerification ? <>
        <div><label htmlFor="phone" className="mb-1 block text-sm font-medium">Nomor telepon</label><input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+62 812..." /></div>
        <div><label htmlFor="label" className="mb-1 block text-sm font-medium">Label <span className="font-normal text-muted-foreground">(opsional)</span></label><input id="label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="Pribadi, kantor, WhatsApp" /></div>
      </> : <div><label htmlFor="otp" className="mb-1 block text-sm font-medium">Kode OTP</label><input id="otp" required inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} className={inputClass} placeholder="Masukkan kode dari SMS" /></div>}
      <div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? 'Memproses...' : pendingVerification ? 'Verifikasi & simpan' : 'Kirim kode OTP'}</button>{(editing || pendingVerification) && <button type="button" onClick={() => { setEditing(null); setPendingVerification(null); setPhone(''); setLabel(''); setOtp('') }} className="rounded-lg border border-border px-4 py-2.5">Batal</button>}</div>
    </form>
    {message && <p role="status" className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-950/20 p-3 text-sm text-red-500">Nomor telepon belum dapat dimuat.</p>}
    <div className="space-y-3">{isLoading ? <p className="text-sm text-muted-foreground">Memuat nomor...</p> : phones?.map((item: Phone) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"><div><p className="font-semibold">{item.phone_number} {item.is_primary && <span className="ml-2 rounded-full bg-indigo-500/15 px-2 py-1 text-xs text-indigo-500">Utama</span>}</p>{item.label && <p className="text-sm text-muted-foreground">{item.label}</p>}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => { setEditing(item); setPhone(item.phone_number); setLabel(item.label ?? '') }} className="text-sm text-indigo-500">Edit</button>{!item.is_primary && <button type="button" onClick={() => makePrimary(item)} className="text-sm text-muted-foreground">Jadikan utama</button>}<button type="button" onClick={() => deletePhone(item.id)} className="text-sm text-red-500">Hapus</button></div></div>)}</div>
  </div>
}
