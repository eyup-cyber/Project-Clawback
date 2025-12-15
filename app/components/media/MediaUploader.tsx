'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { formatFileSize } from '@/lib/utils';

interface MediaUploaderProps {
  mediaType: 'video' | 'audio' | 'image';
  onUploadComplete: (media: {
    id: string;
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => void;
  maxSize?: number; // in bytes
}

const ACCEPT_TYPES = {
  video: 'video/mp4,video/webm,video/quicktime,video/x-msvideo',
  audio: 'audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4',
  image: 'image/jpeg,image/png,image/gif,image/webp,image/avif',
};

const TYPE_LABELS = {
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
};

const TYPE_ICONS = {
  video: '🎥',
  audio: '🎧',
  image: '🖼️',
};

export default function MediaUploader({
  mediaType,
  onUploadComplete,
  maxSize = 500 * 1024 * 1024,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (file.size > maxSize) {
        toast.error(`File too large. Maximum size is ${formatFileSize(maxSize)}`);
        return false;
      }

      const acceptedTypes = ACCEPT_TYPES[mediaType].split(',');
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`Invalid file type. Please upload a ${TYPE_LABELS[mediaType].toLowerCase()} file.`);
        return false;
      }

      return true;
    },
    [maxSize, mediaType]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        setSelectedFile(file);
      }
    },
    [validateFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      // 1. Get presigned URL
      const presignResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          mediaType,
        }),
      });

      if (!presignResponse.ok) {
        const error = await presignResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { uploadUrl, mediaId, publicUrl } = await presignResponse.json();

      // 2. Upload to R2
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
        
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(selectedFile);
      });

      // 3. Confirm upload
      const confirmResponse = await fetch('/api/media/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm upload');
      }

      toast.success('Upload complete!');
      onUploadComplete({
        id: mediaId,
        url: publicUrl,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      setSelectedFile(null);
      setProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setProgress(0);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragging ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:border-[var(--primary)]/50'}
          ${selectedFile ? 'cursor-default' : ''}
        `}
        style={{ background: selectedFile ? 'var(--surface)' : 'transparent' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_TYPES[mediaType]}
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <>
            <div className="text-5xl mb-4">{TYPE_ICONS[mediaType]}</div>
            <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
              Drop your {TYPE_LABELS[mediaType].toLowerCase()} here, or click to browse
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Max file size: {formatFileSize(maxSize)}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-4xl">{TYPE_ICONS[mediaType]}</div>
            <div className="flex-1 text-left">
              <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>
                {selectedFile.name}
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            {!uploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="p-2 hover:text-[var(--accent)]"
                style={{ color: 'var(--foreground)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, background: 'var(--primary)' }}
            />
          </div>
          <p className="text-sm text-center" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !uploading && (
        <button
          onClick={uploadFile}
          className="w-full py-3 rounded-lg font-medium transition-colors"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          Upload {TYPE_LABELS[mediaType]}
        </button>
      )}
    </div>
  );
}



