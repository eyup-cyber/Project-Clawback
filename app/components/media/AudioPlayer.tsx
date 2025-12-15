'use client';

import { useState, useRef, useEffect } from 'react';
import { formatDuration } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  coverImage?: string;
}

export default function AudioPlayer({ src, title, artist, coverImage }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-4">
        {/* Cover image / placeholder */}
        <div
          className="w-20 h-20 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--background)' }}
        >
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt={title || 'Audio'} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <span className="text-4xl">🎙️</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & artist */}
          {title && (
            <h3 className="font-medium truncate" style={{ color: 'var(--foreground)' }}>
              {title}
            </h3>
          )}
          {artist && (
            <p className="text-sm truncate" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              {artist}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--primary) ${progress}%, var(--border) ${progress}%)`,
              }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
              <span>{formatDuration(Math.floor(currentTime))}</span>
              <span>{formatDuration(Math.floor(duration))}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-3">
            {/* Skip back */}
            <button
              onClick={() => skip(-15)}
              className="text-sm hover:text-[var(--primary)]"
              style={{ color: 'var(--foreground)', opacity: 0.7 }}
            >
              -15s
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
              style={{ background: 'var(--primary)' }}
            >
              {playing ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={() => skip(15)}
              className="text-sm hover:text-[var(--primary)]"
              style={{ color: 'var(--foreground)', opacity: 0.7 }}
            >
              +15s
            </button>

            {/* Playback rate */}
            <button
              onClick={changePlaybackRate}
              className="text-sm px-2 py-1 rounded border hover:border-[var(--primary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              {playbackRate}x
            </button>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2 ml-auto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-[var(--primary)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}











