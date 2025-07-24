import type { NotificationPayload } from '../types/index.js';

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  variables: string[];
}

export interface NotificationSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  scheduledFor?: string; // ISO date string
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format
    days?: number[]; // 0-6, Sunday = 0
  };
}

export interface NotificationResult {
  id: string;
  status: 'sent' | 'scheduled' | 'failed';
  sentAt?: string;
  error?: string;
}

export interface INotificationService {
  // Send notifications
  sendNotification(payload: NotificationPayload & NotificationSchedule): Promise<NotificationResult>;
  sendBulkNotifications(payloads: (NotificationPayload & NotificationSchedule)[]): Promise<NotificationResult[]>;
  
  // Template management
  createTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate>;
  getTemplate(templateId: string): Promise<NotificationTemplate | null>;
  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate>;
  deleteTemplate(templateId: string): Promise<void>;
  listTemplates(): Promise<NotificationTemplate[]>;
  
  // Send from template
  sendFromTemplate(
    templateId: string, 
    userId: string, 
    variables: Record<string, string>,
    schedule?: NotificationSchedule
  ): Promise<NotificationResult>;
  
  // Scheduled notifications
  scheduleNotification(payload: NotificationPayload, schedule: NotificationSchedule): Promise<string>; // Returns job ID
  cancelScheduledNotification(jobId: string): Promise<void>;
  getScheduledNotifications(userId: string): Promise<Array<{
    id: string;
    payload: NotificationPayload;
    schedule: NotificationSchedule;
    status: 'pending' | 'sent' | 'cancelled';
  }>>;
  
  // User preferences
  updateUserNotificationPreferences(userId: string, preferences: {
    enablePush?: boolean;
    enableEmail?: boolean;
    dailyReminder?: boolean;
    moodCheckIn?: boolean;
    journalReminder?: boolean;
    quietHours?: {
      start: string; // HH:mm
      end: string; // HH:mm
    };
  }): Promise<void>;
  
  getUserNotificationPreferences(userId: string): Promise<{
    enablePush: boolean;
    enableEmail: boolean;
    dailyReminder: boolean;
    moodCheckIn: boolean;
    journalReminder: boolean;
    quietHours?: {
      start: string;
      end: string;
    };
  }>;
  
  // Analytics
  getNotificationStats(userId: string, period: 'day' | 'week' | 'month'): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
}