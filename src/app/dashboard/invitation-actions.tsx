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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // 1. Coba panggil RPC respond_to_room_application
      const { error: rpcError } = await supabase.rpc('respond_to_room_application', {
        p_notification_id: invitation.id,
        p_action: action,
      })

      if (rpcError) {
        console.warn('RPC respond_to_room_application error, running fallback:', rpcError)
        // 2. Fallback jika RPC error: update tabel notifications langsung
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

      // 3. Jaminan sinkronisasi room_members & rooms pada level client
      if (user && invitation.room_id) {
        if (action === 'approved') {
          // Cari role occupant jika ada
          const { data: roleData } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'occupant')
            .maybeSingle()

          await supabase.from('room_members').upsert(
            {
              room_id: invitation.room_id,
              user_id: user.id,
              role_id: roleData?.id ?? null,
            },
            { onConflict: 'room_id,user_id' }
          )
        } else if (action === 'rejected') {
          await supabase
            .from('rooms')
            .update({ occupant_member_id: null })
            .eq('id', invitation.room_id)

          await supabase
            .from('room_members')
            .delete()
            .eq('room_id', invitation.room_id)
            .eq('user_id', user.id)
        }
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
