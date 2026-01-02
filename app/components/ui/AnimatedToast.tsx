'use client';

import gsap from 'gsap';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';
type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ReactNode;
}

interface AnimatedToastProps extends Toast {
  onDismiss: (id: string) => void;
}

export function AnimatedToast({
  id,
  title,
  description,
  variant = 'default',
  duration = 5000,
  action,
  onDismiss,
}: AnimatedToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);

    if (toastRef.current && !prefersReducedMotion()) {
      gsap.to(toastRef.current, {
        x: 100,
        opacity: 0,
        scale: 0.9,
        duration: getDuration(DURATION.fast),
        ease: EASING.smooth,
        onComplete: () => onDismiss(id),
      });
    } else {
      onDismiss(id);
    }
  }, [id, onDismiss, isExiting]);

  const handleSwipe = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentX = moveEvent.touches[0].clientX;
      const diff = currentX - startX;

      if (diff > 50) {
        handleDismiss();
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { once: true });
  };

  const icons = {
    default: null,
    success: (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    warning: (
      <svg
        className="w-5 h-5 text-yellow-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  const colors = {
    default: 'border-border',
    success: 'border-green-500/30',
    error: 'border-red-500/30',
    warning: 'border-yellow-500/30',
    info: 'border-blue-500/30',
  };

  return (
    <div
      ref={toastRef}
      className={cn(
        'relative bg-surface border rounded-lg shadow-lg overflow-hidden',
        'min-w-[300px] max-w-[400px]',
        colors[variant]
      )}
      onTouchStart={handleSwipe}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        {icons[variant] && <div className="flex-shrink-0">{icons[variant]}</div>}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium text-foreground">{title}</p>}
          {description && <p className="text-sm text-foreground/60 mt-1">{description}</p>}
          {action && <div className="mt-3">{action}</div>}
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-foreground/40 hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-1 bg-white/5">
          <div
            ref={progressRef}
            className={cn(
              'h-full origin-left',
              variant === 'default' && 'bg-primary',
              variant === 'success' && 'bg-green-500',
              variant === 'error' && 'bg-red-500',
              variant === 'warning' && 'bg-yellow-500',
              variant === 'info' && 'bg-blue-500'
            )}
          />
        </div>
      )}
    </div>
  );
}

// Toast Container
interface ToastContainerProps {
  position?: ToastPosition;
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ position = 'top-right', toasts, onDismiss }: ToastContainerProps) {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={cn('fixed z-[9999] flex flex-col gap-3', positions[position])}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <AnimatedToast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    addToast,
    dismissToast,
    clearToasts,
    success: (title: string, description?: string) =>
      addToast({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      addToast({ title, description, variant: 'error' }),
    warning: (title: string, description?: string) =>
      addToast({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) =>
      addToast({ title, description, variant: 'info' }),
  };
}
