/**
 * Validation Utilities
 * Helper functions for data validation and sanitization
 */

import { z } from 'zod';
import { createValidationError, AppError, ErrorCode } from '@/lib/errors';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validates data against a Zod schema and returns structured result
 */
export const validateData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> => {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return {
        success: false,
        errors,
      };
    }

    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'Validation failed',
        code: 'unknown_error',
      }],
    };
  }
};

/**
 * Validates data and throws AppError if validation fails
 */
export const validateOrThrow = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T => {
  const result = validateData(schema, data);
  
  if (!result.success) {
    const firstError = result.errors?.[0];
    throw createValidationError(
      `${context ? `${context}: ` : ''}${firstError?.message || 'Validation failed'}`,
      firstError?.field,
      data
    );
  }

  return result.data!;
};

/**
 * Sanitizes string input by removing potentially harmful characters
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Sanitizes object by applying sanitization to all string values
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item: any) =>
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else {
        sanitized[key] = sanitizeObject(sanitized[key]);
      }
    }
  }
  
  return sanitized;
};

/**
 * Validates and sanitizes data in one step
 */
export const validateAndSanitize = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T => {
  // First sanitize if it's an object
  let sanitizedData = data;
  if (typeof data === 'object' && data !== null) {
    sanitizedData = sanitizeObject(data as Record<string, any>);
  }

  // Then validate
  return validateOrThrow(schema, sanitizedData, context);
};

/**
 * Validates pagination parameters
 */
export const validatePagination = (params: {
  page?: string | number;
  limit?: string | number;
}): { page: number; limit: number } => {
  const page = Math.max(1, parseInt(String(params.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || 20), 10)));
  
  return { page, limit };
};

/**
 * Validates sort parameters
 */
export const validateSort = (params: {
  sort_by?: string;
  sort_order?: string;
}, allowedFields: string[]): { sort_by?: string; sort_order: 'asc' | 'desc' } => {
  const sort_by = allowedFields.includes(params.sort_by || '') ? params.sort_by : undefined;
  const sort_order = params.sort_order === 'desc' ? 'desc' : 'asc';
  
  return { sort_by, sort_order };
};

/**
 * Validates date range parameters
 */
export const validateDateRange = (params: {
  date_from?: string;
  date_to?: string;
}): { date_from?: Date; date_to?: Date } => {
  let date_from: Date | undefined;
  let date_to: Date | undefined;

  if (params.date_from) {
    date_from = new Date(params.date_from);
    if (isNaN(date_from.getTime())) {
      throw createValidationError('Invalid date_from format', 'date_from', params.date_from);
    }
  }

  if (params.date_to) {
    date_to = new Date(params.date_to);
    if (isNaN(date_to.getTime())) {
      throw createValidationError('Invalid date_to format', 'date_to', params.date_to);
    }
  }

  if (date_from && date_to && date_from > date_to) {
    throw createValidationError('date_from must be before date_to', 'date_range');
  }

  return { date_from, date_to };
};

/**
 * Creates a validation middleware for API routes
 */
export const createValidationMiddleware = <T>(
  schema: z.ZodSchema<T>,
  options: {
    sanitize?: boolean;
    context?: string;
  } = {}
) => {
  return (data: unknown): T => {
    const { sanitize = true, context } = options;
    
    if (sanitize) {
      return validateAndSanitize(schema, data, context);
    } else {
      return validateOrThrow(schema, data, context);
    }
  };
};

/**
 * Validates file upload parameters
 */
export const validateFileUpload = (file: {
  name?: string;
  size?: number;
  type?: string;
}, options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
} = {}): void => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  if (!file.name) {
    throw createValidationError('File name is required', 'file.name');
  }

  if (file.size && file.size > maxSize) {
    throw createValidationError(
      `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
      'file.size',
      file.size
    );
  }

  if (file.type && !allowedTypes.includes(file.type)) {
    throw createValidationError(
      `File type must be one of: ${allowedTypes.join(', ')}`,
      'file.type',
      file.type
    );
  }

  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    throw createValidationError(
      `File extension must be one of: ${allowedExtensions.join(', ')}`,
      'file.extension',
      extension
    );
  }
};

/**
 * Validates URL parameters
 */
export const validateUrlParams = (params: Record<string, string | string[] | undefined>) => {
  const validated: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      validated[key] = value.map(v => sanitizeString(v));
    } else {
      validated[key] = sanitizeString(value);
    }
  }

  return validated;
};