/**
 * Audit Logging System
 * Tracks and logs administrative actions and security events
 */

import { logger, securityLogger } from './logger';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  
  // Authorization events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PERMISSION_ESCALATION = 'permission_escalation',
  
  // Data events
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  BULK_DELETE = 'bulk_delete',
  EXPORT = 'export',
  
  // Game management events
  GAME_CREATED = 'game_created',
  GAME_UPDATED = 'game_updated',
  GAME_DELETED = 'game_deleted',
  GAME_SCRAPED = 'game_scraped',
  
  // Rental management events
  RENTAL_CREATED = 'rental_created',
  RENTAL_UPDATED = 'rental_updated',
  RENTAL_EXTENDED = 'rental_extended',
  RENTAL_RETURNED = 'rental_returned',
  RENTAL_DELETED = 'rental_deleted',
  
  // System events
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string | number;
  action: string;
  description: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 10000;

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private createAuditEvent(
    type: AuditEventType,
    action: string,
    description: string,
    options: Partial<AuditEvent> = {}
  ): AuditEvent {
    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type,
      severity: options.severity || AuditSeverity.MEDIUM,
      action,
      description,
      success: options.success !== false,
      ...options,
    };
  }

  private logEvent(event: AuditEvent): void {
    // Add to internal buffer
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to main logger based on severity
    const logMessage = `Audit: ${event.action} - ${event.description}`;
    const metadata = {
      auditId: event.id,
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      resource: event.resource,
      resourceId: event.resourceId,
      success: event.success,
      ...event.metadata,
    };

    switch (event.severity) {
      case AuditSeverity.CRITICAL:
        securityLogger.fatal(logMessage, undefined, metadata);
        break;
      case AuditSeverity.HIGH:
        securityLogger.error(logMessage, undefined, metadata);
        break;
      case AuditSeverity.MEDIUM:
        securityLogger.warn(logMessage, metadata);
        break;
      case AuditSeverity.LOW:
        securityLogger.info(logMessage, metadata);
        break;
    }

    // In production, you might want to send critical events to external monitoring
    if (event.severity === AuditSeverity.CRITICAL && process.env.NODE_ENV === 'production') {
      this.sendCriticalAlert(event);
    }
  }

  private async sendCriticalAlert(event: AuditEvent): Promise<void> {
    // Implementation would depend on your alerting system
    // This could be Slack, email, PagerDuty, etc.
    console.error('CRITICAL AUDIT EVENT:', event);
  }

  // Authentication events
  logLoginSuccess(userId: string, userEmail: string, metadata?: Record<string, any>): void {
    const event = this.createAuditEvent(
      AuditEventType.LOGIN_SUCCESS,
      'User Login',
      `User ${userEmail} logged in successfully`,
      {
        userId,
        userEmail,
        severity: AuditSeverity.LOW,
        metadata,
      }
    );
    this.logEvent(event);
  }

  logLoginFailure(email: string, reason: string, metadata?: Record<string, any>): void {
    const event = this.createAuditEvent(
      AuditEventType.LOGIN_FAILURE,
      'Login Failed',
      `Login attempt failed for ${email}: ${reason}`,
      {
        userEmail: email,
        severity: AuditSeverity.MEDIUM,
        success: false,
        errorMessage: reason,
        metadata,
      }
    );
    this.logEvent(event);
  }

  logLogout(userId: string, userEmail: string, metadata?: Record<string, any>): void {
    const event = this.createAuditEvent(
      AuditEventType.LOGOUT,
      'User Logout',
      `User ${userEmail} logged out`,
      {
        userId,
        userEmail,
        severity: AuditSeverity.LOW,
        metadata,
      }
    );
    this.logEvent(event);
  }

  // Authorization events
  logAccessDenied(
    userId: string,
    resource: string,
    action: string,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.ACCESS_DENIED,
      'Access Denied',
      `User ${userId} denied access to ${resource} for action ${action}`,
      {
        userId,
        resource,
        severity: AuditSeverity.HIGH,
        success: false,
        metadata: { ...metadata, attemptedAction: action },
      }
    );
    this.logEvent(event);
  }

  // Game management events
  logGameCreated(
    userId: string,
    gameId: number,
    gameTitle: string,
    gameData: Record<string, any>,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.GAME_CREATED,
      'Game Created',
      `Game "${gameTitle}" created by user ${userId}`,
      {
        userId,
        resource: 'game',
        resourceId: gameId,
        severity: AuditSeverity.LOW,
        newValues: gameData,
        metadata,
      }
    );
    this.logEvent(event);
  }

  logGameUpdated(
    userId: string,
    gameId: number,
    gameTitle: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.GAME_UPDATED,
      'Game Updated',
      `Game "${gameTitle}" updated by user ${userId}`,
      {
        userId,
        resource: 'game',
        resourceId: gameId,
        severity: AuditSeverity.LOW,
        oldValues,
        newValues,
        metadata,
      }
    );
    this.logEvent(event);
  }

  logGameDeleted(
    userId: string,
    gameId: number,
    gameTitle: string,
    gameData: Record<string, any>,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.GAME_DELETED,
      'Game Deleted',
      `Game "${gameTitle}" deleted by user ${userId}`,
      {
        userId,
        resource: 'game',
        resourceId: gameId,
        severity: AuditSeverity.MEDIUM,
        oldValues: gameData,
        metadata,
      }
    );
    this.logEvent(event);
  }

  // Rental management events
  logRentalCreated(
    userId: string,
    rentalId: number,
    gameTitle: string,
    renterName: string,
    rentalData: Record<string, any>,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.RENTAL_CREATED,
      'Rental Created',
      `Rental created for game "${gameTitle}" to ${renterName} by user ${userId}`,
      {
        userId,
        resource: 'rental',
        resourceId: rentalId,
        severity: AuditSeverity.LOW,
        newValues: rentalData,
        metadata: { ...metadata, gameTitle, renterName },
      }
    );
    this.logEvent(event);
  }

  logRentalExtended(
    userId: string,
    rentalId: number,
    gameTitle: string,
    renterName: string,
    oldDueDate: string,
    newDueDate: string,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.RENTAL_EXTENDED,
      'Rental Extended',
      `Rental for game "${gameTitle}" extended by user ${userId}`,
      {
        userId,
        resource: 'rental',
        resourceId: rentalId,
        severity: AuditSeverity.LOW,
        oldValues: { due_date: oldDueDate },
        newValues: { due_date: newDueDate },
        metadata: { ...metadata, gameTitle, renterName },
      }
    );
    this.logEvent(event);
  }

  logRentalReturned(
    userId: string,
    rentalId: number,
    gameTitle: string,
    renterName: string,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.RENTAL_RETURNED,
      'Rental Returned',
      `Rental for game "${gameTitle}" returned by user ${userId}`,
      {
        userId,
        resource: 'rental',
        resourceId: rentalId,
        severity: AuditSeverity.LOW,
        newValues: { returned_at: new Date().toISOString() },
        metadata: { ...metadata, gameTitle, renterName },
      }
    );
    this.logEvent(event);
  }

  // Security events
  logSuspiciousActivity(
    description: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      'Suspicious Activity',
      description,
      {
        userId,
        severity: AuditSeverity.HIGH,
        success: false,
        metadata,
      }
    );
    this.logEvent(event);
  }

  logRateLimitExceeded(
    ipAddress: string,
    endpoint: string,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.RATE_LIMIT_EXCEEDED,
      'Rate Limit Exceeded',
      `Rate limit exceeded for IP ${ipAddress} on endpoint ${endpoint}`,
      {
        ipAddress,
        severity: AuditSeverity.MEDIUM,
        success: false,
        metadata: { ...metadata, endpoint },
      }
    );
    this.logEvent(event);
  }

  logBruteForceAttempt(
    ipAddress: string,
    userEmail: string,
    attemptCount: number,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.BRUTE_FORCE_ATTEMPT,
      'Brute Force Attempt',
      `Brute force attempt detected for ${userEmail} from IP ${ipAddress} (${attemptCount} attempts)`,
      {
        userEmail,
        ipAddress,
        severity: AuditSeverity.HIGH,
        success: false,
        metadata: { ...metadata, attemptCount },
      }
    );
    this.logEvent(event);
  }

  // Data export events
  logDataExport(
    userId: string,
    exportType: string,
    recordCount: number,
    metadata?: Record<string, any>
  ): void {
    const event = this.createAuditEvent(
      AuditEventType.EXPORT,
      'Data Export',
      `User ${userId} exported ${recordCount} ${exportType} records`,
      {
        userId,
        resource: exportType,
        severity: AuditSeverity.MEDIUM,
        metadata: { ...metadata, recordCount },
      }
    );
    this.logEvent(event);
  }

  // Query methods
  getEvents(filters?: {
    userId?: string;
    type?: AuditEventType;
    severity?: AuditSeverity;
    resource?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): AuditEvent[] {
    let filteredEvents = [...this.events];

    if (filters) {
      if (filters.userId) {
        filteredEvents = filteredEvents.filter(e => e.userId === filters.userId);
      }
      if (filters.type) {
        filteredEvents = filteredEvents.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === filters.severity);
      }
      if (filters.resource) {
        filteredEvents = filteredEvents.filter(e => e.resource === filters.resource);
      }
      if (filters.dateFrom) {
        filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= filters.dateTo!);
      }
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (filters?.limit) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    return filteredEvents;
  }

  getEventById(id: string): AuditEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  // Export events for external systems
  exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'id', 'timestamp', 'type', 'severity', 'userId', 'action', 
        'description', 'resource', 'resourceId', 'success'
      ];
      const csvRows = [
        headers.join(','),
        ...this.events.map(event => [
          event.id,
          event.timestamp,
          event.type,
          event.severity,
          event.userId || '',
          event.action,
          `"${event.description}"`,
          event.resource || '',
          event.resourceId || '',
          event.success
        ].join(','))
      ];
      return csvRows.join('\n');
    }

    return JSON.stringify(this.events, null, 2);
  }
}

// Create default audit logger
export const auditLogger = new AuditLogger();

export default auditLogger;