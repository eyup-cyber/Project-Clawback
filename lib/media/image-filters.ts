/**
 * Enhanced Image Editor with Filters
 * Phase 52: Image manipulation, filters, and effects
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  exposure: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  temperature: number; // -100 to 100
  tint: number; // -100 to 100
  vibrance: number; // -100 to 100
  sharpness: number; // 0 to 100
  blur: number; // 0 to 100
  noise: number; // 0 to 100
  vignette: number; // 0 to 100
  grain: number; // 0 to 100
}

export interface ImageFilter {
  id: string;
  name: string;
  adjustments: Partial<ImageAdjustments>;
  previewUrl?: string;
}

export interface ImageTransform {
  rotate: number; // Degrees
  flipHorizontal: boolean;
  flipVertical: boolean;
  scale: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: number;
}

export interface ImageEditorState {
  originalImage: string;
  currentImage: string;
  adjustments: ImageAdjustments;
  transform: ImageTransform;
  crop: CropArea | null;
  activeFilter: string | null;
  history: ImageHistoryEntry[];
  historyIndex: number;
}

export interface ImageHistoryEntry {
  timestamp: number;
  action: string;
  adjustments: ImageAdjustments;
  transform: ImageTransform;
  crop: CropArea | null;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  sharpness: 0,
  blur: 0,
  noise: 0,
  vignette: 0,
  grain: 0,
};

export const DEFAULT_TRANSFORM: ImageTransform = {
  rotate: 0,
  flipHorizontal: false,
  flipVertical: false,
  scale: 1,
};

// ============================================================================
// PRESET FILTERS
// ============================================================================

export const PRESET_FILTERS: ImageFilter[] = [
  {
    id: 'none',
    name: 'None',
    adjustments: {},
  },
  {
    id: 'vivid',
    name: 'Vivid',
    adjustments: {
      saturation: 30,
      contrast: 15,
      vibrance: 20,
    },
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    adjustments: {
      contrast: 40,
      shadows: -20,
      highlights: -10,
      saturation: -10,
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    adjustments: {
      saturation: -100,
      contrast: 30,
      brightness: -10,
    },
  },
  {
    id: 'silvertone',
    name: 'Silvertone',
    adjustments: {
      saturation: -100,
      contrast: 10,
      brightness: 5,
    },
  },
  {
    id: 'fade',
    name: 'Fade',
    adjustments: {
      contrast: -20,
      brightness: 10,
      saturation: -20,
    },
  },
  {
    id: 'vintage',
    name: 'Vintage',
    adjustments: {
      temperature: 20,
      saturation: -20,
      contrast: 10,
      vignette: 30,
      grain: 20,
    },
  },
  {
    id: 'retro',
    name: 'Retro',
    adjustments: {
      temperature: 30,
      tint: 10,
      saturation: -10,
      contrast: 20,
      vignette: 25,
    },
  },
  {
    id: 'instant',
    name: 'Instant',
    adjustments: {
      contrast: 20,
      saturation: 20,
      temperature: 10,
      vignette: 20,
    },
  },
  {
    id: 'chrome',
    name: 'Chrome',
    adjustments: {
      contrast: 30,
      saturation: 20,
      highlights: -20,
      shadows: 20,
    },
  },
  {
    id: 'process',
    name: 'Process',
    adjustments: {
      temperature: -20,
      contrast: 25,
      saturation: 15,
    },
  },
  {
    id: 'transfer',
    name: 'Transfer',
    adjustments: {
      temperature: 25,
      saturation: -15,
      contrast: 20,
      brightness: 10,
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    adjustments: {
      saturation: -60,
      temperature: 40,
      tint: 10,
    },
  },
  {
    id: 'cool',
    name: 'Cool',
    adjustments: {
      temperature: -30,
      tint: -10,
      saturation: 10,
    },
  },
  {
    id: 'warm',
    name: 'Warm',
    adjustments: {
      temperature: 30,
      tint: 10,
      saturation: 10,
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    adjustments: {
      contrast: 20,
      saturation: -10,
      temperature: 10,
      vignette: 40,
      shadows: -15,
    },
  },
  {
    id: 'hdr',
    name: 'HDR',
    adjustments: {
      contrast: 40,
      saturation: 30,
      highlights: -30,
      shadows: 40,
      sharpness: 30,
    },
  },
  {
    id: 'matte',
    name: 'Matte',
    adjustments: {
      contrast: -20,
      shadows: 30,
      saturation: -15,
    },
  },
  {
    id: 'clarendon',
    name: 'Clarendon',
    adjustments: {
      contrast: 20,
      saturation: 15,
      highlights: -10,
      shadows: 10,
    },
  },
  {
    id: 'gingham',
    name: 'Gingham',
    adjustments: {
      brightness: 10,
      saturation: -10,
      contrast: -10,
    },
  },
];

// ============================================================================
// CANVAS FILTER FUNCTIONS
// ============================================================================

/**
 * Apply adjustments to an image using Canvas API
 */
