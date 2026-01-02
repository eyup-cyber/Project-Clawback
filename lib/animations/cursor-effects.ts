/**
 * Cursor Effects Library
 * Enhanced cursor interactions, magnetic effects, and cursor state management
 */

import { SPRING_PRESETS, Spring2D, type SpringConfig, type Vector2D } from './spring-physics';

// ============================================
// CURSOR STATE TYPES
// ============================================

export type CursorState =
  | 'default'
  | 'pointer'
  | 'text'
  | 'grab'
  | 'grabbing'
  | 'zoom-in'
  | 'zoom-out'
  | 'expand'
  | 'play'
  | 'pause'
  | 'link'
  | 'hidden'
  | 'loading';

export interface CursorStyle {
  size: number;
  color: string;
  mixBlendMode?: string;
  borderRadius?: string;
  scale?: number;
  icon?: string;
}

export const CURSOR_STYLES: Record<CursorState, CursorStyle> = {
  default: {
    size: 20,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
  },
  pointer: {
    size: 60,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    scale: 1.5,
  },
  text: {
    size: 4,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '2px',
    scale: 2,
  },
  grab: {
    size: 40,
    color: 'var(--secondary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    icon: '✋',
  },
  grabbing: {
    size: 35,
    color: 'var(--secondary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    scale: 0.9,
    icon: '✊',
  },
  'zoom-in': {
    size: 50,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    icon: '🔍',
  },
  'zoom-out': {
    size: 50,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    icon: '🔍',
  },
  expand: {
    size: 80,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    icon: '⤢',
  },
  play: {
    size: 70,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    icon: '▶',
  },
  pause: {
    size: 70,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    icon: '⏸',
  },
  link: {
    size: 50,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
    icon: '↗',
  },
  hidden: {
    size: 0,
    color: 'transparent',
    scale: 0,
  },
  loading: {
    size: 30,
    color: 'var(--primary)',
    mixBlendMode: 'difference',
    borderRadius: '50%',
  },
};

// ============================================
// MAGNETIC ELEMENT CLASS
// ============================================

export interface MagneticOptions {
  strength?: number;
  radius?: number;
  springConfig?: SpringConfig;
  ease?: 'linear' | 'easeOut' | 'elastic';
}

export class MagneticElement {
  private element: HTMLElement;
  private spring: Spring2D;
  private bounds: DOMRect | null = null;
  private center: Vector2D = { x: 0, y: 0 };
  private strength: number;
  private radius: number;
  private isActive: boolean = false;
  private rafId: number | null = null;

  constructor(element: HTMLElement, options: MagneticOptions = {}) {
    this.element = element;
    this.strength = options.strength ?? 0.3;
    this.radius = options.radius ?? 100;
    this.spring = new Spring2D({ x: 0, y: 0 }, options.springConfig ?? SPRING_PRESETS.magnetic);

    this.updateBounds();
    this.setupListeners();
  }

  private updateBounds(): void {
    this.bounds = this.element.getBoundingClientRect();
    this.center = {
      x: this.bounds.left + this.bounds.width / 2,
      y: this.bounds.top + this.bounds.height / 2,
    };
  }

  private setupListeners(): void {
    // Update bounds on resize
    const resizeObserver = new ResizeObserver(() => this.updateBounds());
    resizeObserver.observe(this.element);

    // Update bounds on scroll
    window.addEventListener('scroll', () => this.updateBounds(), {
      passive: true,
    });
  }

  /**
   * Update magnetic effect based on cursor position
   */
  update(cursorX: number, cursorY: number): Vector2D {
    if (!this.bounds) return { x: 0, y: 0 };

    const dx = cursorX - this.center.x;
    const dy = cursorY - this.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.radius) {
      // Inside magnetic field
      const factor = 1 - distance / this.radius;
      const targetX = dx * this.strength * factor;
      const targetY = dy * this.strength * factor;
      this.spring.setTarget({ x: targetX, y: targetY });
      this.isActive = true;
    } else if (this.isActive) {
      // Outside magnetic field, return to origin
      this.spring.setTarget({ x: 0, y: 0 });
      this.isActive = false;
    }

    return this.spring.update(0.016); // ~60fps
  }

  /**
   * Apply the magnetic transform to the element
   */
  applyTransform(offset: Vector2D): void {
    this.element.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
  }

  /**
   * Reset element to original position
   */
  reset(): void {
    this.spring.reset();
    this.element.style.transform = '';
    this.isActive = false;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.reset();
  }
}

// ============================================
// CURSOR TRAIL SYSTEM
// ============================================

export interface TrailOptions {
  count?: number;
  size?: number;
  color?: string;
  decay?: number;
  springConfig?: SpringConfig;
}

export class CursorTrail {
  private points: Array<{ spring: Spring2D; element: HTMLElement }> = [];
  private container: HTMLElement;
  private count: number;
  private decay: number;
  private rafId: number | null = null;
  private mousePos: Vector2D = { x: 0, y: 0 };

