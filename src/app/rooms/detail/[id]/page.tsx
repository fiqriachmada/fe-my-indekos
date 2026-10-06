import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Maximize2,
  Bath,
  Droplets,
  Zap,
  BedDouble,
  ShieldCheck,
  AlertCircle,
  UserCheck,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Detail Kamar — My Indekos',
  description: 'Informasi lengkap dan spesifikasi kamar sewa Anda.',
}

function formatBathroom(mode?: string | null, area?: number | null) {
  if (!mode || mode === 'none') return 'Tidak ada fasilitas kamar mandi khusus'
  let label = mode
  if (mode === 'inside') label = 'Kamar Mandi Dalam'
  else if (mode === 'outside') label = 'Kamar Mandi Luar'
  return area ? `${label} (${area} m²)` : label
}

function formatWater(mode?: string | null) {
  if (!mode || mode === 'none') return 'Tidak ada PDAM'
  if (mode === 'separate') return 'Meteran Terpisah'
  if (mode === 'shared') return 'Ikut Properti (Bersama)'
  return mode
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = createAdminClient()

  // Ambil detail kamar dan propertinya
  const { data: room, error: roomError } = await admin
    .from('rooms')
    .select(`
      id,
      name,
      room_type,
      area,
      bathroom_mode,
      bathroom_area,
      water_mode,
      electricity_customer_id,
      electricity_tariff,
      electricity_power,
      is_active,
      occupant_member_id,
      created_at,
      property:properties (
        id,
        name,
        location,
        property_type,
        building_area,
        land_area,
        owner_id
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (roomError || !room) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground sm:p-10">
        <div className="mx-auto max-w-2xl py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Kamar Tidak Ditemukan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kamar yang Anda tuju mungkin sudah tidak tersedia atau ID kamar tidak valid.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition"
            >
              <ArrowLeft className="size-4" /> Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Cek relasi hunian user
  const property = Array.isArray(room.property) ? room.property[0] : room.property
  const propertyId = property?.id

  const [roomMemberRes, userMembershipRes] = await Promise.all([
    admin
      .from('room_members')
      .select('id, user_id, created_at')
      .eq('room_id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    propertyId
      ? admin
          .from('property_members')
          .select('id, user_id')
          .eq('property_id', propertyId)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const isAssignedDirectly = Boolean(
    userMembershipRes.data && room.occupant_member_id === userMembershipRes.data.id
  )
  const isRoomMember = Boolean(roomMemberRes.data)
  const isCurrentOccupant = isAssignedDirectly || isRoomMember

  // Ambil nama profil pemilik
  let ownerName = 'Pemilik Properti'
  if (property?.owner_id) {
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('first_name, last_name, display_name')
      .eq('id', property.owner_id)
      .maybeSingle()
    if (ownerProfile) {
      ownerName =
        ownerProfile.display_name ||
        [ownerProfile.first_name, ownerProfile.last_name].filter(Boolean).join(' ') ||
        'Pemilik Properti'
    }
  }

  return (
    <main className="min-h-screen bg-background pb-28 pt-6 text-foreground">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Navigasi Balik & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground shadow-2xs"
          >
            <ArrowLeft className="size-4" />
            Kembali ke Dashboard
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span>Kamar</span>
            <span>/</span>
            <span className="font-semibold text-foreground">{room.name}</span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-colors sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <BedDouble className="size-3.5" />
                  {room.room_type || 'Kamar Standar'}
                </span>
                {isCurrentOccupant && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    Kamar yang Anda Sewa
                  </span>
                )}
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  {room.is_active ? 'Status: Aktif' : 'Status: Nonaktif'}
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                {room.name}
              </h1>

              {property && (
                <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Building2 className="size-4 text-primary" />
                    <span>{property.name}</span>
                  </div>
                  {property.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      <span>{property.location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Badges */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="rounded-2xl border border-border/80 bg-muted/40 p-3 text-center min-w-24">
                <span className="block text-[11px] font-medium text-muted-foreground">Luas Kamar</span>
                <span className="text-lg font-bold text-foreground">
                  {room.area ? `${room.area} m²` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Spesifikasi Kamar & Informasi Properti */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Spesifikasi Fasilitas Kamar */}
          <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Spesifikasi & Fasilitas Kamar</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Maximize2 className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Dimensi / Luas Kamar</p>
                  <p className="text-sm font-semibold">{room.area ? `${room.area} m²` : 'Belum diisi'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Bath className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Kamar Mandi</p>
                  <p className="text-sm font-semibold">{formatBathroom(room.bathroom_mode, room.bathroom_area)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Droplets className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Air Bersih / PDAM</p>
                  <p className="text-sm font-semibold">{formatWater(room.water_mode)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Zap className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Kelistrikan (PLN)</p>
                  <p className="text-sm font-semibold">
                    {room.electricity_power ? `${room.electricity_power} VA` : 'Standar'}
                    {room.electricity_tariff ? ` · Tarif ${room.electricity_tariff}` : ''}
                  </p>
                  {room.electricity_customer_id && (
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                      No. Meter / ID Pelanggan: {room.electricity_customer_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Informasi Properti & Pengelola */}
          <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Building2 className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Informasi Properti & Pengelola</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nama Properti</p>
                <p className="text-sm font-semibold">{property?.name ?? '-'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Alamat / Lokasi</p>
                <p className="text-sm font-medium text-muted-foreground">
                  {property?.location ?? 'Lokasi belum dicantumkan'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Tipe Properti</p>
                <p className="text-sm font-semibold capitalize">{property?.property_type ?? 'Indekos / Hunian'}</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                    <UserCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Dikelola Oleh</p>
                    <p className="text-sm font-semibold">{ownerName}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Kartu Status Hunian & Hak Akses */}
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-6 text-foreground dark:bg-emerald-950/20 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Status Penghuni Terdaftar
                </h3>
                <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  Kamar ini telah dialokasikan untuk akun Anda. Segala pemberitahuan tagihan, utilitas, atau konfirmasi terkait kamar akan disampaikan melalui notifikasi sistem.
                </p>
              </div>
            </div>
            <Link
              href="/notifications"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs"
            >
              Lihat Notifikasi Kamar
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
