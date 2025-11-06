/**
 * Logging Configuration System
 * Centralized configuration for all logging and monitoring systems
 */

import { LogLevel } from './logger';

export interface LoggingConfig {
  // General settings
  enabled: boolean;
  level: LogLevel;
  environment: 'development' | 'production' | 'test';
  
  // Console logging
  console: {
    enabled: boolean;
    colorize: boolean;
    timestamp: boolean;
  };
  
  // File logging (for server-side)
  file: {
    enabled: boolean;
    path: string;
    maxSize: string; // e.g., '10MB'
    maxFiles: number;
    rotateDaily: boolean;
  };
  
  // Remote logging
  remote: {
    enabled: boolean;
    endpoint?: string;
    apiKey?: string;
    batchSize: number;
    flushInterval: number; // milliseconds
  };
  
  // Audit logging
  audit: {
    enabled: boolean;
    retentionDays: number;
    sensitiveFields: string[];
    logSuccessfulAuth: boolean;
    logFailedAuth: boolean;
    logDataChanges: boolean;
  };
  
  // Performance monitoring
  performance: {
    enabled: boolean;
    thresholds: {
      apiResponse: number; // ms
      databaseQuery: number; // ms
      pageLoad: number; // ms
      memoryUsage: number; // bytes
    };
    sampleRate: number; // 0-1, percentage of requests to monitor
  };
  
  // Security monitoring
  security: {
    enabled: boolean;
    logSuspiciousActivity: boolean;
    rateLimitThreshold: number; // requests per minute
    bruteForceThreshold: number; // failed attempts
    ipWhitelist: string[];
    ipBlacklist: string[];
  };
}

// Default configuration
const defaultConfig: LoggingConfig = {
  enabled: true,
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  environment: (process.env.NODE_ENV as any) || 'development',
  
  console: {
    enabled: true,
    colorize: process.env.NODE_ENV === 'development',
    timestamp: true,
  },
  
  file: {
    enabled: process.env.NODE_ENV === 'production',
    path: './logs',
    maxSize: '10MB',
    maxFiles: 5,
    rotateDaily: true,
  },
  
  remote: {
    enabled: process.env.NODE_ENV === 'production' && !!process.env.LOGGING_ENDPOINT,
    endpoint: process.env.LOGGING_ENDPOINT,
    apiKey: process.env.LOGGING_API_KEY,
    batchSize: 100,
    flushInterval: 30000, // 30 seconds
  },
  
  audit: {
    enabled: true,
    retentionDays: 90,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'auth', 'session'],
    logSuccessfulAuth: true,
    logFailedAuth: true,
    logDataChanges: true,
  },
  
  performance: {
    enabled: true,
    thresholds: {
      apiResponse: 1000, // 1 second
      databaseQuery: 500, // 500ms
      pageLoad: 3000, // 3 seconds
      memoryUsage: 100 * 1024 * 1024, // 100MB
    },
    sampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1, // 100% in dev, 10% in prod
  },
  
  security: {
    enabled: true,
    logSuspiciousActivity: true,
    rateLimitThreshold: 100, // requests per minute
    bruteForceThreshold: 5, // failed attempts
    ipWhitelist: [],
    ipBlacklist: [],
  },
};

// Load configuration from environment variables
function loadConfigFromEnv(): Partial<LoggingConfig> {
  const envConfig: Partial<LoggingConfig> = {};
  
  // Parse environment variables
  if (process.env.LOG_LEVEL) {
    const level = LogLevel[process.env.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel];
    if (level !== undefined) {
      envConfig.level = level;
    }
  }
  
  if (process.env.LOG_CONSOLE_ENABLED !== undefined) {
    envConfig.console = {
      ...defaultConfig.console,
      enabled: process.env.LOG_CONSOLE_ENABLED === 'true',
    };
  }
  
  if (process.env.LOG_FILE_ENABLED !== undefined) {
    envConfig.file = {
      ...defaultConfig.file,
      enabled: process.env.LOG_FILE_ENABLED === 'true',
    };
  }
  
  if (process.env.LOG_REMOTE_ENABLED !== undefined) {
    envConfig.remote = {
      ...defaultConfig.remote,
      enabled: process.env.LOG_REMOTE_ENABLED === 'true',
    };
  }
  
  if (process.env.PERFORMANCE_SAMPLE_RATE) {
    const sampleRate = parseFloat(process.env.PERFORMANCE_SAMPLE_RATE);
    if (!isNaN(sampleRate) && sampleRate >= 0 && sampleRate <= 1) {
      envConfig.performance = {
        ...defaultConfig.performance,
        sampleRate,
      };
    }
  }
  
  return envConfig;
}

// Merge configurations
function mergeConfigs(base: LoggingConfig, override: Partial<LoggingConfig>): LoggingConfig {
  return {
    ...base,
    ...override,
    console: { ...base.console, ...override.console },
    file: { ...base.file, ...override.file },
    remote: { ...base.remote, ...override.remote },
    audit: { ...base.audit, ...override.audit },
    performance: { ...base.performance, ...override.performance },
    security: { ...base.security, ...override.security },
  };
}

// Create final configuration
export const loggingConfig = mergeConfigs(defaultConfig, loadConfigFromEnv());

// Configuration validation
export function validateConfig(config: LoggingConfig): string[] {
  const errors: string[] = [];
  
  if (config.remote.enabled && !config.remote.endpoint) {
    errors.push('Remote logging is enabled but no endpoint is configured');
  }
  
  if (config.performance.sampleRate < 0 || config.performance.sampleRate > 1) {
    errors.push('Performance sample rate must be between 0 and 1');
  }
  
  if (config.audit.retentionDays < 1) {
    errors.push('Audit retention days must be at least 1');
  }
  
  if (config.security.rateLimitThreshold < 1) {
    errors.push('Rate limit threshold must be at least 1');
  }
  
  if (config.security.bruteForceThreshold < 1) {
    errors.push('Brute force threshold must be at least 1');
  }
  
  return errors;
}

// Validate the current configuration
const configErrors = validateConfig(loggingConfig);
if (configErrors.length > 0) {
  console.warn('Logging configuration warnings:', configErrors);
}

export default loggingConfig;