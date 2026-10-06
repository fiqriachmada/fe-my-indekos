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

    if (!propertyId) {
      return NextResponse.json(
        { error: 'ID Properti wajib diisi.' },
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

    let targetRoomName: string | null = null
    let targetRoomId: string | null = null

    // 2. Jika pemohon memilih kamar tertentu
    if (roomId) {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, name, occupant_member_id, is_active, room_members(user_id)')
        .eq('id', roomId)
        .eq('property_id', propertyId)
        .single()

      if (roomError || !room) {
        return NextResponse.json(
          { error: 'Kamar tidak ditemukan pada properti ini.' },
          { status: 404 }
        )
      }

      const isOccupied =
        Boolean(room.occupant_member_id) ||
        (Array.isArray(room.room_members) && room.room_members.length > 0)

      if (isOccupied) {
        return NextResponse.json(
          { error: 'Kamar ini sudah terisi oleh penghuni lain.' },
          { status: 400 }
        )
      }

      targetRoomName = room.name
      targetRoomId = room.id

      // Cek apakah user sudah punya pengajuan pending untuk kamar ini
      const { data: existingRoomNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('from_user_id', user.id)
        .eq('room_id', roomId)
        .eq('type', 'room_application')
        .eq('status', 'pending')
        .maybeSingle()

      if (existingRoomNotif) {
        return NextResponse.json(
          {
            error:
              'Anda sudah memiliki pengajuan sewa yang sedang diproses untuk kamar ini.',
          },
          { status: 400 }
        )
      }
    } else {
      // Jika user memilih untuk skip pilih kamar
      // Cek apakah user sudah punya pengajuan umum pending untuk properti ini
      const { data: existingPropNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('from_user_id', user.id)
        .eq('property_id', propertyId)
        .is('room_id', null)
        .eq('type', 'room_application')
        .eq('status', 'pending')
        .maybeSingle()

      if (existingPropNotif) {
        return NextResponse.json(
          {
            error:
              'Anda sudah memiliki pengajuan sewa umum yang sedang diproses oleh pemilik untuk properti ini.',
          },
          { status: 400 }
        )
      }
    }

    // 3. Susun data notifikasi pengajuan
    const userIdentifier =
      user.user_metadata?.display_name || user.email || 'Calon penghuni'
    const noteText = note?.trim() ? `Catatan pemohon: "${note.trim()}"` : ''

    const title = targetRoomName
      ? `Pengajuan Sewa: ${targetRoomName} - ${property.name}`
      : `Pengajuan Sewa Kamar: ${property.name} (Kamar Bebas)`

    const description = targetRoomName
      ? `User ${userIdentifier} mengajukan sewa untuk kamar ${targetRoomName}. ${noteText}`.trim()
      : `User ${userIdentifier} mengajukan sewa untuk properti ${property.name} (skip pilih kamar / penempatan ditentukan pemilik). ${noteText}`.trim()

    const { error: insertError } = await supabase.from('notifications').insert({
      to_user_id: property.owner_id,
      from_user_id: user.id,
      property_id: property.id,
      room_id: targetRoomId,
      type: 'room_application',
      title,
      description,
      status: 'pending',
      read: false,
    })

    if (insertError) {
      console.error('Error inserting room_application notification:', insertError)
      return NextResponse.json(
        {
          error:
            'Gagal menyimpan notifikasi pengajuan ke database: ' +
            insertError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: targetRoomName
        ? `Pengajuan sewa untuk ${targetRoomName} berhasil dikirim ke pemilik kos!`
        : `Pengajuan sewa (kamar ditentukan pengelola) berhasil dikirim ke pemilik kos!`,
    })
  } catch (err: unknown) {
    console.error('Unexpected error in /api/rooms/apply:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
