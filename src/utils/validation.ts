import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be less than 100 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Mood schemas
export const moodStateSchema = z.object({
  current: z.enum(['happy', 'sad', 'anxious', 'calm', 'energetic', 'depressed']),
  intensity: z.number().min(1).max(10),
  timestamp: z.string().datetime(),
  triggers: z.array(z.string()).optional(),
  notes: z.string().max(500).optional(),
});

export const moodLogSchema = z.object({
  current: z.enum(['happy', 'sad', 'anxious', 'calm', 'energetic', 'depressed']),
  intensity: z.number().min(1, 'Intensity must be between 1 and 10').max(10, 'Intensity must be between 1 and 10'),
  triggers: z.array(z.string()).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Journal schemas
export const createJournalSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters long')
    .max(10000, 'Content must be less than 10,000 characters'),
  mood: moodStateSchema,
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
  attachments: z.object({
    images: z.array(z.string()).max(10, 'Maximum 10 images allowed').optional(),
    voiceRecording: z.string().optional(),
  }).optional(),
});

export const updateJournalSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  content: z.string()
    .min(10, 'Content must be at least 10 characters long')
    .max(10000, 'Content must be less than 10,000 characters')
    .optional(),
  mood: moodStateSchema.optional(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
});

export const journalQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(100).optional(),
  tags: z.string().transform(str => str.split(',').filter(Boolean)).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// AI schemas
export const aiRequestSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(4000, 'Prompt must be less than 4,000 characters'),
  model: z.enum(['gpt-4', 'claude-3', 'gemini-pro']).optional(),
  context: z.string().max(2000).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const journalAnalysisSchema = z.object({
  entryId: z.string().min(1, 'Entry ID is required'),
});

// User profile schemas
export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  notifications: z.boolean().optional(),
  preferredAIModel: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});

// File upload schemas
export const fileUploadSchema = z.object({
  type: z.enum(['image', 'audio']),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// Notification schema
export const notificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
  scheduledFor: z.string().datetime().optional(),
});

// Type inference helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MoodLogInput = z.infer<typeof moodLogSchema>;
export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;
export type JournalQueryInput = z.infer<typeof journalQuerySchema>;
export type AIRequestInput = z.infer<typeof aiRequestSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// Validation middleware helper
export const validateBody = (schema: z.ZodSchema) => {
  return (body: unknown) => {
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (query: unknown) => {
    try {
      return schema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Query validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return (params: unknown) => {
    try {
      return schema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Parameter validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
};