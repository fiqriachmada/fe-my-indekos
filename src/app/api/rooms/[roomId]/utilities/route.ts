import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { params: Promise<{ roomId: string }> }

const MANAGER_ROLES = ['owner', 'property-admin']
const VIEW_ROLES = [...MANAGER_ROLES, 'guard']

/**
 * Menentukan hak akses user terhadap utilitas sebuah kamar.
 * - manager  : owner properti / property-admin  -> boleh catat PLN & PDAM
 * - occupant : penghuni kamar                    -> boleh catat PLN saja
 * - guard    : hanya lihat
 */
async function resolveAccess(userId: string, roomId: string) {
  const admin = createAdminClient()

  const { data: room } = await admin
    .from('rooms')
    .select('id, name, property_id, occupant_member_id, water_mode')
    .eq('id', roomId)
    .maybeSingle()
  if (!room) return { admin, room: null, isManager: false, isOccupant: false, canView: false }

  const [{ data: property }, { data: memberships }, { data: roomMember }] = await Promise.all([
    admin.from('properties').select('id, owner_id').eq('id', room.property_id).maybeSingle(),
    admin
      .from('property_members')
      .select('id, role:roles(name)')
      .eq('property_id', room.property_id)
      .eq('user_id', userId),
    admin.from('room_members').select('user_id').eq('room_id', roomId).eq('user_id', userId).maybeSingle(),
  ])

  const roleNames = (memberships ?? []).map((m) => {
    const r = Array.isArray(m.role) ? m.role[0] : m.role
    return (r as { name?: string } | null)?.name ?? ''
  })
  const memberIds = (memberships ?? []).map((m) => m.id)

  const isManager = property?.owner_id === userId || roleNames.some((r) => MANAGER_ROLES.includes(r))
  const isGuard = roleNames.some((r) => r === 'guard')
  const isOccupant =
    Boolean(roomMember) || (room.occupant_member_id ? memberIds.includes(room.occupant_member_id) : false)

  return {
    admin,
    room,
    isManager,
    isOccupant,
    canView: isManager || isOccupant || isGuard || roleNames.some((r) => VIEW_ROLES.includes(r)),
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  const { roomId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 })

  const { admin, room, isManager, isOccupant, canView } = await resolveAccess(user.id, roomId)
  if (!room) return NextResponse.json({ error: 'Kamar tidak ditemukan.' }, { status: 404 })
  if (!canView) return NextResponse.json({ error: 'Anda tidak memiliki akses ke utilitas kamar ini.' }, { status: 403 })

  const { data: entries, error } = await admin
    .from('utility_payments')
    .select('id, utility_type, amount, paid_at, token_code, kwh, meter_reading, period_label, note, created_by, created_by_role, created_at')
    .eq('room_id', roomId)
    .order('paid_at', { ascending: false })
    .limit(100)

  if (error) {
    const missing = error.code === '42P01' || /utility_payments/.test(error.message)
    return NextResponse.json(
      {
        error: missing
          ? 'Tabel utility_payments belum dibuat. Jalankan migrasi 20261006_create_utility_payments.sql di Supabase SQL Editor.'
          : error.message,
        migrationMissing: missing,
      },
      { status: missing ? 503 : 500 }
    )
  }

  // Nama pencatat
  const creatorIds = [...new Set((entries ?? []).map((e) => e.created_by).filter(Boolean))] as string[]
  const names = new Map<string, string>()
  if (creatorIds.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, first_name, last_name')
      .in('id', creatorIds)
    for (const p of profiles ?? []) {
      names.set(p.id, p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Pengguna')
    }
  }

  const list = (entries ?? []).map((e) => ({
    ...e,
    created_by_name: e.created_by ? names.get(e.created_by) ?? 'Pengguna' : null,
    can_delete: isManager || e.created_by === user.id,
  }))

  return NextResponse.json({
    entries: list,
    latest: {
      pln: list.find((e) => e.utility_type === 'pln') ?? null,
      pdam: list.find((e) => e.utility_type === 'pdam') ?? null,
    },
    permissions: {
      canAddPln: isManager || isOccupant,
      canAddPdam: isManager && room.water_mode !== 'none',
      isManager,
      isOccupant,
    },
    waterMode: room.water_mode ?? null,
  })
}

export async function POST(request: Request, { params }: Ctx) {
  const { roomId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 })

  const { admin, room, isManager, isOccupant } = await resolveAccess(user.id, roomId)
  if (!room) return NextResponse.json({ error: 'Kamar tidak ditemukan.' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const utilityType = body.utilityType as 'pln' | 'pdam'
  if (utilityType !== 'pln' && utilityType !== 'pdam') {
    return NextResponse.json({ error: 'Jenis utilitas harus pln atau pdam.' }, { status: 400 })
  }

  // Aturan akses: PDAM hanya owner/admin, PLN owner/admin atau penghuni.
  if (utilityType === 'pdam' && !isManager) {
    return NextResponse.json({ error: 'Pembayaran PDAM hanya dapat dicatat oleh pemilik properti.' }, { status: 403 })
  }
  if (utilityType === 'pln' && !isManager && !isOccupant) {
    return NextResponse.json({ error: 'Hanya pemilik atau penghuni kamar yang dapat mencatat PLN.' }, { status: 403 })
  }
  if (utilityType === 'pdam' && room.water_mode === 'none') {
    return NextResponse.json({ error: 'Kamar ini tidak memiliki layanan PDAM.' }, { status: 400 })
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'Nominal tidak valid.' }, { status: 400 })
  }

  const paidAt = body.paidAt ? new Date(body.paidAt) : new Date()
  if (Number.isNaN(paidAt.getTime()) || paidAt.getTime() > Date.now() + 24 * 3600 * 1000) {
    return NextResponse.json({ error: 'Tanggal pembayaran tidak valid.' }, { status: 400 })
  }

  const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null)
  const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

  const { data, error } = await admin
    .from('utility_payments')
    .insert({
      room_id: roomId,
      property_id: room.property_id,
      utility_type: utilityType,
      amount,
      paid_at: paidAt.toISOString(),
      token_code: utilityType === 'pln' ? str(body.tokenCode, 64) : null,
      kwh: utilityType === 'pln' ? num(body.kwh) : null,
      meter_reading: utilityType === 'pdam' ? num(body.meterReading) : null,
      period_label: str(body.periodLabel, 32),
      note: str(body.note, 500),
      created_by: user.id,
      created_by_role: isManager ? 'owner' : 'occupant',
    })
    .select('id')
    .single()

  if (error) {
    const missing = error.code === '42P01' || /utility_payments/.test(error.message)
    return NextResponse.json(
      {
        error: missing
          ? 'Tabel utility_payments belum dibuat. Jalankan migrasi 20261006_create_utility_payments.sql di Supabase SQL Editor.'
          : error.message,
      },
      { status: missing ? 503 : 500 }
    )
  }

  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { roomId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 })

  const entryId = new URL(request.url).searchParams.get('id')
  if (!entryId) return NextResponse.json({ error: 'ID catatan wajib diisi.' }, { status: 400 })

  const { admin, room, isManager } = await resolveAccess(user.id, roomId)
  if (!room) return NextResponse.json({ error: 'Kamar tidak ditemukan.' }, { status: 404 })

  const { data: entry } = await admin
    .from('utility_payments')
    .select('id, created_by, utility_type')
    .eq('id', entryId)
    .eq('room_id', roomId)
    .maybeSingle()
  if (!entry) return NextResponse.json({ error: 'Catatan tidak ditemukan.' }, { status: 404 })

  // Penghuni hanya boleh menghapus catatan PLN miliknya sendiri.
  if (!isManager && !(entry.utility_type === 'pln' && entry.created_by === user.id)) {
    return NextResponse.json({ error: 'Anda tidak berhak menghapus catatan ini.' }, { status: 403 })
  }

  const { error } = await admin.from('utility_payments').delete().eq('id', entryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
