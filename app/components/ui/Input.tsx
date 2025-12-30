'use client';

import gsap from 'gsap';
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  floatingLabel?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
  success?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      id,
      floatingLabel = false,
      showCharacterCount = false,
      maxLength,
      success = false,
      value,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const inputRef = useRef<HTMLInputElement>(null);
    const labelRef = useRef<HTMLLabelElement>(null);
    const focusRingRef = useRef<HTMLDivElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);
    const successRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    // Derive hasValue and charCount directly from value prop
    const hasValue = !!value || !!(props.defaultValue as string);
    const charCount = typeof value === 'string' ? value.length : 0;
    const actualRef = (ref as React.RefObject<HTMLInputElement>) || inputRef;

    useEffect(() => {
      if (!actualRef.current || prefersReducedMotion()) return;

      const input = actualRef.current;

      const handleFocus = () => {
        setIsFocused(true);

        // Animate floating label
        if (floatingLabel && labelRef.current) {
          gsap.to(labelRef.current, {
            y: -24,
            scale: 0.85,
            duration: getDuration(DURATION.quick),
            ease: EASING.snappy,
          });
        }

        // Animate focus ring
        if (focusRingRef.current) {
          gsap.to(focusRingRef.current, {
            opacity: 1,
            scale: 1,
            duration: getDuration(DURATION.fast),
            ease: EASING.snappy,
          });
        }
      };

      const handleBlur = () => {
        setIsFocused(false);

        // Reset floating label if no value
        if (floatingLabel && labelRef.current && !hasValue) {
          gsap.to(labelRef.current, {
            y: 0,
            scale: 1,
            duration: getDuration(DURATION.quick),
            ease: EASING.smooth,
          });
        }

        // Hide focus ring
        if (focusRingRef.current) {
          gsap.to(focusRingRef.current, {
            opacity: 0,
            scale: 0.95,
            duration: getDuration(DURATION.fast),
            ease: EASING.smooth,
          });
        }
      };

      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);

      return () => {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      };
    }, [floatingLabel, hasValue, actualRef]);

    // Error animation
    useEffect(() => {
      if (error && errorRef.current && !prefersReducedMotion()) {
        gsap.fromTo(
          errorRef.current,
          { opacity: 0, y: -10 },
          {
            opacity: 1,
            y: 0,
            duration: getDuration(DURATION.quick),
            ease: EASING.snappy,
          }
        );
      }
    }, [error]);

    // Success animation
    useEffect(() => {
      if (success && successRef.current && !prefersReducedMotion()) {
        gsap.fromTo(
          successRef.current,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: getDuration(DURATION.quick),
            ease: EASING.bounce,
          }
        );
      }
    }, [success]);

    const characterCount = typeof value === 'string' ? value.length : charCount;

    return (
      <div className="w-full">
        <div className="relative">
          {floatingLabel && label && (
            <label
              ref={labelRef}
              htmlFor={inputId}
              className={cn(
                'absolute left-4 pointer-events-none transition-colors',
                isFocused || hasValue ? 'top-2 text-xs' : 'top-1/2 -translate-y-1/2 text-base',
                error
                  ? 'text-[var(--accent)]'
                  : success
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--foreground)] opacity-70'
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {label}
              {props.required && <span style={{ color: 'var(--accent)' }}> *</span>}
            </label>
          )}

          {!floatingLabel && label && (
            <label
              htmlFor={inputId}
              className="block mb-2 font-medium"
              style={{
                color: 'var(--foreground)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {label}
              {props.required && <span style={{ color: 'var(--accent)' }}> *</span>}
            </label>
          )}

          <div className="relative">
            {leftIcon && (
              <div
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                style={{ color: 'var(--foreground)', opacity: 0.5 }}
              >
                {leftIcon}
              </div>
            )}

            <input
              ref={actualRef}
              id={inputId}
              value={value}
              className={cn(
                'w-full rounded-lg border px-4 outline-none transition-all',
                floatingLabel ? 'pt-6 pb-2' : 'py-3',
                'focus:ring-2 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                leftIcon && 'pl-11',
                (rightIcon || success || showCharacterCount) && 'pr-11',
                error
                  ? 'border-[var(--accent)] focus:ring-[var(--accent)]'
                  : success
                    ? 'border-[var(--primary)] focus:ring-[var(--primary)]'
                    : 'border-[var(--border)] focus:ring-[var(--primary)]',
                className
              )}
              style={{
                background: 'var(--surface)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-body)',
              }}
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
              maxLength={maxLength}
              onChange={(e) => {
                props.onChange?.(e);
              }}
              {...props}
            />

            {/* Focus ring */}
            <div
              ref={focusRingRef}
              className="absolute inset-0 rounded-lg pointer-events-none border-2 border-[var(--primary)] opacity-0"
              style={{
                transform: 'scale(0.95)',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              aria-hidden="true"
            />

            {/* Success checkmark */}
            {success && (
              <div
                ref={successRef}
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--primary)' }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}

            {!success && rightIcon && (
              <div
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                style={{ color: 'var(--foreground)', opacity: 0.5 }}
              >
                {rightIcon}
              </div>
            )}

            {/* Character count */}
            {showCharacterCount && maxLength && (
              <div
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-xs"
                style={{
                  color: characterCount > maxLength * 0.9 ? 'var(--accent)' : 'var(--foreground)',
                  opacity: 0.6,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {characterCount}/{maxLength}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p
            ref={errorRef}
            id={`${inputId}-error`}
            className="mt-2 text-sm flex items-center gap-2"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
            role="alert"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}

        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="mt-2 text-sm"
            style={{
              color: 'var(--foreground)',
              opacity: 0.6,
              fontFamily: 'var(--font-body)',
            }}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
