import { type NextRequest } from 'next/server';
import { success, handleApiError, requireAuth } from '@/lib/api';
import {
  fetchImagesFromUrl,
  downloadImage,
  getImageDimensions,
} from '@/lib/services/image-fetcher';
import { createClient } from '@/lib/supabase/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '@/lib/r2/client';
import { logger } from '@/lib/logger';
import { withRouteHandler } from '@/lib/api/route-wrapper';

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

/**
 * POST /api/media/fetch-images
 * Fetches images from Patreon/X posts and optionally uploads them to R2
 */
const handler = async (request: NextRequest) => {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const { url, uploadToR2 = false, selectedImageUrl } = body;

    if (!url || typeof url !== 'string') {
      return success(
        {
          success: false,
          images: [],
          error: 'URL is required',
        },
        400
      );
    }

    // Fetch images from the URL
    const result = await fetchImagesFromUrl(url);

    if (!result.success || result.images.length === 0) {
      return success({
        success: false,
        images: [],
        error: result.error || 'No images found',
      });
    }

    // If uploadToR2 is true, upload images to R2 storage
    if (uploadToR2 && BUCKET_NAME) {
      const supabase = await createClient();
      const uploadedImages = [];

      // If a specific image URL is selected, only upload that one
      const imagesToUpload = selectedImageUrl
        ? result.images.filter((img) => img.url === selectedImageUrl)
        : result.images;

      for (const image of imagesToUpload) {
        try {
          // Download the image
          const blob = await downloadImage(image.url);
          const buffer = Buffer.from(await blob.arrayBuffer());

          // Get image dimensions
          const dimensions = await getImageDimensions(image.url);

          // Generate unique key
          const timestamp = Date.now();
          const extension = blob.type.split('/')[1] || 'jpg';
          const key = `imported/${user.id}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

          // Upload to R2
          const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: blob.type,
            ContentLength: buffer.length,
            Metadata: {
              userId: user.id,
              sourceUrl: image.url,
              alt: image.alt,
            },
          });

          await r2Client.send(putCommand);

          // Generate public URL
          const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL}/${key}`;

          // Create media record in database
          const { data: media, error: dbError } = await supabase
            .from('media')
            .insert({
              uploader_id: user.id,
              filename: key.split('/').pop() || 'image.jpg',
              original_filename: image.url.split('/').pop() || 'image.jpg',
              mime_type: blob.type,
              file_size: buffer.length,
              media_type: 'image',
              storage_key: key,
              url: publicUrl,
              thumbnail_url: publicUrl, // Same as main URL for images
              width: dimensions?.width || image.width,
              height: dimensions?.height || image.height,
              alt_text: image.alt,
              processing_status: 'ready',
            })
            .select()
            .single();

          if (!dbError && media) {
            uploadedImages.push({
              ...media,
              originalUrl: image.url,
            });
          }
        } catch (error) {
          logger.error('Failed to upload image', error, { imageUrl: image.url, userId: user.id });
          // Continue with other images even if one fails
        }
      }

      return success({
        success: true,
        images: uploadedImages,
        message: `Successfully imported ${uploadedImages.length} image(s)`,
      });
    }

    // Return just the image URLs without uploading
    return success({
      success: true,
      images: result.images,
      message: `Found ${result.images.length} image(s)`,
    });
  } catch (err) {
    return handleApiError(err);
  }
};

export const POST = withRouteHandler(handler, {
  logRequest: true,
  csrf: true,
});
