import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Sesi tidak ditemukan.' },
        { status: 401 }
      )
    }

    const metadata = user.user_metadata ?? {}

    const [profileRes, ownedRes, memberRes, roomRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name, username, avatar_url, phone, account_status')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('properties').select('id').eq('owner_id', user.id).limit(1),
      supabase
        .from('property_members')
        .select('role:roles(name)')
        .eq('user_id', user.id)
        .returns<{ role: { name: string } | null }[]>(),
      supabase.from('room_members').select('room_id').eq('user_id', user.id).limit(1),
    ])

    const profile = profileRes.data

    const firstName =
      (typeof profile?.first_name === 'string' && profile.first_name) ||
      (typeof metadata.first_name === 'string' && metadata.first_name) ||
      ''

    const lastName =
      (typeof profile?.last_name === 'string' && profile.last_name) ||
      (typeof metadata.last_name === 'string' && metadata.last_name) ||
      ''

    const displayName =
      (typeof profile?.display_name === 'string' && profile.display_name) ||
      (typeof metadata.display_name === 'string' && metadata.display_name) ||
      [firstName, lastName].filter(Boolean).join(' ') ||
      ''

    const rolesSet = new Set<string>()

    if ((ownedRes.data?.length ?? 0) > 0) {
      rolesSet.add('Owner')
    }

    for (const item of memberRes.data ?? []) {
      const roleName = item.role?.name
      if (roleName) {
        const formatted =
          roleName === 'property-admin'
            ? 'Property Admin'
            : roleName.charAt(0).toUpperCase() + roleName.slice(1)
        rolesSet.add(formatted)
      }
    }

    if ((roomRes.data?.length ?? 0) > 0) {
      rolesSet.add('Occupant')
    }

    if (rolesSet.size === 0 && typeof metadata.role === 'string' && metadata.role.trim()) {
      rolesSet.add(metadata.role.charAt(0).toUpperCase() + metadata.role.slice(1))
    }

    const roles = rolesSet.size > 0 ? Array.from(rolesSet) : ['User']

    const mergedProfile = {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      username: profile?.username || (metadata.username as string) || null,
      avatar_url: profile?.avatar_url || (metadata.avatar_url as string) || null,
      phone: profile?.phone || (metadata.phone as string) || null,
      account_status: profile?.account_status ?? 'active',
      roles,
    }

    return NextResponse.json({
      profile: mergedProfile,
      email: user.email ?? '',
      roles,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Sesi tidak ditemukan.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { first_name, last_name, display_name, avatar_url } = body

    const updates: Record<string, unknown> = {}
    if (first_name !== undefined) updates.first_name = first_name
    if (last_name !== undefined) updates.last_name = last_name
    if (display_name !== undefined) updates.display_name = display_name
    if (avatar_url !== undefined) updates.avatar_url = avatar_url

    if (Object.keys(updates).length > 0) {
      const { error: dbError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      if (dbError) throw dbError
    }

    const authMetadataUpdates: Record<string, unknown> = {}
    if (first_name !== undefined) authMetadataUpdates.first_name = first_name
    if (last_name !== undefined) authMetadataUpdates.last_name = last_name
    if (display_name !== undefined) authMetadataUpdates.display_name = display_name
    if (avatar_url !== undefined) authMetadataUpdates.avatar_url = avatar_url

    if (Object.keys(authMetadataUpdates).length > 0) {
      await supabase.auth.updateUser({
        data: authMetadataUpdates,
      })
    }

    return NextResponse.json({ success: true, message: 'Profile updated' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
