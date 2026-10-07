"use client"

import React, { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { Popover, Transition } from "@headlessui/react"
import { createClient } from "@/lib/supabase/client"
import {
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  HomeModernIcon,
  KeyIcon,
  BoltIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline"
import type { IndekosLandingStats } from "@/lib/landing-stats"

const navigation = [
  { name: "Cari Kos", href: "/properties" },
  { name: "Fitur", href: "/fitur" },
  { name: "Tentang", href: "/tentang" },
]

function useAuthPath() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(Boolean(data.user))
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user))
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  return isAuthenticated ? "/dashboard" : "/login"
}

export default function LandingClient({ stats }: { stats: IndekosLandingStats }) {
  const authPath = useAuthPath()

  const features = [
    {
      name: "Pengelolaan Kamar & Ketersediaan",
      description:
        "Pantau kamar terisi, kamar kosong, dan riwayat penghuni secara real-time langsung dalam genggaman.",
      icon: KeyIcon,
    },
    {
      name: "Monitoring Token & Utilitas",
      description:
        "Catat pengisian token listrik PLN dan penggunaan air PDAM per kamar secara transparan dan akurat.",
      icon: BoltIcon,
    },
    {
      name: "Portal Calon Penghuni Terintegrasi",
      description:
        "Pencari kos dapat menjelajahi properti, melihat fasilitas, dan mengajukan sewa secara online tanpa perantara.",
      icon: HomeModernIcon,
    },
    {
      name: "Akses Peran & Keamanan Berlapis",
      description:
        "Bagi tugas operasional kos kepada Owner, Admin Properti, dan Penjaga dengan hak akses yang terisolasi.",
      icon: ShieldCheckIcon,
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors selection:bg-indigo-500 selection:text-white">
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-7xl">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:w-full lg:max-w-2xl lg:pb-28 xl:pb-32">
            {/* Header / Nav */}
            <Popover>
              <div className="relative px-4 pt-6 sm:px-6 lg:px-8">
                <nav className="relative flex items-center justify-between sm:h-10 lg:justify-start" aria-label="Global">
                  <div className="flex flex-shrink-0 flex-grow items-center lg:flex-grow-0">
                    <div className="flex w-full items-center justify-between md:w-auto">
                      <Link href="/" className="flex items-center gap-2">
                        <img src="/indekos-logo.svg" alt="My Indekos" className="h-10 w-auto" />
                      </Link>
                      <div className="-mr-2 flex items-center md:hidden">
                        <Popover.Button className="inline-flex items-center justify-center rounded-md bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                          <span className="sr-only">Buka menu</span>
                          <MenuIcon className="h-6 w-6" aria-hidden="true" />
                        </Popover.Button>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:ml-10 md:block md:space-x-8 md:pr-4">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    ))}
                    <Link
                      href={authPath}
                      className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      {authPath === "/dashboard" ? "Buka Dashboard" : "Masuk"}
                    </Link>
                  </div>
                </nav>
              </div>

              <Transition
                as={Fragment}
                enter="duration-150 ease-out"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="duration-100 ease-in"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Popover.Panel
                  focus
                  className="absolute inset-x-0 top-0 z-10 origin-top-right p-2 transition md:hidden"
                >
                  <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl ring-1 ring-border">
                    <div className="flex items-center justify-between px-5 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                          <HomeModernIcon className="size-4" />
                        </div>
                        <span className="font-bold text-foreground">My Indekos</span>
                      </div>
                      <div className="-mr-2">
                        <Popover.Button className="inline-flex items-center justify-center rounded-md bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                          <span className="sr-only">Tutup menu</span>
                          <XIcon className="h-6 w-6" aria-hidden="true" />
                        </Popover.Button>
                      </div>
                    </div>
                    <div className="space-y-1 px-3 pb-3 pt-4">
                      {navigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="block rounded-lg px-3 py-2 text-base font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={authPath}
                      className="block w-full bg-indigo-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-indigo-700"
                    >
                      {authPath === "/dashboard" ? "Buka Dashboard" : "Masuk ke Akun"}
                    </Link>
                  </div>
                </Popover.Panel>
              </Transition>
            </Popover>

            {/* Headline */}
            <main className="mx-auto mt-10 max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
                  <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />
                  Sistem Manajemen Kos Modern & Transparan
                </div>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Kelola operasional kos</span>{" "}
                  <span className="block text-indigo-600 xl:inline">tanpa rasa ribet</span>
                </h1>
                <p className="mt-4 text-base text-muted-foreground sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Platform lengkap untuk pemilik kos dan penghuni. Pantau sewa kamar, kelola pembayaran utilitas, serta kelola izin dan permohonan kamar dalam satu atap.
                </p>
                <div className="mt-6 sm:mt-8 sm:flex sm:justify-center lg:justify-start gap-3">
                  <Link
                    href="/properties"
                    className="flex w-full sm:w-auto items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-indigo-700"
                  >
                    Jelajahi Kos Tersedia
                  </Link>
                  <Link
                    href={authPath}
                    className="mt-3 sm:mt-0 flex w-full sm:w-auto items-center justify-center rounded-xl border border-border bg-card px-8 py-3.5 text-base font-semibold text-foreground transition hover:bg-muted"
                  >
                    {authPath === "/dashboard" ? "Masuk ke Dashboard" : "Masuk Pemilik / Penghuni"}
                  </Link>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Hero Image */}
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <img
            className="h-64 w-full object-cover sm:h-72 md:h-96 lg:h-full lg:w-full"
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80"
            alt="Interior kamar kos nyaman"
          />
        </div>
      </div>

      {/* 2. STATISTIK REALTIME SESUAI DATABASE (PUBLIC SERVER STATS) */}
      <section className="bg-muted/40 py-12 border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-600">
              Statistik Real-time
            </h2>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Jaringan Properti & Kamar Aktif
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-xs">
              <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600">{stats.totalProperties}</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-foreground">Properti Kos Aktif</p>
              <p className="text-[11px] text-muted-foreground">Lokasi terdaftar</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-xs">
              <p className="text-3xl sm:text-4xl font-extrabold text-foreground">{stats.totalRooms}</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-foreground">Total Kamar</p>
              <p className="text-[11px] text-muted-foreground">Kapasitas kos</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-xs">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600">{stats.availableRooms}</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-foreground">Kamar Siap Huni</p>
              <p className="text-[11px] text-muted-foreground">Siap ditempati</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-xs">
              <p className="text-3xl sm:text-4xl font-extrabold text-indigo-500">{stats.totalMembers}</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-foreground">Penghuni & Member</p>
              <p className="text-[11px] text-muted-foreground">Komunitas aktif</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FITUR UTAMA SESUAI APLIKASI */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Fitur Lengkap
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Dibuat Khusus untuk Ekosistem Rumah Kos
            </p>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-muted-foreground lg:mx-auto">
              Semua kebutuhan operasional terangkum rapi dalam satu platform yang mudah digunakan oleh pemilik maupun penyewa.
            </p>
          </div>

          <div className="mt-12 sm:mt-16">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="rounded-2xl border border-border bg-card p-6 shadow-xs transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">
                    <feature.icon className="size-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-foreground">
                    {feature.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION */}
      <section id="benefits" className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Siap mempermudah pengelolaan kos Anda?
            </h2>
            <p className="mt-2 max-w-xl text-base text-muted-foreground">
              Mulai sekarang tanpa instalasi rumit. Buka portal atau cari kamar idaman Anda secara langsung.
            </p>
          </div>
          <div className="mt-8 flex gap-3 lg:mt-0 lg:flex-shrink-0">
            <Link
              href="/properties"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Cari Kamar Kos
            </Link>
            <Link
              href={authPath}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              {authPath === "/dashboard" ? "Ke Dashboard" : "Masuk Akun"}
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} My Indekos. Hak Cipta Dilindungi.</p>
          <div className="flex gap-4">
            <Link href="/properties" className="hover:text-foreground">Cari Kos</Link>
            <Link href="/login" className="hover:text-foreground">Login</Link>
            <Link href="/register" className="hover:text-foreground">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
