"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"

type Theme = "light" | "dark" | "system" | "brutalism"
type Menu = "theme" | "navigation" | "notifications" | null

type FloatingNotification = {
  id: string
  title: string
  description: string | null
  read: boolean
  status: string | null
  created_at: string
}

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 60) return "baru saja"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m lalu`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}j lalu`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}h lalu`
}

export default function FloatingControls() {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system"
    return (window.localStorage.getItem("my-indekos-theme") as Theme | null) ?? "system"
  })
  const [menu, setMenu] = useState<Menu>(null)
  const [user, setUser] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<FloatingNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      document.documentElement.classList.remove("dark", "brutalism")
      if (theme === "brutalism") {
        document.documentElement.classList.add("brutalism")
        document.documentElement.style.colorScheme = "light"
      } else {
        const dark = theme === "dark" || (theme === "system" && media.matches)
        document.documentElement.classList.toggle("dark", dark)
        document.documentElement.style.colorScheme = dark ? "dark" : "light"
      }
    }
    apply()
    media.addEventListener("change", apply)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.id ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user?.id ?? null)
    })

    return () => {
      media.removeEventListener("change", apply)
      listener.subscription.unsubscribe()
    }
  }, [theme])

  // Realtime notification subscription
  useEffect(() => {
    let active = true

    if (!user) {
      queueMicrotask(() => {
        if (active) {
          setNotifications([])
          setUnreadCount(0)
        }
      })
      return () => {
        active = false
      }
    }

    const supabase = createClient()

    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, description, read, status, created_at")
        .eq("to_user_id", user)
        .order("created_at", { ascending: false })
        .limit(10)

      if (data) {
        setNotifications(data as FloatingNotification[])
        setUnreadCount(data.filter((n) => !n.read).length)
      }
    }

    loadNotifications()

    // Supabase Realtime channel
    const channel = supabase
      .channel(`floating_notifications_${user}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `to_user_id=eq.${user}`,
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    const onThemeChange = (event: Event) => setTheme((event as CustomEvent<Theme>).detail)
    window.addEventListener("my-indekos-theme-change", onThemeChange)
    return () => window.removeEventListener("my-indekos-theme-change", onThemeChange)
  }, [])

  function chooseTheme(value: Theme) {
    setTheme(value)
    window.localStorage.setItem("my-indekos-theme", value)
    window.dispatchEvent(new CustomEvent("my-indekos-theme-change", { detail: value }))
    setMenu(null)
  }

  async function markAllAsRead() {
    if (!user) return
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    const supabase = createClient()
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markSingleAsRead(id: string) {
    const supabase = createClient()
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    setMenu(null)
    router.push("/notifications")
  }

  async function deleteSingleNotification(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const supabase = createClient()
    await supabase.from("notifications").delete().eq("id", id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    setMenu(null)
    router.push("/login")
    router.refresh()
  }

  const options = [
    ["light", "Light", SunIcon],
    ["dark", "Dark", MoonIcon],
    ["system", "System", ComputerDesktopIcon],
    ["brutalism", "Neo-Brutalism", SunIcon],
  ] as const
  const ActiveIcon = options.find(([value]) => value === theme)?.[2] ?? ComputerDesktopIcon
  const links = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/notifications", label: "Notifikasi" },
        { href: "/properties", label: "Cari Properti" },
        { href: "/settings/profile", label: "Profile" },
        { href: "/settings", label: "Settings" },
      ]
    : [
        { href: "/properties", label: "Cari Properti" },
        { href: "/login", label: "Login" },
        { href: "/register", label: "Register" },
      ]
  const visibleLinks = links.filter((link) => link.href !== pathname)

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className="relative flex items-center gap-1 rounded-full border border-border bg-card/85 text-card-foreground p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/85">
        {/* Menu Theme (Hanya Icon agar ringkas & serasi) */}
        <div className="relative">
          <button
            type="button"
            aria-label="Pilih tema"
            aria-expanded={menu === "theme"}
            onClick={() => setMenu(menu === "theme" ? null : "theme")}
            className="flex items-center justify-center rounded-full p-2 text-slate-700 transition hover:scale-105 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10"
          >
            <ActiveIcon className="h-5 w-5" aria-hidden="true" />
            <ChevronDownIcon
              className={`h-3 w-3 ml-0.5 transition-transform ${menu === "theme" ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {menu === "theme" && (
            <div className="absolute bottom-12 left-0 min-w-36 rounded-2xl border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {options.map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => chooseTheme(value)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                    theme === value
                      ? "bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu Notifikasi Realtime (hanya jika login) */}
        {user && (
          <>
            <span className="h-5 w-px bg-slate-300/70 dark:bg-white/20" aria-hidden="true" />
            <div className="relative">
              <button
                type="button"
                aria-label="Notifikasi Realtime"
                aria-expanded={menu === "notifications"}
                onClick={() => setMenu(menu === "notifications" ? null : "notifications")}
                className="relative flex items-center justify-center rounded-full p-2 text-slate-700 transition hover:scale-105 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10"
              >
                <BellIcon className="h-5 w-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {menu === "notifications" && (
                <div className="fixed inset-x-3 bottom-20 sm:absolute sm:inset-x-auto sm:bottom-12 sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-88 rounded-2xl border border-border bg-popover/95 p-3 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Notifikasi Realtime
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Tandai dibaca
                      </button>
                    )}
                  </div>

                  <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-border/40">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        Belum ada notifikasi baru.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markSingleAsRead(n.id)}
                          className={`group cursor-pointer py-2.5 px-2 rounded-xl text-left transition hover:bg-black/5 dark:hover:bg-white/5 ${
                            !n.read ? "bg-indigo-50/50 dark:bg-indigo-950/30" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p
                              className={`text-xs ${
                                !n.read ? "font-bold text-foreground" : "font-medium text-foreground/80"
                              }`}
                            >
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          {n.description && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                              {n.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-1 text-[11px]">
                            <span className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                              Lihat detail →
                            </span>
                            <button
                              type="button"
                              onClick={(e) => void deleteSingleNotification(e, n.id)}
                              className="text-muted-foreground transition hover:text-red-500 p-0.5"
                              title="Hapus notifikasi"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-border/60 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(null)
                        router.push("/notifications")
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      Buka Halaman Notifikasi Lengkap →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <span className="h-5 w-px bg-slate-300/70 dark:bg-white/20" aria-hidden="true" />
        {/* Menu Navigasi */}
        <div className="relative">
          <button
            type="button"
            aria-label="Buka navigasi"
            aria-expanded={menu === "navigation"}
            onClick={() => setMenu(menu === "navigation" ? null : "navigation")}
            className={`rounded-full p-2 text-slate-700 transition duration-300 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10 ${
              menu === "navigation" ? "rotate-90" : ""
            }`}
          >
            <Bars3Icon className="h-5 w-5" aria-hidden="true" />
          </button>
          {menu === "navigation" && (
            <div className="absolute bottom-12 right-0 min-w-36 rounded-2xl border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95">
              {visibleLinks.length ? (
                visibleLinks.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => {
                      setMenu(null)
                      router.push(link.href)
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:translate-x-1 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    {link.label}
                  </button>
                ))
              ) : (
                <span className="block px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  Tidak ada menu lain
                </span>
              )}
              {user && (
                <>
                  <span className="my-1 block h-px bg-slate-200 dark:bg-white/10" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
                  >
                    Log out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
