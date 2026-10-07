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

  const generatedDisplayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
  const previewDisplayName = generatedDisplayName || initialDisplayName || '-'

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
    </div>
  )
}
