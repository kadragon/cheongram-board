// Trace: SPEC-migration-workers-1, TASK-workers-001.7

/**
 * Scraper API Route
 *
 * Endpoint for scraping game information from external websites.
 *
 * Routes:
 * - POST /api/scrape - Scrape game data from URL (admin)
 */

import { Hono } from 'hono';
import { requireAdmin } from '../lib/auth';
import { createValidationError, AppError, ErrorCode } from '../lib/errors';
import { createSuccessResponse, logRequest, logResponse, logError } from '../lib/utils/response';
import { scrapeGame } from '../lib/utils/scraper';
import type { Env, Variables } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Scraper endpoint requires admin access
app.use('*', requireAdmin);

/**
 * POST /api/scrape
 *
 * Scrape game information from a given URL.
 * Admin only.
 *
 * Body:
 * {
 *   "url": "https://koreaboardgames.com/..."
 * }
 */
app.post('/', async (c) => {
  const startTime = Date.now();

  try {
    logRequest('POST', '/api/scrape');

    const body = await c.req.json();
    const { url } = body;

    if (!url) {
      throw createValidationError('URL is required', 'url');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw createValidationError('Invalid URL format', 'url', url);
    }

    const userEmail = c.get('userEmail');
    const gameData = await scrapeGame(url);

    if (!gameData) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to scrape game data',
        '게임 정보를 가져올 수 없습니다. URL을 확인해주세요.',
        500
      );
    }

    const duration = Date.now() - startTime;
    logResponse('POST', '/api/scrape', 200, duration, {
      gameTitle: gameData.title,
      scrapedBy: userEmail,
    });

    return createSuccessResponse(c, gameData);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('POST', '/api/scrape', 500, duration);

    // Handle scraping-specific errors
    if (error instanceof Error && error.message.includes('Scraping failed')) {
      logError('Scraping error', error);
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        error.message,
        '웹사이트에서 게임 정보를 가져오는 중 오류가 발생했습니다.',
        500,
        { context: { originalError: error.message } }
      );
    }

    logError('Scrape API error', error as Error);
    throw error; // Re-throw to let error handler handle it
  }
});

export default app;
