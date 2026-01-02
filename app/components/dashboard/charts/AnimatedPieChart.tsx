'use client';

import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  getStagger,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';

interface PieData {
  label: string;
  value: number;
  color: string;
}

interface AnimatedPieChartProps {
  data: PieData[];
  size?: number;
  innerRadius?: number;
  animate?: boolean;
  duration?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  showValues?: boolean;
  className?: string;
}

export function AnimatedPieChart({
  data,
  size = 200,
  innerRadius = 0,
  animate = true,
  duration = DURATION.slow,
  showLabels = false,
  showLegend = true,
  showValues = true,
  className = '',
}: AnimatedPieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  const center = size / 2;

  // Calculate pie slices
  // Calculate slices using useMemo to avoid reassignment during render
  const slices = useMemo(() => {
    let currentAngle = -90; // Start from top
    return data.map((item) => {
      const percentage = item.value / total;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      // Calculate path
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      let path: string;
      if (innerRadius > 0) {
        // Donut
        const innerX1 = center + innerRadius * Math.cos(startRad);
        const innerY1 = center + innerRadius * Math.sin(startRad);
        const innerX2 = center + innerRadius * Math.cos(endRad);
        const innerY2 = center + innerRadius * Math.sin(endRad);

        path = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${innerX2} ${innerY2}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1}
        Z
      `;
      } else {
        // Full pie
        path = `
        M ${center} ${center}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      `;
      }

      // Label position
      const midAngle = (((startAngle + endAngle) / 2) * Math.PI) / 180;
      const labelRadius = radius * 0.7;
      const labelX = center + labelRadius * Math.cos(midAngle);
      const labelY = center + labelRadius * Math.sin(midAngle);

      return {
        ...item,
        path,
        percentage,
        labelX,
        labelY,
      };
    });
  }, [data, total, radius, center, innerRadius]);

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
    if (!isVisible || !animate || !svgRef.current || prefersReducedMotion()) return;

    const paths = svgRef.current.querySelectorAll('.pie-slice');

    paths.forEach((path, i) => {
      gsap.fromTo(
        path,
        { scale: 0, transformOrigin: 'center' },
        {
          scale: 1,
          duration: getDuration(duration),
          delay: getStagger(0.1) * i,
          ease: EASING.bounce,
        }
      );
    });
  }, [isVisible, animate, duration]);

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <svg ref={svgRef} width={size} height={size}>
        {slices.map((slice, i) => (
          <g key={i}>
            <path
              d={slice.path}
              fill={slice.color}
              className="pie-slice cursor-pointer transition-transform duration-200"
              style={{
                transform: hoveredIndex === i ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: 'center',
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            {showLabels && slice.percentage > 0.05 && (
              <text
                x={slice.labelX}
                y={slice.labelY}
                fill="white"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none"
              >
                {(slice.percentage * 100).toFixed(0)}%
              </text>
            )}
          </g>
        ))}

        {/* Center text for donut */}
        {innerRadius > 0 && showValues && (
          <text
            x={center}
            y={center}
            fill="white"
            fontSize="24"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {total}
          </text>
        )}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-2">
          {data.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                hoveredIndex !== null && hoveredIndex !== i ? 'opacity-50' : ''
              }`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-foreground/80">{item.label}</span>
              {showValues && (
                <span className="text-sm text-foreground/50">
                  ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
