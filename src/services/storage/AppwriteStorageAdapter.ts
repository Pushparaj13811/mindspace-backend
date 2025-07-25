import { Client, Storage, AppwriteException, Compression, ImageGravity, ImageFormat } from 'node-appwrite';
// Note: InputFile import removed due to version compatibility issue
import type { 
  IStorageService,
  StorageFile,
  StorageFileList,
  StorageBucket,
  StorageBucketList,
  StorageQuery,
  FilePreviewOptions,
  BucketOptions,
  StorageUsage
} from '../../core/interfaces/IStorageService.js';
import { config } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

/**
 * Appwrite implementation of the storage service
 * This adapter wraps Appwrite-specific storage operations
 */
export class AppwriteStorageAdapter implements IStorageService {
  private client: Client;
  private storage: Storage;

  constructor() {
    this.client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);

    this.storage = new Storage(this.client);
  }

  async uploadFile(
    bucketId: string,
    fileId: string,
    file: File | Buffer,
    permissions?: string[]
  ): Promise<StorageFile> {
    // TODO: Fix InputFile import issue in node-appwrite
    throw new Error('File upload temporarily disabled due to InputFile import issue');
  }

  async uploadFileFromUrl(
    bucketId: string,
    fileId: string,
    url: string,
    permissions?: string[]
  ): Promise<StorageFile> {
    // TODO: Fix InputFile import issue in node-appwrite
    throw new Error('File upload from URL temporarily disabled due to InputFile import issue');
  }

  async getFile(bucketId: string, fileId: string): Promise<StorageFile> {
    try {
      const result = await this.storage.getFile(bucketId, fileId);
      return this.mapToStorageFile(result);
    } catch (error) {
      logger.error('Failed to get file:', { bucketId, fileId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async getFilePreview(
    bucketId: string,
    fileId: string,
    options?: FilePreviewOptions
  ): Promise<Buffer> {
    try {
      // Convert string output format to ImageFormat enum
      let outputFormat: ImageFormat | undefined;
      if (options?.output) {
        switch (options.output) {
          case 'jpg':
            outputFormat = ImageFormat.Jpg;
            break;
          case 'jpeg':
            outputFormat = ImageFormat.Jpeg;
            break;
          case 'png':
            outputFormat = ImageFormat.Png;
            break;
          case 'gif':
            outputFormat = ImageFormat.Gif;
            break;
          case 'webp':
            outputFormat = ImageFormat.Webp;
            break;
        }
      }

      const result = await this.storage.getFilePreview(
        bucketId,
        fileId,
        options?.width,
        options?.height,
        options?.gravity as ImageGravity,
        options?.quality,
        options?.borderWidth,
        options?.borderColor,
        options?.borderRadius,
        options?.opacity,
        options?.rotation,
        options?.background,
        outputFormat
      );

      return Buffer.from(result);
    } catch (error) {
      logger.error('Failed to get file preview:', { bucketId, fileId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async getFileDownload(bucketId: string, fileId: string): Promise<Buffer> {
    try {
      const result = await this.storage.getFileDownload(bucketId, fileId);
      return Buffer.from(result);
    } catch (error) {
      logger.error('Failed to download file:', { bucketId, fileId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async getFileView(bucketId: string, fileId: string): Promise<Buffer> {
    try {
      const result = await this.storage.getFileView(bucketId, fileId);
      return Buffer.from(result);
    } catch (error) {
      logger.error('Failed to get file view:', { bucketId, fileId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async updateFile(
    bucketId: string,
    fileId: string,
    name?: string,
    permissions?: string[]
  ): Promise<StorageFile> {
    try {
      const result = await this.storage.updateFile(bucketId, fileId, name, permissions);
      logger.debug('File updated:', { bucketId, fileId });
      return this.mapToStorageFile(result);
    } catch (error) {
      logger.error('Failed to update file:', { bucketId, fileId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async deleteFile(bucketId: string, fileId: string): Promise<void> {
    try {
      await this.storage.deleteFile(bucketId, fileId);
      logger.debug('File deleted:', { bucketId, fileId });
    } catch (error) {
      logger.error('Failed to delete file:', { bucketId, fileId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async listFiles(bucketId: string, queries?: StorageQuery[]): Promise<StorageFileList> {
    try {
      // Appwrite storage doesn't support complex queries like database
      // This is a simplified implementation
      const result = await this.storage.listFiles(bucketId);
      
      return {
        total: result.total,
        files: result.files.map(file => this.mapToStorageFile(file))
      };
    } catch (error) {
      logger.error('Failed to list files:', { bucketId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async createBucket(
    bucketId: string,
    name: string,
    permissions?: string[],
    options?: BucketOptions
  ): Promise<StorageBucket> {
    try {
      const result = await this.storage.createBucket(
        bucketId,
        name,
        permissions,
        options?.fileSecurity,
        options?.enabled ?? true,
        options?.maximumFileSize,
        options?.allowedFileExtensions,
        options?.compression as Compression,
        options?.encryption,
        options?.antivirus
      );

      logger.info('Bucket created:', { bucketId, name });
      return this.mapToStorageBucket(result);
    } catch (error) {
      logger.error('Failed to create bucket:', { bucketId, name, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async getBucket(bucketId: string): Promise<StorageBucket> {
    try {
      const result = await this.storage.getBucket(bucketId);
      return this.mapToStorageBucket(result);
    } catch (error) {
      logger.error('Failed to get bucket:', { bucketId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async updateBucket(
    bucketId: string,
    name: string,
    permissions?: string[],
    options?: BucketOptions
  ): Promise<StorageBucket> {
    try {
      const result = await this.storage.updateBucket(
        bucketId,
        name,
        permissions,
        options?.fileSecurity,
        options?.enabled ?? true,
        options?.maximumFileSize,
        options?.allowedFileExtensions,
        options?.compression as Compression,
        options?.encryption,
        options?.antivirus
      );

      logger.debug('Bucket updated:', { bucketId });
      return this.mapToStorageBucket(result);
    } catch (error) {
      logger.error('Failed to update bucket:', { bucketId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async deleteBucket(bucketId: string): Promise<void> {
    try {
      await this.storage.deleteBucket(bucketId);
      logger.info('Bucket deleted:', { bucketId });
    } catch (error) {
      logger.error('Failed to delete bucket:', { bucketId, error });
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  async listBuckets(): Promise<StorageBucketList> {
    try {
      const result = await this.storage.listBuckets();
      
      return {
        total: result.total,
        buckets: result.buckets.map(bucket => this.mapToStorageBucket(bucket))
      };
    } catch (error) {
      logger.error('Failed to list buckets:', error);
      if (error instanceof AppwriteException) {
        throw new Error(this.mapAppwriteError(error));
      }
      throw error;
    }
  }

  getFileUrl(bucketId: string, fileId: string): string {
    return `${config.appwrite.endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${config.appwrite.projectId}`;
  }

  getFilePreviewUrl(bucketId: string, fileId: string, options?: FilePreviewOptions): string {
    let url = `${config.appwrite.endpoint}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${config.appwrite.projectId}`;
    
    if (options) {
      const params = new URLSearchParams();
      if (options.width) params.append('width', options.width.toString());
      if (options.height) params.append('height', options.height.toString());
      if (options.gravity) params.append('gravity', options.gravity);
      if (options.quality) params.append('quality', options.quality.toString());
      if (options.borderWidth) params.append('borderWidth', options.borderWidth.toString());
      if (options.borderColor) params.append('borderColor', options.borderColor);
      if (options.borderRadius) params.append('borderRadius', options.borderRadius.toString());
      if (options.opacity) params.append('opacity', options.opacity.toString());
      if (options.rotation) params.append('rotation', options.rotation.toString());
      if (options.background) params.append('background', options.background);
      if (options.output) params.append('output', options.output);
      
      if (params.toString()) {
        url += '&' + params.toString();
      }
    }
    
    return url;
  }

  async batchDeleteFiles(bucketId: string, fileIds: string[]): Promise<void> {
    try {
      // Appwrite doesn't have native batch delete, so we'll do them sequentially
      for (const fileId of fileIds) {
        await this.deleteFile(bucketId, fileId);
      }

      logger.debug('Batch delete completed:', { bucketId, count: fileIds.length });
    } catch (error) {
      logger.error('Failed to batch delete files:', { bucketId, error });
      throw error;
    }
  }

  async getBucketUsage(bucketId: string): Promise<StorageUsage> {
    try {
      // Appwrite doesn't provide direct bucket usage stats
      // We'll estimate by listing files and summing sizes
      const files = await this.listFiles(bucketId);
      
      let totalSize = 0;
      for (const file of files.files) {
        totalSize += file.sizeOriginal;
      }

      return {
        total: totalSize,
        file: files.total
      };
    } catch (error) {
      logger.error('Failed to get bucket usage:', { bucketId, error });
      throw error;
    }
  }

  async getTotalUsage(): Promise<StorageUsage> {
    try {
      // Get usage across all buckets
      const buckets = await this.listBuckets();
      
      let totalSize = 0;
      let totalFiles = 0;
      
      for (const bucket of buckets.buckets) {
        const usage = await this.getBucketUsage(bucket.$id);
        totalSize += usage.total;
        totalFiles += usage.file;
      }

      return {
        total: totalSize,
        file: totalFiles
      };
    } catch (error) {
      logger.error('Failed to get total usage:', error);
      throw error;
    }
  }

  private mapToStorageFile(appwriteFile: any): StorageFile {
    return {
      $id: appwriteFile.$id,
      bucketId: appwriteFile.bucketId,
      name: appwriteFile.name,
      signature: appwriteFile.signature,
      mimeType: appwriteFile.mimeType,
      sizeOriginal: appwriteFile.sizeOriginal,
      chunksTotal: appwriteFile.chunksTotal,
      chunksUploaded: appwriteFile.chunksUploaded,
      $permissions: appwriteFile.$permissions || [],
      $createdAt: appwriteFile.$createdAt,
      $updatedAt: appwriteFile.$updatedAt
    };
  }

  private mapToStorageBucket(appwriteBucket: any): StorageBucket {
    return {
      $id: appwriteBucket.$id,
      name: appwriteBucket.name,
      enabled: appwriteBucket.enabled,
      maximumFileSize: appwriteBucket.maximumFileSize,
      allowedFileExtensions: appwriteBucket.allowedFileExtensions || [],
      compression: appwriteBucket.compression,
      encryption: appwriteBucket.encryption,
      antivirus: appwriteBucket.antivirus,
      $permissions: appwriteBucket.$permissions || [],
      fileSecurity: appwriteBucket.fileSecurity,
      $createdAt: appwriteBucket.$createdAt,
      $updatedAt: appwriteBucket.$updatedAt
    };
  }

  private mapAppwriteError(error: AppwriteException): string {
    switch (error.code) {
      case 400:
        return 'Invalid file or parameters';
      case 401:
        return 'Unauthorized access to storage';
      case 403:
        return 'Forbidden storage operation';
      case 404:
        return 'File or bucket not found';
      case 409:
        return 'File or bucket already exists';
      case 413:
        return 'File too large';
      case 415:
        return 'Unsupported file type';
      case 429:
        return 'Too many requests';
      case 500:
        return 'Storage service error';
      default:
        return error.message || 'Storage operation failed';
    }
  }
}