import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const origin = request.nextUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const meta = user.user_metadata ?? {}
        const firstName = meta.first_name ?? null
        const lastName = meta.last_name ?? null
        const displayName =
          meta.display_name ?? [firstName, lastName].filter(Boolean).join(' ') ?? null
        if (firstName || lastName || displayName) {
          await supabase.from('profiles').upsert(
            {
              id: user.id,
              first_name: firstName,
              last_name: lastName,
              display_name: displayName,
            },
            { onConflict: 'id' }
          )
        }
      }
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
