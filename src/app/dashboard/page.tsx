import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
        <h1 className="mt-2 text-4xl font-bold">Dashboard</h1>
        <p className="mt-3 text-slate-600">Selamat datang kembali, {user.email}.</p>
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Akun Anda aktif</h2>
          <p className="mt-2 text-sm text-slate-600">Anda berhasil masuk ke protected route.</p>
        </div>
      </div>
    </main>
  )
}
