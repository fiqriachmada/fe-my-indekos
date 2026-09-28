import { updateSession } from '@/lib/supabase/proxy'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl
  const code = searchParams.get('code')

  // Safety net: jika Supabase fallback me-redirect ke root "/" membawa ?code=
  if (code && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    url.searchParams.set('next', '/create-password')
    return NextResponse.redirect(url)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
