'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UsernameSettingsPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [usernameLastChanged, setUsernameLastChanged] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/settings/username')
        return
      }

      const [uRes, pRes] = await Promise.all([
        supabase
          .from('usernames')
          .select('username, last_changed_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      setUsername(uRes.data?.username || pRes.data?.username || '')
      setUsernameLastChanged(uRes.data?.last_changed_at ?? null)
      setLoading(false)
    }

    void loadData()
  }, [router])

  const [usernameChangeAllowed, setUsernameChangeAllowed] = useState(true)
  const [usernameLockedUntil, setUsernameLockedUntil] = useState<Date | null>(null)

  useEffect(() => {
    if (usernameLastChanged) {
      const lockedDate = new Date(new Date(usernameLastChanged).getTime() + 24 * 60 * 60 * 1000)
      setUsernameLockedUntil(lockedDate)
      setUsernameChangeAllowed(lockedDate.getTime() <= Date.now())
    } else {
      setUsernameLockedUntil(null)
      setUsernameChangeAllowed(true)
    }
  }, [usernameLastChanged])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!usernameChangeAllowed) {
      toast.error('Perubahan belum diizinkan', {
        description: `Bisa diganti lagi pada ${usernameLockedUntil?.toLocaleString('id-ID')}`,
      })
      return
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '')
    if (!cleanUsername) {
      toast.error('Username tidak boleh kosong')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('change_username', {
        new_username: cleanUsername,
      })

      if (error) throw error

      setUsername(data.username)
      setUsernameLastChanged(data.last_changed_at)
      toast.success('Username berhasil diperbarui')
      router.refresh()
    } catch (err: unknown) {
      toast.error('Username belum diperbarui', {
        description:
          err instanceof Error
            ? err.message
            : 'Username hanya bisa diganti sekali setiap 24 jam.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Memuat informasi username...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Username Unik</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ubah username (@handle) akun Anda. Username bersifat unik di seluruh ekosistem.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 max-w-xl">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Username Akun
          </label>
          <div className="relative mt-1.5 flex items-center">
            <span className="absolute left-4 text-sm font-semibold text-muted-foreground/60">
              @
            </span>
            <input
              type="text"
              value={username}
              disabled={!usernameChangeAllowed || saving}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
              }
              placeholder="username_anda"
              className="w-full rounded-2xl border border-input bg-background py-3 pl-9 pr-4 text-sm font-medium outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:cursor-not-allowed disabled:bg-muted"
            />
          </div>

          <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            <Clock size={15} className="shrink-0 text-indigo-600 mt-0.5" />
            <span>
              {usernameChangeAllowed
                ? 'Username hanya dapat diubah sekali setiap 24 jam.'
                : `Username terkunci. Anda baru dapat mengubahnya kembali pada ${usernameLockedUntil?.toLocaleString(
                    'id-ID',
                    { dateStyle: 'medium', timeStyle: 'short' }
                  )}.`}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!usernameChangeAllowed || saving}
            className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Memproses...' : 'Simpan Username'}
          </button>
        </div>
      </form>
    </div>
  )
}
