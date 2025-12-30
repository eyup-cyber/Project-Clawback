'use client';

import gsap from 'gsap';
import { useRef, useState } from 'react';
import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';
import { useIntersectionObserver } from '@/lib/animations/performance';

interface AnimatedStatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  delay?: number;
}

export default function AnimatedStatCard({
  label,
  value,
  icon,
  color,
  delay = 0,
}: AnimatedStatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLParagraphElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [displayValue, setDisplayValue] = useState(typeof value === 'number' ? 0 : value);

  useIntersectionObserver(
    cardRef,
    (isIntersecting) => {
      if (isIntersecting && !hasAnimated && !prefersReducedMotion()) {
        setHasAnimated(true);

        // Animate card entrance
        gsap.fromTo(
          cardRef.current,
          { y: 40, opacity: 0, scale: 0.9 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: getDuration(DURATION.medium),
            delay,
            ease: EASING.bounce,
          }
        );

        // Animate number counting if numeric
        if (typeof value === 'number' && valueRef.current) {
          const target = value;
          const duration = getDuration(DURATION.slow);
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const eased = 1 - (1 - progress) ** 3;
            const current = Math.floor(eased * target);

            setDisplayValue(current);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(target);
            }
          };

          requestAnimationFrame(animate);
        }
      }
    },
    { threshold: 0.2, triggerOnce: true }
  );

  return (
    <div
      ref={cardRef}
      className="p-4 sm:p-6 rounded-xl border transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: `0 0 0 0 ${color}`,
        opacity: prefersReducedMotion() ? 1 : 0,
      }}
      onMouseEnter={() => {
        if (!prefersReducedMotion() && cardRef.current) {
          gsap.to(cardRef.current, {
            boxShadow: `0 0 30px ${color}40`,
            duration: getDuration(DURATION.quick),
            ease: EASING.smooth,
          });
        }
      }}
      onMouseLeave={() => {
        if (!prefersReducedMotion() && cardRef.current) {
          gsap.to(cardRef.current, {
            boxShadow: `0 0 0 0 ${color}`,
            duration: getDuration(DURATION.quick),
            ease: EASING.smooth,
          });
        }
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
          style={{ background: `${color}20` }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p
            ref={valueRef}
            className="text-xl sm:text-2xl lg:text-3xl font-bold truncate"
            style={{
              color,
              fontFamily: 'var(--font-display)',
            }}
          >
            {typeof value === 'number' ? displayValue.toLocaleString() : value}
          </p>
          <p
            className="text-xs sm:text-sm truncate"
            style={{
              color: 'var(--foreground)',
              opacity: 0.6,
              fontFamily: 'var(--font-body)',
            }}
          >
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
