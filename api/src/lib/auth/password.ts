// Trace: SPEC-auth-email-password-1, SEC-001

/**
 * Password Hashing Utilities
 *
 * Provides secure password hashing and verification using bcrypt.
 */

import bcrypt from 'bcryptjs';

/**
 * Hash a plain text password using bcrypt
 *
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a plain text password against a hashed password
 *
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database/env
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
