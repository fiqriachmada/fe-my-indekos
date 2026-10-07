'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Camera,
  Check,
  ChevronDown,
  KeyRound,
  LogOut,
  Palette,
  Phone,
  Search,
  User,
  AtSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SettingsNav() {
  const pathname = usePathname()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  const tabs = [
    { href: '/settings/profile', label: 'Profil Saya', desc: 'Nama depan & belakang', Icon: User },
    { href: '/settings/avatar', label: 'Foto Profil', desc: 'Unggah & ganti foto akun', Icon: Camera },
    { href: '/settings/username', label: 'Username', desc: 'Ubah @username unik', Icon: AtSign },
    { href: '/settings/phone', label: 'Nomor Telepon', desc: 'Kontak aktif & WhatsApp', Icon: Phone },
    { href: '/settings/password', label: 'Password', desc: 'Ubah kata sandi akun', Icon: KeyRound },
    { href: '/settings/theme', label: 'Tema Tampilan', desc: 'Mode gelap, terang, sistem', Icon: Palette },
  ]

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabs
    const q = searchQuery.toLowerCase()
    return tabs.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q)
    )
  }, [tabs, searchQuery])

  const activeTab = tabs.find((t) => t.href === pathname)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setComboboxOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Searchable Dropdown / Combobox Selector */}
      <div ref={comboboxRef} className="relative w-full md:hidden mb-6">
        <label className="sr-only">Cari Pengaturan</label>
        <button
          type="button"
          onClick={() => setComboboxOpen(!comboboxOpen)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-xs transition hover:bg-muted"
        >
          <div className="flex items-center gap-2.5 truncate">
            {activeTab ? (
              <>
                <activeTab.Icon size={16} className="text-indigo-600" />
                <span className="truncate">{activeTab.label}</span>
              </>
            ) : (
              <>
                <Search size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Cari menu pengaturan...</span>
              </>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform ${comboboxOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {comboboxOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-border bg-popover p-2 shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-2 pb-2">
              <Search size={14} className="text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik untuk mencari..."
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="mt-1 max-h-56 overflow-y-auto">
              {filteredTabs.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  Menu tidak ditemukan.
                </p>
              ) : (
                filteredTabs.map(({ href, label, desc, Icon }) => {
                  const isSelected = pathname === href
                  return (
                    <button
                      key={href}
                      type="button"
                      onClick={() => {
                        setComboboxOpen(false)
                        setSearchQuery('')
                        router.push(href)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={14} />
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-[10px] text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-indigo-600" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Nav (Desktop) */}
      <nav
        aria-label="Settings"
        className="hidden md:flex shrink-0 flex-col rounded-3xl border border-border bg-card p-3 shadow-xs md:min-h-96 md:w-60"
      >
        {/* Combobox Search di atas sidebar desktop */}
        <div ref={comboboxRef} className="relative mb-3">
          <button
            type="button"
            onClick={() => setComboboxOpen(!comboboxOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-muted"
          >
            <div className="flex items-center gap-2 truncate text-muted-foreground">
              <Search size={13} />
              <span className="truncate">Cari opsi...</span>
            </div>
            <ChevronDown size={13} />
          </button>

          {comboboxOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-border bg-popover p-1.5 shadow-xl">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama opsi..."
                className="w-full rounded-lg bg-muted px-2 py-1.5 text-xs outline-none"
              />
              <div className="mt-1 max-h-48 overflow-y-auto">
                {filteredTabs.map(({ href, label, Icon }) => (
                  <button
                    key={href}
                    type="button"
                    onClick={() => {
                      setComboboxOpen(false)
                      setSearchQuery('')
                      router.push(href)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted text-foreground"
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pengaturan Akun
        </p>

        <ul className="flex flex-1 flex-col gap-1 mt-1">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <LogOut size={16} />
          <span>Keluar Akun</span>
        </button>
      </nav>
    </>
  )
}
