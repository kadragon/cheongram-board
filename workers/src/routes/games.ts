// Trace: SPEC-migration-workers-1, TASK-workers-001.5

/**
 * Games API Routes
 *
 * Endpoints for managing board game catalog.
 *
 * Routes:
 * - GET    /api/games       - List games with filters
 * - POST   /api/games       - Create new game (admin)
 * - GET    /api/games/:id   - Get single game
 * - PUT    /api/games/:id   - Update game (admin)
 * - DELETE /api/games/:id   - Delete game (admin)
 */

import { Hono } from 'hono';
import { D1Adapter } from '../lib/db';
import { requireAdmin } from '../lib/auth';
import { validateBody, validateQuery, gameCreateSchema, gameUpdateSchema, gameSearchSchema } from '../lib/validation';
import { createNotFoundError, handleDatabaseError, ErrorCode, createBusinessLogicError } from '../lib/errors';
import { createSuccessResponse, logRequest, logResponse, logError } from '../lib/utils/response';
import type { Env, Variables } from '../types/env';
import type { GameFilters } from '../lib/db/types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/games
 *
 * List games with optional filters and pagination.
 * Public endpoint (no authentication required).
 */
app.get('/', validateQuery(gameSearchSchema), async (c) => {
  const startTime = Date.now();

  try {
    logRequest('GET', '/api/games');

    const searchParams = c.get('validatedQuery' as any) as any;
    const adapter = new D1Adapter(c.env.DB);

    // Convert search params to GameFilters format
    const filters: GameFilters = {
      query: searchParams.query,
      min_players: searchParams.min_players,
      max_players: searchParams.max_players,
      min_play_time: searchParams.min_play_time,
      max_play_time: searchParams.max_play_time,
      complexity: searchParams.complexity,
      availability: searchParams.availability,
      sort_by: searchParams.sort_by,
      sort_order: searchParams.sort_order,
      page: searchParams.page || 1,
      limit: searchParams.limit || 20,
    };

    const result = await adapter.listGames(filters);

    const duration = Date.now() - startTime;
    logResponse('GET', '/api/games', 200, duration, {
      count: result.data.length,
      total: result.pagination.total,
    });

    return createSuccessResponse(c, result.data, {
      pagination: result.pagination,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('GET', '/api/games', 500, duration);
    logError('Games list error', error as Error);
    throw handleDatabaseError(error);
  }
});

/**
 * POST /api/games
 *
 * Create a new game.
 * Requires admin authentication.
 */
app.post('/', requireAdmin, validateBody(gameCreateSchema), async (c) => {
  const startTime = Date.now();

  try {
    logRequest('POST', '/api/games');

    const validatedData = c.get('validatedBody' as any) as any;
    const adapter = new D1Adapter(c.env.DB);
    const userEmail = c.get('userEmail');

    const newGame = await adapter.createGame(validatedData);

    const duration = Date.now() - startTime;
    logResponse('POST', '/api/games', 201, duration, {
      gameId: newGame.id,
      gameTitle: newGame.title,
      createdBy: userEmail,
    });

    return createSuccessResponse(c, newGame, {}, 201);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('POST', '/api/games', 500, duration);
    logError('Game creation error', error as Error);
    throw handleDatabaseError(error);
  }
});

/**
 * GET /api/games/:id
 *
 * Get a single game by ID.
 * Public endpoint (no authentication required).
 */
app.get('/:id', async (c) => {
  const startTime = Date.now();

  try {
    const idParam = c.req.param('id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Invalid game ID',
        '유효하지 않은 게임 ID입니다.'
      );
    }

    logRequest('GET', `/api/games/${id}`);

    const adapter = new D1Adapter(c.env.DB);
    const game = await adapter.getGame(id);

    if (!game) {
      throw createNotFoundError('Game', id);
    }

    const duration = Date.now() - startTime;
    logResponse('GET', `/api/games/${id}`, 200, duration);

    return createSuccessResponse(c, game);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('GET', `/api/games/:id`, 500, duration);
    logError('Game get error', error as Error);
    throw error; // Re-throw to let error handler handle it
  }
});

/**
 * PUT /api/games/:id
 *
 * Update a game.
 * Requires admin authentication.
 */
app.put('/:id', requireAdmin, validateBody(gameUpdateSchema), async (c) => {
  const startTime = Date.now();

  try {
    const idParam = c.req.param('id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Invalid game ID',
        '유효하지 않은 게임 ID입니다.'
      );
    }

    logRequest('PUT', `/api/games/${id}`);

    const validatedData = c.get('validatedBody' as any) as any;
    const adapter = new D1Adapter(c.env.DB);
    const userEmail = c.get('userEmail');

    const updatedGame = await adapter.updateGame(id, validatedData);

    if (!updatedGame) {
      throw createNotFoundError('Game', id);
    }

    const duration = Date.now() - startTime;
    logResponse('PUT', `/api/games/${id}`, 200, duration, {
      gameId: id,
      updatedBy: userEmail,
    });

    return createSuccessResponse(c, updatedGame);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('PUT', `/api/games/:id`, 500, duration);
    logError('Game update error', error as Error);
    throw handleDatabaseError(error);
  }
});

/**
 * DELETE /api/games/:id
 *
 * Delete a game.
 * Requires admin authentication.
 * Returns 400 if game has active rentals.
 */
app.delete('/:id', requireAdmin, async (c) => {
  const startTime = Date.now();

  try {
    const idParam = c.req.param('id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      throw createBusinessLogicError(
        ErrorCode.INVALID_OPERATION,
        'Invalid game ID',
        '유효하지 않은 게임 ID입니다.'
      );
    }

    logRequest('DELETE', `/api/games/${id}`);

    const adapter = new D1Adapter(c.env.DB);
    const userEmail = c.get('userEmail');

    // deleteGame checks for active rentals and throws error if needed
    const deleted = await adapter.deleteGame(id);

    if (!deleted) {
      throw createNotFoundError('Game', id);
    }

    const duration = Date.now() - startTime;
    logResponse('DELETE', `/api/games/${id}`, 204, duration, {
      gameId: id,
      deletedBy: userEmail,
    });

    return c.body(null, 204);
  } catch (error) {
    const duration = Date.now() - startTime;
    logResponse('DELETE', `/api/games/:id`, 500, duration);
    logError('Game delete error', error as Error);
    throw error; // Re-throw to let error handler handle it
  }
});

export default app;
