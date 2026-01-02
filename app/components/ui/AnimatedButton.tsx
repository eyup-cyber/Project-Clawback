'use client';

import gsap from 'gsap';
import { type ButtonHTMLAttributes, type ReactNode, useRef, useState } from 'react';
import {
  COLORS,
  DURATION,
  EASING,
  getDuration,
  prefersReducedMotion,
} from '@/lib/animations/gsap-config';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  magnetic?: boolean;
  ripple?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  magnetic = true,
  ripple = true,
  icon,
  iconPosition = 'left',
  className,
  disabled,
  onClick,
  ...props
}: AnimatedButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const [isPressed, setIsPressed] = useState(false);

  // Magnetic effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current || !magnetic || prefersReducedMotion() || disabled) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = (e.clientX - centerX) * 0.15;
    const y = (e.clientY - centerY) * 0.15;

    gsap.to(buttonRef.current, {
      x,
      y,
      duration: 0.3,
      ease: EASING.smooth,
    });
  };

  const handleMouseLeave = () => {
    if (!buttonRef.current || prefersReducedMotion() || disabled) return;

    gsap.to(buttonRef.current, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: EASING.elastic,
    });
    setIsPressed(false);
  };

  // Ripple effect
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && buttonRef.current && rippleRef.current && !prefersReducedMotion() && !disabled) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      rippleRef.current.style.left = `${x}px`;
      rippleRef.current.style.top = `${y}px`;

      gsap.fromTo(
        rippleRef.current,
        { scale: 0, opacity: 0.5 },
        {
          scale: size / 10,
          opacity: 0,
          duration: getDuration(DURATION.slow),
          ease: EASING.smooth,
        }
      );
    }

    onClick?.(e);
  };

  const handleMouseDown = () => {
    if (disabled) return;
    setIsPressed(true);
    if (buttonRef.current && !prefersReducedMotion()) {
      gsap.to(buttonRef.current, {
        scale: 0.95,
        duration: 0.1,
        ease: EASING.smooth,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    if (buttonRef.current && !prefersReducedMotion()) {
      gsap.to(buttonRef.current, {
        scale: 1,
        duration: 0.3,
        ease: EASING.bounce,
      });
    }
  };

  const variants = {
    primary: 'bg-primary text-background hover:bg-primary/90',
    secondary: 'bg-secondary text-background hover:bg-secondary/90',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-background',
    ghost: 'text-foreground hover:bg-white/10',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5',
    lg: 'px-8 py-3 text-lg',
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        'relative overflow-hidden rounded-full font-medium transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      {/* Ripple element */}
      <span
        ref={rippleRef}
        className="absolute rounded-full bg-white/30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ width: 10, height: 10 }}
        aria-hidden="true"
      />

      {/* Content */}
      <span
        className={cn(
          'relative z-10 flex items-center justify-center gap-2',
          loading && 'opacity-0'
        )}
      >
        {icon && iconPosition === 'left' && <span>{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span>{icon}</span>}
      </span>

      {/* Loading spinner */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
      )}

      {/* Success checkmark */}
      {success && !loading && (
        <span className="absolute inset-0 flex items-center justify-center animate-scale-in">
          <svg
            className="h-5 w-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}

      {/* Hover glow */}
      <span
        className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle, ${COLORS.glowPrimary} 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />
    </button>
  );
}
