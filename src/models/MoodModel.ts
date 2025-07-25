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
 * Appwrite collection schema for moods
 */
export const MoodSchema = {
  name: 'moods',
  attributes: [
    {
      key: 'userId',
      type: 'string',
      size: 36,
      required: true,
      array: false
    },
    {
      key: 'current',
      type: 'string',
      size: 20,
      required: true,
      array: false
    },
    {
      key: 'intensity',
      type: 'integer',
      required: true,
      min: 1,
      max: 10
    },
    {
      key: 'timestamp',
      type: 'datetime',
      required: true
    },
    {
      key: 'triggers',
      type: 'string',
      size: 100,
      required: false,
      array: true
    },
    {
      key: 'notes',
      type: 'string',
      size: 500,
      required: false,
      array: false
    }
  ],
  indexes: [
    {
      key: 'userId_index',
      type: 'key',
      attributes: ['userId']
    },
    {
      key: 'timestamp_index',
      type: 'key',
      attributes: ['timestamp'],
      orders: ['DESC']
    },
    {
      key: 'user_timestamp_index',
      type: 'key',
      attributes: ['userId', 'timestamp'],
      orders: ['ASC', 'DESC']
    },
    {
      key: 'mood_intensity_index',
      type: 'key',
      attributes: ['current', 'intensity']
    }
  ]
};