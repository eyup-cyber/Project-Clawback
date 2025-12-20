/**
 * Image Editor Component
 * Phase 4.3: Crop, rotate, flip, filters, brightness/contrast
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ImageEditorProps {
  src: string;
  onSave: (blob: Blob, metadata: ImageMetadata) => void;
  onCancel: () => void;
  aspectRatios?: AspectRatio[];
  maxWidth?: number;
  maxHeight?: number;
}

interface ImageMetadata {
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  cropArea: CropArea | null;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AspectRatio {
  name: string;
  value: number | null; // null means free form
}

// ============================================================================
// DEFAULT ASPECT RATIOS
// ============================================================================

const defaultAspectRatios: AspectRatio[] = [
  { name: 'Free', value: null },
  { name: '1:1', value: 1 },
  { name: '4:3', value: 4 / 3 },
  { name: '16:9', value: 16 / 9 },
  { name: '3:2', value: 3 / 2 },
  { name: '2:1', value: 2 },
];

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  crop: (
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
      <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
      <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
    </svg>
  ),
  rotateCw: (
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
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  rotateCcw: (
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
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  flipH: (
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
      <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <line x1="12" y1="20" x2="12" y2="4" />
    </svg>
  ),
  flipV: (
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
      <path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  sun: (
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
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  contrast: (
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
      <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
    </svg>
  ),
  droplet: (
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
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  reset: (
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
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  check: (
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
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
};

// ============================================================================
// TOOLBAR BUTTON
// ============================================================================

function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        p-2 rounded-lg transition-all
        ${
          isActive
            ? 'bg-[var(--primary)] text-[var(--background)]'
            : 'hover:bg-[var(--surface-elevated)] text-[var(--foreground)]'
        }
      `}
    >
      {children}
    </button>
  );
}

// ============================================================================
// SLIDER COMPONENT
// ============================================================================

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-24" style={{ color: 'var(--foreground)' }}>
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((value - min) / (max - min)) * 100}%, var(--border) ${((value - min) / (max - min)) * 100}%, var(--border) 100%)`,
        }}
      />
      <span
        className="w-12 text-right text-sm"
        style={{ color: 'var(--foreground)', opacity: 0.7 }}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ImageEditor({
  src,
  onSave,
  onCancel,
  aspectRatios = defaultAspectRatios,
  maxWidth = 1920,
  maxHeight = 1080,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transform' | 'adjust'>('transform');

  // Image state
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(aspectRatios[0]);

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Draw canvas (declared first to be accessible in load effect)
  const drawCanvasRef = useRef<() => void>(() => {});

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions
    let width = img.width;
    let height = img.height;

    // Swap dimensions for 90/270 degree rotations
    if (rotation % 180 === 90) {
      [width, height] = [height, width];
    }

    // Scale to fit maxWidth/maxHeight
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    width *= scale;
    height *= scale;

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply transforms
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // Draw image centered
    const drawWidth = rotation % 180 === 90 ? height : width;
    const drawHeight = rotation % 180 === 90 ? width : height;
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();

    // Draw crop overlay
    if (cropMode && cropArea) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);
      ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      ctx.strokeStyle = 'var(--primary)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      const thirdW = cropArea.width / 3;
      const thirdH = cropArea.height / 3;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cropArea.x + thirdW * i, cropArea.y);
        ctx.lineTo(cropArea.x + thirdW * i, cropArea.y + cropArea.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cropArea.x, cropArea.y + thirdH * i);
        ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH * i);
        ctx.stroke();
      }
    }
  }, [
    rotation,
    flipX,
    flipY,
    brightness,
    contrast,
    saturation,
    cropMode,
    cropArea,
    maxWidth,
    maxHeight,
  ]);

  // Update ref so it's accessible in load effect
  useEffect(() => {
    drawCanvasRef.current = drawCanvas;
  }, [drawCanvas]);

  // Load image
  useEffect(() => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setLoading(false);
      // Use ref to get current drawCanvas
      drawCanvasRef.current();
    };
    img.onerror = () => {
      setLoading(false);
      console.error('Failed to load image');
    };
    img.src = src;
  }, [src]);

  // Redraw on state change
  useEffect(() => {
    if (!loading) {
      drawCanvas();
    }
  }, [loading, drawCanvas]);

  // Handlers
  const handleRotateCW = () => setRotation((r) => (r + 90) % 360);
  const handleRotateCCW = () => setRotation((r) => (r - 90 + 360) % 360);
  const handleFlipX = () => setFlipX((f) => !f);
  const handleFlipY = () => setFlipY((f) => !f);

  const handleReset = () => {
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setCropArea(null);
    setCropMode(false);
  };

  const handleCropToggle = () => {
    if (!cropMode) {
      // Initialize crop area to full image
      const canvas = canvasRef.current;
      if (canvas) {
        setCropArea({
          x: canvas.width * 0.1,
          y: canvas.height * 0.1,
          width: canvas.width * 0.8,
          height: canvas.height * 0.8,
        });
      }
    }
    setCropMode((m) => !m);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode || !cropArea) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !cropArea) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left - dragStart.x;
    let y = e.clientY - rect.top - dragStart.y;

    // Constrain to canvas bounds
    x = Math.max(0, Math.min(x, canvas.width - cropArea.width));
    y = Math.max(0, Math.min(y, canvas.height - cropArea.height));

    setCropArea({ ...cropArea, x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If cropping, create a new canvas with just the cropped area
    let finalCanvas = canvas;
    if (cropArea) {
      finalCanvas = document.createElement('canvas');
      finalCanvas.width = cropArea.width;
      finalCanvas.height = cropArea.height;
      const ctx = finalCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        );
      }
    }

    finalCanvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob, {
            width: finalCanvas.width,
            height: finalCanvas.height,
            rotation,
            flipX,
            flipY,
            brightness,
            contrast,
            saturation,
            cropArea,
          });
        }
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--surface)]"
            style={{ color: 'var(--foreground)' }}
          >
            {Icons.x}
          </button>
          <h2
            className="text-xl font-bold"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          >
            Edit Image
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          >
            {Icons.reset}
            <span>Reset</span>
          </button>
          <button
            onClick={() => void handleSave()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{
              background: 'var(--primary)',
              color: 'var(--background)',
            }}
          >
            {Icons.check}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          {loading ? (
            <div
              className="animate-pulse rounded-lg"
              style={{
                width: 400,
                height: 300,
                background: 'var(--surface)',
              }}
            />
          ) : (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="max-w-full max-h-full rounded-lg shadow-xl"
              style={{
                cursor: cropMode ? 'move' : 'default',
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        <div
          className="w-80 border-l overflow-y-auto"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
          }}
        >
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveTab('transform')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'transform'
                  ? 'border-b-2 border-[var(--primary)]'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{ color: 'var(--foreground)' }}
            >
              Transform
            </button>
            <button
              onClick={() => setActiveTab('adjust')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'adjust'
                  ? 'border-b-2 border-[var(--primary)]'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{ color: 'var(--foreground)' }}
            >
              Adjust
            </button>
          </div>

          {/* Transform controls */}
          {activeTab === 'transform' && (
            <div className="p-4 space-y-6">
              {/* Rotation & Flip */}
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                  Rotate & Flip
                </h3>
                <div className="flex items-center gap-2">
                  <ToolbarButton onClick={handleRotateCCW} title="Rotate Left">
                    {Icons.rotateCcw}
                  </ToolbarButton>
                  <ToolbarButton onClick={handleRotateCW} title="Rotate Right">
                    {Icons.rotateCw}
                  </ToolbarButton>
                  <ToolbarButton onClick={handleFlipX} isActive={flipX} title="Flip Horizontal">
                    {Icons.flipH}
                  </ToolbarButton>
                  <ToolbarButton onClick={handleFlipY} isActive={flipY} title="Flip Vertical">
                    {Icons.flipV}
                  </ToolbarButton>
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Rotation: {rotation}°
                </p>
              </div>

              {/* Crop */}
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                  Crop
                </h3>
                <button
                  onClick={handleCropToggle}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full justify-center ${
                    cropMode ? 'bg-[var(--primary)] text-[var(--background)]' : ''
                  }`}
                  style={{
                    border: cropMode ? 'none' : '1px solid var(--border)',
                    color: cropMode ? 'var(--background)' : 'var(--foreground)',
                  }}
                >
                  {Icons.crop}
                  <span>{cropMode ? 'Cropping...' : 'Start Crop'}</span>
                </button>

                {cropMode && (
                  <div className="mt-3">
                    <p
                      className="text-xs mb-2"
                      style={{ color: 'var(--foreground)', opacity: 0.6 }}
                    >
                      Aspect Ratio
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {aspectRatios.map((ratio) => (
                        <button
                          key={ratio.name}
                          onClick={() => setSelectedAspectRatio(ratio)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            selectedAspectRatio.name === ratio.name
                              ? 'bg-[var(--primary)] text-[var(--background)]'
                              : 'bg-[var(--background)]'
                          }`}
                          style={{
                            color:
                              selectedAspectRatio.name === ratio.name
                                ? 'var(--background)'
                                : 'var(--foreground)',
                          }}
                        >
                          {ratio.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Adjust controls */}
          {activeTab === 'adjust' && (
            <div className="p-4 space-y-4">
              <Slider
                label="Brightness"
                value={brightness}
                min={0}
                max={200}
                step={1}
                onChange={setBrightness}
                icon={Icons.sun}
              />
              <Slider
                label="Contrast"
                value={contrast}
                min={0}
                max={200}
                step={1}
                onChange={setContrast}
                icon={Icons.contrast}
              />
              <Slider
                label="Saturation"
                value={saturation}
                min={0}
                max={200}
                step={1}
                onChange={setSaturation}
                icon={Icons.droplet}
              />
            </div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: 2px solid var(--background);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: 2px solid var(--background);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
