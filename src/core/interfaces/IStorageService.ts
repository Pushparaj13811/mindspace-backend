/**
 * Abstract storage service interface
 * This interface defines all file storage operations independent of the underlying provider (Appwrite, Firebase, AWS S3, etc.)
 */
export interface IStorageService {
  // File upload operations
  uploadFile(
    bucketId: string,
    fileId: string,
    file: File | Buffer,
    permissions?: string[]
  ): Promise<StorageFile>;
  
  uploadFileFromUrl(
    bucketId: string,
    fileId: string,
    url: string,
    permissions?: string[]
  ): Promise<StorageFile>;
  
  // File retrieval operations
  getFile(bucketId: string, fileId: string): Promise<StorageFile>;
  getFilePreview(
    bucketId: string,
    fileId: string,
    options?: FilePreviewOptions
  ): Promise<Buffer>;
  getFileDownload(bucketId: string, fileId: string): Promise<Buffer>;
  getFileView(bucketId: string, fileId: string): Promise<Buffer>;
  
  // File management operations
  updateFile(
    bucketId: string,
    fileId: string,
    name?: string,
    permissions?: string[]
  ): Promise<StorageFile>;
  deleteFile(bucketId: string, fileId: string): Promise<void>;
  
  // File listing and search
  listFiles(
    bucketId: string,
    queries?: StorageQuery[]
  ): Promise<StorageFileList>;
  
  // Bucket management
  createBucket(
    bucketId: string,
    name: string,
    permissions?: string[],
    options?: BucketOptions
  ): Promise<StorageBucket>;
  getBucket(bucketId: string): Promise<StorageBucket>;
  updateBucket(
    bucketId: string,
    name: string,
    permissions?: string[],
    options?: BucketOptions
  ): Promise<StorageBucket>;
  deleteBucket(bucketId: string): Promise<void>;
  listBuckets(): Promise<StorageBucketList>;
  
  // URL generation
  getFileUrl(bucketId: string, fileId: string): string;
  getFilePreviewUrl(
    bucketId: string,
    fileId: string,
    options?: FilePreviewOptions
  ): string;
  
  // Batch operations
  batchDeleteFiles(bucketId: string, fileIds: string[]): Promise<void>;
  
  // Storage analytics
  getBucketUsage(bucketId: string): Promise<StorageUsage>;
  getTotalUsage(): Promise<StorageUsage>;
}

// Supporting types
export interface StorageFile {
  $id: string;
  bucketId: string;
  name: string;
  signature: string;
  mimeType: string;
  sizeOriginal: number;
  chunksTotal: number;
  chunksUploaded: number;
  $permissions: string[];
  $createdAt: string;
  $updatedAt: string;
}

export interface StorageFileList {
  total: number;
  files: StorageFile[];
}

export interface StorageBucket {
  $id: string;
  name: string;
  enabled: boolean;
  maximumFileSize: number;
  allowedFileExtensions: string[];
  compression: string;
  encryption: boolean;
  antivirus: boolean;
  $permissions: string[];
  fileSecurity: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export interface StorageBucketList {
  total: number;
  buckets: StorageBucket[];
}

export interface StorageQuery {
  field: string;
  operator: string;
  value: any;
}

export interface FilePreviewOptions {
  width?: number;
  height?: number;
  gravity?: 'center' | 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
  quality?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  opacity?: number;
  rotation?: number;
  background?: string;
  output?: 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp';
}

export interface BucketOptions {
  maximumFileSize?: number;
  allowedFileExtensions?: string[];
  compression?: 'none' | 'gzip' | 'zstd';
  encryption?: boolean;
  antivirus?: boolean;
  fileSecurity?: boolean;
  enabled?: boolean;
}

export interface StorageUsage {
  total: number;
  file: number;
}