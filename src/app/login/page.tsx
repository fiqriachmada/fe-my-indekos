'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type LoginMethod = 'email' | 'phone' | 'email_otp'

type AuthError = { code?: string; message?: string; status?: number }

function getRateLimitMessage(authError: AuthError, channel: 'email' | 'sms') {
  const isRateLimited = authError.status === 429 || authError.code?.includes('rate_limit') || authError.code?.includes('over_')
  if (!isRateLimited) return null

  const secondsMatch = authError.message?.match(/(?:after|in)\s+(\d+)\s+seconds?/i)
  if (!secondsMatch) return `Pengiriman OTP ${channel} sedang melebihi batas. Silakan coba lagi nanti.`

  const seconds = Number(secondsMatch[1])
  const wait = seconds >= 60 ? `${Math.ceil(seconds / 60)} menit` : `${seconds} detik`
  return `Pengiriman OTP ${channel} sedang melebihi batas. Silakan coba lagi dalam ${wait}.`
}

export default function LoginPage() {
  const router = useRouter()
  const [method, setMethod] = useState<LoginMethod>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  function resetFeedback() {
    setError(null)
    setMessage(null)
  }

  function selectMethod(nextMethod: LoginMethod) {
    setMethod(nextMethod)
    setOtpSent(false)
    setOtp('')
    resetFeedback()
  }

  async function handleEmailLogin() {
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

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

  async function handleEmailOtpLogin() {
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    })

    if (otpError) {
      setError(getRateLimitMessage(otpError, 'email') ?? 'Kode OTP email belum dapat dikirim. Pastikan format email benar.')
      return
    }

    setOtpSent(true)
    setMessage('Kode OTP 6 digit telah dikirim ke email Anda.')
  }

  async function verifyEmailOtp() {
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    })

    if (verifyError) {
      setError('Kode OTP salah atau sudah kedaluwarsa. Silakan minta kode baru.')
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  async function handlePhoneLogin() {
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: phone.trim() })

    if (otpError) {
      setError(getRateLimitMessage(otpError, 'sms') ?? 'Kode OTP belum dapat dikirim. Pastikan nomor memakai format internasional, misalnya +628123456789.')
      return
    }

    setOtpSent(true)
    setMessage('Kode OTP telah dikirim ke nomor telepon Anda.')
  }

  async function verifyPhoneOtp() {
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp.trim(),
      type: 'sms',
    })

    if (verifyError) {
      setError('Kode OTP salah atau sudah kedaluwarsa. Silakan minta kode baru.')
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    resetFeedback()

    if (method === 'email') {
      await handleEmailLogin()
    } else if (method === 'email_otp' && otpSent) {
      await verifyEmailOtp()
    } else if (method === 'email_otp') {
      await handleEmailOtpLogin()
    } else if (otpSent) {
      await verifyPhoneOtp()
    } else {
      await handlePhoneLogin()
    }

    setLoading(false)
  }

  async function resendActivation() {
    setResending(true)
    resetFeedback()
    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (resendError) {
      setError(getRateLimitMessage(resendError, 'email') ?? 'Email aktivasi belum dapat dikirim. Coba lagi nanti.')
      return
    }
    setMessage('Email aktivasi telah dikirim ulang.')
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
          <h1 className="text-3xl font-bold">Login Occupant</h1>
          <p className="mt-2 text-sm text-slate-600">Masuk untuk mengelola kebutuhan indekos Anda.</p>
        </div>

        <div className="mb-6 grid grid-cols-3 rounded-lg bg-slate-100 p-1 text-center" role="tablist" aria-label="Metode login">
          <button type="button" role="tab" aria-selected={method === 'email'} onClick={() => selectMethod('email')} className={`rounded-md px-2 py-2 text-xs font-semibold transition ${method === 'email' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Email (Password)
          </button>
          <button type="button" role="tab" aria-selected={method === 'email_otp'} onClick={() => selectMethod('email_otp')} className={`rounded-md px-2 py-2 text-xs font-semibold transition ${method === 'email_otp' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Email (OTP)
          </button>
          <button type="button" role="tab" aria-selected={method === 'phone'} onClick={() => selectMethod('phone')} className={`rounded-md px-2 py-2 text-xs font-semibold transition ${method === 'phone' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            SMS (OTP)
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          {method === 'email' ? (
            <>
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
            </>
          ) : method === 'email_otp' ? (
            <div>
              <label htmlFor="emailOtp" className="mb-1 block text-sm font-medium">Alamat Email</label>
              <input id="emailOtp" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={otpSent} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100" placeholder="nama@email.com" />
              {otpSent && (
                <div className="mt-4">
                  <label htmlFor="otpEmail" className="mb-1 block text-sm font-medium">Kode OTP</label>
                  <input id="otpEmail" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 tracking-[0.35em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" placeholder="123456" />
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">Kami akan mengirimkan 6 digit kode login ke email ini.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">Nomor Telepon</label>
              <input id="phone" type="tel" autoComplete="tel" inputMode="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} disabled={otpSent} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100" placeholder="+628123456789" />
              {otpSent && (
                <div className="mt-4">
                  <label htmlFor="otp" className="mb-1 block text-sm font-medium">Kode OTP</label>
                  <input id="otp" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 tracking-[0.35em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" placeholder="123456" />
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">Gunakan format internasional. Kami akan mengirim kode OTP lewat SMS.</p>
            </div>
          )}

          {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {message && <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

          {method === 'email' && error?.includes('belum diaktivasi') && (
            <button type="button" onClick={resendActivation} disabled={resending} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
              {resending ? 'Mengirim...' : 'Kirim ulang email aktivasi'}
            </button>
          )}

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Memproses...' : (method === 'phone' || method === 'email_otp') && otpSent ? 'Verifikasi OTP' : (method === 'phone' || method === 'email_otp') ? 'Kirim OTP' : 'Masuk'}
          </button>
        </form>
      </div>
    </main>
  )
}
