import { NextResponse, type NextRequest } from 'next/server'
import { auditLogger } from '@/lib/logging/audit'
import { performanceMonitor } from '@/lib/monitoring/performance'
import { logger } from '@/lib/logging/logger'
import { getAuthenticatedUserEmail, checkCloudflareAccessAdmin } from '@/utils/auth'

/**
 * Middleware for Cloudflare Access authentication
 *
 * This middleware:
 * 1. Checks authentication via Cloudflare Access headers
 * 2. Protects /admin routes by verifying admin status
 * 3. Logs access attempts and performance metrics
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now()

  try {
    const userEmail = getAuthenticatedUserEmail(request)

    // Log request for monitoring
    const requestMetadata = {
      method: request.method,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userId: userEmail,
    }

    // If the user is trying to access an admin route
    if (request.nextUrl.pathname.startsWith('/admin')) {
      // If the user is not authenticated, redirect to unauthorized page
      if (!userEmail) {
        auditLogger.logAccessDenied(
          'unknown',
          'admin_route',
          'access',
          {
            path: request.nextUrl.pathname,
            reason: 'not_authenticated',
            ip: requestMetadata.ip,
            userAgent: requestMetadata.userAgent,
          }
        )
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check if the user is an admin
      const isAdmin = checkCloudflareAccessAdmin(request)

      // If the user is not an admin, return forbidden
      if (!isAdmin) {
        auditLogger.logAccessDenied(
          userEmail,
          'admin_route',
          'access',
          {
            path: request.nextUrl.pathname,
            reason: 'insufficient_privileges',
            ip: requestMetadata.ip,
            userAgent: requestMetadata.userAgent,
          }
        )
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      }

      // Log successful admin access
      logger.info('Admin route accessed', {
        userId: userEmail,
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
        authenticated: !!userEmail,
        isAdmin: request.nextUrl.pathname.startsWith('/admin'),
      },
    })

    return NextResponse.next()
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Middleware error', error as Error, {
      path: request.nextUrl.pathname,
      duration,
    })

    // Continue with the request even if middleware fails
    return NextResponse.next()
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