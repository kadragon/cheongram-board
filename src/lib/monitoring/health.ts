/**
 * System Health Monitoring
 * Monitors system health and provides alerts for issues
 */

import { logger } from '@/lib/logging/logger';
import { performanceMonitor } from './performance';
import { auditLogger } from '@/lib/logging/audit';
import { loggingConfig } from '@/lib/logging/config';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  timestamp: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  timestamp: string;
  uptime?: number;
}

class HealthMonitor {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  private lastHealthCheck: SystemHealth | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.registerDefaultChecks();
    this.startHealthChecking();
  }

  // Register a health check
  registerCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFn);
    logger.debug(`Health check registered: ${name}`);
  }

  // Remove a health check
  unregisterCheck(name: string): void {
    this.checks.delete(name);
    logger.debug(`Health check unregistered: ${name}`);
  }

  // Run all health checks
  async runHealthChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    // Run all registered checks
    for (const [name, checkFn] of this.checks) {
      try {
        const check = await checkFn();
        checks.push(check);
      } catch (error) {
        checks.push({
          name,
          status: 'critical',
          message: `Health check failed: ${(error as Error).message}`,
          timestamp: new Date().toISOString(),
        });
        logger.error(`Health check failed for ${name}`, error as Error);
      }
    }

    // Determine overall health
    const criticalCount = checks.filter(c => c.status === 'critical').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;

    let overall: 'healthy' | 'warning' | 'critical';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    const systemHealth: SystemHealth = {
      overall,
      checks,
      timestamp: new Date().toISOString(),
      uptime: typeof process !== 'undefined' ? process.uptime() : undefined,
    };

    this.lastHealthCheck = systemHealth;

    // Log health status
    const duration = Date.now() - startTime;
    logger.info('Health check completed', {
      overall,
      checkCount: checks.length,
      criticalCount,
      warningCount,
      duration,
    });

    // Alert on critical issues
    if (overall === 'critical') {
      this.alertCriticalHealth(systemHealth);
    }

    return systemHealth;
  }

  // Get the last health check result
  getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  // Start periodic health checking
  private startHealthChecking(): void {
    if (typeof setInterval !== 'undefined') {
      // Run health checks every 5 minutes
      this.healthCheckInterval = setInterval(async () => {
        try {
          await this.runHealthChecks();
        } catch (error) {
          logger.error('Health check interval failed', error as Error);
        }
      }, 5 * 60 * 1000);

      logger.info('Health monitoring started');
    }
  }

  // Stop health checking
  stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health monitoring stopped');
    }
  }

  // Alert on critical health issues
  private alertCriticalHealth(health: SystemHealth): void {
    const criticalChecks = health.checks.filter(c => c.status === 'critical');
    
    logger.fatal('Critical system health issues detected', undefined, {
      criticalCount: criticalChecks.length,
      criticalChecks: criticalChecks.map(c => ({ name: c.name, message: c.message })),
    });

    // In production, you might want to send alerts to external systems
    if (loggingConfig.environment === 'production') {
      console.error('CRITICAL HEALTH ALERT:', {
        timestamp: health.timestamp,
        criticalChecks,
      });
    }
  }

  // Register default health checks
  private registerDefaultChecks(): void {
    // Memory usage check
    this.registerCheck('memory', async (): Promise<HealthCheck> => {
      if (typeof process === 'undefined') {
        return {
          name: 'memory',
          status: 'unknown',
          message: 'Memory check not available in browser environment',
          timestamp: new Date().toISOString(),
        };
      }

      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const thresholdMB = Math.round(loggingConfig.performance.thresholds.memoryUsage / 1024 / 1024);

      let status: 'healthy' | 'warning' | 'critical';
      let message: string;

      if (memUsage.heapUsed > loggingConfig.performance.thresholds.memoryUsage) {
        status = 'critical';
        message = `High memory usage: ${heapUsedMB}MB (threshold: ${thresholdMB}MB)`;
      } else if (memUsage.heapUsed > loggingConfig.performance.thresholds.memoryUsage * 0.8) {
        status = 'warning';
        message = `Elevated memory usage: ${heapUsedMB}MB (threshold: ${thresholdMB}MB)`;
      } else {
        status = 'healthy';
        message = `Memory usage normal: ${heapUsedMB}MB / ${heapTotalMB}MB`;
      }

      return {
        name: 'memory',
        status,
        message,
        timestamp: new Date().toISOString(),
        metadata: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
        },
      };
    });

    // Performance metrics check
    this.registerCheck('performance', async (): Promise<HealthCheck> => {
      const recentMetrics = performanceMonitor.getRecentMetrics(100);
      const apiMetrics = recentMetrics.filter(m => m.name.includes('api'));
      
      if (apiMetrics.length === 0) {
        return {
          name: 'performance',
          status: 'healthy',
          message: 'No recent API performance data',
          timestamp: new Date().toISOString(),
        };
      }

      const avgResponseTime = apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length;
      const slowRequests = apiMetrics.filter(m => m.value > loggingConfig.performance.thresholds.apiResponse).length;
      const slowRequestPercentage = (slowRequests / apiMetrics.length) * 100;

      let status: 'healthy' | 'warning' | 'critical';
      let message: string;

      if (slowRequestPercentage > 50) {
        status = 'critical';
        message = `High percentage of slow requests: ${slowRequestPercentage.toFixed(1)}%`;
      } else if (slowRequestPercentage > 20 || avgResponseTime > loggingConfig.performance.thresholds.apiResponse) {
        status = 'warning';
        message = `Elevated response times: avg ${avgResponseTime.toFixed(0)}ms, ${slowRequestPercentage.toFixed(1)}% slow`;
      } else {
        status = 'healthy';
        message = `Performance normal: avg ${avgResponseTime.toFixed(0)}ms response time`;
      }

      return {
        name: 'performance',
        status,
        message,
        timestamp: new Date().toISOString(),
        responseTime: avgResponseTime,
        metadata: {
          totalRequests: apiMetrics.length,
          slowRequests,
          slowRequestPercentage,
          threshold: loggingConfig.performance.thresholds.apiResponse,
        },
      };
    });

    // Error rate check
    this.registerCheck('error_rate', async (): Promise<HealthCheck> => {
      const recentLogs = logger.getRecentLogs(100);
      const errorLogs = recentLogs.filter(log => log.level >= 2); // WARN and above
      const criticalLogs = recentLogs.filter(log => log.level >= 3); // ERROR and above

      const errorRate = recentLogs.length > 0 ? (errorLogs.length / recentLogs.length) * 100 : 0;
      const criticalRate = recentLogs.length > 0 ? (criticalLogs.length / recentLogs.length) * 100 : 0;

      let status: 'healthy' | 'warning' | 'critical';
      let message: string;

      if (criticalRate > 10) {
        status = 'critical';
        message = `High critical error rate: ${criticalRate.toFixed(1)}%`;
      } else if (errorRate > 20) {
        status = 'warning';
        message = `Elevated error rate: ${errorRate.toFixed(1)}%`;
      } else {
        status = 'healthy';
        message = `Error rate normal: ${errorRate.toFixed(1)}%`;
      }

      return {
        name: 'error_rate',
        status,
        message,
        timestamp: new Date().toISOString(),
        metadata: {
          totalLogs: recentLogs.length,
          errorLogs: errorLogs.length,
          criticalLogs: criticalLogs.length,
          errorRate,
          criticalRate,
        },
      };
    });

    // Database connectivity check (placeholder - would need actual DB connection)
    this.registerCheck('database', async (): Promise<HealthCheck> => {
      // In a real implementation, you would test the database connection here
      // For now, we'll assume it's healthy if we haven't seen database errors recently
      
      const recentLogs = logger.getRecentLogs(50);
      const dbErrors = recentLogs.filter(log => 
        log.context === 'Database' && log.level >= 3
      );

      let status: 'healthy' | 'warning' | 'critical';
      let message: string;

      if (dbErrors.length > 5) {
        status = 'critical';
        message = `Multiple database errors detected: ${dbErrors.length} in recent logs`;
      } else if (dbErrors.length > 0) {
        status = 'warning';
        message = `Some database errors detected: ${dbErrors.length} in recent logs`;
      } else {
        status = 'healthy';
        message = 'No recent database errors';
      }

      return {
        name: 'database',
        status,
        message,
        timestamp: new Date().toISOString(),
        metadata: {
          recentErrors: dbErrors.length,
        },
      };
    });

    // Disk space check (Node.js only)
    this.registerCheck('disk_space', async (): Promise<HealthCheck> => {
      if (typeof process === 'undefined') {
        return {
          name: 'disk_space',
          status: 'unknown',
          message: 'Disk space check not available in browser environment',
          timestamp: new Date().toISOString(),
        };
      }

      // This is a simplified check - in production you'd use fs.statSync or similar
      // For now, we'll just return healthy
      return {
        name: 'disk_space',
        status: 'healthy',
        message: 'Disk space check not implemented',
        timestamp: new Date().toISOString(),
      };
    });
  }
}

// Create global health monitor
export const healthMonitor = new HealthMonitor();

// Convenience functions
export const runHealthCheck = () => healthMonitor.runHealthChecks();
export const getSystemHealth = () => healthMonitor.getLastHealthCheck();
export const registerHealthCheck = (name: string, checkFn: () => Promise<HealthCheck>) => 
  healthMonitor.registerCheck(name, checkFn);

export default healthMonitor;