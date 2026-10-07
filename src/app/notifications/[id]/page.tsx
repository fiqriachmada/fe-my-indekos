import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationDetailClient, type DetailNotification } from './detail-client'

export const metadata = {
  title: 'Detail Notifikasi — My Indekos',
  description: 'Detail aktivitas dan konfirmasi sewa.',
}

export default async function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get current notification
  const { data: currentNotif } = await supabase
    .from('notifications')
    .select('id, title, description, read, status, type, created_at, property_id, room_id, property:properties(name)')
    .eq('id', id)
    .maybeSingle()

  // Get all user notifications to calculate prev and next
  const { data: allNotifs } = await supabase
    .from('notifications')
    .select('id, title, created_at')
    .eq('to_user_id', user.id)
    .order('created_at', { ascending: false })

  const notificationsList = allNotifs ?? []
  const currentIndex = notificationsList.findIndex((n) => n.id === id)

  const prevNotif = currentIndex > 0 ? notificationsList[currentIndex - 1] : null
  const nextNotif =
    currentIndex !== -1 && currentIndex < notificationsList.length - 1
      ? notificationsList[currentIndex + 1]
      : null

  return (
    <main className="min-h-screen bg-slate-50/70 pb-28 pt-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <NotificationDetailClient
          notification={(currentNotif as unknown as DetailNotification) ?? null}
          prevNotif={prevNotif}
          nextNotif={nextNotif}
          currentIndex={currentIndex !== -1 ? currentIndex + 1 : 1}
          totalCount={notificationsList.length}
        />
      </div>
    </main>
  )
}
