/**
 * Base model interface for all Appwrite documents
 * Provides common fields that all documents should have
 */
export interface BaseModel {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

/**
 * Base create input type that excludes Appwrite system fields
 */
export type CreateInput<T> = Omit<T, keyof BaseModel>;

/**
 * Base update input type that makes all fields optional except system fields
 */
export type UpdateInput<T> = Partial<Omit<T, keyof BaseModel>>;

/**
 * Query options for database operations
 */
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Paginated response type
 */
export interface PaginatedResult<T> {
  documents: T[];
  total: number;
}