/**
 * Enhanced Error Handling System
 * Provides structured error types and utilities for consistent error handling
 */

export enum ErrorCode {
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Business Logic Errors
  GAME_ALREADY_RENTED = 'GAME_ALREADY_RENTED',
  RENTAL_NOT_FOUND = 'RENTAL_NOT_FOUND',
  INVALID_OPERATION = 'INVALID_OPERATION',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;
  public readonly timestamp: string;
  public readonly userMessage: string;

  constructor(
    code: ErrorCode,
    message: string,
    userMessage?: string,
    statusCode: number = 500,
    details?: ErrorDetails
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.VALIDATION_ERROR]: '입력한 정보를 확인해주세요.',
      [ErrorCode.INVALID_INPUT]: '올바르지 않은 입력입니다.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: '필수 항목을 입력해주세요.',
      [ErrorCode.UNAUTHORIZED]: '로그인이 필요합니다.',
      [ErrorCode.FORBIDDEN]: '접근 권한이 없습니다.',
      [ErrorCode.TOKEN_EXPIRED]: '로그인이 만료되었습니다. 다시 로그인해주세요.',
      [ErrorCode.DATABASE_ERROR]: '데이터 처리 중 오류가 발생했습니다.',
      [ErrorCode.RECORD_NOT_FOUND]: '요청한 데이터를 찾을 수 없습니다.',
      [ErrorCode.DUPLICATE_RECORD]: '이미 존재하는 데이터입니다.',
      [ErrorCode.NETWORK_ERROR]: '네트워크 연결을 확인해주세요.',
      [ErrorCode.TIMEOUT_ERROR]: '요청 시간이 초과되었습니다.',
      [ErrorCode.GAME_ALREADY_RENTED]: '이미 대여 중인 게임입니다.',
      [ErrorCode.RENTAL_NOT_FOUND]: '대여 정보를 찾을 수 없습니다.',
      [ErrorCode.INVALID_OPERATION]: '잘못된 요청입니다.',
      [ErrorCode.INTERNAL_ERROR]: '시스템 오류가 발생했습니다.',
      [ErrorCode.SERVICE_UNAVAILABLE]: '서비스를 일시적으로 사용할 수 없습니다.',
    };
    
    return messages[code] || '알 수 없는 오류가 발생했습니다.';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// Factory functions for common errors
export const createValidationError = (
  message: string,
  field?: string,
  value?: any
): AppError => {
  return new AppError(
    ErrorCode.VALIDATION_ERROR,
    message,
    undefined,
    400,
    { field, value }
  );
};

export const createAuthError = (
  code: ErrorCode.UNAUTHORIZED | ErrorCode.FORBIDDEN | ErrorCode.TOKEN_EXPIRED,
  message?: string
): AppError => {
  const statusCode = code === ErrorCode.UNAUTHORIZED ? 401 : 403;
  return new AppError(code, message || code, undefined, statusCode);
};

export const createDatabaseError = (
  message: string,
  originalError?: any
): AppError => {
  return new AppError(
    ErrorCode.DATABASE_ERROR,
    message,
    undefined,
    500,
    { context: { originalError: originalError?.message } }
  );
};

export const createNotFoundError = (
  resource: string,
  id?: string | number
): AppError => {
  return new AppError(
    ErrorCode.RECORD_NOT_FOUND,
    `${resource} not found${id ? ` with id: ${id}` : ''}`,
    undefined,
    404,
    { context: { resource, id } }
  );
};

// Error handling utilities
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

export const handleDatabaseError = (error: any): AppError => {
  if (isAppError(error)) {
    return error;
  }

  // Handle common database error patterns
  // PGRST116: Record not found (PostgreSQL/PostgREST)
  if (error?.code === 'PGRST116') {
    return createNotFoundError('Record');
  }

  // 23505: Duplicate key violation (SQL standard)
  // SQLITE_CONSTRAINT: SQLite unique constraint violation
  if (error?.code === '23505' || error?.code === 'SQLITE_CONSTRAINT') {
    return new AppError(
      ErrorCode.DUPLICATE_RECORD,
      'Duplicate record',
      '이미 존재하는 데이터입니다.',
      409
    );
  }

  return createDatabaseError(
    error?.message || 'Database operation failed',
    error
  );
};

/**
 * @deprecated Use handleDatabaseError instead
 */
export const handleSupabaseError = handleDatabaseError;

export const handleNetworkError = (error: any): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error?.name === 'TimeoutError') {
    return new AppError(
      ErrorCode.TIMEOUT_ERROR,
      'Request timeout',
      undefined,
      408
    );
  }

  return new AppError(
    ErrorCode.NETWORK_ERROR,
    error?.message || 'Network error occurred',
    undefined,
    500
  );
};