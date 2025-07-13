import { createClient } from '@/utils/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If the user is trying to access an admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // If the user is not logged in, redirect to the login page
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check if the user is an admin
    const { data: userDetails } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    // If the user is not an admin, redirect to the home page
    if (!userDetails?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}