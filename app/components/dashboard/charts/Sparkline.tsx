'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showFill?: boolean;
  fillOpacity?: number;
  animate?: boolean;
  duration?: number;
  showTooltip?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = COLORS.primary,
  strokeWidth = 2,
  showFill = true,
  fillOpacity = 0.2,
  animate = true,
  duration = DURATION.medium,
  showTooltip = true,
  className = '',
}: SparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  if (data.length === 0) return null;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const xScale = (index: number) => padding + (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => padding + chartHeight - ((value - min) / range) * chartHeight;

  const linePath = data
    .map((value, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(value)}`)
    .join(' ');

  const fillPath = `${linePath} L ${xScale(data.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`;

  // Intersection observer
  useEffect(() => {
    if (!svgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  // Animation
  useEffect(() => {
    if (!isVisible || !animate || !pathRef.current || prefersReducedMotion()) return;

    const path = pathRef.current;
    const length = path.getTotalLength();

    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: getDuration(duration),
      ease: EASING.smooth,
    });
  }, [isVisible, animate, duration]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current || !showTooltip) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round(((x - padding) / chartWidth) * (data.length - 1));
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));

    setHoveredValue(data[clampedIndex]);
    setHoverPosition({
      x: xScale(clampedIndex),
      y: yScale(data[clampedIndex]),
    });
  };

  // Determine trend color
  const trendColor = data[data.length - 1] >= data[0] ? COLORS.primary : '#ef4444';
  const lineColor = color === COLORS.primary ? trendColor : color;

  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredValue(null)}
        className="cursor-crosshair"
      >
        {/* Fill */}
        {showFill && <path d={fillPath} fill={lineColor} opacity={fillOpacity} />}

        {/* Line */}
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover indicator */}
        {hoveredValue !== null && (
          <>
            <circle cx={hoverPosition.x} cy={hoverPosition.y} r="3" fill={lineColor} />
            <circle
              cx={hoverPosition.x}
              cy={hoverPosition.y}
              r="6"
              fill={lineColor}
              opacity="0.3"
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredValue !== null && (
        <div
          className="absolute bg-surface border border-border rounded px-2 py-1 text-xs pointer-events-none shadow-lg whitespace-nowrap z-10"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y - 30,
            transform: 'translateX(-50%)',
          }}
        >
          {hoveredValue.toLocaleString()}
        </div>
      )}
    </div>
  );
}
