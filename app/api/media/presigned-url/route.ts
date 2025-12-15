import { createClient } from '@/lib/supabase/server';
import { r2Client } from '@/lib/r2/client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse, NextRequest } from 'next/server';
import { generateId } from '@/lib/utils';
import { handleApiError, ApiError } from '@/lib/api';
import { logger } from '@/lib/logger';
import { withRouteHandler } from '@/lib/api/route-wrapper';

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'scroungers-media';

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'],
};

const MAX_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 100 * 1024 * 1024, // 100MB
};

const handler = async (request: NextRequest) => {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is contributor or above
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      logger.error('Profile lookup failed', profileError, { userId: user.id });
      throw new ApiError('Failed to verify user role', 'DATABASE_ERROR', {
        error: profileError.message,
      });
    }

    const allowedRoles = ['contributor', 'editor', 'admin'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { filename, contentType, size, mediaType } = body;

    // Validate media type
    if (!mediaType || !ALLOWED_TYPES[mediaType]) {
      return NextResponse.json(
        { error: 'Invalid media type. Must be: image, video, or audio' },
        { status: 400 }
      );
    }

    // Validate content type
    if (!ALLOWED_TYPES[mediaType].includes(contentType)) {
      return NextResponse.json(
        {
          error: `Invalid content type for ${mediaType}. Allowed: ${ALLOWED_TYPES[mediaType].join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate size
    if (size > MAX_SIZES[mediaType]) {
      const maxMB = MAX_SIZES[mediaType] / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Maximum for ${mediaType}: ${maxMB}MB` },
        { status: 400 }
      );
    }

    // Generate unique key
    const extension = filename.split('.').pop() || '';
    const uniqueId = generateId();
    const key = `${mediaType}s/${profile.id}/${uniqueId}.${extension}`;

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // Public URL for accessing the file after upload
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return handleApiError(error);
    }
    logger.error('Failed to generate presigned URL', error as Error);
    return handleApiError(error);
  }
};

export const POST = withRouteHandler(handler, {
  logRequest: true,
  csrf: true,
});
