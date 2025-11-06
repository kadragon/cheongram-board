import { NextRequest } from "next/server";

/**
 * Cloudflare Access Authentication Utilities
 *
 * Cloudflare Access provides authentication via request headers:
 * - CF-Access-Authenticated-User-Email: Authenticated user's email
 *
 * Admin access is determined by checking against ADMIN_EMAILS environment variable
 */

/**
 * Get authenticated user email from Cloudflare Access headers
 */
export function getAuthenticatedUserEmail(request: NextRequest): string | null {
  // In production, Cloudflare Access sets this header
  const email = request.headers.get('CF-Access-Authenticated-User-Email');

  if (email) {
    return email;
  }

  // For local development, allow bypass with a development header
  if (process.env.NODE_ENV === 'development') {
    const devEmail = request.headers.get('X-Dev-User-Email');
    if (devEmail) {
      return devEmail;
    }
  }

  return null;
}

/**
 * Check if the current user is authenticated
 */
export function isAuthenticated(request: NextRequest): boolean {
  return getAuthenticatedUserEmail(request) !== null;
}

/**
 * Check if the authenticated user is an admin
 *
 * Admin emails are configured via ADMIN_EMAILS environment variable
 * Format: comma-separated list of emails (e.g., "admin@example.com,admin2@example.com")
 */
export function checkCloudflareAccessAdmin(request: NextRequest): boolean {
  const userEmail = getAuthenticatedUserEmail(request);

  if (!userEmail) {
    return false;
  }

  // Get admin emails from environment variable
  const adminEmailsStr = process.env.ADMIN_EMAILS || '';
  const adminEmails = adminEmailsStr
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);

  // Check if user email is in admin list
  return adminEmails.includes(userEmail.toLowerCase());
}

/**
 * Legacy function for backward compatibility with Supabase code
 * @deprecated Use checkCloudflareAccessAdmin instead
 */
export async function checkAdmin(supabase: any) {
  // This function is deprecated and should not be used
  // Kept for backward compatibility during migration
  throw new Error('checkAdmin(supabase) is deprecated. Use checkCloudflareAccessAdmin(request) instead.');
}
