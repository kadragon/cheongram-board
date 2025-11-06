/**
 * Comprehensive tests for the logging and monitoring system
 */

import { logger, LogLevel } from '../logger';
import { auditLogger, AuditEventType, AuditSeverity } from '../audit';
import { performanceMonitor } from '../../monitoring/performance';
import { healthMonitor } from '../../monitoring/health';
import { loggingConfig } from '../config';
import { 
  extractRequestContext, 
  authEventLogger, 
  securityEventLogger, 
  dataEventLogger,
  performanceLogger 
} from '../integration';

// Mock Next.js request for testing
const createMockRequest = (overrides: any = {}) => ({
  method: 'GET',
  nextUrl: { pathname: '/test' },
  headers: {
    get: (name: string) => {
      const headers: Record<string, string> = {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
        ...overrides.headers
      };
      return headers[name] || null;
    }
  },
  cookies: {
    get: (name: string) => overrides.cookies?.[name] || null
  },
  ...overrides
});

describe('Logging System', () => {
  beforeEach(() => {
    // Clear any existing logs
    logger.getRecentLogs(0);
  });

  describe('Basic Logger', () => {
    test('should log messages at different levels', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.fatal('Fatal message');

      const recentLogs = logger.getRecentLogs(5);
      expect(recentLogs).toHaveLength(5);
      
      const levels = recentLogs.map(log => log.level);
      expect(levels).toContain(LogLevel.DEBUG);
      expect(levels).toContain(LogLevel.INFO);
      expect(levels).toContain(LogLevel.WARN);
      expect(levels).toContain(LogLevel.ERROR);
      expect(levels).toContain(LogLevel.FATAL);
    });

    test('should include metadata in log entries', () => {
      const metadata = { userId: '123', action: 'test' };
      logger.info('Test message', metadata);

      const recentLogs = logger.getRecentLogs(1);
      expect(recentLogs[0].metadata).toMatchObject(metadata);
    });

    test('should create child loggers with context', () => {
      const childLogger = logger.child('TestModule');
      childLogger.info('Child logger message');

      const recentLogs = logger.getRecentLogs(1);
      expect(recentLogs[0].context).toBe('TestModule');
    });

    test('should log API requests and responses', () => {
      logger.apiRequest('GET', '/api/test', { param: 'value' });
      logger.apiResponse('GET', '/api/test', 200, 150);

      const recentLogs = logger.getRecentLogs(2);
      expect(recentLogs[1].metadata?.type).toBe('api_request');
      expect(recentLogs[0].metadata?.type).toBe('api_response');
    });

    test('should log security events', () => {
      logger.securityEvent('suspicious_login', 'high', { ip: '192.168.1.1' });

      const recentLogs = logger.getRecentLogs(1);
      expect(recentLogs[0].metadata?.type).toBe('security_event');
      expect(recentLogs[0].metadata?.severity).toBe('high');
    });
  });

  describe('Audit Logger', () => {
    test('should log authentication events', () => {
      auditLogger.logLoginSuccess('user123', 'test@example.com');
      auditLogger.logLoginFailure('test@example.com', 'Invalid password');
      auditLogger.logLogout('user123', 'test@example.com');

      const events = auditLogger.getEvents({ limit: 3 });
      expect(events).toHaveLength(3);
      
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain(AuditEventType.LOGIN_SUCCESS);
      expect(eventTypes).toContain(AuditEventType.LOGIN_FAILURE);
      expect(eventTypes).toContain(AuditEventType.LOGOUT);
    });

    test('should log game management events', () => {
      const gameData = { title: 'Test Game', min_players: 2, max_players: 4 };
      auditLogger.logGameCreated('admin123', 1, 'Test Game', gameData);
      
      const events = auditLogger.getEvents({ type: AuditEventType.GAME_CREATED });
      expect(events).toHaveLength(1);
      expect(events[0].newValues).toMatchObject(gameData);
    });

    test('should log rental management events', () => {
      const rentalData = { name: 'John Doe', game_id: 1, due_date: '2024-01-15' };
      auditLogger.logRentalCreated('admin123', 1, 'Test Game', 'John Doe', rentalData);
      
      const events = auditLogger.getEvents({ type: AuditEventType.RENTAL_CREATED });
      expect(events).toHaveLength(1);
      expect(events[0].newValues).toMatchObject(rentalData);
    });

    test('should log security events', () => {
      auditLogger.logSuspiciousActivity('Multiple failed login attempts', 'user123');
      auditLogger.logRateLimitExceeded('192.168.1.1', '/api/login');
      auditLogger.logBruteForceAttempt('192.168.1.1', 'test@example.com', 5);

      const events = auditLogger.getEvents({ limit: 3 });
      expect(events).toHaveLength(3);
      
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain(AuditEventType.SUSPICIOUS_ACTIVITY);
      expect(eventTypes).toContain(AuditEventType.RATE_LIMIT_EXCEEDED);
      expect(eventTypes).toContain(AuditEventType.BRUTE_FORCE_ATTEMPT);
    });

    test('should filter events by criteria', () => {
      auditLogger.logLoginSuccess('user1', 'user1@example.com');
      auditLogger.logLoginSuccess('user2', 'user2@example.com');
      auditLogger.logLoginFailure('user1@example.com', 'Wrong password');

      const user1Events = auditLogger.getEvents({ userId: 'user1' });
      expect(user1Events).toHaveLength(1);

      const loginEvents = auditLogger.getEvents({ type: AuditEventType.LOGIN_SUCCESS });
      expect(loginEvents).toHaveLength(2);
    });

    test('should export events in different formats', () => {
      auditLogger.logLoginSuccess('user123', 'test@example.com');
      
      const jsonExport = auditLogger.exportEvents('json');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const csvExport = auditLogger.exportEvents('csv');
      expect(csvExport).toContain('id,timestamp,type');
      expect(csvExport).toContain('login_success');
    });
  });

  describe('Performance Monitor', () => {
    test('should measure operation timing', async () => {
      performanceMonitor.startTimer('test_operation');
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      const duration = performanceMonitor.endTimer('test_operation');

      expect(duration).toBeGreaterThanOrEqual(100);
      
      const recentMetrics = performanceMonitor.getRecentMetrics(1);
      expect(recentMetrics).toHaveLength(1);
      expect(recentMetrics[0].name).toBe('test_operation');
    });

    test('should measure async operations', async () => {
      const result = await performanceMonitor.measureAsync(
        'async_test',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'test_result';
        }
      );

      expect(result).toBe('test_result');
      
      const recentMetrics = performanceMonitor.getRecentMetrics(1);
      expect(recentMetrics[0].name).toBe('async_test');
      expect(recentMetrics[0].value).toBeGreaterThanOrEqual(50);
    });

    test('should measure synchronous operations', () => {
      const result = performanceMonitor.measure(
        'sync_test',
        () => {
          // Simulate some work
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return sum;
        }
      );

      expect(result).toBe(499500); // Sum of 0 to 999
      
      const recentMetrics = performanceMonitor.getRecentMetrics(1);
      expect(recentMetrics[0].name).toBe('sync_test');
    });

    test('should record custom metrics', () => {
      performanceMonitor.recordMetric({
        name: 'custom_metric',
        value: 42,
        unit: 'count',
        timestamp: new Date().toISOString(),
        context: 'test',
      });

      const recentMetrics = performanceMonitor.getRecentMetrics(1);
      expect(recentMetrics[0].name).toBe('custom_metric');
      expect(recentMetrics[0].value).toBe(42);
    });

    test('should calculate performance statistics', () => {
      // Record multiple metrics
      for (let i = 1; i <= 10; i++) {
        performanceMonitor.recordMetric({
          name: 'test_metric',
          value: i * 100, // 100, 200, 300, ..., 1000
          unit: 'ms',
          timestamp: new Date().toISOString(),
        });
      }

      const stats = performanceMonitor.getStats('test_metric');
      expect(stats.count).toBe(10);
      expect(stats.average).toBe(550); // Average of 100-1000
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(1000);
    });
  });

  describe('Health Monitor', () => {
    test('should run health checks', async () => {
      const health = await healthMonitor.runHealthChecks();
      
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('timestamp');
      expect(['healthy', 'warning', 'critical']).toContain(health.overall);
    });

    test('should register custom health checks', async () => {
      healthMonitor.registerCheck('custom_check', async () => ({
        name: 'custom_check',
        status: 'healthy',
        message: 'Custom check passed',
        timestamp: new Date().toISOString(),
      }));

      const health = await healthMonitor.runHealthChecks();
      const customCheck = health.checks.find(c => c.name === 'custom_check');
      
      expect(customCheck).toBeDefined();
      expect(customCheck?.status).toBe('healthy');
    });
  });

  describe('Integration Utilities', () => {
    test('should extract request context', () => {
      const mockRequest = createMockRequest({
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: { 'user-agent': 'test-browser' },
        cookies: { session: 'abc123' }
      });

      const context = extractRequestContext(mockRequest as any, 'user123', 'test@example.com');
      
      expect(context.method).toBe('POST');
      expect(context.path).toBe('/api/test');
      expect(context.userId).toBe('user123');
      expect(context.userEmail).toBe('test@example.com');
      expect(context.userAgent).toBe('test-browser');
      expect(context.sessionId).toBe('abc123');
      expect(context.requestId).toBeDefined();
    });

    test('should log authentication events through integration', () => {
      const context = { requestId: 'req123', ipAddress: '127.0.0.1' };
      
      authEventLogger.loginSuccess('user123', 'test@example.com', context);
      authEventLogger.loginFailure('test@example.com', 'Invalid password', context);
      authEventLogger.logout('user123', 'test@example.com', context);

      const events = auditLogger.getEvents({ limit: 3 });
      expect(events).toHaveLength(3);
    });

    test('should log security events through integration', () => {
      const context = { requestId: 'req123', ipAddress: '192.168.1.1', userId: 'user123' };
      
      securityEventLogger.suspiciousActivity('Unusual login pattern', context);
      securityEventLogger.rateLimitExceeded('/api/login', context);
      securityEventLogger.bruteForceAttempt('test@example.com', 5, context);

      const events = auditLogger.getEvents({ limit: 3 });
      expect(events).toHaveLength(3);
    });

    test('should log data events through integration', () => {
      const context = { requestId: 'req123', ipAddress: '127.0.0.1' };
      const gameData = { title: 'Test Game', min_players: 2 };
      
      dataEventLogger.gameCreated('admin123', 1, 'Test Game', gameData, context);
      dataEventLogger.gameUpdated('admin123', 1, 'Test Game', gameData, { ...gameData, max_players: 4 }, context);
      dataEventLogger.gameDeleted('admin123', 1, 'Test Game', gameData, context);

      const events = auditLogger.getEvents({ limit: 3 });
      expect(events).toHaveLength(3);
      
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain(AuditEventType.GAME_CREATED);
      expect(eventTypes).toContain(AuditEventType.GAME_UPDATED);
      expect(eventTypes).toContain(AuditEventType.GAME_DELETED);
    });

    test('should log performance metrics through integration', () => {
      performanceLogger.recordPageLoad('home', 1500);
      performanceLogger.recordApiCall('/api/games', 'GET', 250, 200);
      performanceLogger.recordDatabaseQuery('games_list', 100);

      const recentMetrics = performanceMonitor.getRecentMetrics(3);
      expect(recentMetrics).toHaveLength(3);
      
      const metricNames = recentMetrics.map(m => m.name);
      expect(metricNames).toContain('page_load_time');
      expect(metricNames).toContain('api_response_time');
      expect(metricNames).toContain('database_query_time');
    });
  });

  describe('Configuration', () => {
    test('should have valid configuration', () => {
      expect(loggingConfig).toHaveProperty('enabled');
      expect(loggingConfig).toHaveProperty('level');
      expect(loggingConfig).toHaveProperty('console');
      expect(loggingConfig).toHaveProperty('audit');
      expect(loggingConfig).toHaveProperty('performance');
      expect(loggingConfig).toHaveProperty('security');
    });

    test('should have reasonable default thresholds', () => {
      expect(loggingConfig.performance.thresholds.apiResponse).toBeGreaterThan(0);
      expect(loggingConfig.performance.thresholds.databaseQuery).toBeGreaterThan(0);
      expect(loggingConfig.performance.thresholds.pageLoad).toBeGreaterThan(0);
      expect(loggingConfig.performance.thresholds.memoryUsage).toBeGreaterThan(0);
    });
  });
});

describe('Error Scenarios', () => {
  test('should handle logging errors gracefully', () => {
    // Test with circular reference that would cause JSON.stringify to fail
    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj;

    expect(() => {
      logger.info('Test with circular reference', circularObj);
    }).not.toThrow();
  });

  test('should handle performance monitoring errors', async () => {
    const errorFn = async () => {
      throw new Error('Test error');
    };

    await expect(
      performanceMonitor.measureAsync('error_test', errorFn)
    ).rejects.toThrow('Test error');

    // Should still record the metric even though the function failed
    const recentMetrics = performanceMonitor.getRecentMetrics(1);
    expect(recentMetrics[0].name).toBe('error_test');
    expect(recentMetrics[0].metadata?.error).toBe(true);
  });

  test('should handle health check failures', async () => {
    healthMonitor.registerCheck('failing_check', async () => {
      throw new Error('Health check failed');
    });

    const health = await healthMonitor.runHealthChecks();
    const failingCheck = health.checks.find(c => c.name === 'failing_check');
    
    expect(failingCheck?.status).toBe('critical');
    expect(failingCheck?.message).toContain('Health check failed');
  });
});