'use client';

/**
 * Upload Zone Component
 * Phase 4.1: Drag & drop, multi-file, progress, validation
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  url?: string;
  thumbnailUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
  };
}

interface UploadZoneProps {
  accept?: string[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  multiple?: boolean;
  uploadEndpoint?: string;
  onUploadStart?: (files: UploadedFile[]) => void;
  onUploadProgress?: (file: UploadedFile) => void;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (file: UploadedFile, error: Error) => void;
  onAllComplete?: (files: UploadedFile[]) => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
];

const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_FILES = 10;

// ============================================================================
// UTILITIES
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type === 'application/pdf') return '📄';
  return '📁';
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}

async function getVideoDimensions(
  file: File
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };
    video.onerror = () => resolve({ width: 0, height: 0, duration: 0 });
    video.src = URL.createObjectURL(file);
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UploadZone({
  accept = DEFAULT_ACCEPT,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  multiple = true,
  uploadEndpoint = '/api/media/upload',
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onAllComplete,
  className = '',
  disabled = false,
  compact = false,
}: UploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  // ============================================================================
  // FILE VALIDATION
  // ============================================================================

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file type
      if (!accept.includes(file.type)) {
        return { valid: false, error: `File type ${file.type} not allowed` };
      }

      // Check file size
      if (file.size > maxFileSize) {
        return {
          valid: false,
          error: `File size exceeds limit (${formatFileSize(maxFileSize)})`,
        };
      }

      return { valid: true };
    },
    [accept, maxFileSize]
  );

  // ============================================================================
  // UPLOAD LOGIC (must be defined before processFiles)
  // ============================================================================

  const uploadFile = useCallback(
    async (uploadedFile: UploadedFile) => {
      const updateFileState = (updates: Partial<UploadedFile>) => {
        setFiles((prev) => prev.map((f) => (f.id === uploadedFile.id ? { ...f, ...updates } : f)));
      };

      updateFileState({ status: 'uploading' });

      try {
        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        formData.append('metadata', JSON.stringify(uploadedFile.metadata));

        const xhr = new XMLHttpRequest();

        // Progress tracking
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateFileState({ progress });
            onUploadProgress?.({ ...uploadedFile, progress });
          }
        };

        // Completion handling
        const uploadPromise = new Promise<{
          url: string;
          thumbnailUrl?: string;
        }>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch {
                reject(new Error('Invalid response'));
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error'));
          xhr.onabort = () => reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', uploadEndpoint);
        xhr.send(formData);

        const response = await uploadPromise;

        updateFileState({
          status: 'complete',
          progress: 100,
          url: response.url,
          thumbnailUrl: response.thumbnailUrl,
        });

        const completedFile: UploadedFile = {
          ...uploadedFile,
          status: 'complete',
          progress: 100,
          url: response.url,
          thumbnailUrl: response.thumbnailUrl,
        };

        onUploadComplete?.(completedFile);

        // Check if all files are complete
        setFiles((prev) => {
          const allComplete = prev.every((f) => f.status === 'complete' || f.status === 'error');
          if (allComplete) {
            onAllComplete?.(prev);
          }
          return prev;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateFileState({ status: 'error', error: errorMessage });
        onUploadError?.(
          { ...uploadedFile, status: 'error', error: errorMessage },
          error instanceof Error ? error : new Error(errorMessage)
        );
      }
    },
    [uploadEndpoint, onUploadProgress, onUploadComplete, onUploadError, onAllComplete]
  );

  // ============================================================================
  // FILE PROCESSING
  // ============================================================================

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const newFiles: UploadedFile[] = [];

      for (const file of Array.from(fileList)) {
        // Check max files limit
        if (files.length + newFiles.length >= maxFiles) {
          break;
        }

        const validation = validateFile(file);

        const uploadedFile: UploadedFile = {
          id: generateFileId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: validation.valid ? 'pending' : 'error',
          error: validation.error,
        };

        // Get metadata for images/videos
        if (validation.valid) {
          if (file.type.startsWith('image/')) {
            uploadedFile.metadata = await getImageDimensions(file);
          } else if (file.type.startsWith('video/')) {
            const meta = await getVideoDimensions(file);
            uploadedFile.metadata = meta;
          }
        }

        newFiles.push(uploadedFile);
      }

      setFiles((prev) => [...prev, ...newFiles]);
      onUploadStart?.(newFiles);

      // Start uploads for valid files
      const validFiles = newFiles.filter((f) => f.status === 'pending');
      for (const uploadedFile of validFiles) {
        void uploadFile(uploadedFile);
      }
    },
    [files.length, maxFiles, validateFile, onUploadStart, uploadFile]
  );

  // ============================================================================
  // DRAG & DROP HANDLERS
  // ============================================================================

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current++;
      if (dragCountRef.current === 1 && !disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);

      if (disabled) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [disabled, processFiles]
  );

  // ============================================================================
  // FILE INPUT HANDLERS
  // ============================================================================

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        processFiles(selectedFiles);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // ============================================================================
  // FILE MANAGEMENT
  // ============================================================================

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const retryUpload = useCallback(
    (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (file && file.status === 'error') {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, status: 'pending', error: undefined, progress: 0 } : f
          )
        );
        void uploadFile({
          ...file,
          status: 'pending',
          error: undefined,
          progress: 0,
        });
      }
    },
    [files, uploadFile]
  );

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  // ============================================================================
  // PASTE HANDLER
  // ============================================================================

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        processFiles(pastedFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [disabled, processFiles]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`upload-zone-wrapper ${className}`}>
      {/* Drop Zone */}
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${compact ? 'compact' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          className="file-input"
        />

        <div className="drop-content">
          <div className="drop-icon">{isDragging ? '📥' : '📤'}</div>
          <p className="drop-text">
            {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
          <p className="drop-hint">
            Max {maxFiles} files, up to {formatFileSize(maxFileSize)} each
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="file-list">
          <div className="list-header">
            <span>{files.length} file(s)</span>
            <button onClick={clearAll} className="clear-btn">
              Clear All
            </button>
          </div>

          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onRemove={() => removeFile(file.id)}
              onRetry={() => retryUpload(file.id)}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .upload-zone-wrapper {
          width: 100%;
        }

        .upload-zone {
          border: 2px dashed #e5e7eb;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #fafafa;
        }

        .upload-zone.compact {
          padding: 1rem;
        }

        .upload-zone:hover:not(.disabled) {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .upload-zone.dragging {
          border-color: #3b82f6;
          background: #dbeafe;
        }

        .upload-zone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .file-input {
          display: none;
        }

        .drop-content {
          pointer-events: none;
        }

        .drop-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .compact .drop-icon {
          font-size: 2rem;
        }

        .drop-text {
          margin: 0 0 0.25rem;
          font-weight: 500;
          color: #374151;
        }

        .drop-hint {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .file-list {
          margin-top: 1rem;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .clear-btn {
          padding: 0.25rem 0.5rem;
          border: none;
          background: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .clear-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// FILE ITEM COMPONENT
// ============================================================================

function FileItem({
  file,
  onRemove,
  onRetry,
}: {
  file: UploadedFile;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  // Generate preview for images
  useEffect(() => {
    if (file.type.startsWith('image/') && file.file) {
      const url = URL.createObjectURL(file.file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file.file, file.type]);

  return (
    <div className={`file-item ${file.status}`}>
      <div className="file-preview">
        {preview ? (
          <img src={preview} alt="" className="preview-image" />
        ) : (
          <span className="file-icon">{getFileIcon(file.type)}</span>
        )}
      </div>

      <div className="file-info">
        <div className="file-name" title={file.name}>
          {file.name}
        </div>
        <div className="file-meta">
          <span>{formatFileSize(file.size)}</span>
          {file.metadata?.width && file.metadata?.height && (
            <span>
              {file.metadata.width}×{file.metadata.height}
            </span>
          )}
          {file.metadata?.duration && <span>{Math.round(file.metadata.duration)}s</span>}
        </div>

        {/* Progress Bar */}
        {file.status === 'uploading' && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${file.progress}%` }} />
          </div>
        )}

        {/* Status */}
        <div className="file-status">
          {file.status === 'pending' && <span className="status-pending">Waiting...</span>}
          {file.status === 'uploading' && (
            <span className="status-uploading">{file.progress}%</span>
          )}
          {file.status === 'processing' && <span className="status-processing">Processing...</span>}
          {file.status === 'complete' && <span className="status-complete">✓ Complete</span>}
          {file.status === 'error' && (
            <span className="status-error" title={file.error}>
              ✕ {file.error}
            </span>
          )}
        </div>
      </div>

      <div className="file-actions">
        {file.status === 'error' && (
          <button onClick={onRetry} className="retry-btn" title="Retry">
            ↻
          </button>
        )}
        <button onClick={onRemove} className="remove-btn" title="Remove">
          ✕
        </button>
      </div>

      <style jsx>{`
        .file-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          background: white;
        }

        .file-item.error {
          border-color: #fee2e2;
          background: #fef2f2;
        }

        .file-item.complete {
          border-color: #d1fae5;
          background: #f0fdf4;
        }

        .file-preview {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          overflow: hidden;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .file-icon {
          font-size: 1.5rem;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-meta {
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .progress-bar {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          margin-top: 0.25rem;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.2s;
        }

        .file-status {
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .status-pending {
          color: #6b7280;
        }

        .status-uploading {
          color: #3b82f6;
        }

        .status-processing {
          color: #f59e0b;
        }

        .status-complete {
          color: #10b981;
        }

        .status-error {
          color: #ef4444;
        }

        .file-actions {
          display: flex;
          gap: 0.25rem;
        }

        .retry-btn,
        .remove-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .retry-btn {
          background: #dbeafe;
          color: #3b82f6;
        }

        .remove-btn {
          background: #fee2e2;
          color: #ef4444;
        }

        .retry-btn:hover,
        .remove-btn:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
