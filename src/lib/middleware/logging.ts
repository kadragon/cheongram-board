/**
 * Logging Middleware for API Routes
 * Automatically adds request/response logging and performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logging/logger';
import { performanceMonitor } from '@/lib/monitoring/performance';

export interface LoggingMiddlewareOptions {
  logRequests?: boolean;
  logResponses?: boolean;
  logPerformance?: boolean;
  logBody?: boolean;
  excludePaths?: string[];
  sensitiveFields?: string[];
}

/**
 * Creates a logging middleware wrapper for API routes
 */
export const withLogging = (
  handler: (request: NextRequest, context?: any) => Promise<Response>,
  options: LoggingMiddlewareOptions = {}
) => {
  const {
    logRequests = true,
    logResponses = true,
    logPerformance = true,
    logBody = false,
    excludePaths = [],
    sensitiveFields = ['password', 'token', 'secret', 'key']
  } = options;

  return async (request: NextRequest, context?: any): Promise<Response> => {
    const startTime = Date.now();
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    // Skip logging for excluded paths
    if (excludePaths.some(excludePath => path.includes(excludePath))) {
      return handler(request, context);
    }

    // Generate request ID for tracing
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    try {
      // Log incoming request
      if (logRequests) {
        const requestMetadata: any = {
          requestId,
          method,
          path,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          query: Object.fromEntries(url.searchParams.entries()),
        };

        // Log request body if enabled (be careful with sensitive data)
        if (logBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
          try {
            const body = await request.clone().json();
            // Remove sensitive fields
            const sanitizedBody = sanitizeObject(body, sensitiveFields);
            requestMetadata.body = sanitizedBody;
          } catch {
            // Body might not be JSON, skip logging it
          }
        }

        apiLogger.apiRequest(method, path, requestMetadata);
      }

      // Execute the handler with performance monitoring
      let response: Response;
      
      if (logPerformance) {
        response = await performanceMonitor.measureAsync(
          `api_${method.toLowerCase()}_${path.replace(/\//g, '_')}`,
          () => handler(request, context),
          'api',
          { requestId, method, path }
        );
      } else {
        response = await handler(request, context);
      }

      const duration = Date.now() - startTime;

      // Log response
      if (logResponses) {
        const responseMetadata = {
          requestId,
          method,
          path,
          statusCode: response.status,
          duration,
        };

        apiLogger.apiResponse(method, path, response.status, duration);

        // Log additional details for errors
        if (response.status >= 400) {
          try {
            const responseBody = await response.clone().text();
            apiLogger.error(`API Error ${method} ${path}`, undefined, {
              ...responseMetadata,
              responseBody: responseBody.substring(0, 500), // Truncate long responses
            });
          } catch {
            // Response body might not be readable
          }
        }
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      apiLogger.error(`API Exception ${method} ${path}`, error as Error, {
        requestId,
        method,
        path,
        duration,
      });

      // Re-throw the error to be handled by the error handler
      throw error;
    }
  };
};

/**
 * Sanitizes an object by removing sensitive fields
 */
function sanitizeObject(obj: any, sensitiveFields: string[]): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveFields));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Express-style middleware for Next.js API routes
 */
export const createLoggingMiddleware = (options: LoggingMiddlewareOptions = {}) => {
  return (handler: Function) => withLogging(handler as any, options);
};

/**
 * Middleware specifically for monitoring database operations
 */
export const withDatabaseLogging = <T>(
  operation: () => Promise<T>,
  operationName: string,
  metadata?: Record<string, any>
): Promise<T> => {
  return performanceMonitor.measureAsync(
    `db_${operationName}`,
    operation,
    'database',
    metadata
  );
};

/**
 * Memory usage monitoring middleware
 */
export const withMemoryMonitoring = (
  handler: (request: NextRequest, context?: any) => Promise<Response>
) => {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    // Record memory usage before request
    performanceMonitor.recordMemoryUsage('before_request');

    try {
      const response = await handler(request, context);
      
      // Record memory usage after request
      performanceMonitor.recordMemoryUsage('after_request');
      
      return response;
    } catch (error) {
      // Record memory usage on error
      performanceMonitor.recordMemoryUsage('error_request');
      throw error;
    }
  };
};

export default withLogging;