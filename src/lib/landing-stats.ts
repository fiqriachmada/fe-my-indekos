import { createAdminClient } from "@/lib/supabase/admin"

export type IndekosLandingStats = {
  totalProperties: number
  totalRooms: number
  availableRooms: number
  occupiedRooms: number
  totalMembers: number
}

export async function getIndekosLandingStats(): Promise<IndekosLandingStats> {
  try {
    const admin = createAdminClient()

    // 1. Ambil properti kos aktif
    const { data: properties, error: propError } = await admin
      .from("properties")
      .select("id, status_id, is_active")
      .or("status_id.eq.1,and(status_id.is.null,is_active.eq.true)")

    if (propError) {
      console.error("Error fetching properties stats:", propError)
    }

    const totalProperties = (properties || []).length

    // 2. Ambil kamar dan statusnya
    const { data: rooms, error: roomError } = await admin
      .from("rooms")
      .select("id, occupant_member_id, status_id, is_active")
      .or("status_id.eq.1,and(status_id.is.null,is_active.eq.true)")

    if (roomError) {
      console.error("Error fetching rooms stats:", roomError)
    }

    const roomList = rooms || []
    const totalRooms = roomList.length
    const occupiedRooms = roomList.filter((r) => Boolean(r.occupant_member_id)).length
    const availableRooms = Math.max(0, totalRooms - occupiedRooms)

    // 3. Ambil count total member / penyewa aktif
    const { count: membersCount, error: memberError } = await admin
      .from("room_members")
      .select("id", { count: "exact", head: true })

    if (memberError) {
      console.error("Error fetching room members count:", memberError)
    }

    return {
      totalProperties,
      totalRooms,
      availableRooms,
      occupiedRooms,
      totalMembers: membersCount || 0,
    }
  } catch (err) {
    console.error("Failed to get indekos landing stats:", err)
    return {
      totalProperties: 0,
      totalRooms: 0,
      availableRooms: 0,
      occupiedRooms: 0,
      totalMembers: 0,
    }
  }
}
