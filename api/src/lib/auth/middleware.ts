// Trace: SPEC-migration-workers-1, TASK-workers-001.3, SPEC-auth-email-password-1, REQ-BE-003

/**
 * Authentication Middleware for Hono
 *
 * Provides authentication via JWT tokens.
 * Supports both production (JWT Bearer token) and
 * development (X-Dev-User-Email) modes for backward compatibility.
 */

import { Context, Next } from 'hono';
import type { Env, Variables } from '../../types/env';
import { verifyToken, extractBearerToken } from './jwt';

type AppContext = { Bindings: Env; Variables: Variables };

/**
 * Get authenticated user email from request headers
 *
 * Checks in priority order:
 * 1. JWT Bearer token in Authorization header (primary method)
 * 2. Development: X-Dev-User-Email header (for local testing only)
 * 3. Legacy: CF-Access-Authenticated-User-Email header (deprecated)
 */
export async function getAuthenticatedUserEmail(c: Context<AppContext>): Promise<string | null> {
  // 1. Check JWT Bearer token (primary authentication method)
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = extractBearerToken(authHeader);
    if (token) {
      const jwtSecret = c.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET not configured');
        return null;
      }

      const payload = await verifyToken(token, jwtSecret);
      if (payload && payload.email) {
        return payload.email;
      }
    }
  }

  // 2. Check development/staging override (allows manual header bypass)
  const allowDevHeader =
    c.env.NODE_ENV === 'development' || c.env.ALLOW_DEV_HEADER === 'true';

  if (allowDevHeader) {
    // Allow development header for local testing
    const devEmail = c.req.header('X-Dev-User-Email');
    if (devEmail) {
      return devEmail;
    }
  }

  // 3. Check Cloudflare Access header (legacy, deprecated)
  const cfEmail = c.req.header('CF-Access-Authenticated-User-Email');
  if (cfEmail) {
    return cfEmail;
  }

  return null;
}

/**
 * Check if the authenticated user is an admin
 *
 * Admin emails are configured via ADMIN_EMAILS environment variable.
 * Format: comma-separated list (e.g., "admin@example.com,admin2@example.com")
 */
export function isAdmin(c: Context<AppContext>, userEmail: string): boolean {
  const adminEmailsStr = c.env.ADMIN_EMAILS || '';

  const adminEmails = adminEmailsStr
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

  return adminEmails.includes(userEmail.toLowerCase());
}

/**
 * Middleware: Require authentication
 *
 * Returns 401 if user is not authenticated.
 * Stores user email in context for downstream use.
 */
export async function requireAuth(c: Context<AppContext>, next: Next) {
  const userEmail = await getAuthenticatedUserEmail(c);

  if (!userEmail) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          userMessage: '인증이 필요합니다.',
          timestamp: new Date().toISOString(),
        },
      },
      401
    );
  }

  // Store user email in context for downstream middleware/handlers
  c.set('userEmail', userEmail);

  await next();
}

/**
 * Middleware: Require admin access
 *
 * Returns 401 if user is not authenticated.
 * Returns 403 if user is authenticated but not an admin.
 * Stores user email in context for downstream use.
 */
export async function requireAdmin(c: Context<AppContext>, next: Next) {
  const userEmail = await getAuthenticatedUserEmail(c);

  if (!userEmail) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          userMessage: '인증이 필요합니다.',
          timestamp: new Date().toISOString(),
        },
      },
      401
    );
  }

  if (!isAdmin(c, userEmail)) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
          userMessage: '관리자 권한이 필요합니다.',
          timestamp: new Date().toISOString(),
        },
      },
      403
    );
  }

  // Store user email in context for downstream middleware/handlers
  c.set('userEmail', userEmail);

  await next();
}
