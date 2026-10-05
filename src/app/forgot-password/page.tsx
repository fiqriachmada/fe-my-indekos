'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthError = { code?: string; message?: string; status?: number }

const APP_URL = 'https://my-indekos.vercel.app'

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
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Countdown timer untuk kirim ulang OTP
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Step 1: Kirim link / OTP ke email
  async function handleSendEmail(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/callback?next=/create-password`,
    })
    setLoading(false)

    if (resetError) {
      setError(getRateLimitMessage(resetError) ?? 'Gagal mengirim kode reset. Silakan coba lagi nanti.')
      return
    }

    setStep('otp')
    setCountdown(60) // Cooldown 60 detik sebelum boleh kirim ulang
  }

  // Step 2: Verifikasi Kode OTP 6 Digit
  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const cleanOtp = otp.trim()
    if (cleanOtp.length < 6) {
      setError('Masukkan 6 digit kode OTP yang dikirim ke email.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: cleanOtp,
      type: 'recovery',
    })

    setLoading(false)

    if (verifyError) {
      setError('Kode OTP salah atau telah kedaluwarsa. Silakan periksa kembali atau kirim ulang kode.')
      return
    }

    // Berhasil verifikasi: sesi aktif, langsung arahkan ke form buat password baru
    router.replace('/create-password')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <a href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          ← Kembali ke login
        </a>

        {step === 'email' ? (
          <>
            <h1 className="mt-8 text-3xl font-bold">Lupa password?</h1>
            <p className="mt-2 text-sm text-slate-600">
              Masukkan email Anda. Kami akan mengirimkan kode OTP 6 digit untuk membuat password baru.
            </p>

            {error && (
              <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSendEmail}>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="nama@email.com"
                />
              </div>

              <button
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-8 text-3xl font-bold">Verifikasi OTP</h1>
            <p className="mt-2 text-sm text-slate-600">
              Masukkan 6 digit kode OTP yang kami kirimkan ke <strong className="text-slate-800">{email}</strong>.
            </p>

            {error && (
              <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleVerifyOtp}>
              <div>
                <label htmlFor="otp" className="mb-1 block text-sm font-medium">
                  Kode OTP (6 Digit)
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-3xl font-mono tracking-widest outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="······"
                />
              </div>

              <button
                disabled={loading || otp.length < 6}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? 'Memverifikasi...' : 'Verifikasi & Lanjut'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError(null)
                  setOtp('')
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                Ganti email
              </button>

              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={() => handleSendEmail()}
                className="font-medium text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
              >
                {countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim ulang OTP'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
