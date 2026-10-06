'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const tabs = [
  { href: '/settings/password', label: 'Password' },
  { href: '/settings/theme', label: 'Tema' },
]

export function SettingsNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav aria-label="Settings" className="flex shrink-0 flex-col rounded-2xl border border-border bg-card p-2 text-card-foreground shadow-sm md:min-h-80 md:w-56">
      <ul className="flex flex-1 flex-col gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${active ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={handleLogout} className="mt-4 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10">
        Log out
      </button>
    </nav>
  )
}