  constructor(container: HTMLElement, options: TrailOptions = {}) {
    this.container = container;
    this.count = options.count ?? 10;
    this.decay = options.decay ?? 0.15;

    this.createPoints(options);
    this.start();
  }

  private createPoints(options: TrailOptions): void {
    const size = options.size ?? 8;
    const color = options.color ?? 'var(--primary)';

    for (let i = 0; i < this.count; i++) {
      const element = document.createElement('div');
      element.className = 'cursor-trail-point';
      element.style.cssText = `
        position: fixed;
        width: ${size * (1 - i * 0.08)}px;
        height: ${size * (1 - i * 0.08)}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        opacity: ${1 - i * 0.1};
        z-index: 9998;
        transform: translate(-50%, -50%);
        will-change: transform;
      `;
      this.container.appendChild(element);

      // Each point has progressively softer spring
      const springConfig = {
        stiffness: 400 - i * 30,
        damping: 30 - i * 1.5,
      };

      this.points.push({
        spring: new Spring2D({ x: 0, y: 0 }, springConfig),
        element,
      });
    }
  }

  private start(): void {
    const update = () => {
      let prevPos = this.mousePos;

      this.points.forEach(({ spring, element }, i) => {
        if (i === 0) {
          spring.setTarget(this.mousePos);
        } else {
          // Each point follows the previous
          const target = {
            x: prevPos.x,
            y: prevPos.y,
          };
          spring.setTarget(target);
        }

        const pos = spring.update(0.016);
        prevPos = pos;
        element.style.left = `${pos.x}px`;
        element.style.top = `${pos.y}px`;
      });

      this.rafId = requestAnimationFrame(update);
    };

    update();
  }

  /**
   * Update mouse position
   */
  setPosition(x: number, y: number): void {
    this.mousePos = { x, y };
  }

  /**
   * Show trail
   */
  show(): void {
    this.points.forEach(({ element }) => {
      element.style.opacity = '1';
    });
  }

  /**
   * Hide trail
   */
  hide(): void {
    this.points.forEach(({ element }) => {
      element.style.opacity = '0';
    });
  }

  /**
   * Destroy trail
   */
  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.points.forEach(({ element }) => {
      element.remove();
    });
    this.points = [];
  }
}

// ============================================
// CURSOR SQUEEZE EFFECT
// ============================================

export interface SqueezeOptions {
  scale?: number;
  duration?: number;
}

export class CursorSqueeze {
  private element: HTMLElement;
  private isPressed: boolean = false;
  private scale: number;
  private duration: number;

  constructor(element: HTMLElement, options: SqueezeOptions = {}) {
    this.element = element;
    this.scale = options.scale ?? 0.8;
    this.duration = options.duration ?? 100;

    this.setupListeners();
  }

  private setupListeners(): void {
    this.element.addEventListener('mousedown', () => this.squeeze());
    this.element.addEventListener('mouseup', () => this.release());
    this.element.addEventListener('mouseleave', () => {
      if (this.isPressed) this.release();
    });
  }

  private squeeze(): void {
    this.isPressed = true;
    this.element.style.transition = `transform ${this.duration}ms ease-out`;
    this.element.style.transform = `scale(${this.scale})`;
  }

  private release(): void {
    this.isPressed = false;
    this.element.style.transition = `transform ${this.duration * 2}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    this.element.style.transform = 'scale(1)';
  }
}

// ============================================
// CURSOR MANAGER
// ============================================

export interface CursorManagerOptions {
  defaultState?: CursorState;
  hideSystemCursor?: boolean;
  enableTrail?: boolean;
  trailOptions?: TrailOptions;
}

export class CursorManager {
  private cursor: HTMLElement | null = null;
  private state: CursorState = 'default';
  private position: Vector2D = { x: 0, y: 0 };
  private spring!: Spring2D;
  private magneticElements: Map<HTMLElement, MagneticElement> = new Map();
  private trail: CursorTrail | null = null;
  private rafId: number | null = null;
  private isVisible: boolean = true;

  constructor(options: CursorManagerOptions = {}) {
    if (typeof window === 'undefined') return;

    this.state = options.defaultState ?? 'default';
    this.spring = new Spring2D({ x: 0, y: 0 }, SPRING_PRESETS.snap);

    this.createCursor();

    if (options.hideSystemCursor) {
      document.body.style.cursor = 'none';
    }

    if (options.enableTrail) {
      this.trail = new CursorTrail(document.body, options.trailOptions);
    }

    this.setupListeners();
    this.start();
  }

  private createCursor(): void {
    this.cursor = document.createElement('div');
    this.cursor.id = 'custom-cursor';
    this.cursor.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: width 0.2s, height 0.2s, background 0.2s, border-radius 0.2s;
      will-change: transform, width, height;
      mix-blend-mode: ${CURSOR_STYLES.default.mixBlendMode};
    `;
    this.applyStyle(CURSOR_STYLES.default);
    document.body.appendChild(this.cursor);
  }

