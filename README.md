# My Indekos (Frontend)

Aplikasi web modern untuk manajemen dan pencarian indekos (kos-kosan), dibangun menggunakan Next.js App Router dan Supabase.

---

## 🚀 Fitur Utama

### 1. Autentikasi & Akun
- **Registrasi Akun Baru (`/register`):**
  - Input nama depan (*first name*), nama belakang (*last name*), email, dan password.
  - **Auto-Resend Email Aktivasi:** Jika email sudah pernah didaftarkan namun belum diaktivasi, sistem otomatis mengirimkan ulang email konfirmasi pendaftaran.
  - Jika email sudah terdaftar dan sudah aktif, sistem mengarahkan pengguna untuk login.
- **Show / Hide Password:** Seluruh input password dilengkapi toggle mata (lihat/sembunyikan) yang aksesibel.
- **Login (`/login`):** Validasi email/password dengan link langsung menuju halaman registrasi dan forgot password.
- **Email Activation Callback (`/auth/callback`):** Verifikasi kode konfirmasi dan sinkronisasi otomatis nama & metadata pengguna ke tabel `profiles`.

### 2. Dashboard Multi-Role (`/dashboard`)
Mendukung skenario fleksibel di mana satu pengguna dapat memiliki peran ganda:
- **Properti yang Saya Kelola:**
  - Menampilkan kos yang dimiliki langsung (`owner_id`) maupun melalui keanggotaan `property_members` (*owner*, *property-admin*, *guard*).
  - **Statistik Occupant:** Menghitung jumlah penyewa unik (*occupant*) aktif di setiap properti kos.
- **Kamar yang Saya Sewa:**
  - Menampilkan kamar yang disewa oleh pengguna melalui `room_members` beserta nama properti kos dan badge role *occupant*.
  - Pemilik kos dapat menyewa kamar di properti miliknya sendiri atau di kos milik owner lain.
- **Tombol Pintas:** Akses cepat ke halaman pencarian kos.

### 3. Pencarian Properti & Kamar Kos (`/properties`)
- **Pencarian Real-Time:** Filter instan berdasarkan nama kos maupun lokasi/kota.
- **Filter Khusus Kos:** Memprioritaskan properti bertipe kos (`property_type: 'kosan'`) sesuai domain My Indekos.
- **Filter Kamar Tersedia:** Opsi *"Hanya Kamar Tersedia"* untuk menyaring kos yang masih memiliki kamar kosong.
- **Status Ketersediaan Kamar:** Indikator visual jumlah kamar kosong (hijau) atau status penuh (abu-abu).
- **Detail Properti:** Total kamar, luas bangunan, alamat, dan tautan langsung ke dashboard.

### 4. Manajemen Profil Pengguna (`/profile`)
- **Tampilan Role Dinamis:** Mengambil role aktif langsung dari relasi database (*Owner*, *Occupant*, *Property Admin*, *Guard*). Jika pengguna belum memiliki peran spesifik, ditampilkan *User*.
- **Nama Depan & Nama Belakang:** Input terpisah untuk *First name* dan *Last name*.
- **Auto-Generated Display Name:** Field *Display name* terisi otomatis secara *real-time* saat nama depan dan belakang diketik.
- **Penyimpanan Terintegrasi:** Data disimpan ke `auth.users` dan tabel `public.profiles`.
- **Ganti Username Mandiri:**
  - Kolom khusus dengan simbol `@` di luar input sebagai prefix addon statis.
  - **Batas 24 Jam Sekali:** Memanfaatkan database RPC `change_username` dan tabel `usernames`. Input otomatis terkunci dengan hitungan waktu jika belum 24 jam.
  - **Validasi Keunikan:** Memastikan username tidak duplikat dengan pengguna lain di seluruh platform.

### 5. Halaman Pengaturan (`/settings`)
- **Navigasi Tab Bar Kiri:**
  - **Password (`/settings/password`):** Formulir penggantian password akun.
  - **Tema (`/settings/theme`):** Pengaturan tampilan tema (Light, Dark, System) yang tersinkronisasi dua arah dengan *Floating Controls*.
  - **Tombol Logout:** Tombol keluar yang ditempatkan di bagian bawah tab bar.
- **Proteksi Akses:** Route `/settings/*` otomatis diproteksi dan mengarahkan pengguna yang belum login ke `/login`.

### 6. Floating Controls
- Tombol mengambang (*floating pill*) yang selalu tersedia di bagian bawah layar:
  - Pemilih tema instan (Light / Dark / System).
  - Menu navigasi cepat (Dashboard, Cari Properti, Profile, Settings, Login, Register, Logout).
  - Panel notifikasi undangan / pengajuan kamar realtime.

---

## 🛠️ Tech Stack
- **Framework:** Next.js (App Router, Turbopack, TypeScript)
- **Styling:** Tailwind CSS, Heroicons, Lucide React
- **Backend & Database:** Supabase (Auth, Postgres, Realtime, Storage)
- **State & Query:** React State & Supabase SSR Client

---

## 💻 Memulai Pengembangan

```bash
# Install dependencies
npm install

# Jalankan development server (port 21020)
npm run dev -- -p 21020
```

Buka [http://localhost:21020](http://localhost:21020) pada browser Anda.