export async function applyAdjustments(
  imageUrl: string,
  adjustments: Partial<ImageAdjustments>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply adjustments pixel by pixel
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        if (adjustments.brightness) {
          const brightness = adjustments.brightness * 2.55;
          r += brightness;
          g += brightness;
          b += brightness;
        }

        // Contrast
        if (adjustments.contrast) {
          const contrast = (adjustments.contrast + 100) / 100;
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
          r = factor * (r - 128) + 128;
          g = factor * (g - 128) + 128;
          b = factor * (b - 128) + 128;
        }

        // Saturation
        if (adjustments.saturation) {
          const saturation = adjustments.saturation / 100;
          const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * (1 + saturation);
          g = gray + (g - gray) * (1 + saturation);
          b = gray + (b - gray) * (1 + saturation);
        }

        // Temperature (warm/cool)
        if (adjustments.temperature) {
          const temp = adjustments.temperature * 0.5;
          r += temp;
          b -= temp;
        }

        // Tint (green/magenta)
        if (adjustments.tint) {
          const tint = adjustments.tint * 0.3;
          g += tint;
        }

        // Exposure
        if (adjustments.exposure) {
          const exposure = Math.pow(2, adjustments.exposure / 50);
          r *= exposure;
          g *= exposure;
          b *= exposure;
        }

        // Vibrance
        if (adjustments.vibrance) {
          const vibrance = adjustments.vibrance / 100;
          const max = Math.max(r, g, b);
          const avg = (r + g + b) / 3;
          const amt = ((Math.abs(max - avg) * 2) / 255) * vibrance;
          r += (max - r) * amt;
          g += (max - g) * amt;
          b += (max - b) * amt;
        }

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);

      // Apply blur using CSS filter
      if (adjustments.blur && adjustments.blur > 0) {
        const blurAmount = adjustments.blur / 10;
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
      }

      // Apply vignette
      if (adjustments.vignette && adjustments.vignette > 0) {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          0,
          canvas.width / 2,
          canvas.height / 2,
          Math.max(canvas.width, canvas.height) / 2
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${adjustments.vignette / 100})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Apply grain
      if (adjustments.grain && adjustments.grain > 0) {
        const grainImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const grainData = grainImageData.data;
        const grainAmount = adjustments.grain * 2;

        for (let i = 0; i < grainData.length; i += 4) {
          const noise = (Math.random() - 0.5) * grainAmount;
          grainData[i] += noise;
          grainData[i + 1] += noise;
          grainData[i + 2] += noise;
        }
        ctx.putImageData(grainImageData, 0, 0);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Apply transform to an image
 */
export async function applyTransform(
  imageUrl: string,
  transform: ImageTransform
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate new dimensions for rotation
      const radians = (transform.rotate * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const newWidth = img.width * cos + img.height * sin;
      const newHeight = img.width * sin + img.height * cos;

      canvas.width = newWidth * transform.scale;
      canvas.height = newHeight * transform.scale;

      // Move to center
      ctx.translate(canvas.width / 2, canvas.height / 2);

      // Apply transformations
      ctx.rotate(radians);
      ctx.scale(
        (transform.flipHorizontal ? -1 : 1) * transform.scale,
        (transform.flipVertical ? -1 : 1) * transform.scale
      );

      // Draw image centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Crop an image
 */
export async function cropImage(
  imageUrl: string,
  crop: CropArea
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = crop.width;
      canvas.height = crop.height;

      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Resize an image
 */
export async function resizeImage(
  imageUrl: string,
  maxWidth: number,
  maxHeight: number,
  maintainAspectRatio: boolean = true
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (maintainAspectRatio) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      } else {
        width = maxWidth;
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = width;
      canvas.height = height;

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Apply a preset filter
 */
export async function applyFilter(
  imageUrl: string,
  filterId: string
): Promise<string> {
  const filter = PRESET_FILTERS.find((f) => f.id === filterId);
  if (!filter || filterId === 'none') {
    return imageUrl;
  }

  return applyAdjustments(imageUrl, filter.adjustments);
}

/**
 * Generate filter previews
 */
export async function generateFilterPreviews(
  imageUrl: string,
  thumbnailSize: number = 100
): Promise<{ filterId: string; previewUrl: string }[]> {
  // First resize the image for faster processing
  const thumbnail = await resizeImage(imageUrl, thumbnailSize, thumbnailSize, true);

  const previews: { filterId: string; previewUrl: string }[] = [];

  for (const filter of PRESET_FILTERS) {
    const previewUrl = filter.id === 'none'
      ? thumbnail
      : await applyAdjustments(thumbnail, filter.adjustments);
    
    previews.push({
      filterId: filter.id,
      previewUrl,
    });
  }

  return previews;
}

/**
 * Convert image to different formats
 */
export async function convertImage(
  imageUrl: string,
  format: 'jpeg' | 'png' | 'webp',
  quality: number = 0.9
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const mimeType = `image/${format}`;
      resolve(canvas.toDataURL(mimeType, quality));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  imageUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Create editor state
 */
export function createEditorState(imageUrl: string): ImageEditorState {
  return {
    originalImage: imageUrl,
    currentImage: imageUrl,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    transform: { ...DEFAULT_TRANSFORM },
    crop: null,
    activeFilter: null,
    history: [],
    historyIndex: -1,
  };
}

/**
 * Add to history
 */
export function addToHistory(
  state: ImageEditorState,
  action: string
): ImageEditorState {
  const entry: ImageHistoryEntry = {
    timestamp: Date.now(),
    action,
    adjustments: { ...state.adjustments },
    transform: { ...state.transform },
    crop: state.crop ? { ...state.crop } : null,
  };

  // Remove any future history if we're not at the end
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(entry);

  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

/**
 * Undo last action
 */
export function undo(state: ImageEditorState): ImageEditorState {
  if (state.historyIndex <= 0) {
    return {
      ...state,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      transform: { ...DEFAULT_TRANSFORM },
      crop: null,
      historyIndex: -1,
    };
  }

  const previousEntry = state.history[state.historyIndex - 1];
  return {
    ...state,
    adjustments: { ...previousEntry.adjustments },
    transform: { ...previousEntry.transform },
    crop: previousEntry.crop ? { ...previousEntry.crop } : null,
    historyIndex: state.historyIndex - 1,
  };
}

/**
 * Redo action
 */
export function redo(state: ImageEditorState): ImageEditorState {
  if (state.historyIndex >= state.history.length - 1) {
    return state;
  }

  const nextEntry = state.history[state.historyIndex + 1];
  return {
    ...state,
    adjustments: { ...nextEntry.adjustments },
    transform: { ...nextEntry.transform },
    crop: nextEntry.crop ? { ...nextEntry.crop } : null,
    historyIndex: state.historyIndex + 1,
  };
}

/**
 * Reset to original
 */
export function resetToOriginal(state: ImageEditorState): ImageEditorState {
  return createEditorState(state.originalImage);
}

/**
 * Get CSS filter string for live preview
 */
export function getCSSFilter(adjustments: Partial<ImageAdjustments>): string {
  const filters: string[] = [];

  if (adjustments.brightness) {
    filters.push(`brightness(${1 + adjustments.brightness / 100})`);
  }
  if (adjustments.contrast) {
    filters.push(`contrast(${1 + adjustments.contrast / 100})`);
  }
  if (adjustments.saturation) {
    filters.push(`saturate(${1 + adjustments.saturation / 100})`);
  }
  if (adjustments.blur) {
    filters.push(`blur(${adjustments.blur / 10}px)`);
  }

  return filters.join(' ') || 'none';
}
