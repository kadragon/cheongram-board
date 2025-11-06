/**
 * React Hook for Enhanced Error Handling
 * Provides consistent error handling across components with notification integration
 */

'use client';

import { useCallback } from 'react';
import { isAppError } from '@/lib/errors';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notification-system';

export interface UseErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  context?: string;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const {
    showNotification = true,
    logToConsole = true,
    context
  } = options;

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    const contextPrefix = context ? `[${context}] ` : '';
    
    if (logToConsole) {
      console.error(`${contextPrefix}Error:`, error);
    }

    let errorMessage = customMessage;
    let errorTitle = '오류 발생';

    if (isAppError(error)) {
      errorTitle = getErrorTitle(error.code);
      errorMessage = customMessage || error.userMessage;
    } else if (error instanceof Error) {
      errorMessage = customMessage || error.message;
    } else {
      errorMessage = customMessage || '알 수 없는 오류가 발생했습니다.';
    }

    if (showNotification) {
      notifyError({ 
        code: isAppError(error) ? error.code : 'UNKNOWN_ERROR',
        message: errorMessage,
        userMessage: errorMessage
      }, errorTitle);
    }

    return errorMessage;
  }, [showNotification, logToConsole, context]);

  const handleSuccess = useCallback((message: string, title?: string) => {
    if (showNotification) {
      notifySuccess(title || '성공', message);
    }
  }, [showNotification]);

  const handleWarning = useCallback((message: string, title?: string) => {
    if (showNotification) {
      notifyWarning(title || '주의', message);
    }
  }, [showNotification]);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      loadingMessage?: string;
    }
  ): Promise<T | null> => {
    try {
      const result = await operation();
      
      if (options?.successMessage) {
        handleSuccess(options.successMessage);
      }
      
      return result;
    } catch (error) {
      handleError(error, options?.errorMessage);
      return null;
    }
  }, [handleError, handleSuccess]);

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleAsyncOperation,
  };
};

// Helper function to get user-friendly error titles
const getErrorTitle = (errorCode: string): string => {
  const titles: Record<string, string> = {
    VALIDATION_ERROR: '입력 오류',
    INVALID_INPUT: '잘못된 입력',
    MISSING_REQUIRED_FIELD: '필수 항목 누락',
    UNAUTHORIZED: '인증 필요',
    FORBIDDEN: '접근 거부',
    TOKEN_EXPIRED: '세션 만료',
    DATABASE_ERROR: '데이터베이스 오류',
    RECORD_NOT_FOUND: '데이터 없음',
    DUPLICATE_RECORD: '중복 데이터',
    NETWORK_ERROR: '네트워크 오류',
    TIMEOUT_ERROR: '시간 초과',
    GAME_ALREADY_RENTED: '대여 불가',
    RENTAL_NOT_FOUND: '대여 정보 없음',
    INVALID_OPERATION: '잘못된 요청',
    INTERNAL_ERROR: '시스템 오류',
    SERVICE_UNAVAILABLE: '서비스 이용 불가',
  };

  return titles[errorCode] || '오류 발생';
};

export default useErrorHandler;