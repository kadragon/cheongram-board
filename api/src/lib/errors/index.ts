// Trace: SPEC-migration-workers-1, TASK-workers-001.8

/**
 * Error Handling Module Exports
 */

export {
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
} from './errors';

export type { ErrorDetails } from './errors';

export { errorHandler, asyncHandler } from './handler';
