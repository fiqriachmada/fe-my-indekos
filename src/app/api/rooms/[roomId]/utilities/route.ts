import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // 1. Ambil detail kamar dan propertinya
    const { data: room, error: roomErr } = await admin
      .from('rooms')
      .select('id, name, water_mode, property_id, occupant_member_id, properties:property_id (id, name, owner_id)')
      .eq('id', roomId)
      .maybeSingle()

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Kamar tidak ditemukan' }, { status: 404 })
    }

    const property = Array.isArray(room.properties) ? room.properties[0] : room.properties
    const isOwner = property?.owner_id === user.id

    // Cek apakah user adalah penghuni (occupant) kamar
    const [roomMemberRes, userMembershipRes] = await Promise.all([
      admin
        .from('room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle(),
      room.property_id
        ? admin
            .from('property_members')
            .select('id')
            .eq('property_id', room.property_id)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const isAssignedDirectly = Boolean(
      userMembershipRes.data && room.occupant_member_id === userMembershipRes.data.id
    )
    const isRoomMember = Boolean(roomMemberRes.data)
    const isOccupant = isAssignedDirectly || isRoomMember

    // 2. Ambil data utility_payments
    const { data: rawPayments, error: payErr } = await admin
      .from('utility_payments')
      .select('*')
      .eq('room_id', roomId)
      .order('paid_at', { ascending: false })

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 500 })
    }

    // 3. Ambil profil pembuat catatan agar bisa tampil nama pembuatnya
    const userIds = Array.from(new Set((rawPayments ?? []).map((p) => p.created_by).filter(Boolean)))
    const nameMap = new Map<string, string>()

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', userIds)

      for (const p of profiles ?? []) {
        const name =
          p.display_name ||
          [p.first_name, p.last_name].filter(Boolean).join(' ') ||
          'Pengguna'
        nameMap.set(p.id, name)
      }
    }

    const entries = (rawPayments ?? []).map((p) => {
      const canDelete = isOwner || p.created_by === user.id
      const createdByName = p.created_by ? nameMap.get(p.created_by) ?? 'Pengguna' : null

      return {
        id: p.id,
        room_id: p.room_id,
        property_id: p.property_id,
        utility_type: p.utility_type as 'pln' | 'pdam',
        amount: Number(p.amount),
        paid_at: p.paid_at,
        token_code: p.token_code,
        kwh: p.kwh !== null ? Number(p.kwh) : null,
        meter_reading: p.meter_reading !== null ? Number(p.meter_reading) : null,
        period_label: p.period_label,
        note: p.note,
        created_by_role: p.created_by_role as 'owner' | 'occupant' | null,
        created_by_name: createdByName,
        can_delete: canDelete,
      }
    })

    const latestPln = entries.find((e) => e.utility_type === 'pln') ?? null
    const latestPdam = entries.find((e) => e.utility_type === 'pdam') ?? null

    return NextResponse.json({
      entries,
      latest: {
        pln: latestPln,
        pdam: latestPdam,
      },
      permissions: {
        canAddPln: isOwner || isOccupant,
        canAddPdam: isOwner || isOccupant, // user sekarang bisa isi PLN dan PDAM
        isManager: isOwner,
        isOccupant: isOccupant,
      },
      waterMode: room.water_mode,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const utilityType = body.utilityType || body.utility_type
    const amount = body.amount
    const paidAt = body.paidAt || body.paid_at
    const tokenCode = body.tokenCode !== undefined ? body.tokenCode : body.token_code
    const kwh = body.kwh
    const meterReading = body.meterReading !== undefined ? body.meterReading : body.meter_reading
    const periodLabel = body.periodLabel !== undefined ? body.periodLabel : body.period_label
    const note = body.note

    if (!utilityType || !['pln', 'pdam'].includes(utilityType)) {
      return NextResponse.json(
        { error: 'Tipe utilitas harus "pln" atau "pdam"' },
        { status: 400 }
      )
    }

    const parsedAmount = Number(amount)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: 'Nominal amount tidak valid' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Ambil detail kamar dan properti
    const { data: room, error: roomErr } = await admin
      .from('rooms')
      .select('id, name, property_id, properties:property_id (id, name, owner_id)')
      .eq('id', roomId)
      .maybeSingle()

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Kamar tidak ditemukan' }, { status: 404 })
    }

    const property = Array.isArray(room.properties) ? room.properties[0] : room.properties
    const propertyId = room.property_id
    const ownerId = property?.owner_id

    const isOwner = ownerId === user.id
    const role: 'owner' | 'occupant' = isOwner ? 'owner' : 'occupant'

    // 2. Simpan catatan ke utility_payments
    const insertPayload = {
      room_id: roomId,
      property_id: propertyId,
      utility_type: utilityType,
      amount: parsedAmount,
      paid_at: paidAt || new Date().toISOString(),
      token_code: tokenCode ? String(tokenCode).trim() : null,
      kwh: kwh !== undefined && kwh !== null && kwh !== '' ? Number(kwh) : null,
      meter_reading:
        meterReading !== undefined && meterReading !== null && meterReading !== ''
          ? Number(meterReading)
          : null,
      period_label: periodLabel ? String(periodLabel).trim() : null,
      note: note ? String(note).trim() : null,
      created_by: user.id,
      created_by_role: role,
    }

    const { data: newPayment, error: insertErr } = await admin
      .from('utility_payments')
      .insert(insertPayload)
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // 3. Jika dicatat oleh penghuni (occupant), kirim notifikasi ke owner
    if (!isOwner && ownerId) {
      const typeLabel = utilityType.toUpperCase()
      const formattedNominal = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(parsedAmount)

      await admin.from('notifications').insert({
        to_user_id: ownerId,
        from_user_id: user.id,
        property_id: propertyId,
        room_id: roomId,
        title: `Pengisian Utilitas ${typeLabel} - ${room.name}`,
        description: `Penghuni telah mencatat pengisian utilitas ${typeLabel} sebesar ${formattedNominal}${
          tokenCode ? ` (Token: ${tokenCode})` : ''
        }.`,
        type: 'utility_payment',
        status: 'completed',
        read: false,
      })
    }

    return NextResponse.json({ ok: true, payment: newPayment })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID catatan wajib disertakan' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: existing, error: getErr } = await admin
      .from('utility_payments')
      .select('id, created_by, property_id, properties:property_id(owner_id)')
      .eq('id', id)
      .eq('room_id', roomId)
      .maybeSingle()

    if (getErr || !existing) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 })
    }

    const prop = Array.isArray(existing.properties) ? existing.properties[0] : existing.properties
    const isOwner = prop?.owner_id === user.id
    const isCreator = existing.created_by === user.id

    if (!isOwner && !isCreator) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki hak untuk menghapus catatan ini' },
        { status: 403 }
      )
    }

    const { error: delErr } = await admin
      .from('utility_payments')
      .delete()
      .eq('id', id)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
