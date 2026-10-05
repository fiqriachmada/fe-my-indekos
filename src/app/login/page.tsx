'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthError = { code?: string; message?: string; status?: number }

function getRateLimitMessage(authError: AuthError) {
  const isRateLimited = authError.status === 429 || authError.code?.includes('rate_limit') || authError.code?.includes('over_')
  if (!isRateLimited) return null
  const secondsMatch = authError.message?.match(/(?:after|in)\s+(\d+)\s+seconds?/i)
  if (!secondsMatch) return 'Permintaan sudah melebihi batas. Silakan coba lagi nanti.'
  const seconds = Number(secondsMatch[1])
  const wait = seconds >= 60 ? `${Math.ceil(seconds / 60)} menit` : `${seconds} detik`
  return `Permintaan sudah melebihi batas. Silakan coba lagi dalam ${wait}.`
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)

    if (signInError) {
      if (signInError.code === 'email_not_confirmed') {
        setError('Akun belum diaktivasi. Silakan aktivasi melalui email Anda.')
      } else {
        setError('Email atau password salah.')
      }
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  async function resendActivation() {
    setResending(true)
    setError(null)
    setMessage(null)
    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    setResending(false)
    if (resendError) {
      setError(getRateLimitMessage(resendError) ?? 'Email aktivasi belum dapat dikirim. Coba lagi nanti.')
      return
    }
    setMessage('Email aktivasi telah dikirim ulang. Klik link aktivasi di email tersebut.')
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
          <h1 className="text-3xl font-bold">Login Occupant</h1>
          <p className="mt-2 text-sm text-slate-600">Masuk menggunakan email dan password Anda.</p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" placeholder="nama@email.com" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <a href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Lupa password?</a>
            </div>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" placeholder="Masukkan password" />
          </div>

          {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {message && <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

          {error?.includes('belum diaktivasi') && (
            <button type="button" onClick={resendActivation} disabled={resending} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
              {resending ? 'Mengirim...' : 'Kirim ulang email aktivasi'}
            </button>
          )}

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Memproses...' : 'Masuk'}</button>
        </form>
      </div>
    </main>
  )
}
