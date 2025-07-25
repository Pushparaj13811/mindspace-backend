import type { NotificationPayload } from '../../types/index.js';

/**
 * Notification service interface for sending and managing notifications
 */
export interface INotificationService {
  /**
   * Send an immediate notification
   */
  sendNotification(payload: NotificationPayload): Promise<void>;

  /**
   * Schedule a notification for future delivery
   */
  scheduleNotification(payload: NotificationPayload, scheduledFor: Date): Promise<string>;

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(notificationId: string): Promise<void>;

  /**
   * Send bulk notifications
   */
  sendBulkNotifications(payloads: NotificationPayload[]): Promise<void>;

  /**
   * Get notification history for a user
   */
  getNotificationHistory(userId: string, limit?: number): Promise<NotificationRecord[]>;

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Promise<void>;

  /**
   * Check if the service is available
   */
  isAvailable(): Promise<boolean>;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  sentAt: string;
  readAt?: string;
}