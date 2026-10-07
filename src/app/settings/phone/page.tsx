'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

type Phone = { id: string; phone_number: string; label: string | null; is_primary: boolean }
const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

async function loadPhones() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi login tidak ditemukan.')
  const { data, error } = await supabase.from('user_phone_numbers').select('id, phone_number, label, is_primary').eq('user_id', user.id).order('is_primary', { ascending: false }).order('created_at', { ascending: true })
  if (error) throw error
  return data as Phone[]
}

export default function PhoneSettingsPage() {
  const { data: phones, error, isLoading, mutate } = useSWR('user-phone-numbers', loadPhones)
  const [phone, setPhone] = useState('')
  const [label, setLabel] = useState('')
  const [editing, setEditing] = useState<Phone | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function savePhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null)
    const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMessage('Sesi login tidak ditemukan.'); setBusy(false); return }
    const values = { phone_number: phone.trim(), label: label.trim() || null, is_primary: !phones?.length || editing?.is_primary === true, user_id: user.id }
    const result = editing ? await supabase.from('user_phone_numbers').update(values).eq('id', editing.id) : await supabase.from('user_phone_numbers').insert(values)
    setBusy(false)
    if (result.error) { setMessage(result.error.code === '23505' ? 'Nomor tersebut sudah tersimpan.' : 'Nomor belum dapat disimpan.'); return }
    setPhone(''); setLabel(''); setEditing(null); setMessage(editing ? 'Nomor berhasil diperbarui.' : 'Nomor berhasil ditambahkan.'); await mutate()
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
    <form onSubmit={savePhone} className="space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div><label htmlFor="phone" className="mb-1 block text-sm font-medium">Nomor telepon</label><input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+62 812..." /></div>
      <div><label htmlFor="label" className="mb-1 block text-sm font-medium">Label <span className="font-normal text-muted-foreground">(opsional)</span></label><input id="label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="Pribadi, kantor, WhatsApp" /></div>
      <div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Tambah nomor'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setPhone(''); setLabel('') }} className="rounded-lg border border-border px-4 py-2.5">Batal</button>}</div>
    </form>
    {message && <p role="status" className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-950/20 p-3 text-sm text-red-500">Nomor telepon belum dapat dimuat.</p>}
    <div className="space-y-3">{isLoading ? <p className="text-sm text-muted-foreground">Memuat nomor...</p> : phones?.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"><div><p className="font-semibold">{item.phone_number} {item.is_primary && <span className="ml-2 rounded-full bg-indigo-500/15 px-2 py-1 text-xs text-indigo-500">Utama</span>}</p>{item.label && <p className="text-sm text-muted-foreground">{item.label}</p>}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => { setEditing(item); setPhone(item.phone_number); setLabel(item.label ?? '') }} className="text-sm text-indigo-500">Edit</button>{!item.is_primary && <button type="button" onClick={() => makePrimary(item)} className="text-sm text-muted-foreground">Jadikan utama</button>}<button type="button" onClick={() => deletePhone(item.id)} className="text-sm text-red-500">Hapus</button></div></div>)}</div>
  </div>
}
