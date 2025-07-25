import { Client, Databases, Query, ID, AppwriteException, IndexType } from 'node-appwrite';
import type { 
  IDatabaseService, 
  DatabaseQuery, 
  DatabaseListResponse, 
  DatabaseOperation, 
  DatabaseCollection, 
  DatabaseAttribute, 
  DatabaseIndex, 
  DatabaseIndexType 
} from '../../core/interfaces/IDatabaseService.js';
import { config } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

/**
 * Appwrite implementation of the database service
 * This adapter wraps Appwrite-specific database operations
 */
export class AppwriteDatabaseAdapter implements IDatabaseService {
  private client: Client;
  private databases: Databases;

  constructor() {
    this.client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);

    this.databases = new Databases(this.client);
  }

  async create<T>(collection: string, data: Omit<T, '$id' | '$createdAt' | '$updatedAt'>): Promise<T> {
    try {
      const collectionId = this.getCollectionId(collection);
      const document = await this.databases.createDocument(
        config.appwrite.databaseId,
        collectionId,
        ID.unique(),
        data
      );

      logger.debug('Document created:', { collection, documentId: document.$id });
      return document as T;
    } catch (error) {
      logger.error('Failed to create document:', { collection, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async read<T>(collection: string, documentId: string): Promise<T> {
    try {
      const collectionId = this.getCollectionId(collection);
      const document = await this.databases.getDocument(
        config.appwrite.databaseId,
        collectionId,
        documentId
      );

      return document as T;
    } catch (error) {
      logger.error('Failed to read document:', { collection, documentId, error });
      if (error instanceof AppwriteException) {
        if (error.code === 404) {
          throw new Error(`Document not found: ${documentId}`);
        }
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async update<T>(collection: string, documentId: string, data: Partial<T>): Promise<T> {
    try {
      const collectionId = this.getCollectionId(collection);
      const document = await this.databases.updateDocument(
        config.appwrite.databaseId,
        collectionId,
        documentId,
        data
      );

      logger.debug('Document updated:', { collection, documentId });
      return document as T;
    } catch (error) {
      logger.error('Failed to update document:', { collection, documentId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async delete(collection: string, documentId: string): Promise<void> {
    try {
      const collectionId = this.getCollectionId(collection);
      await this.databases.deleteDocument(
        config.appwrite.databaseId,
        collectionId,
        documentId
      );

      logger.debug('Document deleted:', { collection, documentId });
    } catch (error) {
      logger.error('Failed to delete document:', { collection, documentId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async list<T>(collection: string, queries?: DatabaseQuery[]): Promise<DatabaseListResponse<T>> {
    try {
      const collectionId = this.getCollectionId(collection);
      const appwriteQueries = this.buildAppwriteQueries(queries || []);

      const result = await this.databases.listDocuments(
        config.appwrite.databaseId,
        collectionId,
        appwriteQueries
      );

      return {
        documents: result.documents as T[],
        total: result.total
      };
    } catch (error) {
      logger.error('Failed to list documents:', { collection, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async search<T>(
    collection: string, 
    searchTerm: string, 
    searchFields: string[]
  ): Promise<DatabaseListResponse<T>> {
    try {
      const collectionId = this.getCollectionId(collection);
      
      // For Appwrite, we need to search each field separately and combine results
      // Since Appwrite doesn't support OR queries in a single request, we'll search the first field
      // and then filter on the client side or use the most relevant field (title first, then content)
      const primaryField = searchFields[0] || 'title';
      
      const result = await this.databases.listDocuments(
        config.appwrite.databaseId,
        collectionId,
        [Query.search(primaryField, searchTerm)]
      );

      // If no results from primary field and we have more fields, try the secondary field
      if (result.documents.length === 0 && searchFields.length > 1) {
        const secondaryField = searchFields[1];
        if (secondaryField) {
          const secondaryResult = await this.databases.listDocuments(
            config.appwrite.databaseId,
            collectionId,
            [Query.search(secondaryField, searchTerm)]
          );
        
          return {
            documents: secondaryResult.documents as T[],
            total: secondaryResult.total
          };
        }
      }

      return {
        documents: result.documents as T[],
        total: result.total
      };
    } catch (error) {
      logger.error('Failed to search documents:', { collection, searchTerm, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async batchCreate<T>(collection: string, documents: Omit<T, '$id' | '$createdAt' | '$updatedAt'>[]): Promise<T[]> {
    try {
      const results: T[] = [];
      
      // Appwrite doesn't have native batch operations, so we'll do them sequentially
      // In a production environment, you might want to implement parallel execution with rate limiting
      for (const doc of documents) {
        const result = await this.create<T>(collection, doc);
        results.push(result);
      }

      logger.debug('Batch create completed:', { collection, count: documents.length });
      return results;
    } catch (error) {
      logger.error('Failed to batch create documents:', { collection, error });
      throw error;
    }
  }

  async batchUpdate<T>(collection: string, updates: { documentId: string; data: Partial<T> }[]): Promise<T[]> {
    try {
      const results: T[] = [];
      
      for (const update of updates) {
        const result = await this.update<T>(collection, update.documentId, update.data);
        results.push(result);
      }

      logger.debug('Batch update completed:', { collection, count: updates.length });
      return results;
    } catch (error) {
      logger.error('Failed to batch update documents:', { collection, error });
      throw error;
    }
  }

  async batchDelete(collection: string, documentIds: string[]): Promise<void> {
    try {
      for (const documentId of documentIds) {
        await this.delete(collection, documentId);
      }

      logger.debug('Batch delete completed:', { collection, count: documentIds.length });
    } catch (error) {
      logger.error('Failed to batch delete documents:', { collection, error });
      throw error;
    }
  }

  async count(collection: string, queries?: DatabaseQuery[]): Promise<number> {
    try {
      const result = await this.list(collection, queries);
      return result.total;
    } catch (error) {
      logger.error('Failed to count documents:', { collection, error });
      throw error;
    }
  }

  async exists(collection: string, documentId: string): Promise<boolean> {
    try {
      await this.read(collection, documentId);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      throw error;
    }
  }

  async transaction<T>(operations: DatabaseOperation[]): Promise<T[]> {
    // Appwrite doesn't support native transactions, so we'll execute operations sequentially
    // This is not atomic, but provides a basic implementation
    logger.warn('Transactions are not supported by Appwrite. Operations will be executed sequentially.');
    
    const results: T[] = [];
    
    try {
      for (const operation of operations) {
        let result: any;
        
        switch (operation.type) {
          case 'create':
            result = await this.create(operation.collection, operation.data);
            break;
          case 'update':
            if (!operation.documentId) throw new Error('Document ID required for update operation');
            result = await this.update(operation.collection, operation.documentId, operation.data);
            break;
          case 'delete':
            if (!operation.documentId) throw new Error('Document ID required for delete operation');
            await this.delete(operation.collection, operation.documentId);
            result = { success: true };
            break;
          default:
            throw new Error(`Unsupported operation type: ${operation.type}`);
        }
        
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error('Transaction failed:', { operations: operations.length, error });
      throw new Error('Transaction failed: ' + (error as Error).message);
    }
  }

  async createCollection(collectionId: string, name: string): Promise<void> {
    try {
      await this.databases.createCollection(
        config.appwrite.databaseId,
        collectionId,
        name
      );

      logger.info('Collection created:', { collectionId, name });
    } catch (error) {
      logger.error('Failed to create collection:', { collectionId, name, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    try {
      await this.databases.deleteCollection(
        config.appwrite.databaseId,
        collectionId
      );

      logger.info('Collection deleted:', { collectionId });
    } catch (error) {
      logger.error('Failed to delete collection:', { collectionId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async listCollections(): Promise<DatabaseCollection[]> {
    try {
      const result = await this.databases.listCollections(config.appwrite.databaseId);
      
      return result.collections.map(collection => ({
        $id: collection.$id,
        name: collection.name,
        enabled: collection.enabled,
        documentSecurity: collection.documentSecurity,
        attributes: collection.attributes.map(attr => ({
          key: attr.key,
          type: attr.type as any,
          status: attr.status,
          required: attr.required,
          array: attr.array,
          ...(('size' in attr) && { size: attr.size }),
          ...(('default' in attr) && { default: attr.default })
        })),
        indexes: collection.indexes.map(index => ({
          key: index.key,
          type: index.type as any,
          status: index.status,
          attributes: index.attributes,
          orders: index.orders
        }))
      }));
    } catch (error) {
      logger.error('Failed to list collections:', error);
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async createIndex(collectionId: string, key: string, type: DatabaseIndexType, attributes: string[]): Promise<void> {
    try {
      // Convert DatabaseIndexType to IndexType enum
      let indexType: IndexType;
      switch (type) {
        case 'key':
          indexType = IndexType.Key;
          break;
        case 'fulltext':
          indexType = IndexType.Fulltext;
          break;
        case 'unique':
          indexType = IndexType.Unique;
          break;
        default:
          throw new Error(`Unsupported index type: ${type}`);
      }

      await this.databases.createIndex(
        config.appwrite.databaseId,
        collectionId,
        key,
        indexType,
        attributes
      );

      logger.info('Index created:', { collectionId, key, type });
    } catch (error) {
      logger.error('Failed to create index:', { collectionId, key, type, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async deleteIndex(collectionId: string, key: string): Promise<void> {
    try {
      await this.databases.deleteIndex(
        config.appwrite.databaseId,
        collectionId,
        key
      );

      logger.info('Index deleted:', { collectionId, key });
    } catch (error) {
      logger.error('Failed to delete index:', { collectionId, key, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async listIndexes(collectionId: string): Promise<DatabaseIndex[]> {
    try {
      const collection = await this.databases.getCollection(
        config.appwrite.databaseId,
        collectionId
      );

      return collection.indexes.map(index => ({
        key: index.key,
        type: index.type as DatabaseIndexType,
        status: index.status,
        attributes: index.attributes,
        orders: index.orders
      }));
    } catch (error) {
      logger.error('Failed to list indexes:', { collectionId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  private getCollectionId(collection: string): string {
    // Map collection names to Appwrite collection IDs
    const collectionMap: Record<string, string> = {
      users: config.appwrite.collections.users,
      companies: config.appwrite.collections.companies,
      journals: config.appwrite.collections.journals,
      moods: config.appwrite.collections.moods,
      notifications: config.appwrite.collections.notifications,
      permission_rules: 'permission_rules',
      permission_audit: 'permission_audit',
      permission_templates: 'permission_templates'
    };

    return collectionMap[collection] || collection;
  }

  private buildAppwriteQueries(queries: DatabaseQuery[]): string[] {
    return queries.map(query => {
      switch (query.operator) {
        case 'equal':
          return Query.equal(query.field, query.value);
        case 'notEqual':
          return Query.notEqual(query.field, query.value);
        case 'less':
          return Query.lessThan(query.field, query.value);
        case 'lessEqual':
          return Query.lessThanEqual(query.field, query.value);
        case 'greater':
          return Query.greaterThan(query.field, query.value);
        case 'greaterEqual':
          return Query.greaterThanEqual(query.field, query.value);
        case 'contains':
          return Query.contains(query.field, query.value);
        case 'search':
          return Query.search(query.field, query.value);
        case 'isNull':
          return Query.isNull(query.field);
        case 'isNotNull':
          return Query.isNotNull(query.field);
        case 'between':
          if (Array.isArray(query.value) && query.value.length === 2) {
            return Query.between(query.field, query.value[0], query.value[1]);
          }
          throw new Error('Between operator requires array with two values');
        case 'startsWith':
          return Query.startsWith(query.field, query.value);
        case 'endsWith':
          return Query.endsWith(query.field, query.value);
        default:
          throw new Error(`Unsupported query operator: ${query.operator}`);
      }
    });
  }

  private mapAppwriteError(error: AppwriteException): string {
    switch (error.code) {
      case 400:
        return 'Invalid request parameters';
      case 401:
        return 'Unauthorized access';
      case 403:
        return 'Forbidden operation';
      case 404:
        return 'Resource not found';
      case 409:
        return 'Resource already exists';
      case 429:
        return 'Too many requests';
      case 500:
        return 'Internal server error';
      default:
        return error.message || 'Database operation failed';
    }
  }
}