<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# My Indekos - Engineering & Architecture Guide

## Product Intent & Scope
`fe-my-indekos` adalah frontend terspesialisasi untuk pengelolaan dan pencarian properti bertipe **kos-kosan** (`property_type: 'kosan'`).
Aplikasi ini berbagi database Supabase yang sama dengan platform induk (Property Management System / PMS). Ke depannya, sub-produk lain seperti *My Apart* dan *My House* akan memiliki antarmuka dan batasan domainnya masing-masing.

---

## Arsitektur Fitur & Domain

### 1. Model Peran Bertingkat (Role Scoping)
- **Scope Property (`property_members`):**
  - Peran: `owner`, `property-admin`, `guard`.
  - Terikat langsung pada tingkat properti (`properties.id`).
- **Scope Room (`room_members`):**
  - Peran: `occupant` (penyewa kamar).
  - Terikat pada entitas kamar (`rooms.id`).
- **Dukungan Peran Ganda (Dual Role):**
  - Satu user dapat menjadi pemilik (*Owner*) sekaligus penyewa (*Occupant*) pada saat yang sama (baik menyewa di kos miliknya sendiri maupun di kos milik orang lain).
  - Dashboard menampilkan 2 seksi terpisah: "Properti yang saya kelola" dan "Kamar yang saya sewa".
- **Kalkulasi Jumlah Occupant:**
  - Dihitung dari jumlah user unik pada `room_members` yang terhubung ke seluruh kamar di properti tersebut.

### 2. Autentikasi & Akun
- **Pendaftaran (`/register`):**
  - Jika email sudah terdaftar namun belum diaktivasi, sistem memanggil `auth.resend` secara otomatis dan memberikan feedback ke user.
  - Jika akun sudah terdaftar dan aktif, user diarahkan untuk login.
- **Komponen Input Password (`PasswordInput`):**
  - Semua field password wajib menggunakan `@/components/password-input` yang menyediakan toggle show/hide berbasis `lucide-react`.
- **Aktivasi Akun (`/auth/callback`):**
  - Menukar kode verifikasi menjadi sesi dan secara otomatis menyalin `first_name`, `last_name`, dan `display_name` dari metadata user ke tabel `public.profiles`.

### 3. Profil & Username
- **Profil (`/profile`):**
  - Mengambil daftar role aktif secara langsung dari database (`properties.owner_id`, `property_members`, `room_members`).
  - `Display name` dihasilkan otomatis (*read-only*) dari kombinasi `first_name` + `last_name`.
  - Penyimpanan dilakukan secara atomic ke `auth.users` metadata dan tabel `public.profiles` (`upsert`).
- **Ganti Username:**
  - Prefix `@` diletakkan di luar input sebagai label addon statis.
  - Dibatasi 24 jam sekali berdasarkan `usernames.last_changed_at`.
  - Perubahan dieksekusi melalui RPC `change_username(new_username)` untuk menjamin keunikan username di seluruh database.

### 4. Pengaturan Akun (`/settings`)
- Menggunakan arsitektur tab bar vertikal di sebelah kiri (`/settings/layout.tsx`):
  - `/settings/password`: Form ganti password.
  - `/settings/theme`: Pengaturan tema (Light, Dark, System) yang tersinkronisasi dengan event `my-indekos-theme-change`.
  - Tombol Logout diposisikan di bagian paling bawah tab bar.
- Seluruh sub-halaman `/settings/*` dilindungi sesi auth di tingkat Server Component.

### 5. Pencarian Properti (`/properties`)
- Mengambil daftar kos aktif dari tabel `properties` beserta relasi kamar `rooms`.
- Client component (`PropertySearchClient`) menyediakan:
  - Pencarian teks instan (nama kos dan lokasi).
  - Filter ketersediaan kamar (hanya menampilkan kos yang masih memiliki kamar kosong).
  - Filter tipe properti (default difokuskan ke kosan).

---

## Konvensi Kode & Quality Bar
1. **Next.js App Router (React 19):** Selalu gunakan `async` pada dynamic route params (`const { id } = await params`) dan cookies (`const cookieStore = await cookies()`).
2. **Klien Supabase:**
   - Server Component: `import { createClient } from '@/lib/supabase/server'`
   - Client Component: `import { createClient } from '@/lib/supabase/client'`
3. **Penyelarasan Tema:** Dukung dark mode menggunakan utility class Tailwind (`dark:...`) dan semantic colors (`bg-background`, `text-foreground`, `bg-card`, `border-border`).
