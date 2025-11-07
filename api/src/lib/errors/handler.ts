// Trace: SPEC-migration-workers-1, TASK-workers-001.8

/**
 * Hono Error Handler
 *
 * Global error handler for Hono app that converts errors to consistent
 * JSON responses.
 */

import { Context } from 'hono';
import { AppError, isAppError, ErrorCode } from './errors';
import type { Env, Variables } from '../../types/env';

/**
 * Global error handler middleware for Hono
 *
 * Usage in index.ts:
 * ```typescript
 * import { errorHandler } from './lib/errors';
 * app.onError(errorHandler);
 * ```
 */
export function errorHandler(err: Error, c: Context<{ Bindings: Env; Variables: Variables }>) {
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  // Handle AppError (our custom errors)
  if (isAppError(err)) {
    return c.json(err.toJSON(), err.statusCode as any);
  }

  // Handle unknown errors
  const isDev = c.env.NODE_ENV === 'development';

  return c.json(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: isDev ? err.message : 'Internal server error',
        userMessage: '서버 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
        ...(isDev && { stack: err.stack }),
      },
    },
    500
  );
}

/**
 * Async error wrapper for route handlers
 *
 * Wraps async route handlers to catch errors and pass them to error handler.
 *
 * Usage:
 * ```typescript
 * app.get('/games', asyncHandler(async (c) => {
 *   const games = await db.listGames();
 *   return c.json({ data: games });
 * }));
 * ```
 */
export function asyncHandler(
  fn: (c: Context<{ Bindings: Env; Variables: Variables }>) => Promise<Response>
) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
    try {
      return await fn(c);
    } catch (error) {
      // Let Hono's error handler handle it
      throw error;
    }
  };
}
