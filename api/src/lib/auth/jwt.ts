// Trace: SPEC-auth-email-password-1, REQ-BE-002

/**
 * JWT Utilities for Cloudflare Workers
 *
 * Provides JWT token generation and verification using Web Crypto API.
 */

import jwt from '@tsndr/cloudflare-worker-jwt';

export interface JWTPayload {
  email: string;
  iat: number;  // Issued at
  exp: number;  // Expiration
}

/**
 * Generate a JWT token for an authenticated admin user
 *
 * @param email - Admin email address
 * @param secret - JWT secret key
 * @returns JWT token string
 */
export async function generateToken(
  email: string,
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  const payload: JWTPayload = {
    email,
    iat: now,
    exp: now + expiresIn,
  };

  const token = await jwt.sign(payload, secret, { algorithm: 'HS256' });
  return token;
}

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT token string
 * @param secret - JWT secret key
 * @returns Decoded payload if valid, null if invalid or expired
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    // Verify token signature and expiration
    // Note: jwt.verify() already checks expiration automatically
    const isValid = await jwt.verify(token, secret, { algorithm: 'HS256' });

    if (!isValid) {
      return null;
    }

    // Decode payload
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.payload) {
      return null;
    }

    const payload = decoded.payload as JWTPayload;

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Extract Bearer token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token string if valid format, null otherwise
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
