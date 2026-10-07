import Link from 'next/link'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-background px-4 py-10 text-foreground transition-colors sm:px-6"><div className="mx-auto max-w-4xl"><p className="text-sm font-semibold uppercase tracking-wider text-indigo-500">My Indekos</p><h1 className="mt-2 text-3xl font-bold">Settings</h1><nav aria-label="Settings" className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4"><Link href="/settings/phone" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">Nomor telepon</Link><Link href="/settings/password" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">Password</Link><Link href="/settings/theme" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">Tema</Link></nav><section className="mt-8">{children}</section></div></main>
}
