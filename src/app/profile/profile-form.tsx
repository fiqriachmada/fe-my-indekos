'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProfileFormProps {
  userId: string
  email: string
  initialFirstName: string
  initialLastName: string
  initialDisplayName: string
  initialUsername: string
  initialUsernameLastChanged: string | null
  roles: string[]
}

export default function ProfileForm({
  userId,
  email,
  initialFirstName,
  initialLastName,
  initialDisplayName,
  initialUsername,
  initialUsernameLastChanged,
  roles,
}: ProfileFormProps) {
  const router = useRouter()

  // Profile names state
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileStatus, setProfileStatus] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Username state (strip leading @ so the field contains only the username)
  const initialCleanUsername = (initialUsername || '').replace(/^@/, '')
  const [username, setUsername] = useState(initialCleanUsername)
  const [usernameLastChanged, setUsernameLastChanged] = useState<string | null>(
    initialUsernameLastChanged
  )
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const generatedDisplayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
  const previewDisplayName = generatedDisplayName || initialDisplayName || '-'

  // 24-hour lock calculation
  const usernameLockedUntil = usernameLastChanged
    ? new Date(new Date(usernameLastChanged).getTime() + 24 * 60 * 60 * 1000)
    : null
  const usernameChangeAllowed =
    !usernameLockedUntil || usernameLockedUntil.getTime() <= Date.now()
  const usernameHint = usernameChangeAllowed
    ? 'Username bersifat unik dan hanya bisa diganti sekali setiap 24 jam.'
    : `Username terkunci. Bisa diganti lagi pada ${usernameLockedUntil?.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}.`

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileLoading(true)
    setProfileStatus(null)
    setProfileError(null)

    const finalFirstName = firstName.trim()
    const finalLastName = lastName.trim()
    const finalDisplayName = generatedDisplayName

    const supabase = createClient()

    // 1. Update Auth metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        first_name: finalFirstName,
        last_name: finalLastName,
        display_name: finalDisplayName,
      },
    })

    if (authError) {
      setProfileLoading(false)
      setProfileError('Gagal memperbarui profil di auth: ' + authError.message)
      return
    }

    // 2. Simpan ke tabel profiles
    const { error: profileDbError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        first_name: finalFirstName,
        last_name: finalLastName,
        display_name: finalDisplayName,
      },
      { onConflict: 'id' }
    )

    setProfileLoading(false)

    if (profileDbError) {
      console.error('Error saving to profiles table:', profileDbError)
      setProfileError(
        `Auth diperbarui, namun gagal menyimpan ke tabel profiles: ${profileDbError.message}`
      )
      return
    }

    setProfileStatus('Profil berhasil diperbarui dan tersimpan di database.')
    router.refresh()
  }

  async function handleUsernameChange() {
    setUsernameStatus(null)
    setUsernameError(null)

    const cleaned = username.trim().replace(/^@/, '')
    if (!cleaned) {
      setUsernameError('Silakan masukkan username terlebih dahulu.')
      return
    }

    if (cleaned.toLowerCase() === initialCleanUsername.toLowerCase()) {
      setUsernameError('Username ini sudah menjadi username Anda saat ini.')
      return
    }

    if (cleaned.length < 3) {
      setUsernameError('Username minimal 3 karakter.')
      return
    }

    const normalized = `@${cleaned.toLowerCase()}`

    setUsernameLoading(true)
    const supabase = createClient()

    // Panggil RPC change_username bawaan Supabase
    const { data, error } = await supabase.rpc('change_username', {
      new_username: normalized,
    })

    setUsernameLoading(false)

    if (error) {
      const msg = error.message.toLowerCase()
      if (
        msg.includes('24') ||
        msg.includes('hour') ||
        msg.includes('jam') ||
        msg.includes('rate')
      ) {
        setUsernameError('Username hanya bisa diganti sekali setiap 24 jam.')
      } else if (
        msg.includes('already') ||
        msg.includes('taken') ||
        msg.includes('unique') ||
        msg.includes('digunakan') ||
        msg.includes('exist')
      ) {
        setUsernameError('Username sudah diambil orang lain. Silakan coba username yang lain.')
      } else {
        setUsernameError(error.message)
      }
      return
    }

    const res = data as { username: string; last_changed_at: string } | null
    if (res?.username) {
      setUsername(res.username.replace(/^@/, ''))
    }
    if (res?.last_changed_at) {
      setUsernameLastChanged(res.last_changed_at)
    } else {
      setUsernameLastChanged(new Date().toISOString())
    }

    setUsernameStatus('Username berhasil diubah!')
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Profil Form */}
      <form onSubmit={handleProfileSave} className="space-y-6">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <p className="mt-1 font-medium">{email}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Role</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nama depan"
              className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nama belakang"
              className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            readOnly
            disabled
            value={previewDisplayName}
            className="mt-2 w-full cursor-not-allowed rounded-xl border border-input bg-muted/50 px-3 py-2.5 text-foreground opacity-90 transition-colors"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Otomatis dibuat dari first name dan last name saat diisi.
          </p>
        </div>

        <button
          type="submit"
          disabled={profileLoading}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {profileLoading ? 'Menyimpan...' : 'Simpan profil'}
        </button>

        {profileError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
          >
            {profileError}
          </div>
        )}

        {profileStatus && (
          <div
            role="status"
            className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            {profileStatus}
          </div>
        )}
      </form>

      {/* Ubah Username Section */}
      <div className="border-t border-border pt-6">
        <label htmlFor="username" className="block text-sm font-medium">
          Username
        </label>
        <div className="mt-2 flex gap-2">
          <div className="flex flex-1 overflow-hidden rounded-xl border border-input bg-background transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
            <span className="flex select-none items-center border-r border-input bg-muted/60 px-3.5 text-sm font-semibold text-muted-foreground">
              @
            </span>
            <input
              id="username"
              type="text"
              value={username}
              disabled={!usernameChangeAllowed || usernameLoading}
              onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
              placeholder="username"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-foreground outline-none disabled:cursor-not-allowed disabled:bg-muted/30 disabled:text-muted-foreground"
            />
          </div>
          <button
            type="button"
            disabled={!usernameChangeAllowed || usernameLoading || !username.trim()}
            onClick={handleUsernameChange}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {usernameLoading ? 'Menyimpan...' : 'Ubah username'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{usernameHint}</p>

        {usernameError && (
          <div
            role="alert"
            className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
          >
            {usernameError}
          </div>
        )}

        {usernameStatus && (
          <div
            role="status"
            className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            {usernameStatus}
          </div>
        )}
      </div>
    </div>
  )
}
