'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/settings/profile')
        return
      }

      setUserId(user.id)
      setEmail(user.email ?? '')

      const metadata = user.user_metadata ?? {}

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, display_name')
        .eq('id', user.id)
        .maybeSingle()

      setFirstName(profile?.first_name || metadata.first_name || '')
      setLastName(profile?.last_name || metadata.last_name || '')
      setLoading(false)
    }

    void loadData()
  }, [router])

  const displayName = `${firstName} ${lastName}`.trim()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    const supabase = createClient()

    try {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })

      if (profileErr) throw profileErr

      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName,
        },
      })

      toast.success('Profil berhasil diperbarui')
      router.refresh()
    } catch (err: unknown) {
      toast.error('Gagal memperbarui profil', {
        description: err instanceof Error ? err.message : 'Periksa kembali data Anda.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Memuat informasi profil...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Informasi Profil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Perbarui nama depan, nama belakang, dan nama tampilan akun Anda.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 max-w-xl">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email Akun
          </label>
          <input
            type="text"
            disabled
            value={email}
            className="mt-1.5 w-full rounded-2xl border border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nama Depan
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Contoh: Budi"
              className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nama Belakang
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Contoh: Santoso"
              className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nama Tampilan (Display Name)
          </label>
          <input
            type="text"
            readOnly
            value={displayName || 'Otomatis digenerate'}
            className="mt-1.5 w-full rounded-2xl border border-input bg-muted/40 px-4 py-3 text-sm text-foreground/80 cursor-default"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Nama tampilan terisi otomatis dari gabungan nama depan dan belakang.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}
