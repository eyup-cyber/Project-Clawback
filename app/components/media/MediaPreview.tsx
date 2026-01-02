'use client';

/**
 * Media Preview Component
 * Phase 4.2: Image viewer, video player, gallery
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  name: string;
  alt?: string;
  width?: number;
  height?: number;
  duration?: number;
  size: number;
}

interface MediaPreviewProps {
  media: MediaItem;
  onClose?: () => void;
  showControls?: boolean;
}

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose?: () => void;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onEnded?: () => void;
}

interface GalleryProps {
  items: MediaItem[];
  initialIndex?: number;
  onClose?: () => void;
}

// ============================================================================
// MEDIA PREVIEW (Main)
// ============================================================================

export function MediaPreview({ media, onClose, showControls = true }: MediaPreviewProps) {
  if (media.type === 'image') {
    return <ImageViewer src={media.url} alt={media.alt} onClose={onClose} />;
  }

  if (media.type === 'video') {
    return (
      <div className="media-preview-container">
        <VideoPlayer src={media.url} poster={media.thumbnailUrl} autoPlay />
        {showControls && onClose && (
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        )}

        <style jsx>{`
          .media-preview-container {
            position: relative;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
          }

          .close-btn {
            position: absolute;
            top: 1rem;
            right: 1rem;
            width: 40px;
            height: 40px;
            border: none;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.25rem;
            z-index: 10;
          }
        `}</style>
      </div>
    );
  }

  if (media.type === 'audio') {
    return <AudioPlayer src={media.url} name={media.name} />;
  }

  // Document/other preview
  return (
    <div className="document-preview">
      <div className="doc-icon">📄</div>
      <div className="doc-name">{media.name}</div>
      <a href={media.url} target="_blank" rel="noopener noreferrer" className="download-btn">
        Download
      </a>

      <style jsx>{`
        .document-preview {
          padding: 2rem;
          text-align: center;
          background: #f9fafb;
          border-radius: 12px;
        }

        .doc-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .doc-name {
          font-weight: 500;
          margin-bottom: 1rem;
          word-break: break-all;
        }

        .download-btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// IMAGE VIEWER
// ============================================================================

export function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.5, Math.min(5, s + delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleReset();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="image-viewer" onClick={onClose}>
      <div
        ref={containerRef}
        className="image-container"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
        }}
      >
        <img
          src={src}
          alt={alt || ''}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s',
          }}
          draggable={false}
        />
      </div>

      {/* Controls */}
      <div className="viewer-controls" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleZoomOut} title="Zoom Out (-)">
          ➖
        </button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} title="Zoom In (+)">
          ➕
        </button>
        <button onClick={handleReset} title="Reset (0)">
          ↻
        </button>
      </div>

      {/* Close Button */}
      {onClose && (
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      )}

      <style jsx>{`
        .image-viewer {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          user-select: none;
        }

        .viewer-controls {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.7);
          padding: 0.5rem;
          border-radius: 999px;
        }

        .viewer-controls button {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1rem;
        }

        .viewer-controls button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .zoom-level {
          color: white;
          font-size: 0.875rem;
          min-width: 50px;
          text-align: center;
        }

        .close-btn {
          position: fixed;
          top: 1rem;
          right: 1rem;
          width: 48px;
          height: 48px;
          border: none;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.5rem;
        }

        .close-btn:hover {
          background: rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// VIDEO PLAYER
// ============================================================================

export function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  muted = false,
  loop = false,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (!isMuted) {
        videoRef.current.volume = 0;
        setVolume(0);
      } else {
        videoRef.current.volume = 1;
        setVolume(1);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div
      className="video-player"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onEnded}
        onClick={togglePlay}
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <button className="play-overlay" onClick={togglePlay}>
          ▶
        </button>
      )}

      {/* Controls */}
      <div className={`video-controls ${showControls ? 'visible' : ''}`}>
        <button onClick={togglePlay} className="play-btn">
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span className="time">{formatTime(currentTime)}</span>

        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="seek-bar"
        />

        <span className="time">{formatTime(duration)}</span>

        <button onClick={toggleMute} className="mute-btn">
          {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="volume-bar"
        />

        <button onClick={toggleFullscreen} className="fullscreen-btn">
          {isFullscreen ? '⛶' : '⛶'}
        </button>
      </div>

      <style jsx>{`
        .video-player {
          position: relative;
          width: 100%;
          background: black;
          border-radius: 8px;
          overflow: hidden;
        }

        video {
          width: 100%;
          display: block;
          cursor: pointer;
        }

        .play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border: none;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .play-overlay:hover {
          background: rgba(0, 0, 0, 0.8);
        }

        .video-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          opacity: 0;
          transition: opacity 0.3s;
        }

        .video-controls.visible {
          opacity: 1;
        }

        .video-controls button {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .time {
          color: white;
          font-size: 0.875rem;
          min-width: 45px;
        }

        .seek-bar {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          cursor: pointer;
        }

        .seek-bar::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }

        .volume-bar {
          width: 80px;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          cursor: pointer;
        }

        .volume-bar::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .volume-bar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// AUDIO PLAYER
