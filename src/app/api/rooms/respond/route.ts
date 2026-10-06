import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationId, action, assignedRoomId } = body

    if (!notificationId || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { error: 'Parameter tidak valid: notificationId dan action wajib diisi.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Ambil data notifikasi
    const { data: notif, error: notifError } = await admin
      .from('notifications')
      .select('*, property:properties(id, name, owner_id), room:rooms(id, name)')
      .eq('id', notificationId)
      .maybeSingle()

    if (notifError || !notif) {
      return NextResponse.json(
        { error: 'Notifikasi tidak ditemukan.' },
        { status: 404 }
      )
    }

    if (notif.status !== 'pending') {
      return NextResponse.json(
        { error: `Pemberitahuan ini sudah pernah diproses (${notif.status}).` },
        { status: 400 }
      )
    }

    // Role occupant ID
    const { data: roleData } = await admin
      .from('roles')
      .select('id')
      .eq('name', 'occupant')
      .maybeSingle()
    const occupantRoleId = roleData?.id ?? null

    const finalRoomId = notif.room_id || assignedRoomId || null

    if (notif.type === 'room_application') {
      // Kasus 1: Calon Penghuni mengajukan sewa -> Ditanggapi oleh Owner
      const isOwner =
        notif.to_user_id === user.id || notif.property?.owner_id === user.id
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Hanya pemilik properti yang dapat menanggapi pengajuan sewa ini.' },
          { status: 403 }
        )
      }

      const tenantUserId = notif.from_user_id

      if (action === 'approved') {
        if (finalRoomId && tenantUserId) {
          // 1. Daftarkan tenant ke room_members
          await admin.from('room_members').upsert(
            {
              room_id: finalRoomId,
              user_id: tenantUserId,
              role_id: occupantRoleId,
            },
            { onConflict: 'room_id,user_id' }
          )

          // 2. Pastikan terdaftar di property_members (untuk kompatibilitas PMS)
          const { data: existingPM } = await admin
            .from('property_members')
            .select('id')
            .eq('property_id', notif.property_id)
            .eq('user_id', tenantUserId)
            .maybeSingle()

          let memberId = existingPM?.id
          if (!existingPM && occupantRoleId) {
            const { data: newPM } = await admin
              .from('property_members')
              .insert({
                property_id: notif.property_id,
                user_id: tenantUserId,
                role_id: occupantRoleId,
              })
              .select('id')
              .single()
            memberId = newPM?.id
          }

          // 3. Update occupant_member_id pada rooms jika ada memberId
          if (memberId) {
            await admin
              .from('rooms')
              .update({ occupant_member_id: memberId })
              .eq('id', finalRoomId)
          }
        }

        // Update notifikasi pengajuan
        await admin
          .from('notifications')
          .update({
            status: 'approved',
            read: true,
            room_id: finalRoomId,
            responded_at: new Date().toISOString(),
          })
          .eq('id', notificationId)

        // Kirim notifikasi konfirmasi ke calon penyewa
        if (tenantUserId) {
          let roomName = notif.room?.name
          if (finalRoomId && !roomName) {
            const { data: rData } = await admin
              .from('rooms')
              .select('name')
              .eq('id', finalRoomId)
              .single()
            roomName = rData?.name
          }
          await admin.from('notifications').insert({
            to_user_id: tenantUserId,
            from_user_id: user.id,
            property_id: notif.property_id,
            room_id: finalRoomId,
            type: 'room_approved',
            title: 'Pengajuan Sewa Disetujui!',
            description: `Selamat! Pengajuan sewa Anda untuk ${
              roomName ? `kamar ${roomName}` : 'kamar'
            } di ${notif.property?.name ?? 'properti'} telah disetujui oleh pemilik.`,
            status: 'approved',
            read: false,
          })
        }
      } else {
        // Ditolak oleh owner
        await admin
          .from('notifications')
          .update({
            status: 'rejected',
            read: true,
            responded_at: new Date().toISOString(),
          })
          .eq('id', notificationId)

        if (tenantUserId) {
          await admin.from('notifications').insert({
            to_user_id: tenantUserId,
            from_user_id: user.id,
            property_id: notif.property_id,
            room_id: notif.room_id,
            type: 'room_rejected',
            title: 'Pengajuan Sewa Ditolak',
            description: `Mohon maaf, permohonan sewa untuk ${
              notif.property?.name ?? 'properti'
            } belum dapat diterima oleh pemilik saat ini.`,
            status: 'rejected',
            read: false,
          })
        }
      }
    } else if (notif.type === 'room_assignment') {
      // Kasus 2: Owner menugaskan kamar -> Ditanggapi oleh Penghuni
      if (notif.to_user_id !== user.id) {
        return NextResponse.json(
          { error: 'Hanya calon penghuni yang dituju yang dapat merespon tawaran penempatan ini.' },
          { status: 403 }
        )
      }

      if (action === 'approved') {
        if (notif.room_id) {
          // 1. Daftarkan ke room_members
          await admin.from('room_members').upsert(
            {
              room_id: notif.room_id,
              user_id: user.id,
              role_id: occupantRoleId,
            },
            { onConflict: 'room_id,user_id' }
          )

          // 2. Pastikan property_members ada
          const { data: existingPM } = await admin
            .from('property_members')
            .select('id')
            .eq('property_id', notif.property_id)
            .eq('user_id', user.id)
            .maybeSingle()

          let memberId = existingPM?.id
          if (!existingPM && occupantRoleId) {
            const { data: newPM } = await admin
              .from('property_members')
              .insert({
                property_id: notif.property_id,
                user_id: user.id,
                role_id: occupantRoleId,
              })
              .select('id')
              .single()
            memberId = newPM?.id
          }

          if (memberId) {
            await admin
              .from('rooms')
              .update({ occupant_member_id: memberId })
              .eq('id', notif.room_id)
          }
        }

        await admin
          .from('notifications')
          .update({
            status: 'approved',
            read: true,
            responded_at: new Date().toISOString(),
          })
          .eq('id', notificationId)

        if (notif.from_user_id) {
          await admin.from('notifications').insert({
            to_user_id: notif.from_user_id,
            from_user_id: user.id,
            property_id: notif.property_id,
            room_id: notif.room_id,
            type: 'room_assignment_accepted',
            title: 'Penghuni Menerima Penempatan Kamar',
            description: `Penghuni telah menyetujui tawaran penempatan untuk ${
              notif.room?.name ? `kamar ${notif.room.name}` : 'kamar'
            } di ${notif.property?.name ?? 'properti'}.`,
            status: 'approved',
            read: false,
          })
        }
      } else {
        // Ditolak oleh calon penghuni
        if (notif.room_id) {
          await admin
            .from('rooms')
            .update({ occupant_member_id: null })
            .eq('id', notif.room_id)

          await admin
            .from('room_members')
            .delete()
            .eq('room_id', notif.room_id)
            .eq('user_id', user.id)
        }

        await admin
          .from('notifications')
          .update({
            status: 'rejected',
            read: true,
            responded_at: new Date().toISOString(),
          })
          .eq('id', notificationId)

        if (notif.from_user_id) {
          await admin.from('notifications').insert({
            to_user_id: notif.from_user_id,
            from_user_id: user.id,
            property_id: notif.property_id,
            room_id: notif.room_id,
            type: 'room_assignment_rejected',
            title: 'Penghuni Menolak Penempatan Kamar',
            description: `Penghuni menolak tawaran penempatan untuk ${
              notif.room?.name ? `kamar ${notif.room.name}` : 'kamar'
            } di ${notif.property?.name ?? 'properti'}.`,
            status: 'rejected',
            read: false,
          })
        }
      }
    } else {
      // Notifikasi umum lainnya
      await admin
        .from('notifications')
        .update({
          status: action,
          read: true,
          responded_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
    }

    return NextResponse.json({ ok: true, action })
  } catch (err: unknown) {
    console.error('Error in /api/rooms/respond:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
