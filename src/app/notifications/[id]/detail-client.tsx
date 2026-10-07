'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeftIcon,
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export type DetailNotification = {
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

type SimpleNotif = {
  id: string
  title: string
  created_at: string
}

export function NotificationDetailClient({
  notification: initialNotif,
  prevNotif,
  nextNotif,
  currentIndex,
  totalCount,
}: {
  notification: DetailNotification | null
  prevNotif: SimpleNotif | null
  nextNotif: SimpleNotif | null
  currentIndex: number
  totalCount: number
}) {
  const [notification, setNotification] = useState<DetailNotification | null>(initialNotif)
  const [loadingAction, setLoadingAction] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  if (!notification) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <BellIcon className="size-10 text-muted-foreground mb-3" />
        <h2 className="text-lg font-bold">Notifikasi tidak ditemukan</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Notifikasi mungkin telah dihapus atau tautan tidak valid.
        </p>
        <Link
          href="/notifications"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
        >
          <ArrowLeftIcon className="size-3.5" />
          Kembali ke Notifikasi
        </Link>
      </div>
    )
  }

  async function handleResponse(action: 'approved' | 'rejected') {
    if (!notification) return
    setLoadingAction(true)
    try {
      const res = await fetch('/api/rooms/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: notification.id,
          action,
        }),
      })
      if (res.ok) {
        setNotification({
          ...notification,
          status: action,
          read: true,
        })
        router.refresh()
      }
    } finally {
      setLoadingAction(false)
    }
  }

  async function markAsRead() {
    if (!notification) return
    await supabase.from('notifications').update({ read: true }).eq('id', notification.id)
    setNotification({ ...notification, read: true })
  }

  async function deleteNotification() {
    if (!notification) return
    await supabase.from('notifications').delete().eq('id', notification.id)
    if (nextNotif) {
      router.push(`/notifications/${nextNotif.id}`)
    } else if (prevNotif) {
      router.push(`/notifications/${prevNotif.id}`)
    } else {
      router.push('/notifications')
    }
  }

  const isPending = notification.status === 'pending'
  const isAssignment = notification.type === 'room_assignment'
  const isApplication = notification.type === 'room_application'
  const isPropertyInvitation = notification.type === 'property_invitation'

  const formattedDate = new Date(notification.created_at).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-6">
      {/* Top Bar with Pager */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <Link
          href="/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          Semua Notifikasi
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {currentIndex} dari {totalCount}
          </span>
          <div className="flex items-center gap-1">
            {prevNotif ? (
              <Link
                href={`/notifications/${prevNotif.id}`}
                title={`Sebelumnya: ${prevNotif.title}`}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                <ChevronLeftIcon className="size-4" />
              </Link>
            ) : (
              <span className="inline-flex size-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground/30 cursor-not-allowed">
                <ChevronLeftIcon className="size-4" />
              </span>
            )}

            {nextNotif ? (
              <Link
                href={`/notifications/${nextNotif.id}`}
                title={`Berikutnya: ${nextNotif.title}`}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                <ChevronRightIcon className="size-4" />
              </Link>
            ) : (
              <span className="inline-flex size-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground/30 cursor-not-allowed">
                <ChevronRightIcon className="size-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Notification Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-xl shadow-xs ${
                !notification.read
                  ? 'bg-indigo-600 text-white'
                  : 'bg-black/5 text-muted-foreground dark:bg-white/10'
              }`}
            >
              <BellIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">
                  {notification.title}
                </h1>
                {!notification.read && (
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Baru
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClockIcon className="size-3.5" />
                <span>{formattedDate}</span>
                {notification.property?.name && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-foreground/80">
                      Properti: {notification.property.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!notification.read && (
              <button
                type="button"
                onClick={markAsRead}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <CheckCircleIcon className="size-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Tandai dibaca</span>
              </button>
            )}
            <button
              type="button"
              onClick={deleteNotification}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30 transition"
              title="Hapus notifikasi"
            >
              <TrashIcon className="size-3.5" />
              <span className="hidden sm:inline">Hapus</span>
            </button>
          </div>
        </div>

        {/* Description body */}
        <div className="rounded-xl border border-border/50 bg-black/[0.02] p-4 dark:bg-white/[0.02]">
          <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
            {notification.description || 'Tidak ada keterangan rincian untuk notifikasi ini.'}
          </p>
        </div>

        {/* Status indicator */}
        {notification.status && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Status:</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                notification.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                  : notification.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
              }`}
            >
              {notification.status === 'approved'
                ? 'Disetujui / Diterima'
                : notification.status === 'rejected'
                ? 'Ditolak'
                : 'Menunggu Tanggapan'}
            </span>
          </div>
        )}

        {/* Action buttons if pending */}
        {isPending && (isAssignment || isApplication || isPropertyInvitation) && (
          <div className="border-t border-border/60 pt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => handleResponse('approved')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
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
              disabled={loadingAction}
              onClick={() => handleResponse('rejected')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-rose-600 shadow-xs hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 disabled:opacity-50 transition"
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

      {/* Prev / Next Footer cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {prevNotif ? (
          <Link
            href={`/notifications/${prevNotif.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <ChevronLeftIcon className="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Sebelumnya
              </span>
              <p className="text-xs font-semibold truncate text-foreground">
                {prevNotif.title}
              </p>
            </div>
          </Link>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground/50 sm:flex sm:items-center sm:justify-center">
            Paling baru (tidak ada sebelumnya)
          </div>
        )}

        {nextNotif ? (
          <Link
            href={`/notifications/${nextNotif.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:bg-black/5 dark:hover:bg-white/5 transition text-right"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Berikutnya
              </span>
              <p className="text-xs font-semibold truncate text-foreground">
                {nextNotif.title}
              </p>
            </div>
            <ChevronRightIcon className="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          </Link>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground/50 sm:flex sm:items-center sm:justify-center">
            Paling lama (tidak ada berikutnya)
          </div>
        )}
      </div>
    </div>
  )
}
