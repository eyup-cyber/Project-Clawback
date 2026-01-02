/**
 * Editor Focus Mode
 * Phase 3.8: Distraction-free writing mode
 */

'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface FocusModeProps {
  children: ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  showWordCount?: boolean;
  wordCount?: number;
  targetWords?: number;
}

interface FocusModeControlsProps {
  enabled: boolean;
  onToggle: () => void;
  showStats?: boolean;
  wordCount?: number;
  targetWords?: number;
  characterCount?: number;
  readingTime?: number;
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  focusOn: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  focusOff: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  ),
  close: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  stats: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

// ============================================================================
// FOCUS MODE WRAPPER
// ============================================================================

export function FocusMode({
  children,
  enabled,
  onToggle,
  showWordCount = true,
  wordCount = 0,
  targetWords = 1000,
}: FocusModeProps) {
  const [showControls, setShowControls] = useState(false);

  // Handle escape key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enabled) {
        onToggle(false);
      }
    };

    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      // Hide scrollbar in focus mode
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [enabled, onToggle]);

  // Mouse movement to show/hide controls
  const handleMouseMove = useCallback(() => {
    if (enabled) {
      setShowControls(true);

      // Hide controls after 3 seconds of no movement
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  const progress = Math.min((wordCount / targetWords) * 100, 100);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--background)' }}
      onMouseMove={handleMouseMove}
    >
      {/* Top bar - shows on hover */}
      <div
        className={`
          absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6
          transition-opacity duration-300
          ${showControls ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          background: 'linear-gradient(to bottom, var(--background) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="px-3 py-1.5 rounded-full text-sm"
            style={{
              background: 'var(--surface)',
              color: 'var(--foreground)',
              opacity: 0.8,
            }}
          >
            {Icons.focusOn}
            <span className="ml-2">Focus Mode</span>
          </div>
        </div>

        <button
          onClick={() => onToggle(false)}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--surface)]"
          style={{ color: 'var(--foreground)' }}
          title="Exit Focus Mode (Esc)"
        >
          {Icons.close}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto flex items-start justify-center pt-20 pb-32 px-4">
        <div className="w-full max-w-2xl">{children}</div>
      </div>

      {/* Bottom bar - shows on hover */}
      {showWordCount && (
        <div
          className={`
            absolute bottom-0 left-0 right-0 h-20 flex items-center justify-center
            transition-opacity duration-300
            ${showControls ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            background: 'linear-gradient(to top, var(--background) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                {wordCount.toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                words
              </p>
            </div>

            <div
              className="w-40 h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: progress >= 100 ? 'var(--secondary)' : 'var(--primary)',
                }}
              />
            </div>

            <div className="text-center">
              <p
                className="text-2xl font-bold"
                style={{
                  color: progress >= 100 ? 'var(--secondary)' : 'var(--foreground)',
                  opacity: progress >= 100 ? 1 : 0.4,
                }}
              >
                {targetWords.toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                goal
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ambient gradient effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(var(--primary-rgb), 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(var(--secondary-rgb), 0.03) 0%, transparent 50%)
          `,
        }}
      />

      {/* Styles */}
      <style jsx>{`
        /* Ensure smooth text rendering in focus mode */
        div :global(.ProseMirror) {
          font-size: 1.125rem;
          line-height: 1.8;
          letter-spacing: -0.01em;
        }

        div :global(.ProseMirror p) {
          margin: 1.5rem 0;
        }

        div :global(.ProseMirror h1),
        div :global(.ProseMirror h2),
        div :global(.ProseMirror h3) {
          margin-top: 2rem;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// FOCUS MODE TOGGLE BUTTON
// ============================================================================

export function FocusModeToggle({
  enabled,
  onToggle,
  showStats = true,
  wordCount = 0,
  characterCount = 0,
  readingTime = 0,
}: FocusModeControlsProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {showStats && !enabled && (
          <div
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: 'var(--surface)',
              color: 'var(--foreground)',
              opacity: 0.7,
            }}
          >
            <span>{wordCount.toLocaleString()} words</span>
            <span>·</span>
            <span>{characterCount.toLocaleString()} chars</span>
            <span>·</span>
            <span>~{readingTime} min read</span>
          </div>
        )}

        <button
          onClick={onToggle}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg transition-all
            ${
              enabled
                ? 'bg-[var(--primary)] text-[var(--background)]'
                : 'hover:bg-[var(--surface)] text-[var(--foreground)]'
            }
          `}
          title={enabled ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {enabled ? Icons.focusOff : Icons.focusOn}
          <span className="text-sm font-medium hidden sm:inline">
            {enabled ? 'Exit Focus' : 'Focus'}
          </span>
        </button>

        {!enabled && (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--surface)]"
            style={{ color: 'var(--foreground)', opacity: 0.6 }}
            title="Writing Stats"
          >
            {Icons.stats}
          </button>
        )}
      </div>

      {/* Stats dropdown */}
      {showDropdown && !enabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div
            className="absolute right-0 top-full mt-2 p-4 rounded-xl shadow-xl z-50 min-w-[240px]"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
              Writing Statistics
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>Words</span>
                <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                  {wordCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>Characters</span>
                <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                  {characterCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>Reading time</span>
                <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                  {readingTime} min
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>Paragraphs</span>
                <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                  ~{Math.ceil(wordCount / 100)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onToggle();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--background)',
                }}
              >
                {Icons.focusOn}
                <span className="text-sm font-medium">Enter Focus Mode</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FocusMode;
