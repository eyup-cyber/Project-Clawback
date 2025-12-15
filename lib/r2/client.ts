import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 client configuration
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'scroungers-media';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

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











