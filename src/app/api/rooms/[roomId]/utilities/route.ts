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
      .select('id, name, property_id, occupant_member_id')
      .eq('id', roomId)
      .maybeSingle()

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Kamar tidak ditemukan' }, { status: 404 })
    }

    // 2. Ambil data utility_payments
    const { data: payments, error: payErr } = await admin
      .from('utility_payments')
      .select('*')
      .eq('room_id', roomId)
      .order('paid_at', { ascending: false })

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 500 })
    }

    const list = payments ?? []
    const lastPln = list.find((p) => p.utility_type === 'pln') ?? null
    const lastPdam = list.find((p) => p.utility_type === 'pdam') ?? null

    return NextResponse.json({
      room,
      payments: list,
      last_pln: lastPln,
      last_pdam: lastPdam,
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
    const {
      utility_type,
      amount,
      paid_at,
      token_code,
      kwh,
      meter_reading,
      period_label,
      note,
    } = body

    if (!utility_type || !['pln', 'pdam'].includes(utility_type)) {
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
      utility_type,
      amount: parsedAmount,
      paid_at: paid_at || new Date().toISOString(),
      token_code: token_code ? String(token_code).trim() : null,
      kwh: kwh !== undefined && kwh !== null && kwh !== '' ? Number(kwh) : null,
      meter_reading:
        meter_reading !== undefined && meter_reading !== null && meter_reading !== ''
          ? Number(meter_reading)
          : null,
      period_label: period_label ? String(period_label).trim() : null,
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

    // 3. Jika diisi oleh penghuni (bukan owner), kirimkan notifikasi ke owner
    if (!isOwner && ownerId) {
      const typeLabel = utility_type.toUpperCase()
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
          token_code ? ` (Token: ${token_code})` : ''
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

export async function PATCH(
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
    const { id, amount, paid_at, token_code, kwh, meter_reading, period_label, note } = body

    if (!id) {
      return NextResponse.json({ error: 'ID catatan wajib diisi' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Cek catatan lama
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
        { error: 'Anda tidak memiliki hak untuk mengedit catatan ini' },
        { status: 403 }
      )
    }

    const updatePayload: Record<string, unknown> = {}
    if (amount !== undefined) updatePayload.amount = Number(amount)
    if (paid_at !== undefined) updatePayload.paid_at = paid_at
    if (token_code !== undefined) updatePayload.token_code = token_code || null
    if (kwh !== undefined) updatePayload.kwh = kwh !== '' ? Number(kwh) : null
    if (meter_reading !== undefined)
      updatePayload.meter_reading = meter_reading !== '' ? Number(meter_reading) : null
    if (period_label !== undefined) updatePayload.period_label = period_label || null
    if (note !== undefined) updatePayload.note = note || null

    const { data: updated, error: updateErr } = await admin
      .from('utility_payments')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, payment: updated })
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
