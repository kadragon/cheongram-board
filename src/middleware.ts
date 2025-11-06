import { createClient } from '@/utils/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { auditLogger } from '@/lib/logging/audit'
import { performanceMonitor } from '@/lib/monitoring/performance'
import { logger } from '@/lib/logging/logger'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { supabase, response } = createClient(request)

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Log request for monitoring
    const requestMetadata = {
      method: request.method,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userId: user?.id,
    }

    // If the user is trying to access an admin route
    if (request.nextUrl.pathname.startsWith('/admin')) {
      // If the user is not logged in, redirect to the login page
      if (!user) {
        auditLogger.logAccessDenied(
          undefined,
          'admin_route',
          'access',
          {
            path: request.nextUrl.pathname,
            reason: 'not_authenticated',
            ip: requestMetadata.ip,
            userAgent: requestMetadata.userAgent,
          }
        )
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
        auditLogger.logAccessDenied(
          user.id,
          'admin_route',
          'access',
          {
            path: request.nextUrl.pathname,
            reason: 'insufficient_privileges',
            ip: requestMetadata.ip,
            userAgent: requestMetadata.userAgent,
          }
        )
        return NextResponse.redirect(new URL('/', request.url))
      }

      // Log successful admin access
      logger.info('Admin route accessed', {
        userId: user.id,
        path: request.nextUrl.pathname,
        ip: requestMetadata.ip,
      })
    }

    // Record performance metrics
    const duration = Date.now() - startTime
    performanceMonitor.recordMetric({
      name: 'middleware_execution_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      context: 'middleware',
      metadata: {
        path: request.nextUrl.pathname,
        authenticated: !!user,
        isAdmin: request.nextUrl.pathname.startsWith('/admin'),
      },
    })

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Middleware error', error as Error, {
      path: request.nextUrl.pathname,
      duration,
    })
    
    // Continue with the request even if middleware fails
    return response
  }
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