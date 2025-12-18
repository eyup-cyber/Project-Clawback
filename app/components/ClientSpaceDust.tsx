'use client';

import dynamic from 'next/dynamic';

/**
 * Client-side wrapper for SpaceDust
 *
 * Uses dynamic import with ssr: false to completely skip server-side rendering.
 * This prevents hooks from being called during Next.js 16's aggressive prerendering.
 */
const SpaceDust = dynamic(
  () => import('./effects/Particles').then((mod) => ({ default: mod.SpaceDust })),
  { ssr: false }
);

interface ClientSpaceDustProps {
  count?: number;
}

export default function ClientSpaceDust({ count = 22000 }: ClientSpaceDustProps) {
  return <SpaceDust count={count} />;
}
