'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type Invitation = {
  id: string
  title: string
  description: string | null
  property_id: string | null
  room_id?: string | null
  status: string | null
  type?: string | null
  created_at: string
  property?: { name: string } | null
}

export function InvitationActions({ invitation }: { invitation: Invitation }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const isAssignment = invitation.type === 'room_assignment'
  const isApplication = invitation.type === 'room_application'

  const approveText = isAssignment
    ? 'Terima Kamar'
    : isApplication
    ? 'Setujui Sewa'
    : 'Setujui / Terima'

  const rejectText = isAssignment
    ? 'Tolak Penempatan'
    : isApplication
    ? 'Tolak Pengajuan'
    : 'Tolak'

  async function handleResponse(action: 'approved' | 'rejected') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: invitation.id,
          action,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menanggapi pemberitahuan.')
      }

      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menanggapi pemberitahuan.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        type="button"
        disabled={loading}
        onClick={() => handleResponse('approved')}
        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
      >
        {loading ? 'Memproses...' : approveText}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => handleResponse('rejected')}
        className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted active:scale-95 disabled:opacity-50"
      >
        {rejectText}
      </button>
    </div>
  )
}
