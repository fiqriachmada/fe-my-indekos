# Design System & Guidelines (My Indekos)

Panduan desain visual, palet warna, tipografi, dan perilaku komponen antarmuka pengguna untuk My Indekos.

## 1. Prinsip Desain
- **Modern & Clean**: Antarmuka bersih, fokus pada keterbacaan data kamar, harga, dan ketersediaan.
- **Warm & Welcoming**: Menggunakan tone warna yang hangat, bersahabat, dan profesional untuk menciptakan kenyamanan seperti berada di rumah sendiri.
- **Responsif & Adaptif**: Nyaman digunakan di layar mobile (pencari kos di perjalanan) maupun desktop (pemilik kos memantau portfolio).
- **Aksesibilitas (a11y)**: Kontras warna terstandar, feedback pesan jelas via Sonner Toast, dan kontrol form yang ramah pembaca layar.

## 2. Palet Warna & Tema

Mendukung tema **Light** dan **Dark** mode melalui semantic color tokens Tailwind CSS:

| Token / Variabel | Light Mode | Dark Mode | Deskripsi |
| :--- | :--- | :--- | :--- |
| `background` | `#fdfcfb` / `#ffffff` | `#121212` / `#18181b` | Background dasar halaman |
| `foreground` | `#1c1917` (Stone 900) | `#f4f4f5` (Zinc 100) | Teks utama |
| `card` | `#ffffff` | `#1e1e24` | Background container / kartu |
| `primary` | Warna Terracotta / Amber hangat | Oranye hangat terkalibrasi | Aksen tombol utama, brand icon |
| `border` | Border lembut (`#e4e4e7`) | Border gelap (`#27272a`) | Garis pemisah komponen |
| `badge status` | Hijau (Kamar Kosong), Abu-abu (Penuh) | Hijau redup, Abu-abu gelap | Indikator ketersediaan |

## 3. Tipografi & Hierarki
- **Font Body**: Sans-serif modern (Inter / Geist Sans / system-ui).
- **Heading (`h1`, `h2`, `h3`)**: Tebal (*semi-bold* hingga *bold*) dengan tracking yang rapat untuk kesan tegas dan elegan.
- **Label / Badges**: Ukuran `text-xs` hingga `text-sm`, sering kali dikombinasikan dengan `uppercase` dan `tracking-wider` untuk status peran atau tipe properti.

## 4. Komponen Khusus My Indekos
- **Floating Controls (Pill)**: Komponen mengambang di bawah layar untuk navigasi cepat antar halaman utama, toggle tema instan, dan badge notifikasi.
- **PasswordInput**: Input khusus kata sandi dengan toggle mata (*eye icon*) terintegrasi yang mudah diakses.
- **Modal Penempatan Kamar**: Dialog interaktif untuk owner memilih unit kamar kosong saat menyetujui calon penyewa.
- **Utility Cards (PLN / PDAM)**: Kartu status ringkas biaya bulanan dilengkapi visualisasi persentase konsumsi dan badge status pembayaran.
