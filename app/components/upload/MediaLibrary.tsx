'use client';

import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatFileSize } from '@/lib/utils';
import { useMediaLibrary } from './hooks/useMediaLibrary';
import { useUpload } from './hooks/useUpload';

interface MediaLibraryProps {
  mediaType?: 'image' | 'video' | 'audio';
  onSelect: (url: string, item?: { id: string; alt_text?: string | null }) => void;
  selectedUrl?: string | null;
}

export default function MediaLibrary({
  mediaType = 'image',
  onSelect,
  selectedUrl,
}: MediaLibraryProps) {
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const { items, loading, hasMore, loadMore, refresh, deleteItem } = useMediaLibrary({
    mediaType,
  });
  const { upload, uploading, progress } = useUpload();

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      void (async () => {
        try {
          const result = await upload(file);
          toast.success('Upload complete!');
          onSelect(result.url, { id: result.id });
          refresh();
          setTab('library');
        } catch {
          toast.error('Upload failed');
        }
      })();
    },
    [upload, onSelect, refresh]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this file?')) return;

      try {
        await deleteItem(id);
        toast.success('Deleted');
      } catch {
        toast.error('Failed to delete');
      }
    },
    [deleteItem]
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setTab('library')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'library' ? 'border-b-2' : 'opacity-60'
          }`}
          style={{
            borderColor: tab === 'library' ? 'var(--primary)' : 'transparent',
            color: 'var(--foreground)',
          }}
        >
          Media Library
        </button>
        <button
          onClick={() => setTab('upload')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'upload' ? 'border-b-2' : 'opacity-60'
          }`}
          style={{
            borderColor: tab === 'upload' ? 'var(--primary)' : 'transparent',
            color: 'var(--foreground)',
          }}
        >
          Upload New
        </button>
      </div>

      {/* Library tab */}
      {tab === 'library' && (
        <div>
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{
                  borderColor: 'var(--border)',
                  borderTopColor: 'var(--primary)',
                }}
              />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                No media in library. Upload your first file!
              </p>
              <button
                onClick={() => setTab('upload')}
                className="mt-4 px-4 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--background)',
                }}
              >
                Upload Now
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`relative group aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedUrl === item.url ? 'border-[var(--primary)]' : 'border-transparent'
                    }`}
                    onClick={() =>
                      onSelect(item.url, {
                        id: item.id,
                        alt_text: item.alt_text,
                      })
                    }
                  >
                    {item.media_type === 'image' && (
                      <img
                        src={item.thumbnail_url || item.url}
                        alt={item.alt_text || item.original_filename}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {item.media_type === 'video' && (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--surface)]">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}
                    {item.media_type === 'audio' && (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--surface)]">
                        <span className="text-4xl">🎧</span>
                      </div>
                    )}

                    {/* Overlay */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
                      style={{
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{item.original_filename}</p>
                        <p className="text-xs text-white/60">{formatFileSize(item.file_size)}</p>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(item.id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      style={{ background: 'var(--accent)' }}
                    >
                      <span className="text-white text-xs">×</span>
                    </button>

                    {/* Selected indicator */}
                    {selectedUrl === item.url && (
                      <div
                        className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--primary)' }}
                      >
                        <span className="text-[var(--background)] text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-4 py-2 text-sm rounded-lg border hover:bg-[var(--surface-elevated)] disabled:opacity-50"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Upload tab */}
      {tab === 'upload' && (
        <div className="space-y-4">
          <label
            className={`
              block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              hover:border-[var(--primary)] hover:bg-[var(--surface)]
              ${uploading ? 'pointer-events-none opacity-60' : ''}
            `}
            style={{ borderColor: 'var(--border)' }}
          >
            <input
              type="file"
              accept={
                mediaType === 'image'
                  ? 'image/*'
                  : mediaType === 'video'
                    ? 'video/*'
                    : mediaType === 'audio'
                      ? 'audio/*'
                      : '*/*'
              }
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="text-4xl mb-2">
              {mediaType === 'image' ? '🖼️' : mediaType === 'video' ? '🎬' : '🎧'}
            </div>
            <p className="font-medium" style={{ color: 'var(--foreground)' }}>
              Click to upload {mediaType}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              or drag and drop
            </p>
          </label>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--border)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: 'var(--primary)',
                  }}
                />
              </div>
              <p
                className="text-sm text-center"
                style={{ color: 'var(--foreground)', opacity: 0.6 }}
              >
                Uploading... {progress}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
