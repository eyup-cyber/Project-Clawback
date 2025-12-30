'use client';

/**
 * Image Editor Component
 * Phase 4.3: Crop, resize, rotate, filters
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ImageEditorProps {
  src: string;
  onSave: (editedImageBlob: Blob, metadata: ImageMetadata) => void;
  onCancel: () => void;
  aspectRatios?: AspectRatio[];
}

interface AspectRatio {
  label: string;
  value: number | null; // null = free
}

interface ImageMetadata {
  width: number;
  height: number;
  rotation: number;
  filters: FilterSettings;
  crop: CropArea | null;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
}

type EditorTool = 'crop' | 'rotate' | 'resize' | 'filters';

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_ASPECT_RATIOS: AspectRatio[] = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
];

const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ImageEditor({
  src,
  onSave,
  onCancel,
  aspectRatios = DEFAULT_ASPECT_RATIOS,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<EditorTool>('crop');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [filters, setFilters] = useState<FilterSettings>(DEFAULT_FILTERS);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [maintainRatio, setMaintainRatio] = useState(true);

  // ============================================================================
  // ============================================================================
  // RENDERING HELPERS (must be defined before use)
  // ============================================================================

  const getFilterString = useCallback((f: FilterSettings): string => {
    return `
      brightness(${f.brightness}%)
      contrast(${f.contrast}%)
      saturate(${f.saturation}%)
      blur(${f.blur}px)
      grayscale(${f.grayscale}%)
      sepia(${f.sepia}%)
    `.trim();
  }, []);

  const drawCropOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, crop: CropArea) => {
      // Semi-transparent overlay outside crop area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.clearRect(crop.x, crop.y, crop.width, crop.height);

      // Crop border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

      // Grid lines (rule of thirds)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      const thirdW = crop.width / 3;
      const thirdH = crop.height / 3;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(crop.x + thirdW * i, crop.y);
        ctx.lineTo(crop.x + thirdW * i, crop.y + crop.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(crop.x, crop.y + thirdH * i);
        ctx.lineTo(crop.x + crop.width, crop.y + thirdH * i);
        ctx.stroke();
      }

      // Corner handles
      const handleSize = 10;
      ctx.fillStyle = '#3b82f6';
      const corners = [
        [crop.x, crop.y],
        [crop.x + crop.width, crop.y],
        [crop.x, crop.y + crop.height],
        [crop.x + crop.width, crop.y + crop.height],
      ];
      corners.forEach(([x, y]) => {
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      });
    },
    []
  );

  // ============================================================================
  // RENDERING
  // ============================================================================

  const renderImage = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // Calculate rotated dimensions
    const radians = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const newWidth = img.width * cos + img.height * sin;
    const newHeight = img.width * sin + img.height * cos;

    canvas.width = newWidth;
    canvas.height = newHeight;

    // Clear and apply transformations
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);

    // Apply filters
    ctx.filter = getFilterString(filters);

    // Draw image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Draw crop overlay
    if (cropArea && activeTool === 'crop') {
      drawCropOverlay(ctx, canvas.width, canvas.height, cropArea);
    }
  }, [rotation, filters, cropArea, activeTool, getFilterString, drawCropOverlay]);

  // ============================================================================
  // IMAGE LOADING
  // ============================================================================

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
      setResizeWidth(img.width);
      setResizeHeight(img.height);
      setLoading(false);
      renderImage();
    };
    img.src = src;
  }, [src, renderImage]);

  useEffect(() => {
    if (!loading) {
      renderImage();
    }
  }, [loading, renderImage]);

  // ============================================================================
  // CROP HANDLERS
  // ============================================================================

  const initCrop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cropW = canvas.width * 0.8;
    let cropH = canvas.height * 0.8;

    if (selectedAspectRatio) {
      // Constrain to aspect ratio
      if (cropW / cropH > selectedAspectRatio) {
        cropW = cropH * selectedAspectRatio;
      } else {
        cropH = cropW / selectedAspectRatio;
      }
    }

    setCropArea({
      x: (canvas.width - cropW) / 2,
      y: (canvas.height - cropH) / 2,
      width: cropW,
      height: cropH,
    });
  }, [selectedAspectRatio]);

  useEffect(() => {
    if (activeTool === 'crop' && !loading) {
      initCrop();
    }
  }, [activeTool, loading, initCrop]);

  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'crop' || !cropArea) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !cropArea) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const canvas = canvasRef.current;
    if (!rect || !canvas) return;

    const x = Math.max(
      0,
      Math.min(canvas.width - cropArea.width, e.clientX - rect.left - dragStart.x)
    );
    const y = Math.max(
      0,
      Math.min(canvas.height - cropArea.height, e.clientY - rect.top - dragStart.y)
    );

    setCropArea({ ...cropArea, x, y });
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
  };

  // ============================================================================
  // ROTATION
  // ============================================================================

  const rotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);
  const flipHorizontal = () => {
    // Would need to track flip state separately
  };
  const flipVertical = () => {
    // Would need to track flip state separately
  };

  // ============================================================================
  // RESIZE
  // ============================================================================

  const handleResizeWidthChange = (value: number) => {
    setResizeWidth(value);
    if (maintainRatio && imageSize.width > 0) {
      setResizeHeight(Math.round(value * (imageSize.height / imageSize.width)));
    }
  };

  const handleResizeHeightChange = (value: number) => {
    setResizeHeight(value);
    if (maintainRatio && imageSize.height > 0) {
      setResizeWidth(Math.round(value * (imageSize.width / imageSize.height)));
    }
  };

  // ============================================================================
  // SAVE
  // ============================================================================

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    // Create final canvas with crop and resize applied
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;

    // Determine final dimensions
    let finalWidth = resizeWidth;
    let finalHeight = resizeHeight;

    if (cropArea) {
      const cropRatio = cropArea.width / cropArea.height;
      if (finalWidth / finalHeight !== cropRatio) {
        // Adjust to match crop ratio
        if (finalWidth / finalHeight > cropRatio) {
          finalWidth = finalHeight * cropRatio;
        } else {
          finalHeight = finalWidth / cropRatio;
        }
      }
    }

    finalCanvas.width = finalWidth;
    finalCanvas.height = finalHeight;

    // Apply filters
    finalCtx.filter = getFilterString(filters);

    // Draw cropped or full image
    if (cropArea) {
      finalCtx.drawImage(
        canvas,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        finalWidth,
        finalHeight
      );
    } else {
      finalCtx.drawImage(canvas, 0, 0, finalWidth, finalHeight);
    }

    // Convert to blob
    finalCanvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob, {
            width: finalWidth,
            height: finalHeight,
            rotation,
            filters,
            crop: cropArea,
          });
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleReset = () => {
    setRotation(0);
    setFilters(DEFAULT_FILTERS);
    setCropArea(null);
    setResizeWidth(imageSize.width);
    setResizeHeight(imageSize.height);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="image-editor loading">
        <div className="loader">Loading image...</div>
      </div>
    );
  }

  return (
    <div className="image-editor">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="tool-tabs">
          {(['crop', 'rotate', 'resize', 'filters'] as EditorTool[]).map((tool) => (
            <button
              key={tool}
              className={activeTool === tool ? 'active' : ''}
              onClick={() => setActiveTool(tool)}
            >
              {tool === 'crop' && '✂️ Crop'}
              {tool === 'rotate' && '🔄 Rotate'}
              {tool === 'resize' && '📐 Resize'}
              {tool === 'filters' && '🎨 Filters'}
            </button>
          ))}
        </div>

        <div className="tool-actions">
          <button onClick={handleReset} className="reset-btn">
            Reset
          </button>
          <button onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button onClick={handleSave} className="save-btn">
            Save
          </button>
        </div>
      </div>

      <div className="editor-content">
        {/* Canvas */}
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
          />
        </div>

        {/* Tool Panel */}
        <div className="tool-panel">
          {activeTool === 'crop' && (
            <div className="crop-controls">
              <h3>Aspect Ratio</h3>
              <div className="aspect-buttons">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.label}
                    className={selectedAspectRatio === ratio.value ? 'active' : ''}
                    onClick={() => {
                      setSelectedAspectRatio(ratio.value);
                      initCrop();
                    }}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'rotate' && (
            <div className="rotate-controls">
              <h3>Rotation</h3>
              <div className="rotate-buttons">
                <button onClick={rotateLeft}>↶ Rotate Left</button>
                <button onClick={rotateRight}>↷ Rotate Right</button>
                <button onClick={flipHorizontal}>↔ Flip Horizontal</button>
                <button onClick={flipVertical}>↕ Flip Vertical</button>
              </div>
              <div className="rotation-slider">
                <label>Fine Adjustment</label>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                />
                <span>{rotation}°</span>
              </div>
            </div>
          )}

          {activeTool === 'resize' && (
            <div className="resize-controls">
              <h3>Dimensions</h3>
              <div className="dimension-inputs">
                <div className="input-group">
                  <label>Width</label>
                  <input
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => handleResizeWidthChange(parseInt(e.target.value) || 0)}
                  />
                  <span>px</span>
                </div>
                <div className="input-group">
                  <label>Height</label>
                  <input
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => handleResizeHeightChange(parseInt(e.target.value) || 0)}
                  />
                  <span>px</span>
                </div>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={maintainRatio}
                  onChange={(e) => setMaintainRatio(e.target.checked)}
                />
                Maintain aspect ratio
              </label>
            </div>
          )}

          {activeTool === 'filters' && (
            <div className="filter-controls">
              <h3>Adjustments</h3>
              {Object.entries(filters).map(([key, value]) => (
                <div key={key} className="filter-slider">
                  <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                  <input
                    type="range"
                    min={key === 'blur' ? 0 : 0}
                    max={
                      key === 'blur'
                        ? 20
                        : key === 'brightness' || key === 'contrast' || key === 'saturation'
                          ? 200
                          : 100
                    }
                    value={value}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        [key]: parseInt(e.target.value),
                      })
                    }
                  />
                  <span>
                    {value}
                    {key === 'blur' ? 'px' : '%'}
                  </span>
                </div>
              ))}
              <button className="reset-filters" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .image-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1f2937;
          color: white;
        }

        .image-editor.loading {
          align-items: center;
          justify-content: center;
        }

        .loader {
          color: #9ca3af;
        }

        .editor-toolbar {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          background: #111827;
          border-bottom: 1px solid #374151;
        }

        .tool-tabs {
          display: flex;
          gap: 0.25rem;
        }

        .tool-tabs button {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          border-radius: 6px;
        }

        .tool-tabs button:hover {
          background: #374151;
        }

        .tool-tabs button.active {
          background: #3b82f6;
          color: white;
        }

        .tool-actions {
          display: flex;
          gap: 0.5rem;
        }

        .tool-actions button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .reset-btn {
          background: transparent;
          color: #9ca3af;
        }

        .cancel-btn {
          background: #374151;
          color: white;
        }

        .save-btn {
          background: #10b981;
          color: white;
        }

        .editor-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .canvas-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          overflow: auto;
        }

        .canvas-container canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .tool-panel {
          width: 280px;
          background: #111827;
          border-left: 1px solid #374151;
          padding: 1rem;
          overflow-y: auto;
        }

        .tool-panel h3 {
          margin: 0 0 1rem;
          font-size: 0.875rem;
          color: #9ca3af;
          text-transform: uppercase;
        }

        .aspect-buttons,
        .rotate-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }

        .aspect-buttons button,
        .rotate-buttons button {
          padding: 0.5rem;
          border: 1px solid #374151;
          background: transparent;
          color: white;
          border-radius: 6px;
          cursor: pointer;
        }

        .aspect-buttons button:hover,
        .rotate-buttons button:hover {
          border-color: #3b82f6;
        }

        .aspect-buttons button.active {
          background: #3b82f6;
          border-color: #3b82f6;
        }

        .rotation-slider,
        .filter-slider {
          margin-top: 1rem;
        }

        .rotation-slider label,
        .filter-slider label {
          display: block;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-bottom: 0.25rem;
        }

        .rotation-slider input,
        .filter-slider input {
          width: 100%;
        }

        .rotation-slider span,
        .filter-slider span {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .dimension-inputs {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .input-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .input-group label {
          width: 50px;
          font-size: 0.875rem;
        }

        .input-group input {
          flex: 1;
          padding: 0.375rem;
          background: #374151;
          border: 1px solid #4b5563;
          color: white;
          border-radius: 4px;
        }

        .input-group span {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .reset-filters {
          margin-top: 1rem;
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #374151;
          background: transparent;
          color: #9ca3af;
          border-radius: 6px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .editor-content {
            flex-direction: column;
          }

          .tool-panel {
            width: 100%;
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}