// ============================================================================

export function AudioPlayer({ src, name }: { src: string; name: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      <button onClick={togglePlay} className="play-btn">
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div className="audio-info">
        <div className="audio-name">{name}</div>
        <div className="audio-progress">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const time = parseFloat(e.target.value);
              if (audioRef.current) {
                audioRef.current.currentTime = time;
                setCurrentTime(time);
              }
            }}
          />
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      <style jsx>{`
        .audio-player {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 12px;
        }

        .play-btn {
          width: 48px;
          height: 48px;
          border: none;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .audio-info {
          flex: 1;
          min-width: 0;
        }

        .audio-name {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 0.25rem;
        }

        .audio-progress {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .audio-progress input {
          flex: 1;
          -webkit-appearance: none;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
        }

        .audio-progress input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }

        .audio-progress span {
          font-size: 0.75rem;
          color: #6b7280;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// GALLERY
// ============================================================================

export function Gallery({ items, initialIndex = 0, onClose }: GalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentItem = items[currentIndex];

  const goToNext = () => setCurrentIndex((i) => (i + 1) % items.length);
  const goToPrev = () => setCurrentIndex((i) => (i - 1 + items.length) % items.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="gallery-viewer">
      <div className="gallery-content">
        <MediaPreview media={currentItem} showControls={false} />
      </div>

      {/* Navigation */}
      <button className="nav-btn prev" onClick={goToPrev}>
        ‹
      </button>
      <button className="nav-btn next" onClick={goToNext}>
        ›
      </button>

      {/* Counter */}
      <div className="counter">
        {currentIndex + 1} / {items.length}
      </div>

      {/* Thumbnails */}
      <div className="thumbnails">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          >
            {item.thumbnailUrl ? (
              <img src={item.thumbnailUrl} alt="" />
            ) : (
              <span>{item.type === 'video' ? '🎬' : '🖼️'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Close */}
      {onClose && (
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      )}

      <style jsx>{`
        .gallery-viewer {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .gallery-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .nav-btn {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          width: 60px;
          height: 60px;
          border: none;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          font-size: 2rem;
          cursor: pointer;
          border-radius: 50%;
        }

        .nav-btn.prev {
          left: 1rem;
        }

        .nav-btn.next {
          right: 1rem;
        }

        .counter {
          position: fixed;
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 0.875rem;
          background: rgba(0, 0, 0, 0.5);
          padding: 0.5rem 1rem;
          border-radius: 999px;
        }

        .thumbnails {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
        }

        .thumbnail {
          width: 60px;
          height: 60px;
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          background: #374151;
          flex-shrink: 0;
        }

        .thumbnail.active {
          border-color: #3b82f6;
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail span {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-size: 1.5rem;
        }

        .close-btn {
          position: fixed;
          top: 1rem;
          right: 1rem;
          width: 48px;
          height: 48px;
          border: none;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.5rem;
        }
      `}</style>
    </div>
  );
}
