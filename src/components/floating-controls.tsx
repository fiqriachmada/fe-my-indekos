"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Bars3Icon, ChevronDownIcon, ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline"

type Theme = "light" | "dark" | "system"

export default function FloatingControls() {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>("system")
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState(false)

  useEffect(() => {
    const saved = (window.localStorage.getItem("my-indekos-theme") as Theme | null) ?? "system"
    setTheme(saved)
    applyTheme(saved)
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => saved === "system" && applyTheme("system")
    media.addEventListener("change", onChange)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(Boolean(data.user)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(Boolean(session?.user)))
    return () => { media.removeEventListener("change", onChange); listener.subscription.unsubscribe() }
  }, [])

  function applyTheme(value: Theme) {
    const dark = value === "dark" || (value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", dark)
    document.documentElement.style.colorScheme = dark ? "dark" : "light"
  }

  function chooseTheme(value: Theme) {
    setTheme(value)
    window.localStorage.setItem("my-indekos-theme", value)
    applyTheme(value)
  }

  const options = [
    ["light", "Light", SunIcon],
    ["dark", "Dark", MoonIcon],
    ["system", "System", ComputerDesktopIcon],
  ] as const
  const ActiveIcon = options.find(([value]) => value === theme)?.[2] ?? ComputerDesktopIcon
  const links = user ? [{ href: "/dashboard", label: "Dashboard" }, { href: "/profile", label: "Profile" }] : [{ href: "/login", label: "Login" }, { href: "/register", label: "Register" }]

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className="relative flex items-center gap-1 rounded-full border border-white/50 bg-white/60 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/70">
        <div className="relative">
          <button type="button" aria-label="Pilih tema" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:scale-105 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10">
            <ActiveIcon className="h-5 w-5" aria-hidden="true" /><span className="hidden sm:inline">{options.find(([value]) => value === theme)?.[1]}</span><ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {open && <div className="absolute bottom-12 left-0 min-w-32 rounded-2xl border border-white/60 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95">{options.map(([value, label, Icon]) => <button key={value} type="button" onClick={() => chooseTheme(value)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${theme === value ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}</div>}
        </div>
        <span className="h-5 w-px bg-slate-300/70 dark:bg-white/20" aria-hidden="true" />
        <button type="button" aria-label="Buka navigasi" onClick={() => setOpen((value) => !value)} className="rounded-full p-2 text-slate-700 transition hover:rotate-90 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10"><Bars3Icon className="h-5 w-5" aria-hidden="true" /></button>
        {open && <div className="absolute bottom-12 right-0 min-w-36 rounded-2xl border border-white/60 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95">{links.filter((link) => link.href !== pathname).map((link) => <button key={link.href} type="button" onClick={() => { setOpen(false); router.push(link.href) }} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:translate-x-1 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">{link.label}</button>)}</div>}
      </div>
    </div>
  )
}
