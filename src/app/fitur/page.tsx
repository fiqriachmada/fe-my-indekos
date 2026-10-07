import Link from "next/link"
import Image from "next/image"
import {
  KeyIcon,
  BoltIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  UserGroupIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline"

export const metadata = {
  title: "Fitur Lengkap — My Indekos",
  description: "Eksplorasi seluruh fitur manajemen properti kos dan kemudahan sewa kamar di My Indekos.",
}

const detailedFeatures = [
  {
    title: "Manajemen Kamar & Ketersediaan",
    badge: "Operasional",
    description: "Visibilitas penuh atas status kamar (tersedia, terisi, renovasi) serta pengaturan tipe kamar mandi, fasilitas kamar, dan luas ruangan secara instan.",
    icon: KeyIcon,
    points: [
      "Status ketersediaan kamar otomatis real-time",
      "Pilihan tipe kamar mandi (Dalam / Luar)",
      "Pencatatan ukuran luas kamar & inventaris fasilitas",
    ],
  },
  {
    title: "Pencatatan Token & Utilitas Listrik/Air",
    badge: "Keuangan",
    description: "Sistem pencatatan tagihan dan token listrik PLN atau meteran air PDAM yang dapat dipantau bersama antara pemilik dan penghuni kos.",
    icon: BoltIcon,
    points: [
      "Catatan nomor meteran & ID Pelanggan PLN/PDAM",
      "Riwayat pengisian token dan tanggal transaksi",
      "Notifikasi pengingat jatuh tempo pembayaran",
    ],
  },
  {
    title: "Verifikasi Calon Penghuni & Penempatan",
    badge: "Member",
    description: "Proses onboarding penghuni baru yang tertib. Calon penghuni mengajukan permohonan sewa, diverifikasi oleh pemilik/admin, lalu di-assign ke kamar yang dipilih.",
    icon: UserGroupIcon,
    points: [
      "Permohonan kamar digital tanpa berkas fisik",
      "Persetujuan cepat via notifikasi interaktif",
      "Data kontak darurat dan identitas tersimpan aman",
    ],
  },
  {
    title: "Hak Akses Bertingkat (Role-Based)",
    badge: "Keamanan",
    description: "Bagi hak pengelolaan properti kepada tim Anda dengan aman. Pisahkan akses untuk Pemilik (Owner), Admin Pengelola, dan Penjaga Kos.",
    icon: ShieldCheckIcon,
    points: [
      "Hak akses Owner dengan kontrol finansial penuh",
      "Akses Admin untuk kelola operasional dan penghuni",
      "Akses Penjaga untuk monitoring harian dan lapor fasilitas",
    ],
  },
  {
    title: "Notifikasi Realtime Supabase",
    badge: "Real-time",
    description: "Dapatkan pemberitahuan langsung detik itu juga saat ada pengajuan kamar baru, pembayaran disetujui, atau laporan dari penghuni.",
    icon: BellAlertIcon,
    points: [
      "Pemberitahuan instan via Web Socket Supabase",
      "Quick response (Terima / Tolak) langsung di floating bar",
      "Riwayat aktivitas lengkap terarsip",
    ],
  },
  {
    title: "Portal Publik Cari Kos",
    badge: "Pemasaran",
    description: "Halaman pencarian kos publik yang ramah pengguna, memungkinkan pencari kos menemukan kamar idaman berdasarkan filter lokasi dan fasilitas.",
    icon: SparklesIcon,
    points: [
      "Pencarian cepat berbasis nama, kota, dan lokasi",
      "Tampilan harga, foto kamar, dan status siap huni",
      "Langsung terhubung dengan sistem reservasi digital",
    ],
  },
]

export default function FiturPage() {
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
              href="/properties"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Cari Kos
            </Link>
            <Link
              href="/tentang"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Tentang Kami
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
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
          <SparklesIcon className="size-3.5" />
          Platform Cerdas Kos-Kosan
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Fitur Lengkap untuk <span className="text-indigo-600">Bisnis Kos Modern</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Tinggalkan cara manual buku catatan dan chat yang berantakan. My Indekos menyatukan semua kebutuhan operasional rumah kos dalam satu aplikasi terpadu.
        </p>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {detailedFeatures.map((f) => (
            <div
              key={f.title}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">
                    <f.icon className="size-6" />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {f.badge}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                <ul className="mt-4 space-y-2 border-t border-border/50 pt-4 text-xs text-foreground/80">
                  {f.points.map((pt, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-3xl border border-border bg-gradient-to-r from-indigo-900 to-slate-900 p-8 text-center text-white shadow-xl sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Mulai Coba Semua Fitur Hari Ini</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
            Daftarkan properti kos Anda atau cari kamar kos terbaik tanpa biaya langganan di awal.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-950 shadow-md transition hover:bg-slate-100"
            >
              Daftar Sekarang Gratis
            </Link>
            <Link
              href="/properties"
              className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Cari Kos Terdekat
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
