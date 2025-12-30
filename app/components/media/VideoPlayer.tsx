'use client';

/**
 * Custom Video Player Component
 * Phase 41: Video player with chapters, captions, quality selector
 */

import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

export interface VideoCaption {
  id: string;
  label: string;
  language: string;
  src: string;
  default?: boolean;
}

export interface VideoQuality {
  label: string;
  src: string;
  resolution: number;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  chapters?: VideoChapter[];
  captions?: VideoCaption[];
  qualities?: VideoQuality[];
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  aspectRatio?: '16:9' | '4:3' | '21:9' | '1:1';
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgress?: (progress: number) => void;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getAspectRatioClass(ratio: string): string {
  const ratios: Record<string, string> = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '21:9': 'aspect-[21/9]',
    '1:1': 'aspect-square',
  };
  return ratios[ratio] || 'aspect-video';
}

// ============================================================================
// ICONS
// ============================================================================

const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const VolumeHighIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const VolumeMuteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

const FullscreenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

const CaptionsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
  </svg>
);

const ChaptersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
  </svg>
);

const PipIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
  </svg>
);

// ============================================================================
// COMPONENT
// ============================================================================

export default function VideoPlayer({
  src,
  poster,
  title,
  chapters = [],
  captions = [],
  qualities = [],
  autoPlay = false,
  muted = false,
  loop = false,
  preload = 'metadata',
  aspectRatio = '16:9',
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onProgress,
  className = '',
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [currentQuality, setCurrentQuality] = useState(qualities[0]?.label || 'Auto');
  const [currentCaption, setCurrentCaption] = useState<string | null>(
    captions.find((c) => c.default)?.id || null
  );
  const [playbackRate, setPlaybackRate] = useState(1);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Current chapter
  const currentChapter = chapters.find(
    (ch) => currentTime >= ch.startTime && currentTime < ch.endTime
  );

  // Hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Video event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time, duration);
  }, [duration, onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  }, []);

  const handleProgress = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const bufferedProgress = (bufferedEnd / video.duration) * 100;
      setBuffered(bufferedProgress);
      onProgress?.(bufferedProgress);
    }
  }, [onProgress]);

  // Control handlers
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    if (!isMuted) {
      setVolume(0);
    } else {
      setVolume(1);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen failed:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Exit fullscreen failed:', err);
      }
    }
  }, [isFullscreen]);

  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP failed:', err);
    }
  }, []);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!videoRef.current || !progressRef.current) return;

      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;

      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const changeQuality = useCallback(
    (quality: VideoQuality) => {
      if (!videoRef.current) return;
      const currentTimeRef = videoRef.current.currentTime;
      videoRef.current.src = quality.src;
      videoRef.current.currentTime = currentTimeRef;
      setCurrentQuality(quality.label);
      if (isPlaying) {
        void videoRef.current.play();
      }
      setShowSettings(false);
    },
    [isPlaying]
  );

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  }, []);

  const toggleCaption = useCallback((captionId: string | null) => {
    setCurrentCaption(captionId);

    if (!videoRef.current) return;
    const tracks = videoRef.current.textTracks;

    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = tracks[i].id === captionId ? 'showing' : 'hidden';
    }
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(Math.min(duration, currentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.min(1, volume + 0.1);
            setVolume(Math.min(1, volume + 0.1));
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.max(0, volume - 0.1);
            setVolume(Math.max(0, volume - 0.1));
          }
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          void toggleFullscreen();
          break;
        case 'c':
          e.preventDefault();
          toggleCaption(currentCaption ? null : captions[0]?.id || null);
          break;
        case 'Escape':
          setShowSettings(false);
          setShowChapters(false);
          break;
      }
    },
    [
      togglePlay,
      seekTo,
      currentTime,
      duration,
      volume,
      toggleMute,
      toggleFullscreen,
      toggleCaption,
      currentCaption,
      captions,
    ]
  );

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Controls visibility - initial setup
  useEffect(() => {
    // Set initial controls timeout on mount
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group ${getAspectRatioClass(aspectRatio)} ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label={title || 'Video player'}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        preload={preload}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        playsInline
      >
        {/* Captions */}
        {captions.map((caption) => (
          <track
            key={caption.id}
            id={caption.id}
            kind="subtitles"
            label={caption.label}
            srcLang={caption.language}
            src={caption.src}
            default={caption.default}
          />
        ))}
      </video>

      {/* Big Play Button Overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
          aria-label="Play video"
        >
          <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            <PlayIcon />
          </div>
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="relative h-1 bg-white/30 rounded cursor-pointer mb-3 group/progress"
          onClick={handleProgressClick}
        >
          {/* Buffered */}
          <div className="absolute h-full bg-white/50 rounded" style={{ width: `${buffered}%` }} />
          {/* Progress */}
          <div
            className="absolute h-full bg-blue-500 rounded"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Chapter markers */}
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="absolute w-1 h-full bg-white/70 rounded"
              style={{ left: `${(chapter.startTime / duration) * 100}%` }}
              title={chapter.title}
            />
          ))}
          {/* Scrubber */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 text-white hover:text-blue-400 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Volume */}
            <div className="flex items-center group/volume">
              <button
                onClick={toggleMute}
                className="p-2 text-white hover:text-blue-400 transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 transition-all duration-200 accent-blue-500"
                aria-label="Volume"
              />
            </div>

            {/* Time */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Current Chapter */}
            {currentChapter && (
              <span className="text-white/70 text-sm ml-2 truncate max-w-[200px]">
                {currentChapter.title}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Chapters */}
            {chapters.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowChapters(!showChapters);
                    setShowSettings(false);
                  }}
                  className="p-2 text-white hover:text-blue-400 transition-colors"
                  aria-label="Chapters"
                >
                  <ChaptersIcon />
                </button>
                {showChapters && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 max-h-64 overflow-y-auto bg-gray-900 rounded-lg shadow-lg">
                    {chapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => {
                          seekTo(chapter.startTime);
                          setShowChapters(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 ${
                          currentChapter?.id === chapter.id ? 'bg-blue-900' : ''
                        }`}
                      >
                        <span className="text-white/70 mr-2">{formatTime(chapter.startTime)}</span>
                        <span className="text-white">{chapter.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Captions */}
            {captions.length > 0 && (
              <button
                onClick={() => toggleCaption(currentCaption ? null : captions[0]?.id || null)}
                className={`p-2 transition-colors ${
                  currentCaption ? 'text-blue-400' : 'text-white hover:text-blue-400'
                }`}
                aria-label="Toggle captions"
              >
                <CaptionsIcon />
              </button>
            )}

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowChapters(false);
                }}
                className="p-2 text-white hover:text-blue-400 transition-colors"
                aria-label="Settings"
              >
                <SettingsIcon />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 rounded-lg shadow-lg overflow-hidden">
                  {/* Playback Speed */}
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-xs text-white/50 mb-2">Speed</p>
                    <div className="flex flex-wrap gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`px-2 py-1 text-xs rounded ${
                            playbackRate === rate
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-800 text-white/70 hover:bg-gray-700'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  {qualities.length > 0 && (
                    <div className="px-4 py-2 border-b border-gray-800">
                      <p className="text-xs text-white/50 mb-2">Quality</p>
                      <div className="space-y-1">
                        {qualities.map((quality) => (
                          <button
                            key={quality.label}
                            onClick={() => changeQuality(quality)}
                            className={`block w-full text-left px-2 py-1 text-sm rounded ${
                              currentQuality === quality.label
                                ? 'bg-blue-500 text-white'
                                : 'text-white/70 hover:bg-gray-800'
                            }`}
                          >
                            {quality.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Captions Selection */}
                  {captions.length > 0 && (
                    <div className="px-4 py-2">
                      <p className="text-xs text-white/50 mb-2">Captions</p>
                      <div className="space-y-1">
                        <button
                          onClick={() => toggleCaption(null)}
                          className={`block w-full text-left px-2 py-1 text-sm rounded ${
                            !currentCaption
                              ? 'bg-blue-500 text-white'
                              : 'text-white/70 hover:bg-gray-800'
                          }`}
                        >
                          Off
                        </button>
                        {captions.map((caption) => (
                          <button
                            key={caption.id}
                            onClick={() => toggleCaption(caption.id)}
                            className={`block w-full text-left px-2 py-1 text-sm rounded ${
                              currentCaption === caption.id
                                ? 'bg-blue-500 text-white'
                                : 'text-white/70 hover:bg-gray-800'
                            }`}
                          >
                            {caption.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Picture in Picture */}
            <button
              onClick={() => void togglePictureInPicture()}
              className="p-2 text-white hover:text-blue-400 transition-colors"
              aria-label="Picture in Picture"
            >
              <PipIcon />
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => void toggleFullscreen()}
              className="p-2 text-white hover:text-blue-400 transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
