'use client';

import { useEffect, useRef, useCallback } from 'react';
import { prefersReducedMotion } from '@/lib/animations/gsap-config';
import { frameLoop } from '@/lib/animations/frame-loop';

interface WebGLParticlesProps {
  count?: number;
}

// Brand colors in normalized RGB
const LIME_GREEN = { r: 0.196, g: 0.804, b: 0.196 }; // #32CD32
const GOLD = { r: 1.0, g: 0.843, b: 0.0 }; // #FFD700

// Pre-computed sin table for particle sway (avoids Math.sin calls per frame)
const SIN_TABLE_SIZE = 360;
const SIN_TABLE = new Float32Array(SIN_TABLE_SIZE);
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  SIN_TABLE[i] = Math.sin((i / SIN_TABLE_SIZE) * Math.PI * 2);
}

// Vertex shader for point sprite rendering
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_opacity;
  attribute vec3 a_color;
  
  uniform vec2 u_resolution;
  
  varying float v_opacity;
  varying vec3 v_color;
  
  void main() {
    // Convert pixel coordinates to clip space (-1 to 1)
    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    gl_PointSize = a_size;
    v_opacity = a_opacity;
    v_color = a_color;
  }
`;

// Fragment shader for circular points with soft edges
const FRAGMENT_SHADER = `
  precision mediump float;
  
  varying float v_opacity;
  varying vec3 v_color;
  
  void main() {
    // Create circular point with soft edges
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    float alpha = smoothstep(0.5, 0.3, dist) * v_opacity;
    gl_FragColor = vec4(v_color, alpha);
  }
