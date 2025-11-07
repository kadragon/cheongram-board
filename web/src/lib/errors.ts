// Simple error types for frontend
export type ErrorCode = string;

export interface AppError extends Error {
  code: ErrorCode;
  userMessage: string;
  statusCode?: number;
  details?: any;
}

export function isAppError(error: any): error is AppError {
  return error && typeof error.code === 'string' && typeof error.userMessage === 'string';
}
