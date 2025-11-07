// Trace: SPEC-migration-workers-1, TASK-workers-001.1, SPEC-migration-pages-to-workers-1

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types/env';
import { errorHandler } from './lib/errors';
import gamesRouter from './routes/games';
import rentalsRouter from './routes/rentals';
import scraperRouter from './routes/scrape';

/**
 * Cheongram Board Game Rental - Unified Workers
 *
 * Integrated frontend (static assets) and backend (API) in a single Worker.
 * - Frontend: React SPA served via Workers Assets
 * - Backend: Hono API routes
 * - Database: D1
 */
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', logger());

/**
 * API Router
 *
 * All API routes under /api/* with CORS enabled
 */
const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS middleware (API only)
api.use('*', cors({
  origin: '*', // TODO: Configure proper CORS for production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Dev-User-Email', 'CF-Access-Authenticated-User-Email'],
}));

// Health check
api.get('/', (c) => {
  return c.json({
    name: 'Cheongram Board API',
    version: '3.0.0',
    status: 'healthy',
    environment: c.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API routes
api.route('/games', gamesRouter);
api.route('/rentals', rentalsRouter);
api.route('/scrape', scraperRouter);

// 404 handler for API
api.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found',
      userMessage: '요청한 API 엔드포인트를 찾을 수 없습니다.',
      timestamp: new Date().toISOString(),
    },
  }, 404);
});

// Mount API router
app.route('/api', api);

/**
 * Static Assets Handler
 *
 * Serve frontend static files (React SPA) via Workers Assets.
 * All non-API routes fall back to index.html for client-side routing.
 */
app.get('*', async (c) => {
  try {
    // Forward request to Workers Assets
    const response = await c.env.ASSETS.fetch(c.req.raw);

    // If asset found, return it
    if (response.status !== 404) {
      return response;
    }

    // SPA fallback: serve index.html for client-side routing
    const indexResponse = await c.env.ASSETS.fetch(new Request(`${new URL(c.req.url).origin}/index.html`));
    return new Response(indexResponse.body, {
      ...indexResponse,
      status: 200,
      headers: {
        ...Object.fromEntries(indexResponse.headers),
        'Content-Type': 'text/html;charset=UTF-8',
      },
    });
  } catch (error) {
    // If assets are not available (dev mode without build), show helpful message
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Frontend Not Built</title>
        </head>
        <body>
          <h1>Frontend Not Built</h1>
          <p>Please build the frontend first:</p>
          <pre>cd ../frontend && npm run build</pre>
          <p>Or run frontend dev server separately:</p>
          <pre>cd ../frontend && npm run dev</pre>
        </body>
      </html>
    `, 500);
  }
});

// Global error handler
app.onError(errorHandler);

export default app;
