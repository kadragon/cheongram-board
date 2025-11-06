/**
 * Structured Logging System
 * Provides consistent logging across the application with different levels and contexts
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  context?: string;
}

class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      ...config,
    };

    // In production, we might want to flush logs periodically
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      setInterval(() => this.flushLogs(), 30000); // Flush every 30 seconds
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.config.context,
      metadata,
    };

    if (error) {
      entry.stack = error.stack;
      entry.metadata = {
        ...entry.metadata,
        errorName: error.name,
        errorMessage: error.message,
      };
    }

    // Add request context if available (server-side)
    if (typeof window === 'undefined') {
      // In a real implementation, you might get this from AsyncLocalStorage or similar
      entry.requestId = this.generateRequestId();
    }

    return entry;
  }

  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private safeStringify(value: unknown): string {
    const seen = new WeakSet<object>();

    try {
      return JSON.stringify(value, (key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val as object)) {
            return '[Circular]';
          }
          seen.add(val as object);
        }
        if (typeof val === 'bigint') {
          return val.toString();
        }
        return val;
      });
    } catch (error) {
      return '[Unserializable metadata]';
    }
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}] ` : '';
    const metadata = entry.metadata ? ` ${this.safeStringify(entry.metadata)}` : '';
    
    return `${entry.timestamp} ${levelName} ${context}${entry.message}${metadata}`;
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const message = this.formatConsoleMessage(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }
  }

  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: entries }),
      });
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, metadata, error);

    this.outputToConsole(entry);
    this.addToBuffer(entry);

    // For high-priority logs, send immediately
    if (level >= LogLevel.ERROR && this.config.enableRemote) {
      this.sendToRemote([entry]);
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, metadata, error);
  }

  // Convenience methods for common scenarios
  apiRequest(method: string, path: string, metadata?: Record<string, any>): void {
    this.info(`API ${method} ${path}`, {
      type: 'api_request',
      method,
      path,
      ...metadata,
    });
  }

  apiResponse(method: string, path: string, statusCode: number, duration: number): void {
    this.info(`API ${method} ${path} - ${statusCode}`, {
      type: 'api_response',
      method,
      path,
      statusCode,
      duration,
    });
  }

  userAction(action: string, userId?: string, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, {
      type: 'user_action',
      action,
      userId,
      ...metadata,
    });
  }

  databaseQuery(query: string, duration: number, metadata?: Record<string, any>): void {
    this.debug(`Database query executed`, {
      type: 'database_query',
      query: query.substring(0, 100), // Truncate long queries
      duration,
      ...metadata,
    });
  }

  securityEvent(event: string, severity: 'low' | 'medium' | 'high', metadata?: Record<string, any>): void {
    const level = severity === 'high' ? LogLevel.ERROR : 
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `Security event: ${event}`, {
      type: 'security_event',
      event,
      severity,
      ...metadata,
    });
  }

  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    
    this.log(level, `Performance: ${operation} took ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...metadata,
    });
  }

  // Get recent logs (useful for debugging)
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  // Flush buffered logs to remote endpoint
  async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    await this.sendToRemote(logsToSend);
  }

  // Create a child logger with additional context
  child(context: string, metadata?: Record<string, any>): Logger {
    const childConfig = {
      ...this.config,
      context: this.config.context ? `${this.config.context}:${context}` : context,
    };

    const childLogger = new Logger(childConfig);
    
    // If metadata is provided, add it to all log entries
    if (metadata) {
      const originalCreateLogEntry = childLogger.createLogEntry.bind(childLogger);
      childLogger.createLogEntry = (level, message, entryMetadata, error) => {
        return originalCreateLogEntry(level, message, { ...metadata, ...entryMetadata }, error);
      };
    }

    return childLogger;
  }
}

// Create default logger instances
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.LOGGING_ENDPOINT,
});

// Specialized loggers for different parts of the application
export const apiLogger = logger.child('API');
export const dbLogger = logger.child('Database');
export const authLogger = logger.child('Auth');
export const securityLogger = logger.child('Security');

export default logger;
