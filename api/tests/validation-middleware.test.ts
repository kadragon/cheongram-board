// Trace: SPEC-test-coverage-improvement-1, TASK-test-coverage-001

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { z } from 'zod';
import * as validationMiddleware from '../src/lib/validation/middleware.js';

// Mock Hono Context
const createMockContext = () => {
  const mockReq = {
    json: vi.fn(),
    query: vi.fn(),
  };

  const mockContext = {
    req: mockReq,
    json: vi.fn(),
    text: vi.fn(),
    status: vi.fn().mockReturnThis(),
    set: vi.fn(),
    get: vi.fn(),
  };

  return mockContext as any as Context;
};

describe('Validation Middleware', () => {
  let mockContext: Context;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  describe('validateBody', () => {
    it('should validate and store valid request body', async () => {
      const testSchema = z.object({
        name: z.string(),
        players: z.number(),
      });

      const middleware = validationMiddleware.validateBody(testSchema);
      const next = vi.fn();

      const testBody = { name: 'Test Game', players: 4 };
      mockContext.req.json.mockResolvedValue(testBody);

      await middleware(mockContext, next);

      expect(mockContext.req.json).toHaveBeenCalled();
      expect(mockContext.set).toHaveBeenCalledWith('validatedBody', { name: 'Test Game', players: 4 });
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for invalid request body', async () => {
      const testSchema = z.object({
        name: z.string().min(1, 'Required'),
        players: z.number({ invalid_type_error: 'Must be number' }),
      });

      const middleware = validationMiddleware.validateBody(testSchema);
      const next = vi.fn();

      const invalidBody = { name: '', players: 'four' };
      mockContext.req.json.mockResolvedValue(invalidBody);

      await middleware(mockContext, next);

      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          userMessage: '입력 데이터가 유효하지 않습니다.',
          timestamp: expect.any(String),
          details: expect.any(Array),
        },
      }, 400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle JSON parse errors', async () => {
      const testSchema = z.object({
        name: z.string(),
      });

      const middleware = validationMiddleware.validateBody(testSchema);
      const next = vi.fn();

      mockContext.req.json.mockRejectedValue(new Error('JSON parse error'));

      await expect(middleware(mockContext, next)).rejects.toThrow('JSON parse error');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('should validate and store valid query parameters', async () => {
      const testSchema = z.object({
        page: z.coerce.number().int().min(1),
        limit: z.coerce.number().int().min(1).max(100),
      });

      const middleware = validationMiddleware.validateQuery(testSchema);
      const next = vi.fn();

      const testQuery = { page: '1', limit: '20' };
      mockContext.req.query.mockReturnValue(testQuery);

      await middleware(mockContext, next);

      expect(mockContext.req.query).toHaveBeenCalled();
      expect(mockContext.set).toHaveBeenCalledWith('validatedQuery', { page: 1, limit: 20 });
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for invalid query parameters', async () => {
      const testSchema = z.object({
        page: z.coerce.number().int().min(1, 'Must be positive number'),
        limit: z.coerce.number().int().min(1),
      });

      const middleware = validationMiddleware.validateQuery(testSchema);
      const next = vi.fn();

      const invalidQuery = { page: '-1', limit: 'abc' };
      mockContext.req.query.mockReturnValue(invalidQuery);

      await middleware(mockContext, next);

      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          userMessage: '검색 조건이 유효하지 않습니다.',
          timestamp: expect.any(String),
          details: expect.any(Array),
        },
      }, 400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

// Trace: SPEC-test-coverage-improvement-1, TASK-test-coverage-001
