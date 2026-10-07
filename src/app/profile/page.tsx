'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ProfileResponse = {
  profile: {
    id: string
    first_name: string | null
    last_name: string | null
    display_name: string | null
    username: string | null
    avatar_url: string | null
    phone: string | null
    account_status: string
    roles?: string[]
  }
  email: string
  roles?: string[]
}

async function fetchProfile(): Promise<ProfileResponse> {
  const res = await fetch('/api/profile', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Gagal memuat profil.')
  }
  return await res.json()
}

async function updateProfileApi(payload: {
  first_name: string
  last_name: string
  display_name: string
}) {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Gagal memperbarui profil.')
  }
  return await res.json()
}

export default function ProfilePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    if (data?.profile) {
      setFirstName(data.profile.first_name ?? '')
      setLastName(data.profile.last_name ?? '')
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profil berhasil diperbarui')
      router.refresh()
    },
    onError: (err: unknown) => {
      toast.error('Gagal memperbarui profil', {
        description: err instanceof Error ? err.message : 'Periksa kembali data Anda.',
      })
    },
  })

  const generatedDisplayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
  const previewDisplayName = generatedDisplayName || data?.profile?.display_name || '-'
  const email = data?.email ?? '-'
  const roles = data?.roles ?? data?.profile?.roles ?? ['User']

  function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      display_name: generatedDisplayName,
    })
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-foreground transition-colors">
        <div className="mx-auto max-w-2xl py-20 text-center text-sm text-muted-foreground">
          Memuat data profil...
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-foreground transition-colors">
        <div className="mx-auto max-w-2xl py-20 text-center text-sm text-red-500">
          Gagal memuat profil: {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground transition-colors">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
        <h1 className="mt-2 text-4xl font-bold">Profile</h1>
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
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
              <label className="block text-sm font-medium text-muted-foreground">
                Display name
              </label>
              <p className="mt-1 font-medium">{previewDisplayName}</p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
