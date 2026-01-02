'use client';

import gsap from 'gsap';
import { Draggable } from 'gsap/dist/Draggable';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { DURATION, EASING, getDuration, prefersReducedMotion } from '@/lib/animations/gsap-config';

// Register plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(Draggable);
}

interface Card {
  id: string;
  content: ReactNode;
}

interface CardStackProps {
  cards: Card[];
  onCardDismiss?: (cardId: string, direction: 'left' | 'right') => void;
  onEmpty?: () => void;
  className?: string;
  cardClassName?: string;
  maxVisible?: number;
  swipeThreshold?: number;
}

export function CardStack({
  cards,
  onCardDismiss,
  onEmpty,
  className = '',
  cardClassName = '',
  maxVisible = 3,
  swipeThreshold = 100,
}: CardStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeCards, setActiveCards] = useState(cards.slice(0, maxVisible));

  useEffect(() => {
    setActiveCards(cards.slice(0, maxVisible));
  }, [cards, maxVisible]);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    // Animate initial stack
    activeCards.forEach((card, index) => {
      const element = cardRefs.current.get(card.id);
      if (element) {
        gsap.to(element, {
          y: index * 8,
          scale: 1 - index * 0.05,
          opacity: index === 0 ? 1 : 0.8 - index * 0.2,
          zIndex: activeCards.length - index,
          duration: getDuration(DURATION.quick),
          ease: EASING.smooth,
        });
      }
    });
  }, [activeCards]);

  const setupDraggable = (cardId: string) => {
    const element = cardRefs.current.get(cardId);
    if (!element || prefersReducedMotion()) return;

    Draggable.create(element, {
      type: 'x',
      bounds: { minX: -300, maxX: 300 },
      onDrag: function () {
        const rotation = this.x * 0.05;
        gsap.set(element, { rotation });

        // Visual feedback
        const opacity = 1 - (Math.abs(this.x) / 300) * 0.5;
        gsap.set(element, { opacity });
      },
      onDragEnd: function () {
        if (Math.abs(this.x) > swipeThreshold) {
          const direction = this.x > 0 ? 'right' : 'left';
          dismissCard(cardId, direction);
        } else {
          // Snap back
          gsap.to(element, {
            x: 0,
            rotation: 0,
            opacity: 1,
            duration: getDuration(DURATION.quick),
            ease: EASING.elastic,
          });
        }
      },
    });
  };

  const dismissCard = (cardId: string, direction: 'left' | 'right') => {
    const element = cardRefs.current.get(cardId);
    if (!element) return;

    const targetX = direction === 'right' ? 400 : -400;

    gsap.to(element, {
      x: targetX,
      rotation: direction === 'right' ? 30 : -30,
      opacity: 0,
      duration: getDuration(DURATION.quick),
      ease: EASING.smooth,
      onComplete: () => {
        onCardDismiss?.(cardId, direction);

        // Remove from active cards
        setActiveCards((prev) => {
          const newCards = prev.filter((c) => c.id !== cardId);
          if (newCards.length === 0) {
            onEmpty?.();
          }
          return newCards;
        });
      },
    });
  };

  const setCardRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
      if (activeCards[0]?.id === id) {
        setupDraggable(id);
      }
    } else {
      cardRefs.current.delete(id);
    }
  };

  if (activeCards.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-foreground/40">No cards</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {activeCards.map((card, index) => (
        <div
          key={card.id}
          ref={setCardRef(card.id)}
          className={`absolute inset-0 cursor-grab active:cursor-grabbing ${cardClassName}`}
          style={{
            touchAction: 'pan-y',
          }}
        >
          {card.content}
        </div>
      ))}
    </div>
  );
}
