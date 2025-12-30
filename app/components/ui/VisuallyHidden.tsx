'use client';

import type { ReactNode } from 'react';

/**
 * Visually Hidden Component
 * Hides content visually but keeps it accessible to screen readers
 */
interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'p' | 'label';
}

export default function VisuallyHidden({ children, as = 'span' }: VisuallyHiddenProps) {
  const style = {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden' as const,
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: 0,
  };

  if (as === 'div') return <div style={style}>{children}</div>;
  if (as === 'p') return <p style={style}>{children}</p>;
  if (as === 'label') return <label style={style}>{children}</label>;
  return <span style={style}>{children}</span>;
}
