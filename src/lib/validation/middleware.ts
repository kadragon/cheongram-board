/**
 * API Validation Middleware
 * Middleware functions for validating API requests
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAndSanitize, validateUrlParams, validatePagination } from './utils';
import { createValidationError } from '@/lib/errors';

export interface ValidatedRequest<T = any> extends NextRequest {
  validatedData: T;
  validatedQuery: Record<string, any>;
}

/**
 * Validates request body against a schema
 */
export const validateRequestBody = async <T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> => {
  try {
    const body = await request.json();
    return validateAndSanitize(schema, body, 'Request body');
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createValidationError('Invalid JSON in request body', 'body');
    }
    throw error;
  }
};

/**
 * Validates URL search parameters against a schema
 */
export const validateSearchParams = <T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): T => {
  const url = new URL(request.url);
  const params: Record<string, any> = {};

  // Convert URLSearchParams to object
  for (const [key, value] of url.searchParams.entries()) {
    if (params[key]) {
      // Handle multiple values for the same key
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    } else {
      // Try to parse numbers and booleans
      if (value === 'true') {
        params[key] = true;
      } else if (value === 'false') {
        params[key] = false;
      } else if (!isNaN(Number(value)) && value !== '') {
        params[key] = Number(value);
      } else {
        params[key] = value;
      }
    }
  }

  return validateAndSanitize(schema, params, 'Search parameters');
};

/**
 * Validates route parameters (path parameters)
 */
export const validateRouteParams = <T>(
  params: Record<string, string | string[] | undefined>,
  schema: z.ZodSchema<T>
): T => {
  const sanitizedParams = validateUrlParams(params);
  return validateAndSanitize(schema, sanitizedParams, 'Route parameters');
};

/**
 * Creates a higher-order function for API route validation
 */
export const withValidation = <TBody = any, TQuery = any, TParams = any>(
  options: {
    body?: z.ZodSchema<TBody>;
    query?: z.ZodSchema<TQuery>;
    params?: z.ZodSchema<TParams>;
  }
) => {
  return (
    handler: (
      request: NextRequest,
      context: {
        params?: Promise<Record<string, string>>;
        validatedData?: {
          body?: TBody;
          query?: TQuery;
          params?: TParams;
        };
      }
    ) => Promise<Response>
  ) => {
    return async (
      request: NextRequest,
      context: { params?: Promise<Record<string, string>> }
    ) => {
      const validatedData: any = {};

      try {
        // Validate body if schema provided
        if (options.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
          validatedData.body = await validateRequestBody(request, options.body);
        }

        // Validate query parameters if schema provided
        if (options.query) {
          validatedData.query = validateSearchParams(request, options.query);
        }

        // Validate route parameters if schema provided
        if (options.params && context.params) {
          const params = await context.params;
          validatedData.params = validateRouteParams(params, options.params);
        }

        // Call the original handler with validated data
        return handler(request, {
          ...context,
          validatedData,
        });
      } catch (error) {
        // Let the error handler deal with validation errors
        throw error;
      }
    };
  };
};

/**
 * Validates common pagination and sorting parameters
 */
export const validateListParams = (request: NextRequest) => {
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const pagination = validatePagination({
    page: searchParams.page,
    limit: searchParams.limit,
  });

  return {
    ...pagination,
    search: searchParams.search || undefined,
    sort_by: searchParams.sort_by || undefined,
    sort_order: (searchParams.sort_order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
  };
};

/**
 * Validates admin-only operations
 */
export const validateAdminOperation = (
  operation: string,
  resource: string,
  resourceId?: string | number
) => {
  if (!operation || !resource) {
    throw createValidationError('Operation and resource are required for admin actions');
  }

  const allowedOperations = ['create', 'read', 'update', 'delete', 'extend', 'return'];
  const allowedResources = ['game', 'rental', 'user'];

  if (!allowedOperations.includes(operation)) {
    throw createValidationError(
      `Invalid operation: ${operation}. Allowed: ${allowedOperations.join(', ')}`,
      'operation',
      operation
    );
  }

  if (!allowedResources.includes(resource)) {
    throw createValidationError(
      `Invalid resource: ${resource}. Allowed: ${allowedResources.join(', ')}`,
      'resource',
      resource
    );
  }

  if (['update', 'delete', 'extend', 'return'].includes(operation) && !resourceId) {
    throw createValidationError(
      `Resource ID is required for ${operation} operation`,
      'resourceId'
    );
  }

  return {
    operation,
    resource,
    resourceId: resourceId ? Number(resourceId) : undefined,
  };
};

/**
 * Validates content type for file uploads
 */
export const validateContentType = (
  request: NextRequest,
  allowedTypes: string[] = ['application/json']
): void => {
  const contentType = request.headers.get('content-type');
  
  if (!contentType) {
    throw createValidationError('Content-Type header is required', 'content-type');
  }

  const isAllowed = allowedTypes.some(type => 
    contentType.toLowerCase().includes(type.toLowerCase())
  );

  if (!isAllowed) {
    throw createValidationError(
      `Invalid Content-Type: ${contentType}. Allowed: ${allowedTypes.join(', ')}`,
      'content-type',
      contentType
    );
  }
};

/**
 * Validates request method
 */
export const validateMethod = (
  request: NextRequest,
  allowedMethods: string[]
): void => {
  if (!allowedMethods.includes(request.method)) {
    throw createValidationError(
      `Method ${request.method} not allowed. Allowed: ${allowedMethods.join(', ')}`,
      'method',
      request.method
    );
  }
};