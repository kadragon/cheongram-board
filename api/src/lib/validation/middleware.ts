// Trace: SPEC-migration-workers-1, TASK-workers-001.4

/**
 * Validation Middleware for Hono
 *
 * Provides request body and query validation using Zod schemas.
 */

import { Context, Next } from 'hono';
import { z, ZodSchema } from 'zod';
import type { Env, Variables } from '../../types/env';

type AppContext = { Bindings: Env; Variables: Variables };

/**
 * Validate request body against a Zod schema
 *
 * Usage:
 * ```typescript
 * app.post('/games', validateBody(gameCreateSchema), async (c) => {
 *   const data = c.get('validatedBody');
 *   // data is type-safe!
 * });
 * ```
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (c: Context<AppContext>, next: Next) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);

      // Store validated data in context
      c.set('validatedBody' as any, validatedData);

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              userMessage: '입력 데이터가 유효하지 않습니다.',
              timestamp: new Date().toISOString(),
              details: error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              })),
            },
          },
          400
        );
      }

      // Re-throw non-validation errors
      throw error;
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 *
 * Usage:
 * ```typescript
 * app.get('/games', validateQuery(gameSearchSchema), async (c) => {
 *   const filters = c.get('validatedQuery');
 *   // filters is type-safe!
 * });
 * ```
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (c: Context<AppContext>, next: Next) => {
    try {
      const query = c.req.query();

      // Convert query strings to appropriate types
      const parsedQuery = Object.entries(query).reduce((acc, [key, value]) => {
        // Try to parse numbers
        if (!isNaN(Number(value))) {
          acc[key] = Number(value);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      const validatedData = schema.parse(parsedQuery);

      // Store validated data in context
      c.set('validatedQuery' as any, validatedData);

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Query validation failed',
              userMessage: '검색 조건이 유효하지 않습니다.',
              timestamp: new Date().toISOString(),
              details: error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              })),
            },
          },
          400
        );
      }

      // Re-throw non-validation errors
      throw error;
    }
  };
}
