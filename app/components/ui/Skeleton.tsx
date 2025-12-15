'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) {
  const baseStyles = 'relative overflow-hidden';
  
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-xl',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    shimmer: '',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '1em' : undefined),
    background: 'var(--surface)',
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
    >
      {animation === 'shimmer' && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

// Preset skeleton components
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height="1rem"
          width={i === lines - 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-xl overflow-hidden', className)}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Image placeholder */}
      <Skeleton variant="rectangular" height={200} />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton variant="text" height="1.5rem" width="80%" />
        
        {/* Description */}
        <SkeletonText lines={2} />
        
        {/* Footer */}
        <div className="flex items-center gap-3 pt-2">
          <SkeletonAvatar size={32} />
          <Skeleton variant="text" height="0.875rem" width="40%" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonArticleList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className={i === 0 ? 'md:col-span-2 lg:row-span-2' : ''} />
      ))}
    </div>
  );
}

export function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-4', className)}>
      <SkeletonAvatar size={64} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height="1.25rem" width="50%" />
        <Skeleton variant="text" height="0.875rem" width="30%" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex gap-4 p-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" height="1rem" className="flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 p-4"
          style={{ borderBottom: rowIdx < rows - 1 ? '1px solid var(--border)' : 'none' }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              variant="text"
              height="0.875rem"
              className="flex-1"
              width={colIdx === 0 ? '60%' : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Page-level skeleton
export function SkeletonPage() {
  return (
    <div className="min-h-screen py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <Skeleton variant="text" height="0.875rem" width="100px" />
          <Skeleton variant="text" height="3rem" width="60%" />
          <Skeleton variant="text" height="1.25rem" width="80%" />
        </div>
        
        {/* Content grid */}
        <SkeletonArticleList count={8} />
      </div>
    </div>
  );
}






