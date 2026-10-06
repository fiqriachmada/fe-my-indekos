'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/password-input'

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

export default function PasswordSettingsPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (password.length < 8) return setError('Password minimal 8 karakter.')
    if (password !== confirmPassword) return setError('Konfirmasi password tidak cocok.')
    setLoading(true)
    const { error: updateError } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (updateError) return setError('Password belum dapat diubah. Silakan coba lagi.')
    setPassword('')
    setConfirmPassword('')
    setMessage('Password berhasil diubah.')
  }

  return (
    <form className="max-w-md space-y-5" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-xl font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Gunakan password baru yang kuat dan belum pernah dipakai.</p>
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Password baru</label>
        <PasswordInput id="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="Minimal 8 karakter" />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">Konfirmasi password</label>
        <PasswordInput id="confirmPassword" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
      </div>
      {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Menyimpan...' : 'Simpan password'}</button>
    </form>
  )
}
