'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UploadResult {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface UseUploadOptions {
  folder?: string;
  onProgress?: (progress: number) => void;
}

// Threshold for choosing Supabase vs R2 (5MB)
const SUPABASE_SIZE_LIMIT = 5 * 1024 * 1024;

export function useUpload(options: UseUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { folder = 'uploads', onProgress } = options;

  const updateProgress = useCallback((value: number) => {
    setProgress(value);
    onProgress?.(value);
  }, [onProgress]);

  /**
   * Upload small images to Supabase Storage (< 5MB)
   */
  const uploadToSupabase = useCallback(async (file: File): Promise<UploadResult> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || '';
    const fileName = `${user.id}/${folder}/${timestamp}-${random}.${extension}`;

    updateProgress(10);

    const { data, error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    updateProgress(80);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(data.path);

    // Record in media table
    const { data: mediaRecord, error: dbError } = await supabase
      .from('media')
      .insert({
        uploader_id: user.id,
        filename: fileName,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        url: publicUrl,
        media_type: file.type.startsWith('image/') ? 'image' 
          : file.type.startsWith('video/') ? 'video' 
          : file.type.startsWith('audio/') ? 'audio' 
          : null,
        folder,
        processing_status: 'ready',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to record media:', dbError);
    }

    updateProgress(100);

    return {
      id: mediaRecord?.id || data.path,
      url: publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
  }, [supabase, folder, updateProgress]);

  /**
   * Upload large files to R2 via presigned URL
   */
  const uploadToR2 = useCallback(async (file: File): Promise<UploadResult> => {
    const mediaType = file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('audio/') ? 'audio'
      : 'image';

    updateProgress(5);

    // 1. Get presigned URL
    const presignResponse = await fetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        mediaType,
      }),
    });

    if (!presignResponse.ok) {
      const errorData = await presignResponse.json();
      throw new Error(errorData.error || 'Failed to get upload URL');
    }

    const { uploadUrl, mediaId, publicUrl } = await presignResponse.json();

    updateProgress(15);

    // 2. Upload to R2 with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const uploadProgress = 15 + Math.round((e.loaded / e.total) * 70);
          updateProgress(uploadProgress);
        }
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(file);
    });

    updateProgress(90);

    // 3. Confirm upload
    const confirmResponse = await fetch('/api/media/upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaId }),
    });

    if (!confirmResponse.ok) {
      throw new Error('Failed to confirm upload');
    }

    updateProgress(100);

    return {
      id: mediaId,
      url: publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
  }, [updateProgress]);

  /**
   * Main upload function - automatically chooses storage based on file size/type
   */
  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const isLargeOrMedia = 
        file.size > SUPABASE_SIZE_LIMIT || 
        file.type.startsWith('video/') || 
        file.type.startsWith('audio/');

      const result = isLargeOrMedia 
        ? await uploadToR2(file)
        : await uploadToSupabase(file);

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [uploadToSupabase, uploadToR2]);

  /**
   * Upload multiple files
   */
  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await upload(file);
      results.push(result);
    }

    return results;
  }, [upload]);

  return {
    upload,
    uploadMultiple,
    uploadToSupabase,
    uploadToR2,
    uploading,
    progress,
    error,
  };
}
