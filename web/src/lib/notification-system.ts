// Simplified notification system for frontend
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'outline' | 'ghost';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

class NotificationManager {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    listener(this.notifications); // Send current state immediately
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(notification: Omit<Notification, 'id'>) {
    const fullNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2),
    };
    this.notifications.push(fullNotification);
    this.listeners.forEach(listener => listener([...this.notifications]));

    // Auto-remove after duration (default 5 seconds)
    if (!notification.persistent) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        this.remove(fullNotification.id);
      }, duration);
    }
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

export const notificationManager = new NotificationManager();

export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    notificationManager.notify({ type: 'success', message, title: title || '성공', duration });
  },
  error: (message: string, title?: string, duration?: number) => {
    notificationManager.notify({ type: 'error', message, title: title || '오류', duration });
  },
  info: (message: string, title?: string, duration?: number) => {
    notificationManager.notify({ type: 'info', message, title: title || '알림', duration });
  },
  warning: (message: string, title?: string, duration?: number) => {
    notificationManager.notify({ type: 'warning', message, title: title || '경고', duration });
  },
};
