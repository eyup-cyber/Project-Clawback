'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { cn, formatFileSize } from '@/lib/utils';

interface FileUploadProps {
  label?: string;
  hint?: string;
  error?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  onChange?: (files: File[]) => void;
  className?: string;
  showPreview?: boolean;
  progress?: Record<string, number>; // key by file.name
}

export function FileUpload({
  label,
  hint,
  error,
  accept,
  multiple = true,
  maxFiles = 10,
  disabled,
  onChange,
  className,
  showPreview = true,
  progress,
}: Readonly<FileUploadProps>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (selected: FileList | null) => {
      if (!selected) return;
      const array = Array.from(selected).slice(0, maxFiles);
      setFiles(array);
      onChange?.(array);
    },
    [maxFiles, onChange]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (disabled) return;
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const previews = useMemo(() => {
    if (!showPreview) return [];
    return files.map((file) => {
      if (file.type.startsWith('image/')) {
        return { name: file.name, url: URL.createObjectURL(file), type: 'image' as const, size: file.size };
      }
      return { name: file.name, url: '', type: 'file' as const, size: file.size };
    });
  }, [files, showPreview]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && <div className="text-sm font-semibold text-(--foreground)">{label}</div>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-(--border) bg-(--surface) p-6 text-center transition-colors',
          'hover:border-(--primary) hover:bg-(--surface-elevated)',
          isDragging && 'border-(--primary) bg-(--surface-elevated)',
          disabled && 'cursor-not-allowed opacity-60'
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          aria-label="Upload files"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="rounded-full bg-(--surface-elevated) px-3 py-1 text-xs text-(--foreground)/80">
          {multiple ? 'Drag and drop files or click to browse' : 'Click to select a file'}
        </div>
        <div className="text-xs text-(--foreground)/60">Max {maxFiles} files</div>
        {hint && <div className="text-sm text-(--foreground)/70">{hint}</div>}
      </div>

      {error && (
        <p className="text-sm text-(--accent)" role="alert">
          {error}
        </p>
      )}

      {previews.length > 0 && (
        <div className="space-y-2">
          {previews.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-lg border border-(--border) bg-(--surface) p-2"
            >
              {item.type === 'image' ? (
                // Using img for user-uploaded blob URLs - Next/Image doesn't support blob:// protocol
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.name} className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-(--surface-elevated)">
                  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <div className="text-sm font-semibold text-(--foreground)">{item.name}</div>
                <div className="text-xs text-(--foreground)/70">{formatFileSize(item.size)}</div>
                {progress?.[item.name] !== undefined && (
                  <div className="mt-1 text-xs text-(--foreground)/70">
                    Progress: {Math.round(progress[item.name])}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

