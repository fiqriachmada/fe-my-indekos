'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type ProfileData = {
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
}

async function fetchProfile(): Promise<ProfileData> {
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

function ProfileSettingsForm({ profile, email }: { profile: ProfileData['profile']; email: string }) {
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState(profile.first_name ?? '')
  const [lastName, setLastName] = useState(profile.last_name ?? '')

  const mutation = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profil berhasil diperbarui')
    },
    onError: (err: unknown) => {
      toast.error('Gagal memperbarui profil', {
        description: err instanceof Error ? err.message : 'Periksa kembali data Anda.',
      })
    },
  })

  const displayName = `${firstName} ${lastName}`.trim()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      display_name: displayName,
    })
  }

  return (
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
          disabled={mutation.isPending}
          className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  )
}

export default function ProfileSettingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Memuat informasi profil...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center text-sm text-red-500">
        Gagal memuat data: {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
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

      <ProfileSettingsForm
        key={data.profile.id}
        profile={data.profile}
        email={data.email}
      />
    </div>
  )
}
