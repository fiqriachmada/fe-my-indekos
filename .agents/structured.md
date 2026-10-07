# Struktur Proyek My Indekos (`fe-my-indekos`)

Dokumentasi struktur folder, modul, dan organisasi file dalam proyek frontend My Indekos.

## Ringkasan Struktur Direktori

```text
fe-my-indekos/
├── .agents/                      # Dokumentasi & panduan teknis agent
│   ├── structured.md             # Struktur proyek dan organisasi modul (file ini)
│   ├── architecture.md           # Arsitektur sistem, peran, dan data flow
│   └── design.md                 # Panduan desain UI/UX dan Design System
├── AGENTS.md                     # Aturan teknis dan pedoman Next.js App Router
├── README.md                     # Panduan pengguna dan ringkasan fitur utama
├── db/
│   └── migrations/               # Skrip migrasi SQL Supabase (misal: utility payments)
├── public/                       # File statis dan aset gambar
└── src/
    ├── app/                      # Next.js App Router
    │   ├── api/                  # API routes (utilities, rooms, requests, dsb.)
    │   │   ├── rooms/            # Endpoint respons pengajuan kamar dan utilitas
    │   │   └── utilities/        # Agregasi utilitas tingkat properti/kamar
    │   ├── auth/callback/        # Handler pertukaran token auth Supabase
    │   ├── dashboard/            # Halaman Dashboard Multi-Role (Kelola vs Sewa)
    │   ├── properties/           # Halaman pencarian dan katalog kos-kosan
    │   ├── profile/              # Manajemen profil pengguna dan pergantian username
    │   ├── rooms/detail/[id]/    # Detail kamar kos & riwayat utilitas (PLN/PDAM)
    │   ├── settings/             # Pengaturan akun dengan layout tab bar vertikal
    │   │   ├── password/         # Form ganti password
    │   │   └── theme/            # Preferensi tema
    │   ├── layout.tsx            # Root layout aplikasi
    │   └── page.tsx              # Landing page utama
    ├── components/               # Komponen UI Reusable
    │   ├── ui/                   # Komponen primitif Shadcn (button, dialog, sonner, dll.)
    │   ├── floating-controls.tsx # Floating pill kontrol navigasi & tema
    │   ├── notification-bell.tsx # Lonceng notifikasi realtime
    │   ├── password-input.tsx    # Input password dengan toggle visibilitas
    │   └── room-utilities.tsx    # Komponen riwayat pembayaran token PLN / PDAM
    └── lib/                      # Helper, utility, dan integrasi backend
        ├── supabase/             # Inisialisasi client Supabase (server & client)
        │   ├── client.ts         # Browser client
        │   ├── server.ts         # Server component / route handler client
        │   └── middleware.ts     # Middleware session refresh
        └── utils.ts              # Fungsi utilitas styling (clsx, tailwind-merge)
```

## Konvensi Penamaan & Organisasi
- **File Routes**: Mengikuti konvensi Next.js App Router (`page.tsx`, `layout.tsx`, `route.ts`).
- **Komponen**: `kebab-case.tsx` (misal: `password-input.tsx`, `room-utilities.tsx`).
- **Server vs Client**: Komponen interaktif menggunakan direktif `"use client";` di baris pertama. Akses data sensitif atau cookies dilakukan via Server Components atau Route Handlers.
