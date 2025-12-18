'use client';

import { Suspense, lazy, useSyncExternalStore } from 'react';

/**
 * Client Layout Wrapper
 *
 * Uses lazy loading and hydration-safe mounting to defer client component
 * rendering until after hydration, preventing hook failures during
 * Next.js's prerendering.
 */

// Hydration-safe mounted check using useSyncExternalStore
const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // Client: mounted
    () => false // Server: not mounted
  );
}

// Lazy load all client components
const Providers = lazy(() =>
  import('./providers/Providers').then((mod) => ({ default: mod.Providers }))
);
const ScrollProgress = lazy(() => import('./ScrollProgress'));
const ScrollAnimations = lazy(() => import('./ScrollAnimations'));
const SmoothScroll = lazy(() => import('./SmoothScroll'));
const ClientSpaceDust = lazy(() => import('./ClientSpaceDust'));
const SkipLink = lazy(() => import('./ui/SkipLink'));

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const mounted = useIsMounted();

  // During SSR/prerender, render just the children without any client components
  if (!mounted) {
    return <main id="main-content">{children}</main>;
  }

  return (
    <Suspense fallback={<main id="main-content">{children}</main>}>
      <ClientSpaceDust count={15000} />
      <SkipLink />
      <Providers>
        <ScrollProgress />
        <ScrollAnimations>
          <SmoothScroll>
            <main id="main-content">{children}</main>
          </SmoothScroll>
        </ScrollAnimations>
      </Providers>
    </Suspense>
  );
}
