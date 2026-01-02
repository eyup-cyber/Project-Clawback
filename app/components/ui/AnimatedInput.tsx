'use client';

import gsap from 'gsap';
import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';
import { cn } from '@/lib/utils';

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function AnimatedInput({
  label,
  error,
  success,
  helperText,
  icon,
  iconPosition = 'left',
  className,
  onFocus,
  onBlur,
  ...props
}: AnimatedInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);

    if (labelRef.current && !prefersReducedMotion()) {
      gsap.to(labelRef.current, {
        y: -24,
        scale: 0.85,
        color: 'var(--primary)',
        duration: getDuration(DURATION.fast),
        ease: EASING.snappy,
      });
    }

    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const value = e.target.value;
    setHasValue(!!value);

    if (labelRef.current && !value && !prefersReducedMotion()) {
      gsap.to(labelRef.current, {
        y: 0,
        scale: 1,
        color: 'var(--foreground)',
        duration: getDuration(DURATION.fast),
        ease: EASING.smooth,
      });
    }

    onBlur?.(e);
  };

  // Shake animation for error
  useEffect(() => {
    if (!error || !containerRef.current || prefersReducedMotion()) return;

    const tl = gsap.timeline();
    tl.to(containerRef.current, { x: -4, duration: 0.1 })
      .to(containerRef.current, { x: 4, duration: 0.1 })
      .to(containerRef.current, { x: -4, duration: 0.1 })
      .to(containerRef.current, { x: 4, duration: 0.1 })
      .to(containerRef.current, { x: 0, duration: 0.1 });
  }, [error]);

  return (
    <div ref={containerRef} className="relative">
      {/* Floating Label */}
      {label && (
        <label
          ref={labelRef}
          className={cn(
            'absolute left-3 top-3 origin-left pointer-events-none',
            'text-foreground/60 transition-colors',
            icon && iconPosition === 'left' && 'left-10',
            (isFocused || hasValue) && 'text-primary'
          )}
          style={{
            transform: isFocused || hasValue ? 'translateY(-24px) scale(0.85)' : undefined,
          }}
        >
          {label}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Icon */}
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">{icon}</div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          className={cn(
            'w-full px-3 py-3 bg-surface border rounded-lg',
            'text-foreground placeholder-transparent',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            icon && iconPosition === 'left' && 'pl-10',
            icon && iconPosition === 'right' && 'pr-10',
            error && 'border-red-500 focus:ring-red-500/50',
            success && 'border-green-500 focus:ring-green-500/50',
            !error && !success && 'border-border focus:border-primary',
            className
          )}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {/* Icon Right */}
        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40">{icon}</div>
        )}

        {/* Success/Error Icons */}
        {(success || error) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {success && (
              <svg
                className="w-5 h-5 text-green-500 animate-scale-in"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {error && (
              <svg
                className="w-5 h-5 text-red-500 animate-scale-in"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
        )}

        {/* Focus Ring Animation */}
        <div
          className={cn(
            'absolute inset-0 rounded-lg pointer-events-none',
            'border-2 border-primary opacity-0 transition-opacity duration-200',
            isFocused && 'opacity-100'
          )}
          style={{
            transform: 'scale(1.02)',
          }}
        />
      </div>

      {/* Helper Text / Error Message */}
      {(helperText || error) && (
        <p
          className={cn(
            'mt-1 text-sm animate-slide-up',
            error ? 'text-red-500' : 'text-foreground/50'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

// Animated Textarea
interface AnimatedTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  autoResize?: boolean;
}

export function AnimatedTextarea({
  label,
  error,
  success,
  helperText,
  autoResize = true,
  className,
  onFocus,
  onBlur,
  onChange,
  ...props
}: AnimatedTextareaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    setHasValue(!!e.target.value);
    onChange?.(e);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          className={cn(
            'block text-sm font-medium mb-1',
            'text-foreground/60 transition-colors',
            isFocused && 'text-primary'
          )}
        >
          {label}
        </label>
      )}

      <textarea
        ref={textareaRef}
        className={cn(
          'w-full px-3 py-3 bg-surface border rounded-lg resize-none',
          'text-foreground placeholder-foreground/30',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          error && 'border-red-500 focus:ring-red-500/50',
          success && 'border-green-500 focus:ring-green-500/50',
          !error && !success && 'border-border focus:border-primary',
          className
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />

      {(helperText || error) && (
        <p className={cn('mt-1 text-sm', error ? 'text-red-500' : 'text-foreground/50')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

// Animated Toggle/Switch
interface AnimatedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AnimatedToggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
}: AnimatedToggleProps) {
  const thumbRef = useRef<HTMLDivElement>(null);

  const handleChange = () => {
    if (disabled) return;

    if (thumbRef.current && !prefersReducedMotion()) {
      gsap.to(thumbRef.current, {
        scale: 0.8,
        duration: 0.1,
        ease: EASING.smooth,
        onComplete: () => {
          gsap.to(thumbRef.current, {
            scale: 1,
            duration: 0.2,
            ease: EASING.bounce,
          });
        },
      });
    }

    onChange(!checked);
  };

  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-8', thumb: 'w-6 h-6', translate: 'translate-x-6' },
  };

  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={cn(
          'relative rounded-full transition-colors duration-200',
          sizes[size].track,
          checked ? 'bg-primary' : 'bg-white/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={handleChange}
      >
        <div
          ref={thumbRef}
          className={cn(
            'absolute top-0.5 left-0.5 rounded-full bg-white shadow-md',
            'transition-transform duration-200',
            sizes[size].thumb,
            checked && sizes[size].translate
          )}
        />
      </div>
      {label && <span className={cn('text-foreground', disabled && 'opacity-50')}>{label}</span>}
    </label>
  );
}
