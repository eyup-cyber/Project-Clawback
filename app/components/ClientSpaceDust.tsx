'use client';

import dynamic from 'next/dynamic';

/**
 * Client-side wrapper for high-performance particle system
 *
 * Uses dynamic import with ssr: false to completely skip server-side rendering.
 * The WebGLParticles component uses Canvas 2D for GPU-accelerated rendering
 * of 10,000+ particles at 60fps.
 */
const WebGLParticles = dynamic(() => import('./effects/WebGLParticles'), { ssr: false });

interface ClientSpaceDustProps {
  count?: number;
}

export default function ClientSpaceDust({ count = 12000 }: ClientSpaceDustProps) {
  return <WebGLParticles count={count} />;
}
