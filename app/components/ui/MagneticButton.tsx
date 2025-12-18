'use client';

import { forwardRef, useRef, useEffect, type ReactNode } from 'react';
import gsap from 'gsap';
import { EASING, COLORS, prefersReducedMotion } from '@/lib/animations/gsap-config';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  radius?: number;
  scale?: number;
  glow?: boolean;
  ripple?: boolean;
  particleTrail?: boolean;
  liquidMorph?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'glassmorphism' | 'neon' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  rainbowBend?: boolean;
  rainbowBendAmount?: number;
  rainbowBox?: boolean;
  rainbowBoxDirection?: 'up' | 'down';
}

const MagneticButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, MagneticButtonProps>(
  (
    {
      children,
      className = '',
      strength = 0.3,
      radius = 100,
      scale = 1.002,
      glow = true,
      ripple: _ripple = true,
      particleTrail = false,
      liquidMorph = false,
      variant = 'primary',
      size = 'md',
      disabled = false,
      onClick,
      href,
      type = 'button',
      rainbowBend = false,
      rainbowBendAmount = 14,
      rainbowBox = false,
      rainbowBoxDirection = 'up',
    },
    forwardedRef
  ) => {
    const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
    const contentRef = useRef<HTMLSpanElement>(null);
    const glowRef = useRef<HTMLSpanElement>(null);
    const _rippleRef = useRef<HTMLSpanElement>(null);
    const particleContainerRef = useRef<HTMLDivElement>(null);
    const liquidRef = useRef<HTMLDivElement>(null);
    const boundingRef = useRef<DOMRect | null>(null);
    const particlesRef = useRef<Array<{ id: number; element: HTMLSpanElement }>>([]);
    const particleIdRef = useRef(0);

    const ref =
      (forwardedRef as React.RefObject<HTMLButtonElement | HTMLAnchorElement>) || buttonRef;

    // Variant styles
    const variantStyles = {
      primary: {
        bg: COLORS.primary,
        text: '#000',
        glowColor: COLORS.glowPrimary,
        hoverBg: '#2db82d',
      },
      secondary: {
        bg: COLORS.secondary,
        text: '#000',
        glowColor: COLORS.glowSecondary,
        hoverBg: '#e6c200',
      },
      ghost: {
        bg: 'transparent',
        text: COLORS.foreground,
        glowColor: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
      },
      outline: {
        bg: COLORS.primary,
        text: '#000',
        glowColor: COLORS.glowPrimary,
        hoverBg: COLORS.secondary,
      },
      glassmorphism: {
        bg: 'rgba(1, 50, 32, 0.3)',
        text: COLORS.foreground,
        glowColor: COLORS.glowPrimary,
        hoverBg: 'rgba(1, 50, 32, 0.5)',
      },
      neon: {
        bg: 'transparent',
        text: COLORS.primary,
        glowColor: COLORS.glowPrimary,
        hoverBg: 'rgba(50, 205, 50, 0.1)',
      },
      gradient: {
        bg: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
        text: '#000',
        glowColor: COLORS.glowPrimary,
        hoverBg: `linear-gradient(135deg, #2db82d, #e6c200)`,
      },
    };

    // Size styles - rectangular buttons
    const sizeStyles = {
      sm: 'px-4 py-2.5 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
    };

    const styles = variantStyles[variant];

    useEffect(() => {
      const element = ref.current || buttonRef.current;
      if (!element || disabled || prefersReducedMotion()) return;

      const updateBounding = () => {
        boundingRef.current = element.getBoundingClientRect();
      };

      // Randomized floating animation - extremely subtle, space-like float (always running, independent)
      // Track float position - magnetic effect won't interfere with position
      const floatProxy = { y: 0 };
      let magneticX = 0;
      let magneticY = 0;
      let currentFloatAnimation: gsap.core.Tween | null = null;

      // Create randomized floating pattern
      const createRandomFloat = (): gsap.core.Tween => {
        const randomY = (Math.random() - 0.5) * 0.4; // Very limited: -0.2 to 0.2
        const randomDuration = 4 + Math.random() * 4; // 4-8 seconds
        const randomDelay = Math.random() * 0.5;

        return gsap.to(floatProxy, {
          y: randomY,
          duration: randomDuration,
          ease: 'power1.inOut',
          onUpdate: () => {
            // Only apply float position - magnetic doesn't move the button
            gsap.set(element, {
              y: floatProxy.y,
              x: 0,
            });
          },
          onComplete: () => {
            // Chain to next random movement
            currentFloatAnimation = createRandomFloat();
          },
          delay: randomDelay,
        });
      };

      // Start the randomized floating
      currentFloatAnimation = createRandomFloat();

      const handleMouseMove = (e: MouseEvent) => {
        if (!boundingRef.current) return;

        const rect = boundingRef.current;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (distance < radius) {
          // Keep magnetic values for visual effects but don't move button position
          magneticX = distanceX * strength;
          magneticY = distanceY * strength;

          // Only apply scale, not position movement - floating continues uninterrupted
          gsap.to(element, {
            scale,
            duration: 0.4,
            ease: EASING.smooth,
          });

          if (contentRef.current) {
            // Extremely minimal content movement - less than 10% of original
            gsap.to(contentRef.current, {
              x: magneticX * 0.01,
              y: magneticY * 0.01,
              duration: 0.4,
              ease: EASING.smooth,
            });
          }

          if (glow && glowRef.current) {
            gsap.to(glowRef.current, {
              opacity: 0.6,
              x: magneticX * 0.03,
              y: magneticY * 0.03,
              duration: 0.4,
              ease: EASING.smooth,
            });
          }

          // Particle trail effect
          if (particleTrail && particleContainerRef.current && distance < radius * 0.8) {
            createParticle(e.clientX - rect.left, e.clientY - rect.top);
          }

          // Liquid morph effect
          if (liquidMorph && liquidRef.current) {
            const morphX = (distanceX / rect.width) * 20;
            const morphY = (distanceY / rect.height) * 20;
            gsap.to(liquidRef.current, {
              borderRadius: `${50 + morphX}% ${50 - morphX}% ${50 + morphY}% ${50 - morphY}%`,
              duration: 0.3,
              ease: EASING.liquid,
            });
          }
        }
      };

      const createParticle = (x: number, y: number) => {
        if (!particleContainerRef.current) return;

        const particle = document.createElement('span');
        const id = particleIdRef.current++;
        particle.style.cssText = `
          position: absolute;
          width: 4px;
          height: 4px;
          background: ${styles.glowColor || COLORS.glowPrimary};
          border-radius: 50%;
          pointer-events: none;
          left: ${x}px;
          top: ${y}px;
          transform: translate(-50%, -50%);
        `;

        particleContainerRef.current.appendChild(particle);
        particlesRef.current.push({ id, element: particle });

        gsap.to(particle, {
          x: (Math.random() - 0.5) * 40,
          y: (Math.random() - 0.5) * 40,
          opacity: 0,
          scale: 0,
          duration: 0.6,
          ease: EASING.trail,
          onComplete: () => {
            particle.remove();
            particlesRef.current = particlesRef.current.filter((p) => p.id !== id);
          },
        });
      };

      const handleMouseLeave = () => {
        magneticX = 0;
        magneticY = 0;

        // Reset scale only, position continues floating
        gsap.to(element, {
          scale: 1,
          duration: 0.6,
          ease: EASING.elastic,
        });

        if (contentRef.current) {
          gsap.to(contentRef.current, {
            x: 0,
            y: 0,
            duration: 0.6,
            ease: EASING.elastic,
          });
        }

        if (glowRef.current) {
          gsap.to(glowRef.current, {
            opacity: 0,
            x: 0,
            y: 0,
            duration: 0.4,
            ease: EASING.smooth,
          });
        }

        // Reset liquid morph
        if (liquidMorph && liquidRef.current) {
          gsap.to(liquidRef.current, {
            borderRadius: '50%',
            duration: 0.5,
            ease: EASING.elastic,
          });
        }
      };

      updateBounding();
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('resize', updateBounding);
      window.addEventListener('scroll', updateBounding);
      element.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        // Kill all animations on the element and floatProxy
        gsap.killTweensOf(element);
        gsap.killTweensOf(floatProxy);
        if (currentFloatAnimation) {
          currentFloatAnimation.kill();
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', updateBounding);
        window.removeEventListener('scroll', updateBounding);
        element.removeEventListener('mouseleave', handleMouseLeave);
        // Clean up particles
        particlesRef.current.forEach((p) => p.element.remove());
        particlesRef.current = [];
      };
    }, [
      ref,
      strength,
      radius,
      scale,
      glow,
      styles.glowColor,
      particleTrail,
      liquidMorph,
      disabled,
    ]);

    const handleClick = (_e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      if (disabled) return;

      // Ripple effect removed - no white spots

      onClick?.();
    };

    const variantClasses = {
      glassmorphism: 'backdrop-blur-md border border-white/20',
      neon: 'border-2 border-[var(--primary)] shadow-[0_0_20px_var(--glow-primary)]',
      gradient: '',
    };

    // Blob-like border radius - will be animated
    // Curved corner squares - simple rounded rectangles
    const baseClassName = `
      relative overflow-hidden rounded-md font-medium transition-colors
      ${sizeStyles[size]}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${variant === 'outline' ? 'border-2 border-[var(--primary)]' : ''}
      ${variantClasses[variant as keyof typeof variantClasses] || ''}
      ${className}
    `;

    const Component = href ? 'a' : 'button';

    return (
      <Component
        ref={ref as React.Ref<HTMLButtonElement & HTMLAnchorElement>}
        className={baseClassName}
        style={{
          background: variant === 'gradient' ? styles.bg : styles.bg,
          color: styles.text,
          borderColor: variant === 'outline' || variant === 'neon' ? COLORS.primary : undefined,
          willChange: 'transform',
          transition: 'background-color 0.3s ease, color 0.3s ease',
        }}
        onMouseEnter={(e) => {
          if (!disabled && (variant === 'primary' || variant === 'outline')) {
            const target = e.currentTarget as HTMLElement;
            target.style.background = COLORS.secondary;
            target.style.color = '#000';
            if (variant === 'outline') {
              target.style.borderColor = COLORS.secondary;
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && (variant === 'primary' || variant === 'outline')) {
            const target = e.currentTarget as HTMLElement;
            target.style.background = styles.bg;
            target.style.color = styles.text;
            if (variant === 'outline') {
              target.style.borderColor = COLORS.primary;
            }
          }
        }}
        onClick={handleClick}
        href={href}
        type={href ? undefined : type}
        disabled={disabled && !href}
      >
        {/* Liquid morph background */}
        {liquidMorph && (
          <div
            ref={liquidRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: styles.bg,
              borderRadius: '50%',
              transition: 'border-radius 0.3s ease',
            }}
            aria-hidden="true"
          />
        )}

        {/* Glow effect */}
        {glow && (
          <span
            ref={glowRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: styles.glowColor,
              filter: 'blur(20px)',
              opacity: 0,
            }}
            aria-hidden="true"
          />
        )}

        {/* Particle container */}
        {particleTrail && (
          <div
            ref={particleContainerRef}
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
          />
        )}

        {/* Ripple effect - removed white spots */}

        {/* Content */}
        <span
          ref={contentRef}
          className="relative z-10 flex items-center justify-center"
          style={{ willChange: 'transform' }}
        >
          {children}
        </span>
      </Component>
    );
  }
);

MagneticButton.displayName = 'MagneticButton';

export default MagneticButton;

// Pulsing CTA variant
interface PulsingCTAProps extends MagneticButtonProps {
  pulseColor?: string;
  pulseIntensity?: number;
}

export function PulsingCTA({
  children,
  pulseColor = COLORS.glowPrimary,
  pulseIntensity = 0.5,
  ...props
}: PulsingCTAProps) {
  const pulseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pulseRef.current || prefersReducedMotion()) return;

    gsap.to(pulseRef.current, {
      scale: 1.2,
      opacity: 0,
      duration: 1.5,
      repeat: -1,
      ease: EASING.smooth,
    });
  }, []);

  return (
    <div className="relative inline-block">
      {/* Pulse ring */}
      <span
        ref={pulseRef}
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          background: pulseColor,
          opacity: pulseIntensity,
        }}
        aria-hidden="true"
      />

      <MagneticButton {...props}>{children}</MagneticButton>
    </div>
  );
}
