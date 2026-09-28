'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AuthError = { code?: string; message?: string; status?: number }

function getRateLimitMessage(authError: AuthError) {
  const isRateLimited = authError.status === 429 || authError.code?.includes('rate_limit') || authError.code?.includes('over_')
  if (!isRateLimited) return null

  const secondsMatch = authError.message?.match(/(?:after|in)\s+(\d+)\s+seconds?/i)
  if (!secondsMatch) return 'Permintaan reset password sudah melebihi batas. Silakan coba lagi nanti.'

  const seconds = Number(secondsMatch[1])
  const wait = seconds >= 60 ? `${Math.ceil(seconds / 60)} menit` : `${seconds} detik`
  return `Permintaan reset password sudah melebihi batas. Silakan coba lagi dalam ${wait}.`
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/create-password')}`
    const redirectTo = window.location.hostname.endsWith('vercel.app')
      ? callbackUrl
      : `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? callbackUrl}?next=${encodeURIComponent('/create-password')}`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    setLoading(false)

    if (resetError) {
      setError(getRateLimitMessage(resetError) ?? 'Tautan reset password belum dapat dikirim. Silakan coba lagi nanti.')
      return
    }

    setSent(true)
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <a href="/login" className="text-sm font-medium text-indigo-600">← Kembali ke login</a>
        <h1 className="mt-8 text-3xl font-bold">Lupa password?</h1>
        <p className="mt-2 text-sm text-slate-600">Masukkan email Anda. Kami akan mengirimkan tautan untuk membuat password baru.</p>
        {error && <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
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
