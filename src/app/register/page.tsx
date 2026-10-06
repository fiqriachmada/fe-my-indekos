'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/password-input'

type AuthError = { code?: string; message?: string; status?: number }

function getRateLimitMessage(authError: AuthError) {
  const isRateLimited = authError.status === 429 || authError.code?.includes('rate_limit') || authError.code?.includes('over_')
  if (!isRateLimited) return null
  const secondsMatch = authError.message?.match(/(?:after|in)\s+(\d+)\s+seconds?/i)
  if (!secondsMatch) return 'Permintaan sudah melebihi batas. Silakan coba lagi nanti.'
  const seconds = Number(secondsMatch[1])
  return `Permintaan sudah melebihi batas. Silakan coba lagi dalam ${seconds >= 60 ? `${Math.ceil(seconds / 60)} menit` : `${seconds} detik`}.`
}

export default function RegisterPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (password !== confirmPassword) return setError('Konfirmasi password tidak cocok.')
    if (password.length < 8) return setError('Password minimal 8 karakter.')
    setLoading(true)
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: { first_name: firstName.trim(), last_name: lastName.trim(), display_name: displayName },
      },
    })
    if (signUpError?.code === 'user_already_exists') {
      // Email exists: resend the activation email. If the account is already active, resend
      // returns an error and we point the user to login instead.
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })
      setLoading(false)
      if (resendError) {
        setError(getRateLimitMessage(resendError) ?? 'Email sudah terdaftar dan aktif. Silakan masuk.')
        return
      }
      setMessage('Email sudah terdaftar tetapi belum diaktivasi. Kami telah mengirim ulang email aktivasi, silakan cek inbox Anda.')
      return
    }
    setLoading(false)
    if (signUpError) {
      setError(getRateLimitMessage(signUpError) ?? 'Pendaftaran belum berhasil. Silakan periksa data Anda.')
      return
    }
    if (data.session) {
      router.replace('/dashboard')
      router.refresh()
      return
    }
    // Already-active accounts come back with no identities (Supabase hides existence).
    if (data.user && data.user.identities?.length === 0) {
      setError('Email sudah terdaftar dan aktif. Silakan masuk.')
      return
    }
    // For an existing unconfirmed account Supabase resends the activation email on signUp.
    setMessage('Silakan cek email untuk mengaktivasi akun sebelum login. Jika email ini pernah mendaftar dan belum aktif, email aktivasi telah dikirim ulang.')
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground transition-colors">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-lg transition-colors">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
        <h1 className="text-3xl font-bold">Buat akun</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Daftar untuk mengelola kebutuhan indekos Anda.</p>
        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="firstName" className="mb-1 block text-sm font-medium">Nama depan</label><input id="firstName" required value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-indigo-500" /></div>
            <div><label htmlFor="lastName" className="mb-1 block text-sm font-medium">Nama belakang</label><input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-indigo-500" /></div>
          </div>
          <div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-indigo-500" placeholder="nama@email.com" /></div>
          <div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label><PasswordInput id="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-indigo-500" placeholder="Minimal 8 karakter" /></div>
          <div><label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">Konfirmasi password</label><PasswordInput id="confirmPassword" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-indigo-500" /></div>
          {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
          {message && <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Mendaftarkan...' : 'Daftar'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">Sudah punya akun? <a href="/login" className="font-semibold text-indigo-600">Masuk</a></p>
      </div>
    </main>
  )
}
