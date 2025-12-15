import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { r2Client } from '@/lib/r2/client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { success, handleApiError, unauthorized, forbidden, badRequest } from '@/lib/api';
import { requireContributor } from '@/lib/api/middleware';
import { rateLimitByUser } from '@/lib/security/rate-limit';
import { sanitizeFilename } from '@/lib/security/sanitize';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { applySecurityHeaders } from '@/lib/security/headers';

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const ALLOWED_TYPES = {
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
};

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Require contributor role
    const { user } = await requireContributor();

    createContext(requestId, 'POST', '/api/media/upload', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      userId: user.id,
    });

    logger.info('Media upload request', { method: 'POST', path: '/api/media/upload', userId: user.id }, requestId);

    // Rate limit: 20 uploads per hour
    await rateLimitByUser(user.id, { maxRequests: 20, windowMs: 3600000 });

    const body = await request.json();
    const { fileName, fileType, fileSize, mediaType } = body;

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return badRequest('File too large. Maximum size is 500MB.');
    }

    // Validate file type
    const allowedMimeTypes = ALLOWED_TYPES[mediaType as keyof typeof ALLOWED_TYPES];
    if (!allowedMimeTypes?.includes(fileType)) {
      return badRequest(`Invalid file type for ${mediaType}`);
    }

    // Sanitize filename
    const sanitizedName = sanitizeFilename(fileName);
    const timestamp = Date.now();
    const key = `${mediaType}/${user.id}/${timestamp}-${sanitizedName}`;

    // Generate presigned URL for upload
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        userId: user.id,
        originalName: fileName,
      },
    });

    const uploadUrl = await getSignedUrl(r2Client, putCommand, { expiresIn: 3600 });

    // Generate the public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    const supabase = await createClient();

    // Create media record in database
    const { data: media, error: dbError } = await supabase
      .from('media')
      .insert({
        uploader_id: user.id,
        filename: key.split('/').pop() || sanitizedName,
        original_filename: fileName,
        mime_type: fileType,
        file_size: fileSize,
        media_type: mediaType,
        storage_key: key,
        url: publicUrl,
        processing_status: 'uploading',
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to create media record', dbError, { userId: user.id, fileName }, requestId);
      throw dbError;
    }

    const duration = Date.now() - startTime;
    logger.performance('mediaUpload', duration, { mediaId: media.id, fileSize }, requestId);
    logger.info('Media upload initiated', { mediaId: media.id }, requestId);

    const response = success({
      uploadUrl,
      mediaId: media.id,
      publicUrl,
      key,
    }, 201);

    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}

// Confirm upload completion
export async function PUT(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { requireAuth } = await import('@/lib/api/middleware');
    const { user } = await requireAuth();

    createContext(requestId, 'PUT', '/api/media/upload', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      userId: user.id,
    });

    logger.info('Media upload confirmation', { method: 'PUT', path: '/api/media/upload', userId: user.id }, requestId);

    const body = await request.json();
    const { mediaId } = body;

    if (!mediaId) {
      return badRequest('mediaId is required');
    }

    const supabase = await createClient();

    // Update media status
    const { data, error } = await supabase
      .from('media')
      .update({ processing_status: 'ready' })
      .eq('id', mediaId)
      .eq('uploader_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to confirm upload', error, { mediaId, userId: user.id }, requestId);
      throw error;
    }

    const duration = Date.now() - startTime;
    logger.performance('mediaUploadConfirm', duration, { mediaId }, requestId);
    logger.info('Media upload confirmed', { mediaId }, requestId);

    const response = success({ media: data });
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}






