// Trace: SPEC-auth-email-password-1, REQ-BE-001

/**
 * Authentication Routes
 *
 * Provides login/logout endpoints for admin authentication.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, Variables } from '../types/env';
import { generateToken } from '../lib/auth/jwt';
import { verifyPassword } from '../lib/auth/password';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Login Request Schema
 */
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login
 *
 * Authenticate admin user with email and password.
 * Returns JWT token on success.
 */
app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // Get admin credentials from environment
  const adminEmails = c.env.ADMIN_EMAILS || '';
  const adminPassword = c.env.ADMIN_PASSWORD;
  const jwtSecret = c.env.JWT_SECRET;

  // Fail fast if critical secrets are missing
  if (!jwtSecret) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'JWT secret not configured',
          userMessage: 'Authentication system is not properly configured',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }

  if (!adminPassword) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Admin password not configured',
          userMessage: 'Authentication system is not properly configured',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }

  // Validate email is in admin list
  const adminEmailList = adminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (!adminEmailList.includes(email.toLowerCase())) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          userMessage: '이메일 또는 비밀번호가 올바르지 않습니다.',
          timestamp: new Date().toISOString(),
        },
      },
      401
    );
  }

  // Validate password using bcrypt
  const isPasswordValid = await verifyPassword(password, adminPassword);
  if (!isPasswordValid) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          userMessage: '이메일 또는 비밀번호가 올바르지 않습니다.',
          timestamp: new Date().toISOString(),
        },
      },
      401
    );
  }

  // Generate JWT token
  const token = await generateToken(email, jwtSecret);
  const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  return c.json(
    {
      data: {
        token,
        email,
        expiresIn,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    200
  );
});

/**
 * POST /api/auth/logout
 *
 * Optional logout endpoint. Logout is primarily handled client-side
 * by removing the JWT token from localStorage.
 */
app.post('/logout', async (c) => {
  return c.json(
    {
      data: {
        message: 'Logged out successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    200
  );
});

export default app;
