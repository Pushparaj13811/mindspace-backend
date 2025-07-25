/**
 * Model exports for MindSpace Backend
 * Central export file for all database models and schemas
 */

// Base model
export * from './BaseModel.js';

// User model
export * from './UserModel.js';

// Company model
export * from './CompanyModel.js';

// Journal model
export * from './JournalModel.js';

// Mood model
export * from './MoodModel.js';

// Notification model
export * from './NotificationModel.js';

// Collection schemas array for easy iteration
import { UserSchema } from './UserModel.js';
import { CompanySchema } from './CompanyModel.js';
import { JournalSchema } from './JournalModel.js';
import { MoodSchema } from './MoodModel.js';
import { NotificationSchema } from './NotificationModel.js';

export const AllSchemas = [
  UserSchema,
  CompanySchema,
  JournalSchema,
  MoodSchema,
  NotificationSchema
];

// Schema map for easy access
export const SchemaMap = {
  users: UserSchema,
  companies: CompanySchema,
  journals: JournalSchema,
  moods: MoodSchema,
  notifications: NotificationSchema
} as const;