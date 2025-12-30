'use client';

/**
 * Custom Audio Player Component
 * Phase 42: Audio player with waveform display and playlist support
 */

import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  src: string;
  duration?: number;
  coverUrl?: string;
  waveformData?: number[];
}

export interface AudioPlayerProps {
  tracks: AudioTrack[];
  initialTrack?: number;
  autoPlay?: boolean;
  showPlaylist?: boolean;
  showWaveform?: boolean;
  showCover?: boolean;
  compact?: boolean;
  accentColor?: string;
  onTrackChange?: (track: AudioTrack, index: number) => void;
  onPlay?: (track: AudioTrack) => void;
  onPause?: (track: AudioTrack) => void;
  onEnded?: (track: AudioTrack) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Generate fake waveform data for demo purposes
function generateWaveformData(length: number = 100): number[] {
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    // Create a somewhat realistic waveform pattern
    const baseHeight = 0.3 + Math.random() * 0.4;
    const variation = Math.sin(i * 0.1) * 0.15;
    data.push(Math.min(1, Math.max(0.1, baseHeight + variation)));
  }
  return data;
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

const PreviousIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

const NextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const VolumeHighIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const VolumeMuteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

const RepeatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);

const ShuffleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </svg>
);

const PlaylistIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
  </svg>
);

// ============================================================================
// WAVEFORM COMPONENT
// ============================================================================

interface WaveformProps {
  data: number[];
  progress: number;
  onSeek: (progress: number) => void;
  accentColor: string;
}

