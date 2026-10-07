import Link from "next/link"
import {
  BuildingOffice2Icon,
  HeartIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CheckBadgeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline"

export const metadata = {
  title: "Tentang Kami — My Indekos",
  description: "Mengenal visi, misi, dan tim di balik platform manajemen kos terintegrasi My Indekos.",
}

const values = [
  {
    title: "Transparansi Penuh",
    desc: "Baik tarif sewa, pembagian biaya listrik dan air, hingga riwayat penghuni tercatat secara gamblang tanpa biaya tersembunyi.",
    icon: CheckBadgeIcon,
  },
  {
    title: "Kenyamanan Komunitas",
    desc: "Menciptakan ekosistem rumah kos yang aman, tertib, dan harmonis antara pemilik, penjaga, dan sesama anak kos.",
    icon: HeartIcon,
  },
  {
    title: "Keandalan Teknologi",
    desc: "Didukung basis data realtime Supabase untuk sinkronisasi seketika saat ada transaksi atau perubahan status kamar.",
    icon: ShieldCheckIcon,
  },
]

export default function TentangPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/indekos-logo.svg" alt="My Indekos" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/fitur"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Fitur
            </Link>
            <Link
              href="/properties"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Cari Kos
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              Masuk
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
          <BuildingOffice2Icon className="size-3.5" />
          Tentang My Indekos
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Menghubungkan Pemilik Kos dengan <span className="text-indigo-600">Penghuni Bahagia</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
          My Indekos lahir dari kebutuhan nyata di lapangan: proses sewa kos tradisional seringkali memakan waktu, pencatatan pembayaran utilitas rentan selisih, dan komunikasi operasional sering terselip. Kami hadir untuk menyederhanakan semuanya.
        </p>
      </section>

      {/* Visi & Misi */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Visi Kami</span>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Menjadi Ekosistem Hunian Kos Terbaik</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Menjadi platform digital standar utama bagi pemilik kos mandiri maupun jaringan properti kos di Indonesia dalam menyajikan hunian yang teratur, aman, dan nyaman bagi generasi muda.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Misi Kami</span>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Memberdayakan Pengelola & Penyewa</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                Menyediakan automasi pencatatan kamar dan utilitas tanpa beban teknis.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                Mempermudah calon perantau menemukan kamar kos siap huni secara aman.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                Menjamin privasi data dan riwayat keuangan dengan infrastruktur modern.
              </li>
            </ul>
          </div>
        </div>

        {/* Nilai-nilai */}
        <div className="mt-16">
          <h2 className="text-center text-2xl font-bold">Prinsip & Nilai Dasar</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-border bg-card p-6 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">
                  <v.icon className="size-6" />
                </div>
                <h3 className="mt-4 font-bold text-foreground">{v.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} My Indekos. Hak Cipta Dilindungi.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-foreground">Beranda</Link>
            <Link href="/fitur" className="hover:text-foreground">Fitur</Link>
            <Link href="/properties" className="hover:text-foreground">Cari Kos</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
