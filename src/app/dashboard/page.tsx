import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground transition-colors">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
        <h1 className="mt-2 text-4xl font-bold">Dashboard</h1>
        <p className="mt-3 text-muted-foreground">Selamat datang kembali, {user.email}.</p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-colors">
          <h2 className="text-xl font-semibold">Akun Anda aktif</h2>
          <p className="mt-2 text-sm text-muted-foreground">Anda berhasil masuk ke protected route.</p>
        </div>
      </div>
    </main>
  )
}
