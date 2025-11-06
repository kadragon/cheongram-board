import { NextResponse, NextRequest } from "next/server";
import { getAuthenticatedUserEmail, checkCloudflareAccessAdmin } from "@/utils/auth";

/**
 * Debug endpoint to check auth status
 * TEMPORARY - for debugging auth issues
 */
export async function GET(request: NextRequest) {
  const userEmail = getAuthenticatedUserEmail(request);
  const isAdmin = checkCloudflareAccessAdmin(request);

  const host = request.headers.get('host');
  const devHeader = request.headers.get('X-Dev-User-Email');
  const cfHeader = request.headers.get('CF-Access-Authenticated-User-Email');

  // Try to get Cloudflare context
  let cloudflareEnv = null;
  try {
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    cloudflareEnv = {
      hasContext: !!cloudflareContext,
      hasEnv: !!cloudflareContext?.env,
      adminEmails: cloudflareContext?.env?.ADMIN_EMAILS,
      nodeEnv: cloudflareContext?.env?.NODE_ENV,
    };
  } catch (e) {
    cloudflareEnv = { error: String(e) };
  }

  return NextResponse.json({
    auth: {
      userEmail,
      isAdmin,
    },
    headers: {
      host,
      devHeader,
      cfHeader,
    },
    processEnv: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTJS_ENV: process.env.NEXTJS_ENV,
      ADMIN_EMAILS: process.env.ADMIN_EMAILS ? '***exists***' : undefined,
    },
    cloudflareEnv,
  });
}
