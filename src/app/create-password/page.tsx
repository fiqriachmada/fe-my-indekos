'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CreatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login')
      setChecking(false)
    })
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < 6) return setError('Password minimal 6 karakter.')
    if (password !== confirmPassword) return setError('Password tidak cocok.')

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) return setError('Password belum dapat disimpan. Silakan coba lagi.')
    router.replace('/dashboard')
    router.refresh()
  }

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-background text-slate-600">Memeriksa sesi...</main>

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-lg transition-colors">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
        <h1 className="text-3xl font-bold">Buat password</h1>
        <p className="mt-2 text-sm text-slate-600">Atur password Anda untuk melanjutkan ke dashboard.</p>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password baru</label><input id="password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" /></div>
          <div><label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">Konfirmasi password</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" /></div>
          {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Menyimpan...' : 'Simpan password'}</button>
        </form>
      </div>
    </main>
  )
}
