import type { FileUpload } from '../types/index.js';

export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
  compress?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IFileService {
  // File upload
  uploadFile(
    file: File | Buffer, 
    userId: string,
    options?: FileUploadOptions
  ): Promise<FileUpload>;
  
  // File management
  getFile(fileId: string, userId: string): Promise<FileUpload | null>;
  deleteFile(fileId: string, userId: string): Promise<void>;
  getUserFiles(userId: string, type?: 'image' | 'audio'): Promise<FileUpload[]>;
  
  // File processing
  validateFile(file: File | Buffer, options?: FileUploadOptions): Promise<FileValidationResult>;
  generateThumbnail(fileId: string): Promise<string>; // Returns thumbnail URL
  compressImage(fileId: string, quality?: number): Promise<string>; // Returns compressed URL
  
  // Audio processing
  transcribeAudio(fileId: string): Promise<{
    text: string;
    confidence: number;
    duration: number;
  }>;
  
  // Cleanup
  cleanupOrphanedFiles(): Promise<number>; // Returns number of files cleaned up
  
  // Storage stats
  getUserStorageUsage(userId: string): Promise<{
    totalFiles: number;
    totalSize: number; // in bytes
    byType: Record<string, { count: number; size: number }>;
  }>;
}