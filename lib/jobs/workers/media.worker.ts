/**
 * Media Worker
 * Processes media file operations (resize, compress, convert, thumbnails)
 */

import { type Job } from 'bullmq';
import { registerWorker, type MediaJobData, QUEUE_NAMES, addJob } from '../queue';

/**
 * Media processing operations
 */
interface MediaOperationResult {
  success: boolean;
  outputUrl?: string;
  error?: string;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    format?: string;
  };
}

/**
 * Resize image (mock implementation)
 */
async function resizeImage(
  mediaId: string,
  options: Record<string, unknown>
): Promise<MediaOperationResult> {
  const width = (options.width as number) || 800;
  const height = (options.height as number) || 600;
  const quality = (options.quality as number) || 80;

  console.log(`🖼️ Resizing image ${mediaId} to ${width}x${height} at ${quality}% quality`);
  
  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In production, use sharp, jimp, or cloud service:
  // const sharp = require('sharp');
  // await sharp(inputPath)
  //   .resize(width, height, { fit: 'inside' })
  //   .jpeg({ quality })
  //   .toFile(outputPath);

  return {
    success: true,
    outputUrl: `/media/${mediaId}/resized_${width}x${height}.jpg`,
    metadata: { width, height, format: 'jpeg' },
  };
}

/**
 * Compress image (mock implementation)
 */
async function compressImage(
  mediaId: string,
  options: Record<string, unknown>
): Promise<MediaOperationResult> {
  const quality = (options.quality as number) || 75;
  const format = (options.format as string) || 'webp';

  console.log(`🗜️ Compressing image ${mediaId} to ${format} at ${quality}% quality`);
  
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    success: true,
    outputUrl: `/media/${mediaId}/compressed.${format}`,
    metadata: { format },
  };
}

/**
 * Convert media format (mock implementation)
 */
async function convertMedia(
  mediaId: string,
  options: Record<string, unknown>
): Promise<MediaOperationResult> {
  const targetFormat = (options.format as string) || 'webp';

  console.log(`🔄 Converting media ${mediaId} to ${targetFormat}`);
  
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    success: true,
    outputUrl: `/media/${mediaId}/converted.${targetFormat}`,
    metadata: { format: targetFormat },
  };
}

/**
 * Generate thumbnail (mock implementation)
 */
async function generateThumbnail(
  mediaId: string,
  options: Record<string, unknown>
): Promise<MediaOperationResult> {
  const size = (options.size as number) || 150;

  console.log(`📷 Generating ${size}x${size} thumbnail for ${mediaId}`);
  
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    success: true,
    outputUrl: `/media/${mediaId}/thumb_${size}.jpg`,
    metadata: { width: size, height: size, format: 'jpeg' },
  };
}

/**
 * Process media job
 */
async function processMediaJob(job: Job<MediaJobData>): Promise<void> {
  const { mediaId, userId: _userId, operation, options = {} } = job.data;

  console.log(`📹 Processing media job: ${operation} for ${mediaId}`);
  await job.updateProgress(10);

  let result: MediaOperationResult;

  switch (operation) {
    case 'resize':
      result = await resizeImage(mediaId, options);
      break;
    case 'compress':
      result = await compressImage(mediaId, options);
      break;
    case 'convert':
      result = await convertMedia(mediaId, options);
      break;
    case 'thumbnail':
      result = await generateThumbnail(mediaId, options);
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  await job.updateProgress(90);

  if (!result.success) {
    throw new Error(result.error || 'Media processing failed');
  }

  // Update database with processed media URL
  // await updateMediaRecord(mediaId, {
  //   [`${operation}Url`]: result.outputUrl,
  //   metadata: result.metadata,
  // });

  console.log(`✅ Media ${operation} completed for ${mediaId}: ${result.outputUrl}`);
  await job.updateProgress(100);
}

/**
 * Initialize media worker
 */
export function initMediaWorker(): void {
  registerWorker(QUEUE_NAMES.MEDIA, processMediaJob, {
    concurrency: 3, // Limit concurrent media operations (CPU intensive)
    limiter: {
      max: 20, // Max 20 operations per minute
      duration: 60000,
    },
  });

  console.log('📹 Media worker initialized');
}

/**
 * Queue media processing job
 */
export async function queueMediaProcessing(
  mediaId: string,
  userId: string,
  operation: MediaJobData['operation'],
  options?: Record<string, unknown>
): Promise<void> {
  await addJob(
    QUEUE_NAMES.MEDIA,
    {
      mediaId,
      userId,
      operation,
      options,
    },
    {
      jobId: `${mediaId}-${operation}`, // Prevent duplicate jobs
    }
  );
}

/**
 * Queue full media processing pipeline
 */
export async function queueMediaPipeline(
  mediaId: string,
  userId: string
): Promise<void> {
  // Queue multiple operations
  await Promise.all([
    queueMediaProcessing(mediaId, userId, 'compress', { quality: 80, format: 'webp' }),
    queueMediaProcessing(mediaId, userId, 'thumbnail', { size: 150 }),
    queueMediaProcessing(mediaId, userId, 'thumbnail', { size: 300 }),
    queueMediaProcessing(mediaId, userId, 'resize', { width: 1200, height: 900 }),
  ]);
}
