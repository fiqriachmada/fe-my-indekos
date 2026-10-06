import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationsClient, type PageNotification } from './notifications-client'

export const metadata = {
  title: 'Notifikasi — My Indekos',
  description: 'Pusat notifikasi dan pengajuan sewa Anda.',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, description, read, status, type, created_at, property_id, room_id, property:properties(name)')
    .eq('to_user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<PageNotification[]>()

  return (
    <main className="min-h-screen bg-slate-50/70 pb-28 pt-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <NotificationsClient initialNotifications={notifications ?? []} userId={user.id} />
      </div>
    </main>
  )
}
