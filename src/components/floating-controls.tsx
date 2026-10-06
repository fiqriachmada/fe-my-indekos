"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Bars3Icon, ChevronDownIcon, ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline"

type Theme = "light" | "dark" | "system"
type Menu = "theme" | "navigation" | null

export default function FloatingControls() {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system"
    return (window.localStorage.getItem("my-indekos-theme") as Theme | null) ?? "system"
  })
  const [menu, setMenu] = useState<Menu>(null)
  const [user, setUser] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches)
      document.documentElement.classList.toggle("dark", dark)
      document.documentElement.style.colorScheme = dark ? "dark" : "light"
    }
    apply()
    media.addEventListener("change", apply)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(Boolean(data.user)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(Boolean(session?.user)))
    return () => {
      media.removeEventListener("change", apply)
      listener.subscription.unsubscribe()
    }
  }, [theme])

  function chooseTheme(value: Theme) {
    setTheme(value)
    window.localStorage.setItem("my-indekos-theme", value)
    setMenu(null)
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    setMenu(null)
    router.push("/login")
    router.refresh()
  }

  const options = [["light", "Light", SunIcon], ["dark", "Dark", MoonIcon], ["system", "System", ComputerDesktopIcon]] as const
  const ActiveIcon = options.find(([value]) => value === theme)?.[2] ?? ComputerDesktopIcon
  const links = user ? [{ href: "/dashboard", label: "Dashboard" }, { href: "/profile", label: "Profile" }] : [{ href: "/login", label: "Login" }, { href: "/register", label: "Register" }]
  const visibleLinks = links.filter((link) => link.href !== pathname)

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className="relative flex items-center gap-1 rounded-full border border-white/50 bg-white/70 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/80">
        <div className="relative">
          <button type="button" aria-label="Pilih tema" aria-expanded={menu === "theme"} onClick={() => setMenu(menu === "theme" ? null : "theme")} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:scale-105 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10">
            <ActiveIcon className="h-5 w-5" aria-hidden="true" /><span>{options.find(([value]) => value === theme)?.[1]}</span><ChevronDownIcon className={`h-4 w-4 transition-transform ${menu === "theme" ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {menu === "theme" && <div className="absolute bottom-12 left-0 min-w-32 rounded-2xl border border-white/60 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95">{options.map(([value, label, Icon]) => <button key={value} type="button" onClick={() => chooseTheme(value)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${theme === value ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}</div>}
        </div>
        <span className="h-5 w-px bg-slate-300/70 dark:bg-white/20" aria-hidden="true" />
        <div className="relative">
          <button type="button" aria-label="Buka navigasi" aria-expanded={menu === "navigation"} onClick={() => setMenu(menu === "navigation" ? null : "navigation")} className={`rounded-full p-2 text-slate-700 transition duration-300 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10 ${menu === "navigation" ? "rotate-90" : ""}`}><Bars3Icon className="h-5 w-5" aria-hidden="true" /></button>
          {menu === "navigation" && <div className="absolute bottom-12 right-0 min-w-36 rounded-2xl border border-white/60 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95">{visibleLinks.length ? visibleLinks.map((link) => <button key={link.href} type="button" onClick={() => { setMenu(null); router.push(link.href) }} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:translate-x-1 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">{link.label}</button>) : <span className="block px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Tidak ada menu lain</span>}{user && <><span className="my-1 block h-px bg-slate-200 dark:bg-white/10" /><button type="button" onClick={handleLogout} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10">Log out</button></>}</div>}
        </div>
      </div>
    </div>
  )
}
