import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk mengajukan sewa.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { propertyId, roomId, note } = body

    if (!propertyId || !roomId) {
      return NextResponse.json(
        { error: 'ID Properti dan ID Kamar wajib diisi.' },
        { status: 400 }
      )
    }

    // 1. Ambil data properti & pemilik
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, name, owner_id')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json(
        { error: 'Properti tidak ditemukan.' },
        { status: 404 }
      )
    }

    if (!property.owner_id) {
      return NextResponse.json(
        { error: 'Pemilik properti belum terdaftar pada properti ini.' },
        { status: 400 }
      )
    }

    if (property.owner_id === user.id) {
      return NextResponse.json(
        { error: 'Anda adalah pemilik dari properti ini.' },
        { status: 400 }
      )
    }

    // 2. Ambil data kamar
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, occupant_member_id, is_active, room_members(user_id)')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Kamar tidak ditemukan.' },
        { status: 404 }
      )
    }

    const isOccupied =
      Boolean(room.occupant_member_id) ||
      (Array.isArray(room.room_members) && room.room_members.length > 0)

    if (isOccupied) {
      return NextResponse.json(
        { error: 'Kamar ini sudah memiliki penghuni.' },
        { status: 400 }
      )
    }

    // 3. Cek apakah user sudah punya pengajuan 'pending' untuk kamar ini
    const { data: existingNotif, error: notifCheckError } = await supabase
      .from('notifications')
      .select('id, status')
      .eq('from_user_id', user.id)
      .eq('room_id', roomId)
      .eq('type', 'room_application')
      .eq('status', 'pending')
      .maybeSingle()

    if (existingNotif) {
      return NextResponse.json(
        {
          error:
            'Anda sudah memiliki pengajuan sewa yang sedang diproses oleh pemilik untuk kamar ini.',
        },
        { status: 400 }
      )
    }

    // 4. Kirim notifikasi pengajuan sewa ke pemilik properti
    const userIdentifier = user.user_metadata?.display_name || user.email || 'Calon penghuni'
    const noteText = note?.trim() ? `Catatan pemohon: "${note.trim()}"` : ''
    const description = `User ${userIdentifier} mengajukan sewa untuk kamar ${room.name ?? 'kamar'}. ${noteText}`.trim()

    const { error: insertError } = await supabase.from('notifications').insert({
      to_user_id: property.owner_id,
      from_user_id: user.id,
      property_id: property.id,
      room_id: room.id,
      type: 'room_application',
      title: `Pengajuan Sewa: ${room.name ?? 'Kamar'}`,
      description,
      status: 'pending',
      read: false,
    })

    if (insertError) {
      console.error('Error inserting room_application notification:', insertError)
      if (insertError.message.includes('notifications')) {
        return NextResponse.json(
          {
            error:
              'Tabel notifications belum siap di database. Pastikan migrasi SQL di Supabase SQL Editor telah dijalankan.',
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: `Gagal mengirim pengajuan: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: `Pengajuan sewa untuk ${room.name ?? 'kamar'} berhasil dikirim ke pemilik properti!`,
    })
  } catch (err: unknown) {
    console.error('Unexpected error in /api/rooms/apply:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
