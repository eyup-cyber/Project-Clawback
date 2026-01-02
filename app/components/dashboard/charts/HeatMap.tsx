'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import {
  DURATION,
  EASING,
  getDuration,
  getStagger,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

interface HeatMapData {
  value: number;
  label?: string;
}

interface HeatMapProps {
  data: HeatMapData[][];
  rows?: string[];
  columns?: string[];
  colors?: { min: string; max: string };
  cellSize?: number;
  cellGap?: number;
  animate?: boolean;
  duration?: number;
  showValues?: boolean;
  className?: string;
}

export function HeatMap({
  data,
  rows,
  columns,
  colors = { min: 'rgba(50, 205, 50, 0.1)', max: 'rgba(50, 205, 50, 1)' },
  cellSize = 30,
  cellGap = 2,
  animate = true,
  duration = DURATION.slow,
  showValues = false,
  className = '',
}: HeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<HTMLDivElement[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
    value: number;
  } | null>(null);

  // Flatten data for calculations
  const flatData = data.flat().map((d) => d.value);
  const minValue = Math.min(...flatData);
  const maxValue = Math.max(...flatData);
  const valueRange = maxValue - minValue || 1;

  // Interpolate color based on value
  const getColor = (value: number) => {
    const normalized = (value - minValue) / valueRange;
    // Parse RGB values from colors
    const minRgb = colors.min.match(/\d+/g)?.map(Number) || [50, 205, 50];
    const maxRgb = colors.max.match(/\d+/g)?.map(Number) || [50, 205, 50];

    const r = Math.round(minRgb[0] + (maxRgb[0] - minRgb[0]) * normalized);
    const g = Math.round(minRgb[1] + (maxRgb[1] - minRgb[1]) * normalized);
    const b = Math.round(minRgb[2] + (maxRgb[2] - minRgb[2]) * normalized);

    return `rgba(${r}, ${g}, ${b}, ${0.1 + normalized * 0.9})`;
  };

  // Intersection observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  // Animation
  useEffect(() => {
    if (!isVisible || !animate || prefersReducedMotion()) return;

    gsap.fromTo(
      cellsRef.current,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: getDuration(duration),
        stagger: {
          each: getStagger(0.02),
          from: 'start',
          grid: [data.length, data[0]?.length || 0],
        },
        ease: EASING.bounce,
      }
    );
  }, [isVisible, animate, duration, data.length]);

  let cellIndex = 0;
  const setCellRef = (el: HTMLDivElement | null) => {
    if (el) cellsRef.current[cellIndex++] = el;
  };

  return (
    <div ref={containerRef} className={className}>
      <div className="flex">
        {/* Row labels */}
        {rows && (
          <div className="flex flex-col justify-end" style={{ marginRight: cellGap }}>
            {rows.map((label, i) => (
              <div
                key={i}
                className="flex items-center justify-end text-xs text-foreground/60 pr-2"
                style={{ height: cellSize + cellGap }}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        <div>
          {/* Column labels */}
          {columns && (
            <div className="flex" style={{ marginBottom: cellGap }}>
              {columns.map((label, i) => (
                <div
                  key={i}
                  className="text-xs text-foreground/60 text-center"
                  style={{ width: cellSize + cellGap }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="flex flex-col" style={{ gap: cellGap }}>
            {data.map((row, rowIndex) => (
              <div key={rowIndex} className="flex" style={{ gap: cellGap }}>
                {row.map((cell, colIndex) => (
                  <div
                    key={colIndex}
                    ref={setCellRef}
                    className="rounded-sm cursor-pointer transition-transform duration-200 hover:scale-110 flex items-center justify-center"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(cell.value),
                      transform: animate && !isVisible ? 'scale(0)' : undefined,
                    }}
                    onMouseEnter={() =>
                      setHoveredCell({
                        row: rowIndex,
                        col: colIndex,
                        value: cell.value,
                      })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {showValues && (
                      <span className="text-[8px] font-medium text-white/80">{cell.value}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div className="mt-2 text-sm">
          <span className="text-foreground/60">
            {rows?.[hoveredCell.row]} {columns?.[hoveredCell.col]}:{' '}
          </span>
          <span className="font-medium">{hoveredCell.value}</span>
        </div>
      )}
    </div>
  );
}
