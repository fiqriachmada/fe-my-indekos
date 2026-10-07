'use client'

import { useEffect, useState } from 'react'
import { Camera, Trash2, User, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ImageCropModal } from '@/components/image-crop-modal'

export default function AvatarSettingsPage() {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)

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

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, atau WEBP)')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Ukuran file terlalu besar', {
        description: 'Maksimal ukuran file foto adalah 5MB.',
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setRawImageSrc(reader.result as string)
      setCropModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  // Helper untuk mengekstrak relative storage path dari public URL avatars
  const extractStoragePath = (url: string | null): string | null => {
    if (!url) return null
    try {
      const parts = url.split('/avatars/')
      if (parts.length > 1) {
        return decodeURIComponent(parts[1].split('?')[0])
      }
    } catch {}
    return null
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!userId) return
    setCropModalOpen(false)
    setIsUploading(true)

    const previousUrl = avatarUrl

    try {
      const supabase = createClient()
      const newPath = `${userId}/${Date.now()}-avatar.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(newPath, croppedBlob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(newPath)
      const publicUrl = data.publicUrl

      const { error: dbError } = await supabase.from('profiles').upsert({
        id: userId,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })

      if (dbError) throw dbError

      // Bersihkan avatar lama agar tidak menjadi orphan file di storage
      const oldStoragePath = extractStoragePath(previousUrl)
      if (oldStoragePath && oldStoragePath !== newPath) {
        void supabase.storage.from('avatars').remove([oldStoragePath])
      }

      setAvatarUrl(publicUrl)
      toast.success('Foto profil berhasil disesuaikan dan diunggah!')
      router.refresh()
    } catch (err: unknown) {
      toast.error('Gagal mengunggah foto', {
        description: err instanceof Error ? err.message : 'Pastikan ukuran file tidak melebihi batas.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!userId) return
    try {
      const supabase = createClient()
      const oldStoragePath = extractStoragePath(avatarUrl)

      await supabase.from('profiles').upsert({
        id: userId,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })

      // Hapus file dari Supabase Storage
      if (oldStoragePath) {
        await supabase.storage.from('avatars').remove([oldStoragePath])
      }

      setAvatarUrl(null)
      toast.success('Foto profil berhasil dihapus')
      router.refresh()
    } catch (err: unknown) {
      toast.error('Gagal menghapus foto', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      })
    }
  }

  // Native Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleSelectFile(file)
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
          Tarik dan lepaskan (drag and drop) foto Anda, lalu sesuaikan ukuran & posisinya.
        </p>
      </div>

      <div className="max-w-xl space-y-4">
        {/* Drag and Drop Zone Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col sm:flex-row items-center gap-6 rounded-3xl border-2 border-dashed p-6 transition-all ${
            isDraggingOver
              ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/20'
              : 'border-border bg-card shadow-xs'
          }`}
        >
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

          <div className="flex flex-col gap-2.5 text-center sm:text-left flex-1 min-w-0">
            <div>
              <p className="text-sm font-semibold flex items-center justify-center sm:justify-start gap-1.5">
                <UploadCloud size={16} className="text-indigo-600 dark:text-indigo-400" />
                Tarik foto ke sini atau pilih berkas
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Maksimal ukuran file: <span className="font-semibold text-foreground/80">5 MB</span> (JPG, PNG, atau WEBP). Dilengkapi fitur zoom & resize.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                <Camera size={14} />
                <span>{avatarUrl ? 'Ganti Foto' : 'Pilih Foto'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleSelectFile(file)
                  }}
                />
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
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

      {/* Modal Crop & Resize */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={rawImageSrc}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        accentColor="bg-indigo-600 hover:bg-indigo-700"
      />
    </div>
  )
}
