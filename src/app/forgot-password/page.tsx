'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`}?next=/create-password`,
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <a href="/login" className="text-sm font-medium text-indigo-600">← Kembali ke login</a>
        <h1 className="mt-8 text-3xl font-bold">Lupa password?</h1>
        <p className="mt-2 text-sm text-slate-600">Masukkan email Anda. Kami akan mengirimkan tautan untuk membuat password baru.</p>
        {sent ? (
          <div role="status" className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">Jika email terdaftar, tautan reset password telah dikirim. Periksa inbox Anda.</div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" placeholder="nama@email.com" />
            </div>
            <button disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Mengirim...' : 'Kirim tautan reset'}</button>
          </form>
        )}
      </div>
    </main>
  )
}