  private applyStyle(style: CursorStyle): void {
    if (!this.cursor) return;

    this.cursor.style.width = `${style.size}px`;
    this.cursor.style.height = `${style.size}px`;
    this.cursor.style.background = style.color;
    this.cursor.style.borderRadius = style.borderRadius ?? '50%';

    if (style.mixBlendMode) {
      this.cursor.style.mixBlendMode = style.mixBlendMode;
    }

    // Handle icon
    if (style.icon) {
      this.cursor.innerHTML = `<span style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: ${style.size * 0.5}px;
        color: var(--background);
      ">${style.icon}</span>`;
    } else {
      this.cursor.innerHTML = '';
    }
  }

  private setupListeners(): void {
    // Track mouse position
    window.addEventListener('mousemove', (e) => {
      this.position = { x: e.clientX, y: e.clientY };
      this.spring.setTarget(this.position);

      if (this.trail) {
        this.trail.setPosition(e.clientX, e.clientY);
      }

      // Update magnetic elements
      this.magneticElements.forEach((magnetic, element) => {
        const offset = magnetic.update(e.clientX, e.clientY);
        magnetic.applyTransform(offset);
      });
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      this.hide();
    });

    document.addEventListener('mouseenter', () => {
      this.show();
    });

    // Auto-detect interactive elements
    this.setupInteractiveDetection();
  }

  private setupInteractiveDetection(): void {
    // Hover state detection via event delegation
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;

      // Check for data-cursor attribute
      const cursorAttr = target.closest('[data-cursor]');
      if (cursorAttr) {
        const state = cursorAttr.getAttribute('data-cursor') as CursorState;
        if (state && CURSOR_STYLES[state]) {
          this.setState(state);
          return;
        }
      }

      // Auto-detect element types
      if (target.closest('a, button, [role="button"]')) {
        this.setState('pointer');
      } else if (target.closest('input[type="text"], textarea, [contenteditable]')) {
        this.setState('text');
      } else if (target.closest('video, [data-video]')) {
        this.setState('play');
      } else if (target.closest('img[data-zoom], [data-lightbox]')) {
        this.setState('zoom-in');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('a, button, [role="button"], input, textarea, video, img, [data-cursor]')
      ) {
        this.setState('default');
      }
    });
  }

  private start(): void {
    const update = () => {
      if (!this.cursor || !this.isVisible) {
        this.rafId = requestAnimationFrame(update);
        return;
      }

      const pos = this.spring.update(0.016);
      this.cursor.style.left = `${pos.x}px`;
      this.cursor.style.top = `${pos.y}px`;

      this.rafId = requestAnimationFrame(update);
    };

    update();
  }

  /**
   * Set cursor state
   */
  setState(state: CursorState): void {
    if (this.state === state) return;
    this.state = state;
    this.applyStyle(CURSOR_STYLES[state]);
  }

  /**
   * Get current state
   */
  getState(): CursorState {
    return this.state;
  }

  /**
   * Register a magnetic element
   */
  registerMagnetic(element: HTMLElement, options?: MagneticOptions): void {
    const magnetic = new MagneticElement(element, options);
    this.magneticElements.set(element, magnetic);
  }

  /**
   * Unregister a magnetic element
   */
  unregisterMagnetic(element: HTMLElement): void {
    const magnetic = this.magneticElements.get(element);
    if (magnetic) {
      magnetic.destroy();
      this.magneticElements.delete(element);
    }
  }

  /**
   * Show cursor
   */
  show(): void {
    this.isVisible = true;
    if (this.cursor) {
      this.cursor.style.opacity = '1';
    }
    if (this.trail) {
      this.trail.show();
    }
  }

  /**
   * Hide cursor
   */
  hide(): void {
    this.isVisible = false;
    if (this.cursor) {
      this.cursor.style.opacity = '0';
    }
    if (this.trail) {
      this.trail.hide();
    }
  }

  /**
   * Destroy cursor manager
   */
  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.cursor) {
      this.cursor.remove();
    }
    if (this.trail) {
      this.trail.destroy();
    }
    this.magneticElements.forEach((magnetic) => magnetic.destroy());
    this.magneticElements.clear();
    document.body.style.cursor = '';
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate distance between two points
 */
export const distance = (p1: Vector2D, p2: Vector2D): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Normalize a vector
 */
export const normalize = (v: Vector2D): Vector2D => {
  const length = Math.sqrt(v.x * v.x + v.y * v.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: v.x / length, y: v.y / length };
};

/**
 * Lerp between two vectors
 */
export const lerpVector = (a: Vector2D, b: Vector2D, t: number): Vector2D => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/**
 * Check if device supports hover (not touch-only)
 */
export const supportsHover = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover)').matches;
};

/**
 * Check if device is touch-only
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};
