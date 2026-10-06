'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type Invitation = {
  id: string
  title: string
  description: string | null
  property_id: string | null
  status: string | null
  created_at: string
  property?: { name: string } | null
}

export function InvitationActions({ invitation }: { invitation: Invitation }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleResponse(action: 'approved' | 'rejected') {
    setLoading(true)
    setError(null)
    try {
      // Coba panggil RPC respond_to_invitation terlebih dahulu
      const { error: rpcError } = await supabase.rpc('respond_to_invitation', {
        p_notification_id: invitation.id,
        p_action: action,
      })

      if (rpcError) {
        // Fallback update langsung jika RPC belum tersedia
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            status: action,
            read: true,
            responded_at: new Date().toISOString(),
          })
          .eq('id', invitation.id)

        if (updateError) throw updateError
      }

      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menanggapi undangan.'
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
        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'Memproses...' : 'Setujui / Terima'}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => handleResponse('rejected')}
        className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
      >
        Tolak
      </button>
    </div>
  )
}
