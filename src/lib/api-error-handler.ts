/**
 * API Error Handler Utilities
 * Provides consistent error handling for API routes and client-side requests
 */

import { NextResponse } from 'next/server';
import { AppError, ErrorCode, isAppError, handleSupabaseError } from './errors';

export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    userMessage: string;
    details?: any;
    timestamp: string;
  };
}

export interface APISuccessResponse<T = any> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
  };
}

/**
 * Handles errors in API routes and returns appropriate NextResponse
 */
export const handleAPIError = (error: unknown): NextResponse<APIErrorResponse> => {
  console.error('API Error:', error);

  let appError: AppError;

  if (isAppError(error)) {
    appError = error;
  } else if (error instanceof Error) {
    // Handle different types of errors
    if (error.message.includes('supabase') || error.message.includes('database')) {
      appError = handleSupabaseError(error);
    } else {
      appError = new AppError(
        ErrorCode.INTERNAL_ERROR,
        error.message,
        undefined,
        500
      );
    }
  } else {
    appError = new AppError(
      ErrorCode.INTERNAL_ERROR,
      'Unknown error occurred',
      undefined,
      500
    );
  }

  const errorResponse: APIErrorResponse = {
    error: {
      code: appError.code,
      message: appError.message,
      userMessage: appError.userMessage,
      details: appError.details,
      timestamp: appError.timestamp,
    },
  };

  return NextResponse.json(errorResponse, { status: appError.statusCode });
};

/**
 * Creates a success response with consistent structure
 */
export const createSuccessResponse = <T>(
  data: T,
  meta?: APISuccessResponse<T>['meta']
): NextResponse<APISuccessResponse<T>> => {
  const response: APISuccessResponse<T> = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return NextResponse.json(response);
};

/**
 * Client-side error handler for fetch requests
 */
export class APIClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: APIErrorResponse;
      
      try {
        errorData = await response.json();
      } catch {
        // If response is not JSON, create a generic error
        throw new AppError(
          ErrorCode.NETWORK_ERROR,
          `HTTP ${response.status}: ${response.statusText}`,
          undefined,
          response.status
        );
      }

      // Reconstruct AppError from API response
      const appError = new AppError(
        errorData.error.code as ErrorCode,
        errorData.error.message,
        errorData.error.userMessage,
        response.status,
        errorData.error.details
      );

      throw appError;
    }

    const data: APISuccessResponse<T> = await response.json();
    return data.data;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new AppError(
        ErrorCode.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new AppError(
        ErrorCode.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new AppError(
        ErrorCode.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new AppError(
        ErrorCode.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }
}

// Default API client instance
export const apiClient = new APIClient();

/**
 * Hook for handling errors in React components
 */
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    
    if (isAppError(error)) {
      // You can integrate with a toast notification system here
      return error.userMessage;
    }
    
    return '알 수 없는 오류가 발생했습니다.';
  };

  return { handleError };
};