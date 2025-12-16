import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'scroungers-media';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 25 * 1024 * 1024, // 25MB
  default: 10 * 1024 * 1024, // 10MB
};

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

// Presigned URL expiration times (in seconds)
export const PRESIGNED_URL_EXPIRY = {
  upload: 3600, // 1 hour
  download: 86400, // 24 hours
};

// ============================================================================
// R2 CLIENT
// ============================================================================

function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// Lazy-initialized R2 client
let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_r2Client) {
    if (!isR2Configured()) {
      throw new Error('R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
    }
    _r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _r2Client;
}

// Export for backwards compatibility
export const r2Client = new Proxy({} as S3Client, {
  get(_target, prop) {
    return getR2Client()[prop as keyof S3Client];
  },
});

/**
 * Generate a presigned URL for direct browser upload
 */
export async function generatePresignedUploadUrl(
  filename: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Upload a file to R2 from the server
 */
export async function uploadFile(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: file,
    ContentType: contentType,
  });

  await r2Client.send(command);
  return getPublicUrl(filename);
}

/**
 * Delete a file from R2
 */
export async function deleteFile(filename: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
  });

  await r2Client.send(command);
}

/**
 * Get the public URL for a file
 */
export function getPublicUrl(filename: string): string {
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${filename}`;
  }
  // Fallback - this won't work without proper public access configuration
  return `https://${BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filename}`;
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string, folder = 'uploads'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalFilename.split('.').pop() || '';
  const baseName = originalFilename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-');
  
  return `${folder}/${timestamp}-${random}-${baseName}.${extension}`;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(filename: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
  });

  const response = await r2Client.send(command);
  
  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
  };
}