`;

// Performance state for adaptive scaling
interface PerformanceState {
  frameCount: number;
  lastCheck: number;
  currentParticles: number;
}

// Particle data layout: [x, y, vx, vy, size, opacity, r, g, b, phase] = 10 floats per particle
const FLOATS_PER_PARTICLE = 10;
const X = 0,
  Y = 1,
  VX = 2,
  VY = 3,
  SIZE = 4,
  OPACITY = 5,
  R = 6,
  G = 7,
  B = 8,
  PHASE = 9;

// Seeded random for deterministic initialization
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export default function WebGLParticles({ count = 12000 }: WebGLParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const particleDataRef = useRef<Float32Array | null>(null);
  const bufferRef = useRef<WebGLBuffer | null>(null);
  const locationsRef = useRef<{
    position: number;
    size: number;
    opacity: number;
    color: number;
    resolution: WebGLUniformLocation | null;
  } | null>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const perfRef = useRef<PerformanceState>({
    frameCount: 0,
    lastCheck: 0,
    currentParticles: count,
  });
  const fpsRef = useRef({ frames: 0, lastTime: 0, fps: 0 });
  const reducedMotion = prefersReducedMotion();

  // Initialize particles in typed array
  const initParticles = useCallback(
    (particleCount: number, width: number, height: number): Float32Array => {
      const random = seededRandom(42);
      const data = new Float32Array(particleCount * FLOATS_PER_PARTICLE);

      for (let i = 0; i < particleCount; i++) {
        const base = i * FLOATS_PER_PARTICLE;
        const isGold = random() > 0.8;
        const color = isGold ? GOLD : LIME_GREEN;

        data[base + X] = random() * width;
        data[base + Y] = random() * height * 1.2 - height * 0.1;
        data[base + VX] = (random() - 0.5) * 0.3;
        data[base + VY] = 0.2 + random() * 0.5;
        data[base + SIZE] = 1 + random() * 3;
        data[base + OPACITY] = 0.3 + random() * 0.4;
        data[base + R] = color.r;
        data[base + G] = color.g;
        data[base + B] = color.b;
        data[base + PHASE] = random() * SIN_TABLE_SIZE;
      }

      return data;
    },
    []
  );

  // Initialize WebGL context and resources
  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('WebGL not supported, falling back to Canvas 2D');
      return false;
    }

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return false;

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return false;

    // Get attribute and uniform locations
    const locations = {
      position: gl.getAttribLocation(program, 'a_position'),
      size: gl.getAttribLocation(program, 'a_size'),
      opacity: gl.getAttribLocation(program, 'a_opacity'),
      color: gl.getAttribLocation(program, 'a_color'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
    };

    // Create buffer
    const buffer = gl.createBuffer();
    if (!buffer) return false;

    // Store references
    glRef.current = gl;
    programRef.current = program;
    bufferRef.current = buffer;
    locationsRef.current = locations;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return true;
  }, []);

  // Update particle physics (CPU-side, using typed arrays)
  const updateParticles = useCallback((deltaTime: number, timestamp: number) => {
    const data = particleDataRef.current;
    if (!data) return;

    const { width, height } = dimensionsRef.current;
    const particleCount = perfRef.current.currentParticles;
    const timeIndex = Math.floor((timestamp * 0.03) % SIN_TABLE_SIZE);

    // Process particles in batches for better cache locality
    for (let i = 0; i < particleCount; i++) {
      const base = i * FLOATS_PER_PARTICLE;

      // Update Y position
      data[base + Y] += data[base + VY] * deltaTime;

      // Sinusoidal horizontal sway using pre-computed table
      const phaseIndex = Math.floor((data[base + PHASE] + timeIndex) % SIN_TABLE_SIZE);
      const sway = SIN_TABLE[phaseIndex] * 0.5;
      data[base + X] += (data[base + VX] + sway) * deltaTime;

      // Wrap around edges
      if (data[base + Y] > height + 20) {
        data[base + Y] = -20;
        data[base + X] = Math.random() * width;
      }
      if (data[base + X] < -20) data[base + X] = width + 20;
      if (data[base + X] > width + 20) data[base + X] = -20;
    }
  }, []);

  // Render particles using WebGL
  const renderParticles = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const buffer = bufferRef.current;
    const locations = locationsRef.current;
    const data = particleDataRef.current;

    if (!gl || !program || !buffer || !locations || !data) return;

    const { width, height } = dimensionsRef.current;
    const particleCount = perfRef.current.currentParticles;

    // Clear canvas
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use program
    gl.useProgram(program);

    // Set resolution uniform
    gl.uniform2f(locations.resolution, width, height);

    // Upload particle data to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      data.subarray(0, particleCount * FLOATS_PER_PARTICLE),
      gl.DYNAMIC_DRAW
    );

    // Set up attribute pointers
    const stride = FLOATS_PER_PARTICLE * 4; // 4 bytes per float

    // Position (x, y)
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, stride, 0);

    // Size
    gl.enableVertexAttribArray(locations.size);
    gl.vertexAttribPointer(locations.size, 1, gl.FLOAT, false, stride, SIZE * 4);

    // Opacity
    gl.enableVertexAttribArray(locations.opacity);
    gl.vertexAttribPointer(locations.opacity, 1, gl.FLOAT, false, stride, OPACITY * 4);

    // Color (r, g, b)
    gl.enableVertexAttribArray(locations.color);
    gl.vertexAttribPointer(locations.color, 3, gl.FLOAT, false, stride, R * 4);

    // Draw points
    gl.drawArrays(gl.POINTS, 0, particleCount);
  }, []);

  // Adaptive performance scaling
  const checkPerformance = useCallback(
    (timestamp: number) => {
      const perf = perfRef.current;
      perf.frameCount++;

      // Check every 60 frames (~1 second at 60fps)
      if (perf.frameCount >= 60) {
        const elapsed = timestamp - perf.lastCheck;
        const fps = (perf.frameCount / elapsed) * 1000;

        // Adjust particle count based on FPS
        if (fps < 50 && perf.currentParticles > 5000) {
          // Reduce particles by 10%
          perf.currentParticles = Math.max(5000, Math.floor(perf.currentParticles * 0.9));
        } else if (fps > 58 && perf.currentParticles < count) {
          // Increase particles by 5%
          perf.currentParticles = Math.min(count, Math.floor(perf.currentParticles * 1.05));
        }

        perf.frameCount = 0;
        perf.lastCheck = timestamp;
      }
    },
    [count]
  );

  // Animation frame callback
  const animationCallback = useCallback(
    (deltaTime: number, timestamp: number) => {
      // FPS monitoring (development only)
      if (process.env.NODE_ENV === 'development') {
        fpsRef.current.frames++;
        if (timestamp - fpsRef.current.lastTime >= 1000) {
          fpsRef.current.fps = fpsRef.current.frames;
          fpsRef.current.frames = 0;
          fpsRef.current.lastTime = timestamp;
          // Uncomment to see FPS in console:
          // console.debug(`Particles FPS: ${fpsRef.current.fps}, count: ${perfRef.current.currentParticles}`);
        }
      }

      checkPerformance(timestamp);
      updateParticles(deltaTime, timestamp);
      renderParticles();
    },
    [checkPerformance, updateParticles, renderParticles]
  );

  // Handle canvas resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    dimensionsRef.current = { width: rect.width, height: rect.height };

    // Reinitialize particles for new dimensions
    particleDataRef.current = initParticles(count, rect.width, rect.height);
    perfRef.current.currentParticles = count;

    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }, [count, initParticles]);

  // Render static particles for reduced motion
  const renderStaticParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Render 500 static particles (no animation)
    const random = seededRandom(42);
    const staticCount = 500;

    ctx.clearRect(0, 0, rect.width, rect.height);

    for (let i = 0; i < staticCount; i++) {
      const x = random() * rect.width;
      const y = random() * rect.height;
      const size = 1 + random() * 2;
      const opacity = 0.2 + random() * 0.3;
      const isGold = random() > 0.8;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = isGold ? '#FFD700' : '#32CD32';
      ctx.globalAlpha = opacity;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, []);

  // Main effect
  useEffect(() => {
    // Handle reduced motion preference
    if (reducedMotion) {
      renderStaticParticles();

      // Re-render on resize
      const handleStaticResize = () => renderStaticParticles();
      window.addEventListener('resize', handleStaticResize);
      return () => window.removeEventListener('resize', handleStaticResize);
    }

    // Initialize WebGL
    if (!initWebGL()) {
      console.error('Failed to initialize WebGL');
      return;
    }

    // Initial setup
    handleResize();

    // Register with central frame loop
    frameLoop.register('webgl-particles', animationCallback);

    // Handle window resize
    window.addEventListener('resize', handleResize);

    return () => {
      frameLoop.unregister('webgl-particles');
      window.removeEventListener('resize', handleResize);

      // Cleanup WebGL resources
      const gl = glRef.current;
      if (gl) {
        if (bufferRef.current) gl.deleteBuffer(bufferRef.current);
        if (programRef.current) gl.deleteProgram(programRef.current);
      }
    };
  }, [reducedMotion, initWebGL, handleResize, animationCallback, renderStaticParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        width: '100vw',
        height: '100vh',
        zIndex: 0,
      }}
      aria-hidden
      tabIndex={-1}
    />
  );
}
