// Trace: SPEC-test-coverage-improvement-1, TASK-test-coverage-001

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  AppError,
  isAppError,
  createValidationError,
  createAuthError,
  createDatabaseError,
  createNotFoundError,
  createBusinessLogicError,
  handleDatabaseError,
  handleNetworkError,
} from '../src/lib/errors/errors.js';

describe('Error Handling System', () => {
  describe('AppError Class', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Test message',
        'User message',
        400,
        { field: 'test' }
      );

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Test message');
      expect(error.userMessage).toBe('User message');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'test' });
      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(error.name).toBe('AppError');
    });

    it('should use default user message when not provided', () => {
      const error = new AppError(ErrorCode.UNAUTHORIZED, 'Test', undefined, 401);
      expect(error.userMessage).toBe('로그인이 필요합니다.');
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError(ErrorCode.FORBIDDEN, 'Forbidden', '접근 권한이 없습니다.', 403);
      const json = error.toJSON();

      expect(json.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(json.error.message).toBe('Forbidden');
      expect(json.error.userMessage).toBe('접근 권한이 없습니다.');
      expect(json.error.timestamp).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    describe('createValidationError', () => {
      it('should create validation error with field details', () => {
        const error = createValidationError('Invalid value', 'email', 'test@');

        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual({ field: 'email', value: 'test@' });
      });
    });

    describe('createAuthError', () => {
      it('should create unauthorized error', () => {
        const error = createAuthError(ErrorCode.UNAUTHORIZED);

        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
        expect(error.statusCode).toBe(401);
      });

      it('should create forbidden error', () => {
        const error = createAuthError(ErrorCode.FORBIDDEN);

        expect(error.code).toBe(ErrorCode.FORBIDDEN);
        expect(error.statusCode).toBe(403);
      });
    });

    describe('createDatabaseError', () => {
      it('should create database error with context', () => {
        const originalError = new Error('Connection failed');
        const error = createDatabaseError('Database operation failed', originalError);

        expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
        expect(error.statusCode).toBe(500);
        expect(error.details?.context?.originalError).toBe('Connection failed');
      });
    });

    describe('createNotFoundError', () => {
      it('should create not found error with resource info', () => {
        const error = createNotFoundError('Game', 123);

        expect(error.code).toBe(ErrorCode.RECORD_NOT_FOUND);
        expect(error.statusCode).toBe(404);
        expect(error.details).toEqual({ context: { resource: 'Game', id: 123 } });
      });
    });

    describe('createBusinessLogicError', () => {
      it('should create business logic error', () => {
        const error = createBusinessLogicError(
          ErrorCode.GAME_ALREADY_RENTED,
          'Game is already rented',
          '이미 대여 중인 게임입니다.',
          409
        );

        expect(error.code).toBe(ErrorCode.GAME_ALREADY_RENTED);
        expect(error.statusCode).toBe(409);
        expect(error.userMessage).toBe('이미 대여 중인 게임입니다.');
      });
    });
  });

  describe('Error Handling Utilities', () => {
    describe('isAppError', () => {
      it('should identify AppError instances', () => {
        const appError = new AppError(ErrorCode.INTERNAL_ERROR, 'Test');
        const regularError = new Error('Regular error');

        expect(isAppError(appError)).toBe(true);
        expect(isAppError(regularError)).toBe(false);
        expect(isAppError(null)).toBe(false);
        expect(isAppError({})).toBe(false);
      });
    });

    describe('handleDatabaseError', () => {
      it('should return AppError unchanged', () => {
        const appError = new AppError(ErrorCode.DATABASE_ERROR, 'Test');
        const result = handleDatabaseError(appError);

        expect(result).toBe(appError);
      });

      it('should handle unique constraint violations', () => {
        const dbError = { message: 'UNIQUE constraint failed: games.title' };
        const result = handleDatabaseError(dbError);

        expect(result.code).toBe(ErrorCode.DUPLICATE_RECORD);
        expect(result.statusCode).toBe(409);
      });

      it('should handle foreign key violations', () => {
        const dbError = { message: 'FOREIGN KEY constraint failed' };
        const result = handleDatabaseError(dbError);

        expect(result.code).toBe(ErrorCode.INVALID_OPERATION);
        expect(result.statusCode).toBe(400);
      });

      it('should handle NOT NULL violations', () => {
        const dbError = { message: 'NOT NULL constraint failed' };
        const result = handleDatabaseError(dbError);

        expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(result.statusCode).toBe(400);
      });

      it('should create generic database error for unknown errors', () => {
        const dbError = { message: 'Unknown database error' };
        const result = handleDatabaseError(dbError);

        expect(result.code).toBe(ErrorCode.DATABASE_ERROR);
        expect(result.statusCode).toBe(500);
      });
    });

    describe('handleNetworkError', () => {
      it('should return AppError unchanged', () => {
        const appError = new AppError(ErrorCode.NETWORK_ERROR, 'Test');
        const result = handleNetworkError(appError);

        expect(result).toBe(appError);
      });

      it('should handle timeout errors', () => {
        const timeoutError = { name: 'TimeoutError', message: 'Request timed out' };
        const result = handleNetworkError(timeoutError);

        expect(result.code).toBe(ErrorCode.TIMEOUT_ERROR);
        expect(result.statusCode).toBe(408);
      });

      it('should create generic network error', () => {
        const networkError = { message: 'Connection failed' };
        const result = handleNetworkError(networkError);

        expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
        expect(result.statusCode).toBe(500);
      });
    });
  });
});

// Trace: SPEC-test-coverage-improvement-1, TASK-test-coverage-001
