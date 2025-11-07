// Trace: SPEC-migration-workers-1, TASK-workers-001.3

/**
 * Authentication Middleware for Hono
 *
 * Provides authentication via Cloudflare Access headers.
 * Supports both production (CF-Access-Authenticated-User-Email) and
 * development (X-Dev-User-Email) modes.
 */

import { Context, Next } from 'hono';
import type { Env, Variables } from '../../types/env';

type AppContext = { Bindings: Env; Variables: Variables };

/**
 * Get authenticated user email from request headers
 *
 * Checks:
 * 1. Production: CF-Access-Authenticated-User-Email header (set by Cloudflare Access)
 * 2. Development: X-Dev-User-Email header (for local testing)
 */
export function getAuthenticatedUserEmail(c: Context<AppContext>): string | null {
  // Check Cloudflare Access header (production)
  const cfEmail = c.req.header('CF-Access-Authenticated-User-Email');
  if (cfEmail) {
    return cfEmail;
  }

  // Check development mode
  const isDevMode = c.env.NODE_ENV === 'development';

  if (isDevMode) {
    // Allow development header for local testing
    const devEmail = c.req.header('X-Dev-User-Email');
    if (devEmail) {
      return devEmail;
    }
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
  const userEmail = getAuthenticatedUserEmail(c);

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
  const userEmail = getAuthenticatedUserEmail(c);

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
