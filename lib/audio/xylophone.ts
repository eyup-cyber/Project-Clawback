/**
 * Xylophone Audio Module
 *
 * Generates soft xylophone-like tones using Web Audio API.
 * Uses a pentatonic scale for pleasing, harmonious sounds.
 */

// Pentatonic scale frequencies (C major pentatonic extended)
// Maps to "scroungers" (10 letters): s-c-r-o-u-n-g-e-r-s
const XYLOPHONE_NOTES = [
  523.25, // C5 - s
  587.33, // D5 - c
  659.25, // E5 - r
  783.99, // G5 - o
  880.0, // A5 - u
  1046.5, // C6 - n
  1174.66, // D6 - g
  1318.51, // E6 - e
  1567.98, // G6 - r
  1760.0, // A6 - s
];

// Audio context singleton (created on first use)
let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context.
 * Audio context must be created after user interaction.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      )();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }

  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // Ignore - will try again on next interaction
    });
  }

  return audioContext;
}

/**
 * Check if user prefers reduced motion (accessibility)
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Play a soft xylophone note for a given letter index.
 *
 * @param letterIndex - Index of the letter (0-9 for "scroungers")
 * @param volume - Volume level 0-1 (default: 0.15 for soft sound)
 */
export function playXylophoneNote(letterIndex: number, volume = 0.15): void {
  // Skip if reduced motion is preferred
  if (prefersReducedMotion()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Ensure index is within bounds
  const noteIndex = Math.abs(letterIndex) % XYLOPHONE_NOTES.length;
  const frequency = XYLOPHONE_NOTES[noteIndex];

  const now = ctx.currentTime;

  // Create oscillator for the main tone
  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, now);

  // Create a second oscillator for harmonics (creates xylophone-like timbre)
  const harmonic = ctx.createOscillator();
  harmonic.type = 'sine';
  harmonic.frequency.setValueAtTime(frequency * 2, now); // Octave harmonic

  // Third harmonic for shimmer
  const shimmer = ctx.createOscillator();
  shimmer.type = 'triangle';
  shimmer.frequency.setValueAtTime(frequency * 4, now);

  // Create gain nodes for envelope shaping
  const mainGain = ctx.createGain();
  const harmonicGain = ctx.createGain();
  const shimmerGain = ctx.createGain();
  const masterGain = ctx.createGain();

  // Xylophone envelope: quick attack, medium decay
  // Main tone
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(volume, now + 0.005); // 5ms attack
  mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8); // 800ms decay

  // Harmonic (quieter, decays faster)
  harmonicGain.gain.setValueAtTime(0, now);
  harmonicGain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.003);
  harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  // Shimmer (very quiet, adds sparkle)
  shimmerGain.gain.setValueAtTime(0, now);
  shimmerGain.gain.linearRampToValueAtTime(volume * 0.1, now + 0.002);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  // Master volume
  masterGain.gain.setValueAtTime(1, now);

  // Connect the audio graph
  oscillator.connect(mainGain);
  harmonic.connect(harmonicGain);
  shimmer.connect(shimmerGain);

  mainGain.connect(masterGain);
  harmonicGain.connect(masterGain);
  shimmerGain.connect(masterGain);

  masterGain.connect(ctx.destination);

  // Start and stop
  oscillator.start(now);
  harmonic.start(now);
  shimmer.start(now);

  oscillator.stop(now + 1);
  harmonic.stop(now + 0.5);
  shimmer.stop(now + 0.3);
}

/**
 * Pre-warm the audio context on first user interaction.
 * Call this on mouseenter of the logo container to ensure
 * audio plays immediately on letter hover.
 */
export function initializeAudio(): void {
  if (prefersReducedMotion()) return;
  getAudioContext();
}

/**
 * Clean up audio resources.
 */
export function disposeAudio(): void {
  if (audioContext) {
    audioContext.close().catch(() => {
      // Ignore close errors
    });
    audioContext = null;
  }
}
