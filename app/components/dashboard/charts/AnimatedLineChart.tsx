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

interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
}

interface AnimatedLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDots?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  animate?: boolean;
  duration?: number;
  className?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  tooltipFormat?: (point: DataPoint) => string;
}

export function AnimatedLineChart({
  data,
  width = 400,
  height = 200,
  color = COLORS.primary,
  fillOpacity = 0.1,
  showDots = true,
  showGrid = true,
  showLabels = true,
  animate = true,
  duration = DURATION.slow,
  className = '',
  yAxisLabel,
  xAxisLabel: _xAxisLabel,
  tooltipFormat,
}: AnimatedLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const yValues = data.map((d) => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const yRange = maxY - minY || 1;

  const xScale = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) =>
    padding.top + chartHeight - ((value - minY) / yRange) * chartHeight;

  // Generate path
  const linePath = data
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(point.y)}`)
    .join(' ');

  const fillPath = `${linePath} L ${xScale(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

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
    if (!isVisible || !animate || prefersReducedMotion()) return;

    const path = pathRef.current;
    const fill = fillRef.current;
    const dots = dotsRef.current;

    if (path) {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: getDuration(duration),
        ease: EASING.expo,
      });
    }

    if (fill) {
      gsap.fromTo(
        fill,
        { opacity: 0 },
        {
          opacity: fillOpacity,
          duration: getDuration(duration),
          ease: EASING.smooth,
          delay: getDuration(duration) * 0.3,
        }
      );
    }

    if (dots) {
      const dotElements = dots.querySelectorAll('circle');
      gsap.fromTo(
        dotElements,
        { scale: 0, transformOrigin: 'center' },
        {
          scale: 1,
          duration: getDuration(DURATION.quick),
          stagger: 0.05,
          ease: EASING.bounce,
          delay: getDuration(duration) * 0.5,
        }
      );
    }
  }, [isVisible, animate, duration, fillOpacity]);

  // Grid lines
  const gridLines = [];
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const y = padding.top + (chartHeight / gridCount) * i;
    const value = maxY - (yRange / gridCount) * i;
    gridLines.push(
      <g key={i}>
        <line
          x1={padding.left}
          y1={y}
          x2={width - padding.right}
          y2={y}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="4,4"
        />
        {showLabels && (
          <text
            x={padding.left - 8}
            y={y}
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {value.toFixed(0)}
          </text>
        )}
      </g>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <svg ref={svgRef} width={width} height={height}>
        {/* Grid */}
        {showGrid && gridLines}

        {/* Fill area */}
        <path ref={fillRef} d={fillPath} fill={color} opacity={animate ? 0 : fillOpacity} />

        {/* Line */}
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots && (
          <g ref={dotsRef}>
            {data.map((point, i) => (
              <g key={i}>
                <circle
                  cx={xScale(i)}
                  cy={yScale(point.y)}
                  r="4"
                  fill={color}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* Larger hit area */}
                <circle
                  cx={xScale(i)}
                  cy={yScale(point.y)}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            ))}
          </g>
        )}

        {/* X-axis labels */}
        {showLabels &&
          data.map((point, i) => {
            if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={i}
                x={xScale(i)}
                y={height - 8}
                fill="rgba(255,255,255,0.5)"
                fontSize="10"
                textAnchor="middle"
              >
                {typeof point.x === 'string' ? point.x : point.x.toFixed(0)}
              </text>
            );
          })}

        {/* Axis labels */}
        {yAxisLabel && (
          <text
            x={12}
            y={height / 2}
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            textAnchor="middle"
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            {yAxisLabel}
          </text>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute bg-surface border border-border rounded-lg px-3 py-2 text-sm pointer-events-none shadow-lg"
          style={{
            left: xScale(data.indexOf(hoveredPoint)),
            top: yScale(hoveredPoint.y) - 50,
            transform: 'translateX(-50%)',
          }}
        >
          {tooltipFormat ? (
            tooltipFormat(hoveredPoint)
          ) : (
            <>
              <div className="font-medium">{hoveredPoint.y}</div>
              {hoveredPoint.label && <div className="text-foreground/60">{hoveredPoint.label}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
