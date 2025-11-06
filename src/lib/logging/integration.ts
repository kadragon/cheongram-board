/**
 * Logging Integration Utilities
 * Provides high-level functions for integrating logging throughout the application
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, apiLogger, authLogger, securityLogger } from './logger';
import { auditLogger, AuditEventType, AuditSeverity } from './audit';
import { performanceMonitor } from '@/lib/monitoring/performance';
import { loggingConfig } from './config';
import { notificationManager } from '@/lib/notification-system';

// Request context interface
export interface RequestContext {
  requestId: string;
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method: string;
  path: string;
  timestamp: string;
}

// Generate unique request ID
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

// Extract request context from Next.js request
export function extractRequestContext(request: NextRequest, userId?: string, userEmail?: string): RequestContext {
  return {
    requestId: generateRequestId(),
    userId,
    userEmail,
    sessionId: request.cookies.get('session')?.value,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    method: request.method,
    path: request.nextUrl.pathname,
    timestamp: new Date().toISOString(),
  };
}

// Enhanced API logging wrapper
export function withEnhancedLogging<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string,
  context?: Partial<RequestContext>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const requestId = context?.requestId || generateRequestId();
    
    try {
      // Log operation start
      apiLogger.info(`Starting ${operationName}`, {
        requestId,
        operationName,
        ...context,
      });

      // Execute operation with performance monitoring
      const result = await performanceMonitor.measureAsync(
        operationName,
        () => operation(...args),
        'api',
        { requestId, ...context }
      );

      // Log successful completion
      const duration = Date.now() - startTime;
      apiLogger.info(`Completed ${operationName}`, {
        requestId,
        operationName,
        duration,
        success: true,
        ...context,
      });

      return result;
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      apiLogger.error(`Failed ${operationName}`, error as Error, {
        requestId,
        operationName,
        duration,
        success: false,
        ...context,
      });

      throw error;
    }
  };
}

// Authentication event logging
export const authEventLogger = {
  loginSuccess: (userId: string, userEmail: string, context: Partial<RequestContext>) => {
    authLogger.info('User login successful', {
      userId,
      userEmail,
      ...context,
    });
    
    auditLogger.logLoginSuccess(userId, userEmail, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });
  },

  loginFailure: (email: string, reason: string, context: Partial<RequestContext>) => {
    authLogger.warn('User login failed', {
      email,
      reason,
      ...context,
    });
    
    auditLogger.logLoginFailure(email, reason, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });
  },

  logout: (userId: string, userEmail: string, context: Partial<RequestContext>) => {
    authLogger.info('User logout', {
      userId,
      userEmail,
      ...context,
    });
    
    auditLogger.logLogout(userId, userEmail, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });
  },

  sessionExpired: (userId: string, context: Partial<RequestContext>) => {
    authLogger.info('User session expired', {
      userId,
      ...context,
    });
    
    auditLogger.logEvent({
      type: AuditEventType.SESSION_EXPIRED,
      severity: AuditSeverity.LOW,
      action: 'Session Expired',
      description: `Session expired for user ${userId}`,
      userId,
      success: true,
      metadata: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
    });
  },
};

// Security event logging
export const securityEventLogger = {
  suspiciousActivity: (description: string, context: Partial<RequestContext>, metadata?: Record<string, any>) => {
    securityLogger.error('Suspicious activity detected', undefined, {
      description,
      ...context,
      ...metadata,
    });
    
    auditLogger.logSuspiciousActivity(description, context.userId, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      ...metadata,
    });
  },

  rateLimitExceeded: (endpoint: string, context: Partial<RequestContext>) => {
    securityLogger.warn('Rate limit exceeded', {
      endpoint,
      ...context,
    });
    
    auditLogger.logRateLimitExceeded(
      context.ipAddress || 'unknown',
      endpoint,
      {
        userAgent: context.userAgent,
        requestId: context.requestId,
        userId: context.userId,
      }
    );
  },

  bruteForceAttempt: (email: string, attemptCount: number, context: Partial<RequestContext>) => {
    securityLogger.error('Brute force attempt detected', undefined, {
      email,
      attemptCount,
      ...context,
    });
    
    auditLogger.logBruteForceAttempt(
      context.ipAddress || 'unknown',
      email,
      attemptCount,
      {
        userAgent: context.userAgent,
        requestId: context.requestId,
      }
    );
  },

  invalidToken: (context: Partial<RequestContext>) => {
    securityLogger.warn('Invalid token detected', {
      ...context,
    });
    
    auditLogger.logEvent({
      type: AuditEventType.INVALID_TOKEN,
      severity: AuditSeverity.MEDIUM,
      action: 'Invalid Token',
      description: 'Invalid authentication token detected',
      userId: context.userId,
      success: false,
      metadata: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
    });
  },
};

// Data operation logging
export const dataEventLogger = {
  gameCreated: (userId: string, gameId: number, gameTitle: string, gameData: Record<string, any>, context: Partial<RequestContext>) => {
    logger.info('Game created', {
      userId,
      gameId,
      gameTitle,
      ...context,
    });
    
    auditLogger.logGameCreated(userId, gameId, gameTitle, gameData, {
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  },

  gameUpdated: (userId: string, gameId: number, gameTitle: string, oldValues: Record<string, any>, newValues: Record<string, any>, context: Partial<RequestContext>) => {
    logger.info('Game updated', {
      userId,
      gameId,
      gameTitle,
      ...context,
    });
    
    auditLogger.logGameUpdated(userId, gameId, gameTitle, oldValues, newValues, {
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  },

  gameDeleted: (userId: string, gameId: number, gameTitle: string, gameData: Record<string, any>, context: Partial<RequestContext>) => {
    logger.info('Game deleted', {
      userId,
      gameId,
      gameTitle,
      ...context,
    });
    
    auditLogger.logGameDeleted(userId, gameId, gameTitle, gameData, {
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  },

  rentalCreated: (userId: string, rentalId: number, gameTitle: string, renterName: string, rentalData: Record<string, any>, context: Partial<RequestContext>) => {
    logger.info('Rental created', {
      userId,
      rentalId,
      gameTitle,
      renterName,
      ...context,
    });
    
    auditLogger.logRentalCreated(userId, rentalId, gameTitle, renterName, rentalData, {
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  },

  rentalExtended: (userId: string, rentalId: number, gameTitle: string, renterName: string, oldDueDate: string, newDueDate: string, context: Partial<RequestContext>) => {
    logger.info('Rental extended', {
      userId,
      rentalId,
      gameTitle,
      renterName,
      oldDueDate,
      newDueDate,
      ...context,
    });
    
    auditLogger.logRentalExtended(userId, rentalId, gameTitle, renterName, oldDueDate, newDueDate, {
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  },

  rentalReturned: (userId: string, rentalId: number, gameTitle: string, renterName: string, context: Partial<RequestContext>) => {
    logger.info('Rental returned', {
      userId,
      rentalId,
      gameTitle,
      renterName,
      ...context,
    });
    
    auditLogger.logRentalReturned(userId, rentalId, gameTitle, renterName, {
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  },

  dataExported: (userId: string, exportType: string, recordCount: number, context: Partial<RequestContext>) => {
    logger.info('Data exported', {
      userId,
      exportType,
      recordCount,
      ...context,
    });
    
    auditLogger.logDataExport(userId, exportType, recordCount, {
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  },
};

// Error logging with user notification
export function logAndNotifyError(
  error: any,
  operation: string,
  context: Partial<RequestContext>,
  notifyUser: boolean = true
) {
  // Log the error
  logger.error(`Error in ${operation}`, error, {
    operation,
    ...context,
  });

  // Notify user if requested
  if (notifyUser && typeof window !== 'undefined') {
    const errorMessage = error?.userMessage || error?.message || '알 수 없는 오류가 발생했습니다.';
    notificationManager.error('오류 발생', errorMessage);
  }
}

// Performance monitoring helpers
export const performanceLogger = {
  recordPageLoad: (pageName: string, loadTime: number, context?: Partial<RequestContext>) => {
    performanceMonitor.recordMetric({
      name: 'page_load_time',
      value: loadTime,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      context: 'client',
      metadata: {
        pageName,
        ...context,
      },
    });

    // Log warning if load time exceeds threshold
    if (loadTime > loggingConfig.performance.thresholds.pageLoad) {
      logger.warn('Slow page load detected', {
        pageName,
        loadTime,
        threshold: loggingConfig.performance.thresholds.pageLoad,
        ...context,
      });
    }
  },

  recordApiCall: (endpoint: string, method: string, duration: number, statusCode: number, context?: Partial<RequestContext>) => {
    performanceMonitor.recordMetric({
      name: 'api_response_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      context: 'api',
      metadata: {
        endpoint,
        method,
        statusCode,
        ...context,
      },
    });

    // Log warning if response time exceeds threshold
    if (duration > loggingConfig.performance.thresholds.apiResponse) {
      logger.warn('Slow API response detected', {
        endpoint,
        method,
        duration,
        statusCode,
        threshold: loggingConfig.performance.thresholds.apiResponse,
        ...context,
      });
    }
  },

  recordDatabaseQuery: (queryType: string, duration: number, context?: Partial<RequestContext>) => {
    performanceMonitor.recordMetric({
      name: 'database_query_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      context: 'database',
      metadata: {
        queryType,
        ...context,
      },
    });

    // Log warning if query time exceeds threshold
    if (duration > loggingConfig.performance.thresholds.databaseQuery) {
      logger.warn('Slow database query detected', {
        queryType,
        duration,
        threshold: loggingConfig.performance.thresholds.databaseQuery,
        ...context,
      });
    }
  },
};

// System health monitoring
export const systemHealthLogger = {
  recordMemoryUsage: (context?: string) => {
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      
      performanceMonitor.recordMetric({
        name: 'memory_usage',
        value: memUsage.heapUsed,
        unit: 'bytes',
        timestamp: new Date().toISOString(),
        context: context || 'system',
        metadata: {
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
        },
      });

      // Log warning if memory usage is high
      if (memUsage.heapUsed > loggingConfig.performance.thresholds.memoryUsage) {
        logger.warn('High memory usage detected', {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          threshold: loggingConfig.performance.thresholds.memoryUsage,
          context,
        });
      }
    }
  },

  recordSystemError: (error: Error, component: string, context?: Partial<RequestContext>) => {
    logger.fatal('System error occurred', error, {
      component,
      ...context,
    });

    // For critical system errors, you might want to send alerts
    if (loggingConfig.remote.enabled) {
      // This would typically integrate with your alerting system
      console.error('CRITICAL SYSTEM ERROR:', {
        error: error.message,
        component,
        context,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

// Cleanup and maintenance
export const maintenanceLogger = {
  scheduleLogCleanup: () => {
    if (typeof setInterval !== 'undefined') {
      // Clean up old audit logs every hour
      setInterval(() => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - loggingConfig.audit.retentionDays);
        
        logger.info('Cleaning up old audit logs', {
          cutoffDate: cutoffDate.toISOString(),
          retentionDays: loggingConfig.audit.retentionDays,
        });
        
        // In a real implementation, you would clean up the audit logs here
        // This might involve database cleanup or file system cleanup
      }, 60 * 60 * 1000); // Every hour
    }
  },

  flushLogs: async () => {
    try {
      await logger.flushLogs();
      logger.info('Logs flushed successfully');
    } catch (error) {
      logger.error('Failed to flush logs', error as Error);
    }
  },
};

// Initialize maintenance tasks
if (typeof window === 'undefined' && loggingConfig.enabled) {
  maintenanceLogger.scheduleLogCleanup();
}

export default {
  withEnhancedLogging,
  authEventLogger,
  securityEventLogger,
  dataEventLogger,
  logAndNotifyError,
  performanceLogger,
  systemHealthLogger,
  maintenanceLogger,
  extractRequestContext,
  generateRequestId,
};