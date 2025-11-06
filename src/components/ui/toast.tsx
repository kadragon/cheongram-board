/**
 * Toast Notification Component
 * Displays user-friendly notifications with different types and actions
 */

'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { 
  Notification, 
  NotificationType, 
  notificationManager 
} from '@/lib/notification-system';

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(notification.id), 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.SUCCESS:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case NotificationType.ERROR:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case NotificationType.INFO:
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case NotificationType.SUCCESS:
        return 'border-green-200 bg-green-50';
      case NotificationType.ERROR:
        return 'border-red-200 bg-red-50';
      case NotificationType.WARNING:
        return 'border-yellow-200 bg-yellow-50';
      case NotificationType.INFO:
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isLeaving ? 'scale-95' : 'scale-100'}
      `}
    >
      <Card className={`w-full max-w-sm shadow-lg ${getColorClasses()}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </h4>
                  {notification.message && (
                    <p className="mt-1 text-sm text-gray-600">
                      {notification.message}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {notification.actions && notification.actions.length > 0 && (
                <div className="mt-3 flex space-x-2">
                  {notification.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'outline'}
                      size="sm"
                      onClick={() => {
                        action.action();
                        if (!notification.persistent) {
                          handleClose();
                        }
                      }}
                      className="text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const handleClose = (id: string) => {
    notificationManager.remove(id);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};

export default Toast;