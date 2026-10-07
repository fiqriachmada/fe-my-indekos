'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeftIcon,
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export type PageNotification = {
  id: string
  title: string
  description: string | null
  read: boolean
  status: string | null
  type?: string | null
  created_at: string
  property_id?: string | null
  room_id?: string | null
  property?: { name: string } | null
}

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 60) return 'Baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} menit yang lalu`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} hari yang lalu`
}

export function NotificationsClient({
  initialNotifications,
  userId,
}: {
  initialNotifications: PageNotification[]
  userId: string
}) {
  const [notifications, setNotifications] = useState<PageNotification[]>(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread' | 'action_needed'>('all')
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`realtime_notifications_page_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `to_user_id=eq.${userId}`,
        },
        async () => {
          const { data } = await supabase
            .from('notifications')
            .select('id, title, description, read, status, type, created_at, property_id, room_id, property:properties(name)')
            .eq('to_user_id', userId)
            .order('created_at', { ascending: false })
            .returns<PageNotification[]>()

          if (data) {
            setNotifications(data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const unreadCount = notifications.filter((n) => !n.read).length
  const actionNeededCount = notifications.filter((n) => n.status === 'pending').length

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    if (filter === 'action_needed') return n.status === 'pending'
    return true
  })

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function markSingleAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  async function handleResponse(n: PageNotification, action: 'approved' | 'rejected') {
    setLoadingActionId(n.id)
    try {
      const res = await fetch('/api/rooms/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: n.id,
          action,
        }),
      })

      if (!res.ok) {
        // Fallback update
        const { error: rpcError } = await supabase.rpc('respond_to_room_application', {
          p_notification_id: n.id,
          p_action: action,
        })
        if (rpcError) {
          await supabase
            .from('notifications')
            .update({
              status: action,
              read: true,
              responded_at: new Date().toISOString(),
            })
            .eq('id', n.id)
        }
      }

      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, status: action, read: true } : item))
      )
      router.refresh()
    } finally {
      setLoadingActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Kembali ke Dashboard
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pusat Notifikasi</h1>
            {unreadCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <span className="size-1.5 rounded-full bg-indigo-600 animate-pulse" />
                {unreadCount} baru
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Semua aktivitas, undangan sewa kamar, dan konfirmasi pengajuan Anda secara realtime.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground shadow-sm transition hover:bg-black/5 dark:hover:bg-white/10 sm:self-auto"
          >
            <CheckIcon className="size-4 text-emerald-600" />
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            filter === 'unread'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('action_needed')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            filter === 'action_needed'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          Perlu Tindakan ({actionNeededCount})
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
              <BellIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-semibold text-foreground">Tidak ada notifikasi</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter === 'unread'
                ? 'Semua notifikasi sudah Anda baca.'
                : filter === 'action_needed'
                ? 'Tidak ada pengajuan atau undangan yang perlu ditanggapi.'
                : 'Belum ada notifikasi yang masuk ke akun Anda.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isPending = n.status === 'pending'
            const isAssignment = n.type === 'room_assignment'
            const isApplication = n.type === 'room_application'
            const isPropertyInvitation = n.type === 'property_invitation'

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markSingleAsRead(n.id)
                }}
                className={`relative rounded-2xl border p-4 transition ${
                  !n.read
                    ? 'border-indigo-200 bg-indigo-50/40 shadow-xs dark:border-indigo-900/60 dark:bg-indigo-950/20'
                    : 'border-border bg-card/70 hover:bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        isPending
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : n.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : n.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          : 'bg-black/5 text-muted-foreground dark:bg-white/10'
                      }`}
                    >
                      {isPending ? (
                        <SparklesIcon className="size-5" />
                      ) : n.status === 'approved' ? (
                        <CheckCircleIcon className="size-5" />
                      ) : (
                        <BellIcon className="size-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className={`text-sm ${!n.read ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'}`}>
                          {n.title}
                        </h2>
                        {!n.read && (
                          <span className="size-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                        {n.status === 'pending' && (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Menunggu Konfirmasi
                          </span>
                        )}
                        {n.status === 'approved' && (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Disetujui
                          </span>
                        )}
                        {n.status === 'rejected' && (
                          <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Ditolak
                          </span>
                        )}
                      </div>

                      {n.description && (
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {n.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="size-3.5" />
                          {timeAgo(n.created_at)}
                        </span>
                        {n.property?.name && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-foreground/80">
                              Properti: {n.property.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        markSingleAsRead(n.id)
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>

                {/* Quick actions for pending */}
                {isPending && (isAssignment || isApplication || isPropertyInvitation) && (
                  <div className="mt-3.5 flex items-center gap-2 border-t border-border/50 pt-3">
                    <button
                      type="button"
                      disabled={loadingActionId === n.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResponse(n, 'approved')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                    >
                      <CheckIcon className="size-3.5" />
                      {isPropertyInvitation
                        ? 'Terima Undangan Properti'
                        : isAssignment
                        ? 'Terima Kamar'
                        : 'Setujui Sewa'}
                    </button>
                    <button
                      type="button"
                      disabled={loadingActionId === n.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResponse(n, 'rejected')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-xs transition hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 disabled:opacity-50"
                    >
                      <XMarkIcon className="size-3.5" />
                      {isPropertyInvitation
                        ? 'Tolak Undangan'
                        : isAssignment
                        ? 'Tolak Penempatan'
                        : 'Tolak Pengajuan'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