function Waveform({ data, progress, onSeek, accentColor }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barWidth = 3;
  const barGap = 2;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, percent)));
  };

  return (
    <div
      ref={containerRef}
      className="relative h-16 cursor-pointer flex items-center"
      onClick={handleClick}
    >
      <div className="flex items-center h-full w-full">
        {data.map((height, index) => {
          const isPlayed = index / data.length <= progress;
          return (
            <div
              key={index}
              className="flex-shrink-0 rounded-full transition-colors"
              style={{
                width: barWidth,
                height: `${height * 100}%`,
                marginRight: barGap,
                backgroundColor: isPlayed ? accentColor : 'rgba(255,255,255,0.3)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================

interface ProgressBarProps {
  progress: number;
  buffered: number;
  onSeek: (progress: number) => void;
  accentColor: string;
}

function ProgressBar({ progress, buffered, onSeek, accentColor }: ProgressBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, percent)));
  };

  return (
    <div
      ref={containerRef}
      className="relative h-1 bg-white/20 rounded cursor-pointer group"
      onClick={handleClick}
    >
      {/* Buffered */}
      <div
        className="absolute h-full bg-white/30 rounded"
        style={{ width: `${buffered * 100}%` }}
      />
      {/* Progress */}
      <div
        className="absolute h-full rounded"
        style={{ width: `${progress * 100}%`, backgroundColor: accentColor }}
      />
      {/* Scrubber */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          left: `calc(${progress * 100}% - 6px)`,
          backgroundColor: accentColor,
        }}
      />
    </div>
  );
}

// ============================================================================
// PLAYLIST COMPONENT
// ============================================================================

interface PlaylistProps {
  tracks: AudioTrack[];
  currentIndex: number;
  onSelect: (index: number) => void;
  accentColor: string;
}

function Playlist({ tracks, currentIndex, onSelect, accentColor }: PlaylistProps) {
  return (
    <div className="mt-4 max-h-64 overflow-y-auto">
      {tracks.map((track, index) => (
        <button
          key={track.id}
          onClick={() => onSelect(index)}
          className={`w-full flex items-center p-3 rounded-lg transition-colors ${
            index === currentIndex ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
          style={{
            borderLeft:
              index === currentIndex ? `3px solid ${accentColor}` : '3px solid transparent',
          }}
        >
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
              <PlaylistIcon />
            </div>
          )}
          <div className="ml-3 text-left flex-1 min-w-0">
            <p className="text-white font-medium truncate">{track.title}</p>
            {track.artist && <p className="text-white/60 text-sm truncate">{track.artist}</p>}
          </div>
          {track.duration && (
            <span className="text-white/40 text-sm ml-2">{formatTime(track.duration)}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AudioPlayer({
  tracks,
  initialTrack = 0,
  autoPlay = false,
  showPlaylist = true,
  showWaveform = true,
  showCover = true,
  compact = false,
  accentColor = '#3b82f6',
  onTrackChange,
  onPlay,
  onPause,
  onEnded,
  onProgress,
  className = '',
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false);

  const currentTrack = tracks[currentTrackIndex];
  const waveformData = currentTrack?.waveformData || generateWaveformData();

  // Control handler - defined first to avoid hoisting issues
  const playTrack = useCallback(
    (index: number) => {
      setCurrentTrackIndex(index);
      setCurrentTime(0);
      onTrackChange?.(tracks[index], index);

      // Small delay to let the src change
      setTimeout(() => {
        if (audioRef.current) {
          void audioRef.current.play();
        }
      }, 100);
    },
    [tracks, onTrackChange]
  );

  // Audio event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    if (currentTrack) onPlay?.(currentTrack);
  }, [currentTrack, onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (currentTrack) onPause?.(currentTrack);
  }, [currentTrack, onPause]);

  const handleEnded = useCallback(() => {
    if (currentTrack) onEnded?.(currentTrack);

    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      }
    } else if (currentTrackIndex < tracks.length - 1) {
      playTrack(currentTrackIndex + 1);
    } else if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      playTrack(randomIndex);
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack, isRepeat, isShuffle, currentTrackIndex, tracks.length, onEnded, playTrack]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    onProgress?.(time, duration);
  }, [duration, onProgress]);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  }, []);

  const handleProgress = useCallback(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (audio.buffered.length > 0) {
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      setBuffered(bufferedEnd / audio.duration);
    }
  }, []);

  // Control handlers
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
  }, [isPlaying]);

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    } else if (currentTrackIndex > 0) {
      playTrack(currentTrackIndex - 1);
    } else if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      playTrack(randomIndex);
    }
  }, [currentTime, currentTrackIndex, isShuffle, tracks.length, playTrack]);

  const playNext = useCallback(() => {
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      playTrack(randomIndex);
    } else if (currentTrackIndex < tracks.length - 1) {
      playTrack(currentTrackIndex + 1);
    }
  }, [currentTrackIndex, isShuffle, tracks.length, playTrack]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newVolume = parseFloat(e.target.value);
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const handleSeek = useCallback(
    (progress: number) => {
      if (!audioRef.current) return;
      const newTime = progress * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

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
          handleSeek(Math.max(0, currentTime / duration - 0.05));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(1, currentTime / duration + 0.05));
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.volume = Math.min(1, volume + 0.1);
            setVolume(Math.min(1, volume + 0.1));
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.volume = Math.max(0, volume - 0.1);
            setVolume(Math.max(0, volume - 0.1));
          }
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'n':
          e.preventDefault();
          playNext();
          break;
        case 'p':
          e.preventDefault();
          playPrevious();
          break;
      }
    },
    [togglePlay, handleSeek, currentTime, duration, volume, toggleMute, playNext, playPrevious]
  );

  // Auto-play on mount if specified
  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Auto-play blocked by browser
      });
    }
  }, [autoPlay]);

  const progress = duration > 0 ? currentTime / duration : 0;

  if (compact) {
    return (
      <div
        className={`bg-gray-900 rounded-lg p-3 ${className}`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="application"
        aria-label="Audio player"
      >
        <audio
          ref={audioRef}
          src={currentTrack?.src}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onProgress={handleProgress}
        />

        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
            style={{ backgroundColor: accentColor }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{currentTrack?.title}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-white/50 text-xs">{formatTime(currentTime)}</span>
              <div className="flex-1">
                <ProgressBar
                  progress={progress}
                  buffered={buffered}
                  onSeek={handleSeek}
                  accentColor={accentColor}
                />
              </div>
              <span className="text-white/50 text-xs">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-900 rounded-xl p-6 ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Audio player"
    >
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
      />

      {/* Track Info */}
      <div className="flex items-start space-x-4 mb-6">
        {showCover && (
          <div className="flex-shrink-0">
            {currentTrack?.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-24 h-24 rounded-lg object-cover shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-white/10 flex items-center justify-center">
                <PlaylistIcon />
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-xl font-bold truncate">{currentTrack?.title}</h3>
          {currentTrack?.artist && <p className="text-white/60 truncate">{currentTrack.artist}</p>}
          {currentTrack?.album && (
            <p className="text-white/40 text-sm truncate">{currentTrack.album}</p>
          )}
        </div>
      </div>

      {/* Waveform or Progress */}
      {showWaveform ? (
        <Waveform
          data={waveformData}
          progress={progress}
          onSeek={handleSeek}
          accentColor={accentColor}
        />
      ) : (
        <ProgressBar
          progress={progress}
          buffered={buffered}
          onSeek={handleSeek}
          accentColor={accentColor}
        />
      )}

      {/* Time */}
      <div className="flex justify-between text-white/50 text-sm mt-2 mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4">
        {/* Shuffle */}
        <button
          onClick={() => setIsShuffle(!isShuffle)}
          className={`p-2 rounded-full transition-colors ${
            isShuffle ? '' : 'text-white/50 hover:text-white'
          }`}
          style={{ color: isShuffle ? accentColor : undefined }}
          aria-label={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
        >
          <ShuffleIcon />
        </button>

        {/* Previous */}
        <button
          onClick={playPrevious}
          className="p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Previous track"
        >
          <PreviousIcon />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105"
          style={{ backgroundColor: accentColor }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Next */}
        <button
          onClick={playNext}
          className="p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Next track"
        >
          <NextIcon />
        </button>

        {/* Repeat */}
        <button
          onClick={() => setIsRepeat(!isRepeat)}
          className={`p-2 rounded-full transition-colors ${
            isRepeat ? '' : 'text-white/50 hover:text-white'
          }`}
          style={{ color: isRepeat ? accentColor : undefined }}
          aria-label={isRepeat ? 'Disable repeat' : 'Enable repeat'}
        >
          <RepeatIcon />
        </button>
      </div>

      {/* Volume & Playlist Toggle */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-2 text-white/70 hover:text-white transition-colors"
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
            className="w-24"
            style={{ accentColor }}
            aria-label="Volume"
          />
        </div>

        {showPlaylist && tracks.length > 1 && (
          <button
            onClick={() => setShowPlaylistPanel(!showPlaylistPanel)}
            className={`p-2 rounded-full transition-colors ${
              showPlaylistPanel ? '' : 'text-white/50 hover:text-white'
            }`}
            style={{ color: showPlaylistPanel ? accentColor : undefined }}
            aria-label="Toggle playlist"
          >
            <PlaylistIcon />
          </button>
        )}
      </div>

      {/* Playlist Panel */}
      {showPlaylist && showPlaylistPanel && tracks.length > 1 && (
        <Playlist
          tracks={tracks}
          currentIndex={currentTrackIndex}
          onSelect={playTrack}
          accentColor={accentColor}
        />
      )}
    </div>
  );
}
