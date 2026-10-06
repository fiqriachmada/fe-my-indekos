import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsNav } from './settings-nav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-background px-4 py-12 pb-28 text-foreground transition-colors">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
        <h1 className="mt-2 text-3xl font-bold">Settings</h1>
        <div className="mt-8 flex flex-col gap-6 md:flex-row">
          <SettingsNav />
          <section className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm transition-colors">{children}</section>
        </div>
      </div>
    </main>
  )
}
