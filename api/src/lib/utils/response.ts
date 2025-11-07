// Trace: SPEC-migration-workers-1, TASK-workers-001.5

/**
 * Response Utility Functions
 *
 * Helpers for creating standardized API responses.
 */

import { Context } from 'hono';

/**
 * Create a success response with data and metadata
 *
 * Format:
 * {
 *   data: T,
 *   meta: {
 *     timestamp: string,
 *     pagination?: { page, limit, total, totalPages },
 *     ...
 *   }
 * }
 */
export function createSuccessResponse<T>(
  c: Context,
  data: T,
  meta?: Record<string, any>,
  status: number = 200
) {
  return c.json(
    {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    status as any
  );
}

/**
 * Simple logging helper for Workers
 *
 * In production, these logs are collected by Cloudflare Logs.
 */
export function logRequest(method: string, path: string, extra?: Record<string, any>) {
  console.log(
    JSON.stringify({
      type: 'request',
      method,
      path,
      timestamp: new Date().toISOString(),
      ...extra,
    })
  );
}

export function logResponse(
  method: string,
  path: string,
  status: number,
  duration: number,
  extra?: Record<string, any>
) {
  console.log(
    JSON.stringify({
      type: 'response',
      method,
      path,
      status,
      duration,
      timestamp: new Date().toISOString(),
      ...extra,
    })
  );
}

export function logError(message: string, error: Error, extra?: Record<string, any>) {
  console.error(
    JSON.stringify({
      type: 'error',
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...extra,
    })
  );
}
