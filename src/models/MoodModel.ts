import type { BaseModel, CreateInput, UpdateInput } from './BaseModel.js';
import type { MoodState } from './JournalModel.js';

/**
 * Mood tracking model interface
 */
export interface MoodModel extends BaseModel {
  userId: string;
  current: MoodState;
  intensity: number; // 1-10
  timestamp: string;
  triggers?: string[];
  notes?: string;
}

/**
 * Mood creation input
 */
export type CreateMoodInput = CreateInput<MoodModel>;

/**
 * Mood update input
 */
export type UpdateMoodInput = UpdateInput<MoodModel>;

/**
 * Complete database schema for moods collection
 */
export const MoodSchema = {
  name: 'moods',
  permissions: ['read', 'write', 'create', 'update', 'delete'],
  attributes: [
    { key: 'userId', type: 'string', size: 36, required: true },
    { key: 'current', type: 'string', size: 20, required: true },
    { key: 'intensity', type: 'integer', required: true, min: 1, max: 10 },
    { key: 'timestamp', type: 'datetime', required: true },
    { key: 'triggers', type: 'string', size: 100, array: true, required: false },
    { key: 'notes', type: 'string', size: 500, required: false },
    { key: 'location', type: 'string', size: 200, required: false },
    { key: 'weather', type: 'string', size: 50, required: false },
    { key: 'activities', type: 'string', size: 100, array: true, required: false },
    { key: 'sleepQuality', type: 'integer', required: false, min: 1, max: 10 },
    { key: 'stressLevel', type: 'integer', required: false, min: 1, max: 10 },
    { key: 'energyLevel', type: 'integer', required: false, min: 1, max: 10 },
    { key: 'socialInteraction', type: 'string', size: 50, required: false }
  ],
  indexes: [
    { key: 'user_index', type: 'key', attributes: ['userId'] },
    { key: 'timestamp_index', type: 'key', attributes: ['timestamp'], orders: ['DESC'] },
    { key: 'user_timestamp_index', type: 'key', attributes: ['userId', 'timestamp'], orders: ['ASC', 'DESC'] },
    { key: 'mood_index', type: 'key', attributes: ['current'] },
    { key: 'intensity_index', type: 'key', attributes: ['intensity'] },
    { key: 'mood_intensity_index', type: 'key', attributes: ['current', 'intensity'] },
    { key: 'user_mood_index', type: 'key', attributes: ['userId', 'current'] },
    { key: 'created_at_index', type: 'key', attributes: ['$createdAt'], orders: ['DESC'] }
  ]
};