"use client";

import { useEffect, useRef, useMemo } from "react";
import { prefersReducedMotion } from "@/lib/animations/gsap-config";

interface NoiseProps {
  opacity?: number;
  animate?: boolean;
  speed?: number;
  className?: string;
  blendMode?: string;
}

export default function Noise({
  opacity = 0.03,
  animate = true,
  speed = 50,
  className = "",
  blendMode = "overlay",
}: NoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      // Use smaller canvas for performance
      canvas.width = 128;
      canvas.height = 128;
    };

    resize();

    const renderNoise = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value; // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
        data[i + 3] = 255; // A
      }

      ctx.putImageData(imageData, 0, 0);
    };

    if (animate && !prefersReducedMotion()) {
      const loop = () => {
        renderNoise();
        frameRef.current = setTimeout(() => {
          requestAnimationFrame(loop);
        }, 1000 / speed) as unknown as number;
      };
      loop();
    } else {
      renderNoise();
    }

    return () => {
      if (frameRef.current) {
        clearTimeout(frameRef.current);
      }
    };
  }, [animate, speed]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[9990] ${className}`}
      style={{
        opacity,
        mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          imageRendering: "pixelated",
          transform: "scale(10)",
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

// Static SVG noise filter (more performant)
export function SVGNoise({
  opacity = 0.03,
  baseFrequency = 0.65,
  className = "",
}: {
  opacity?: number;
  baseFrequency?: number;
  className?: string;
}) {
  const filterId = useMemo(
    () => `noise-${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  return (
    <>
      <svg className="fixed" aria-hidden="true" style={{ width: 0, height: 0 }}>
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={baseFrequency}
            numOctaves={4}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <div
        className={`fixed inset-0 pointer-events-none z-[9990] ${className}`}
        style={{
          opacity,
          filter: `url(#${filterId})`,
          mixBlendMode: "overlay",
        }}
        aria-hidden="true"
      />
    </>
  );
}

// Gradient overlay with noise texture
interface GradientNoiseProps {
  from?: string;
  to?: string;
  direction?: string;
  noiseOpacity?: number;
  className?: string;
}

export function GradientNoise({
  from = "transparent",
  to = "rgba(0, 0, 0, 0.3)",
  direction = "to bottom",
  noiseOpacity = 0.05,
  className = "",
}: GradientNoiseProps) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Gradient layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${direction}, ${from}, ${to})`,
        }}
      />

      {/* Noise layer */}
      <SVGNoise opacity={noiseOpacity} />
    </div>
  );
}

// Vignette effect
interface VignetteProps {
  intensity?: number;
  className?: string;
}

export function Vignette({ intensity = 0.3, className = "" }: VignetteProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[9989] ${className}`}
      style={{
        background: `radial-gradient(circle at center, transparent 50%, rgba(0, 0, 0, ${intensity}) 100%)`,
      }}
      aria-hidden="true"
    />
  );
}

// Grid pattern overlay
interface GridPatternProps {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export function GridPattern({
  size = 50,
  color = "var(--primary)",
  opacity = 0.05,
  className = "",
}: GridPatternProps) {
  const patternId = useMemo(
    () => `grid-${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  return (
    <>
      <svg className="fixed" aria-hidden="true" style={{ width: 0, height: 0 }}>
        <defs>
          <pattern
            id={patternId}
            width={size}
            height={size}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${size} 0 L 0 0 0 ${size}`}
              fill="none"
              stroke={color}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
      </svg>
      <div
        className={`fixed inset-0 pointer-events-none ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <svg className="w-full h-full">
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>
    </>
  );
}

// Animated gradient background
interface AnimatedGradientProps {
  colors?: string[];
  speed?: number;
  className?: string;
}

export function AnimatedGradient({
  colors = ["var(--background)", "var(--surface)", "var(--background)"],
  speed = 10,
  className = "",
}: AnimatedGradientProps) {
  if (prefersReducedMotion()) {
    return (
      <div
        className={`absolute inset-0 ${className}`}
        style={{ background: colors[0] }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{
        background: `linear-gradient(45deg, ${colors.join(", ")})`,
        backgroundSize: "400% 400%",
        animation: `gradient ${speed}s ease infinite`,
      }}
      aria-hidden="true"
    >
      <style jsx>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}

// Scanlines effect
interface ScanlinesProps {
  opacity?: number;
  size?: number;
  className?: string;
}

export function Scanlines({
  opacity = 0.03,
  size = 4,
  className = "",
}: ScanlinesProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[9991] ${className}`}
      style={{
        opacity,
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent ${size - 1}px,
          rgba(0, 0, 0, 0.3) ${size - 1}px,
          rgba(0, 0, 0, 0.3) ${size}px
        )`,
      }}
      aria-hidden="true"
    />
  );
}
