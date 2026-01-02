'use client';

import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

interface RippleType {
  x: number;
  y: number;
  id: number;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ripple?: boolean;
  glow?: boolean;
  fullWidth?: boolean;
}

// Spinner component
function Spinner({ size = 'md' }: { size?: string }) {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    icon: 'w-4 h-4',
  };

  return (
    <svg
      className={`animate-spin ${sizes[size as keyof typeof sizes] || sizes.md}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      ripple = true,
      glow = false,
      fullWidth = false,
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<RippleType[]>([]);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const rippleIdRef = useRef(0);

    // Handle ripple effect
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (ripple && buttonRef.current && !disabled && !loading) {
          const rect = buttonRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          const id = rippleIdRef.current++;
          setRipples((prev) => [...prev, { x, y, id }]);

          // Remove ripple after animation
          setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
          }, 600);
        }

        onClick?.(e);
      },
      [ripple, disabled, loading, onClick]
    );

    const baseStyles = `
      relative overflow-hidden
      inline-flex items-center justify-center gap-2 font-bold rounded-xl
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
    `;

    const variants = {
      primary: `
        bg-[var(--primary)] text-[var(--background)]
        hover:brightness-110 hover:shadow-lg
        focus-visible:ring-[var(--primary)] focus-visible:ring-offset-[var(--background)]
      `,
      secondary: `
        bg-[var(--secondary)] text-[var(--background)]
        hover:brightness-110 hover:shadow-lg
        focus-visible:ring-[var(--secondary)] focus-visible:ring-offset-[var(--background)]
      `,
      accent: `
        bg-[var(--accent)] text-white
        hover:brightness-110 hover:shadow-lg
        focus-visible:ring-[var(--accent)] focus-visible:ring-offset-[var(--background)]
      `,
      outline: `
        border-2 border-[var(--border)] text-[var(--foreground)] bg-transparent
        hover:bg-[var(--surface)] hover:border-[var(--primary)]
        focus-visible:ring-[var(--primary)] focus-visible:ring-offset-[var(--background)]
      `,
      ghost: `
        text-[var(--foreground)] bg-transparent
        hover:bg-[var(--surface)]
        focus-visible:ring-[var(--primary)] focus-visible:ring-offset-[var(--background)]
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700 hover:shadow-lg
        focus-visible:ring-red-600 focus-visible:ring-offset-[var(--background)]
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-8 py-4 text-lg',
      icon: 'p-2.5',
    };

    const glowStyles = glow
      ? {
          primary: 'shadow-[0_0_20px_var(--glow-primary)]',
          secondary: 'shadow-[0_0_20px_var(--glow-secondary)]',
          accent: 'shadow-[0_0_20px_var(--glow-accent)]',
          outline: '',
          ghost: '',
          danger: 'shadow-[0_0_20px_rgba(220,38,38,0.4)]',
        }
      : {};

    return (
      <button
        ref={(node) => {
          // Handle both refs
          (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          glow && glowStyles[variant],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        style={{ fontFamily: 'var(--font-body)' }}
        {...props}
      >
        {/* Ripple effects */}
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute pointer-events-none rounded-full animate-ripple"
            style={{
              left: r.x,
              top: r.y,
              width: '10px',
              height: '10px',
              marginLeft: '-5px',
              marginTop: '-5px',
              background:
                variant === 'outline' || variant === 'ghost'
                  ? 'rgba(50, 205, 50, 0.3)'
                  : 'rgba(255, 255, 255, 0.3)',
            }}
          />
        ))}

        {/* Loading spinner */}
        {loading && <Spinner size={size} />}

        {/* Left icon */}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}

        {/* Children with loading text fade */}
        <span className={cn(loading && 'opacity-70')}>{children}</span>

        {/* Right icon */}
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}

        {/* Ripple animation keyframes */}
        <style jsx>{`
          @keyframes ripple {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            100% {
              transform: scale(40);
              opacity: 0;
            }
          }
          .animate-ripple {
            animation: ripple 0.6s ease-out forwards;
          }
        `}</style>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// Icon button variant
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'icon',
  ...props
}: ButtonProps & { icon: ReactNode; label: string }) {
  return (
    <Button variant={variant} size={size} aria-label={label} {...props}>
      {icon}
    </Button>
  );
}

// Button with arrow
export function ArrowButton({
  children,
  direction = 'right',
  ...props
}: ButtonProps & { direction?: 'left' | 'right' }) {
  const arrow = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cn(
        'transition-transform group-hover:translate-x-1',
        direction === 'left' && 'rotate-180'
      )}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );

  return (
    <Button
      className="group"
      rightIcon={direction === 'right' ? arrow : undefined}
      leftIcon={direction === 'left' ? arrow : undefined}
      {...props}
    >
      {children}
    </Button>
  );
}
