import type { BaseModel, CreateInput, UpdateInput } from './BaseModel.js';

/**
 * Notification types
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'reminder';

/**
 * Notification status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

/**
 * Notification model interface
 */
export interface NotificationModel extends BaseModel {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  isRead: boolean;
}

/**
 * Notification creation input
 */
export type CreateNotificationInput = CreateInput<NotificationModel>;

/**
 * Notification update input
 */
export type UpdateNotificationInput = UpdateInput<NotificationModel>;

/**
 * Appwrite collection schema for notifications
 */
export const NotificationSchema = {
  name: 'notifications',
  attributes: [
    {
      key: 'userId',
      type: 'string',
      size: 36,
      required: true,
      array: false
    },
    {
      key: 'type',
      type: 'string',
      size: 20,
      required: true,
      array: false
    },
    {
      key: 'title',
      type: 'string',
      size: 100,
      required: true,
      array: false
    },
    {
      key: 'body',
      type: 'string',
      size: 500,
      required: true,
      array: false
    },
    {
      key: 'data',
      type: 'string',
      size: 1000,
      required: false,
      array: false
    },
    {
      key: 'status',
      type: 'string',
      size: 20,
      required: true,
      default: 'pending'
    },
    {
      key: 'scheduledFor',
      type: 'datetime',
      required: false
    },
    {
      key: 'sentAt',
      type: 'datetime',
      required: false
    },
    {
      key: 'readAt',
      type: 'datetime',
      required: false
    },
    {
      key: 'isRead',
      type: 'boolean',
      required: true,
      default: false
    }
  ],
  indexes: [
    {
      key: 'userId_index',
      type: 'key',
      attributes: ['userId']
    },
    {
      key: 'status_index',
      type: 'key',
      attributes: ['status']
    },
    {
      key: 'scheduled_index',
      type: 'key',
      attributes: ['scheduledFor'],
      orders: ['ASC']
    },
    {
      key: 'unread_notifications',
      type: 'key',
      attributes: ['userId', 'isRead']
    },
    {
      key: 'user_created_index',
      type: 'key',
      attributes: ['userId', '$createdAt'],
      orders: ['ASC', 'DESC']
    }
  ]
};