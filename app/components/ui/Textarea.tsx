'use client';

import { forwardRef, type TextareaHTMLAttributes, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { EASING, prefersReducedMotion, getDuration, DURATION } from '@/lib/animations/gsap-config';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  floatingLabel?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
  success?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, floatingLabel = false, showCharacterCount = false, maxLength, autoResize = true, success = false, value, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const labelRef = useRef<HTMLLabelElement>(null);
    const focusRingRef = useRef<HTMLDivElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);
    const successRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    // Derive hasValue and charCount directly from value prop
    const hasValue = !!value || !!(props.defaultValue as string);
    const charCount = typeof value === 'string' ? value.length : 0;
    const actualRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    // Auto-resize
    useEffect(() => {
      if (!autoResize || !textareaRef.current) return;

      const textarea = textareaRef.current;
      
      const resize = () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      };

      textarea.addEventListener('input', resize);
      resize(); // Initial resize

      return () => textarea.removeEventListener('input', resize);
    }, [autoResize, value]);

    useEffect(() => {
      if (!actualRef.current || prefersReducedMotion()) return;

      const textarea = actualRef.current;

      const handleFocus = () => {
        setIsFocused(true);
        
        if (floatingLabel && labelRef.current) {
          gsap.to(labelRef.current, {
            y: -24,
            scale: 0.85,
            duration: getDuration(DURATION.quick),
            ease: EASING.snappy,
          });
        }

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
        
        if (floatingLabel && labelRef.current && !hasValue) {
          gsap.to(labelRef.current, {
            y: 0,
            scale: 1,
            duration: getDuration(DURATION.quick),
            ease: EASING.smooth,
          });
        }

        if (focusRingRef.current) {
          gsap.to(focusRingRef.current, {
            opacity: 0,
            scale: 0.95,
            duration: getDuration(DURATION.fast),
            ease: EASING.smooth,
          });
        }
      };

      textarea.addEventListener('focus', handleFocus);
      textarea.addEventListener('blur', handleBlur);

      return () => {
        textarea.removeEventListener('focus', handleFocus);
        textarea.removeEventListener('blur', handleBlur);
      };
    }, [floatingLabel, hasValue, actualRef]);

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
              htmlFor={textareaId}
              className={cn(
                'absolute left-4 pointer-events-none transition-colors',
                (isFocused || hasValue) ? 'top-2 text-xs' : 'top-4 text-base',
                error ? 'text-[var(--accent)]' : success ? 'text-[var(--primary)]' : 'text-[var(--foreground)] opacity-70'
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {label}
              {props.required && <span style={{ color: 'var(--accent)' }}> *</span>}
            </label>
          )}

          {!floatingLabel && label && (
            <label
              htmlFor={textareaId}
              className="block mb-2 font-medium"
              style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}
            >
              {label}
              {props.required && <span style={{ color: 'var(--accent)' }}> *</span>}
            </label>
          )}

          <div className="relative">
            <textarea
              ref={actualRef}
              id={textareaId}
              value={value}
              className={cn(
                'w-full rounded-lg border px-4 outline-none transition-all',
                floatingLabel ? 'pt-6 pb-2' : 'py-3',
                autoResize ? 'resize-none overflow-hidden' : 'resize-y',
                'min-h-[120px]',
                'focus:ring-2 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                (success || showCharacterCount) && 'pr-11',
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
              aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
              maxLength={maxLength}
              onChange={(e) => {
                setHasValue(!!e.target.value);
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
                className="absolute right-4 top-4 pointer-events-none"
                style={{ color: 'var(--primary)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}

            {/* Character count */}
            {showCharacterCount && maxLength && (
              <div
                className="absolute right-4 bottom-4 pointer-events-none text-xs"
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
            id={`${textareaId}-error`}
            className="mt-2 text-sm flex items-center gap-2"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
            role="alert"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}

        {hint && !error && (
          <p
            id={`${textareaId}-hint`}
            className="mt-2 text-sm"
            style={{ color: 'var(--foreground)', opacity: 0.6, fontFamily: 'var(--font-body)' }}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;






