'use client'

import { useEffect, useState } from 'react'
import { Camera, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AvatarSettingsPage() {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/settings/avatar')
        return
      }

      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      setAvatarUrl(profile?.avatar_url ?? null)
      setLoading(false)
    }

    void loadData()
  }, [router])

  const handleAvatarUpload = async (file: File) => {
    if (!userId) return
    setIsUploading(true)
    try {
      const supabase = createClient()
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) throw error

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = data.publicUrl

      await supabase.from('profiles').upsert({
        id: userId,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })

      setAvatarUrl(publicUrl)
      toast.success('Foto profil berhasil diunggah')
      router.refresh()
    } catch (err: unknown) {
      toast.error('Gagal mengunggah foto', {
        description: err instanceof Error ? err.message : 'Pastikan ukuran foto tidak melebihi batas.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!userId) return
    try {
      const supabase = createClient()
      await supabase.from('profiles').upsert({
        id: userId,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      setAvatarUrl(null)
      toast.success('Foto profil berhasil dihapus')
      router.refresh()
    } catch (err: unknown) {
      toast.error('Gagal menghapus foto', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      })
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Memuat foto profil...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Foto Profil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur dan perbarui foto identitas akun Anda di seluruh sistem.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl border border-border bg-card p-6 shadow-xs max-w-xl">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-indigo-400/40 bg-muted">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <User className="h-12 w-12 text-muted-foreground/40" />
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white">
              Mengunggah...
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 text-center sm:text-left">
          <div>
            <p className="text-sm font-semibold">Ubah Foto Profil</p>
            <p className="text-xs text-muted-foreground">
              Format JPG, PNG, atau WEBP. Rekomendasi rasio 1:1.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              <Camera size={14} />
              <span>{avatarUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleAvatarUpload(file)
                }}
              />
            </label>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 size={14} />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
