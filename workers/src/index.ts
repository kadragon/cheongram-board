// Trace: SPEC-migration-workers-1, TASK-workers-001.1

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types/env';
import { errorHandler } from './lib/errors';
import gamesRouter from './routes/games';
import rentalsRouter from './routes/rentals';
import scraperRouter from './routes/scrape';

/**
 * Cheongram Board Game Rental API
 *
 * Pure Cloudflare Workers implementation using Hono framework.
 * Migrated from Next.js + OpenNext to improve performance and simplify deployment.
 */
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*', // TODO: Configure proper CORS for production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Dev-User-Email', 'CF-Access-Authenticated-User-Email'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Cheongram Board API',
    version: '2.0.0',
    status: 'healthy',
    environment: c.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/api/games', gamesRouter);
app.route('/api/rentals', rentalsRouter);
app.route('/api/scrape', scraperRouter);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      userMessage: '요청한 엔드포인트를 찾을 수 없습니다.',
      timestamp: new Date().toISOString(),
    },
  }, 404);
});

// Global error handler
app.onError(errorHandler);

export default app;
