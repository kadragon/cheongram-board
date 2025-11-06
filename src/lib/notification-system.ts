/**
 * Enhanced Notification System
 * Provides user-friendly notifications with different types and actions
 */

import { logger } from './logging/logger';

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // in milliseconds, 0 for persistent
  actions?: NotificationAction[];
  persistent?: boolean;
  timestamp: string;
}

export interface NotificationState {
  notifications: Notification[];
}

// Notification manager class
export class NotificationManager {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private notifications: Notification[] = [];
  private maxNotifications = 5;

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  add(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    const id = this.generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date().toISOString(),
      duration: notification.duration ?? (notification.persistent ? 0 : 5000),
    };

    this.notifications.unshift(newNotification);

    // Log notification for monitoring
    this.logNotification(newNotification);

    // Limit the number of notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.notify();

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newNotification.duration);
    }

    return id;
  }

  private logNotification(notification: Notification): void {
    const metadata = {
      notificationId: notification.id,
      type: notification.type,
      title: notification.title,
      persistent: notification.persistent,
      duration: notification.duration,
    };

    switch (notification.type) {
      case NotificationType.ERROR:
        logger.warn('Error notification shown to user', metadata);
        break;
      case NotificationType.WARNING:
        logger.info('Warning notification shown to user', metadata);
        break;
      case NotificationType.SUCCESS:
        logger.debug('Success notification shown to user', metadata);
        break;
      case NotificationType.INFO:
        logger.debug('Info notification shown to user', metadata);
        break;
    }
  }

  remove(id: string) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.notify();
    }
  }

  clear() {
    this.notifications = [];
    this.notify();
  }

  // Convenience methods
  success(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: NotificationType.SUCCESS,
      title,
      message: message || '',
      ...options,
    });
  }

  error(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: NotificationType.ERROR,
      title,
      message: message || '',
      persistent: true, // Errors should be persistent by default
      ...options,
    });
  }

  warning(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: NotificationType.WARNING,
      title,
      message: message || '',
      ...options,
    });
  }

  info(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: NotificationType.INFO,
      title,
      message: message || '',
      ...options,
    });
  }
}

// Global notification manager instance
export const notificationManager = new NotificationManager();

// Error message mapping for user-friendly messages
export const getErrorMessage = (error: any): { title: string; message: string } => {
  if (error?.code) {
    const errorMessages: Record<string, { title: string; message: string }> = {
      VALIDATION_ERROR: {
        title: '입력 오류',
        message: '입력한 정보를 다시 확인해주세요.',
      },
      UNAUTHORIZED: {
        title: '인증 필요',
        message: '로그인이 필요한 서비스입니다.',
      },
      FORBIDDEN: {
        title: '접근 거부',
        message: '이 작업을 수행할 권한이 없습니다.',
      },
      NETWORK_ERROR: {
        title: '연결 오류',
        message: '네트워크 연결을 확인하고 다시 시도해주세요.',
      },
      DATABASE_ERROR: {
        title: '데이터 오류',
        message: '데이터 처리 중 문제가 발생했습니다.',
      },
      GAME_ALREADY_RENTED: {
        title: '대여 불가',
        message: '이미 대여 중인 게임입니다.',
      },
      RECORD_NOT_FOUND: {
        title: '데이터 없음',
        message: '요청한 정보를 찾을 수 없습니다.',
      },
    };

    return errorMessages[error.code] || {
      title: '오류 발생',
      message: error.userMessage || error.message || '알 수 없는 오류가 발생했습니다.',
    };
  }

  return {
    title: '오류 발생',
    message: error?.message || '알 수 없는 오류가 발생했습니다.',
  };
};

// Utility functions for common notification patterns
export const notifySuccess = (title: string, message?: string) => {
  return notificationManager.success(title, message);
};

export const notifyError = (error: any, customTitle?: string) => {
  const { title, message } = getErrorMessage(error);
  return notificationManager.error(customTitle || title, message);
};

export const notifyWarning = (title: string, message?: string) => {
  return notificationManager.warning(title, message);
};

export const notifyInfo = (title: string, message?: string) => {
  return notificationManager.info(title, message);
};