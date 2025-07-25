/**
 * Abstract database service interface
 * This interface defines all database operations independent of the underlying provider (Appwrite, Firebase, MongoDB, etc.)
 */
export interface IDatabaseService {
  // Generic CRUD operations
  create<T>(collection: string, data: Omit<T, '$id' | '$createdAt' | '$updatedAt'>): Promise<T>;
  read<T>(collection: string, documentId: string): Promise<T>;
  update<T>(collection: string, documentId: string, data: Partial<T>): Promise<T>;
  delete(collection: string, documentId: string): Promise<void>;
  
  // Query operations
  list<T>(
    collection: string, 
    queries?: DatabaseQuery[]
  ): Promise<DatabaseListResponse<T>>;
  
  search<T>(
    collection: string, 
    searchTerm: string, 
    searchFields: string[]
  ): Promise<DatabaseListResponse<T>>;
  
  // Batch operations
  batchCreate<T>(collection: string, documents: Omit<T, '$id' | '$createdAt' | '$updatedAt'>[]): Promise<T[]>;
  batchUpdate<T>(collection: string, updates: { documentId: string; data: Partial<T> }[]): Promise<T[]>;
  batchDelete(collection: string, documentIds: string[]): Promise<void>;
  
  // Advanced operations
  count(collection: string, queries?: DatabaseQuery[]): Promise<number>;
  exists(collection: string, documentId: string): Promise<boolean>;
  
  // Transaction support
  transaction<T>(operations: DatabaseOperation[]): Promise<T[]>;
  
  // Collection management
  createCollection(collectionId: string, name: string): Promise<void>;
  deleteCollection(collectionId: string): Promise<void>;
  listCollections(): Promise<DatabaseCollection[]>;
  
  // Index management
  createIndex(collectionId: string, key: string, type: DatabaseIndexType, attributes: string[]): Promise<void>;
  deleteIndex(collectionId: string, key: string): Promise<void>;
  listIndexes(collectionId: string): Promise<DatabaseIndex[]>;
}

// Supporting types
export interface DatabaseQuery {
  field: string;
  operator: 'equal' | 'notEqual' | 'less' | 'lessEqual' | 'greater' | 'greaterEqual' | 'contains' | 'search' | 'isNull' | 'isNotNull' | 'between' | 'startsWith' | 'endsWith';
  value: any;
}

export interface DatabaseListResponse<T> {
  documents: T[];
  total: number;
}

export interface DatabaseOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  documentId?: string;
  data?: any;
}

export interface DatabaseCollection {
  $id: string;
  name: string;
  enabled: boolean;
  documentSecurity: boolean;
  attributes: DatabaseAttribute[];
  indexes: DatabaseIndex[];
}

export interface DatabaseAttribute {
  key: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'datetime' | 'email' | 'ip' | 'url';
  status: string;
  required: boolean;
  array?: boolean;
  size?: number;
  default?: any;
}

export interface DatabaseIndex {
  key: string;
  type: DatabaseIndexType;
  status: string;
  attributes: string[];
  orders?: string[];
}

export type DatabaseIndexType = 'key' | 'fulltext' | 'unique';