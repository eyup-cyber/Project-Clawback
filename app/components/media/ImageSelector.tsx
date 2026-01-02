'use client';

import Image from 'next/image';
import { useState } from 'react';
import ImageImporter from './ImageImporter';
import MediaUploader from './MediaUploader';

interface ImageSelectorProps {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  allowImport?: boolean;
  allowUpload?: boolean;
}

/**
 * Universal Image Selector Component
 * Can be used anywhere images need to be selected
 */
export default function ImageSelector({
  value,
  onChange,
  label = 'Select Image',
  allowImport = true,
  allowUpload = true,
}: ImageSelectorProps) {
  const [mode, setMode] = useState<'select' | 'import' | 'upload'>('select');
  const [showImporter, setShowImporter] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {label}
        </label>
        <div className="flex gap-2">
          {allowImport && (
            <button
              onClick={() => {
                setMode('import');
                setShowImporter(true);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border transition-all"
              style={{
                borderColor: mode === 'import' ? 'var(--primary)' : 'var(--border)',
                background: mode === 'import' ? 'var(--primary)' : 'transparent',
                color: mode === 'import' ? 'var(--background)' : 'var(--foreground)',
              }}
            >
              📥 Import
            </button>
          )}
          {allowUpload && (
            <button
              onClick={() => {
                setMode('upload');
                setShowImporter(false);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border transition-all"
              style={{
                borderColor: mode === 'upload' ? 'var(--primary)' : 'var(--border)',
                background: mode === 'upload' ? 'var(--primary)' : 'transparent',
                color: mode === 'upload' ? 'var(--background)' : 'var(--foreground)',
              }}
            >
              📤 Upload
            </button>
          )}
          <button
            onClick={() => {
              setMode('select');
              setShowImporter(false);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border transition-all"
            style={{
              borderColor: mode === 'select' ? 'var(--primary)' : 'var(--border)',
              background: mode === 'select' ? 'var(--primary)' : 'transparent',
              color: mode === 'select' ? 'var(--background)' : 'var(--foreground)',
            }}
          >
            🖼️ Library
          </button>
        </div>
      </div>

      {/* Image Importer */}
      {mode === 'import' && showImporter && (
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <ImageImporter onImageSelect={onChange} currentImage={value || undefined} />
        </div>
      )}

      {/* Media Uploader */}
      {mode === 'upload' && (
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <MediaUploader mediaType="image" onUploadComplete={(media) => onChange(media.url)} />
        </div>
      )}

      {/* Library Selector (would link to media library) */}
      {mode === 'select' && (
        <div
          className="p-4 rounded-lg border text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <p className="text-sm mb-3" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Browse your media library
          </p>
          <a
            href="/dashboard/media"
            target="_blank"
            className="inline-block px-4 py-2 rounded-lg font-medium"
            style={{ background: 'var(--primary)', color: 'var(--background)' }}
            rel="noopener"
          >
            Open Media Library →
          </a>
        </div>
      )}

      {/* Preview */}
      {value && (
        <div
          className="relative aspect-video rounded-lg overflow-hidden border"
          style={{ borderColor: 'var(--border)' }}
        >
          <Image src={value} alt="Selected image" fill className="object-cover" unoptimized />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            style={{ color: '#fff' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
