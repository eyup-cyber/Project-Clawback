/**
 * Accessibility Utilities
 * Phase 26: ARIA helpers, focus management, screen reader announcements
 */

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Trap focus within an element (for modals, dialogs)
 */
export function createFocusTrap(containerEl: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');

  let previousActiveElement: Element | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(containerEl.querySelectorAll(focusableSelectors));
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  return {
    activate() {
      previousActiveElement = document.activeElement;
      containerEl.addEventListener('keydown', handleKeyDown);

      // Focus first focusable element
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    },
    deactivate() {
      containerEl.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previous element
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    },
  };
}

/**
 * Move focus to an element
 */
export function focusElement(
  element: HTMLElement | null,
  options: { preventScroll?: boolean } = {}
): void {
  if (!element) return;

  // Make element focusable if it isn't already
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
  }

  element.focus({ preventScroll: options.preventScroll });
}

/**
 * Get the first focusable element in a container
 */
export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return container.querySelector(focusableSelectors);
}

// ============================================================================
// SCREEN READER ANNOUNCEMENTS
// ============================================================================

let announcerElement: HTMLElement | null = null;

/**
 * Create or get the announcer element
 */
function getAnnouncer(): HTMLElement {
  if (announcerElement) return announcerElement;

  announcerElement = document.createElement('div');
  announcerElement.setAttribute('aria-live', 'polite');
  announcerElement.setAttribute('aria-atomic', 'true');
  announcerElement.setAttribute('role', 'status');
  announcerElement.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(announcerElement);
  return announcerElement;
}

/**
 * Announce a message to screen readers
 */
export function announce(
  message: string,
  options: {
    priority?: 'polite' | 'assertive';
    clearAfter?: number;
  } = {}
): void {
  if (typeof document === 'undefined') return;

  const { priority = 'polite', clearAfter = 5000 } = options;

  const announcer = getAnnouncer();
  announcer.setAttribute('aria-live', priority);

  // Clear and set the message (forces announcement)
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });

  // Clear after delay
  if (clearAfter > 0) {
    setTimeout(() => {
      announcer.textContent = '';
    }, clearAfter);
  }
}

/**
 * Announce form errors
 */
export function announceFormErrors(errors: string[]): void {
  if (errors.length === 0) return;

  const message =
    errors.length === 1 ? `Error: ${errors[0]}` : `${errors.length} errors: ${errors.join('. ')}`;

  announce(message, { priority: 'assertive' });
}

// ============================================================================
// ARIA HELPERS
// ============================================================================

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Set up aria-describedby for an element
 */
export function setAriaDescribedBy(element: HTMLElement, descriptionElement: HTMLElement): string {
  const id = descriptionElement.id || generateId('desc');
  descriptionElement.id = id;
  element.setAttribute('aria-describedby', id);
  return id;
}

/**
 * Set up aria-labelledby for an element
 */
export function setAriaLabelledBy(element: HTMLElement, labelElement: HTMLElement): string {
  const id = labelElement.id || generateId('label');
  labelElement.id = id;
  element.setAttribute('aria-labelledby', id);
  return id;
}

/**
 * Create an accessible hidden element
 */
export function createVisuallyHidden(content: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = content;
  span.className = 'sr-only';
  span.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  return span;
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

export type KeyboardHandler = (event: KeyboardEvent) => void;

/**
 * Create keyboard navigation for a list
 */
export function createListNavigation(
  containerEl: HTMLElement,
  options: {
    itemSelector: string;
    orientation?: 'vertical' | 'horizontal';
    wrap?: boolean;
    onSelect?: (element: HTMLElement) => void;
  }
): () => void {
  const { itemSelector, orientation = 'vertical', wrap = true, onSelect } = options;

  function getItems(): HTMLElement[] {
    return Array.from(containerEl.querySelectorAll(itemSelector));
  }

  function getCurrentIndex(items: HTMLElement[]): number {
    return items.findIndex((item) => item === document.activeElement);
  }

  function focusItem(items: HTMLElement[], index: number): void {
    const item = items[index];
    if (item) {
      item.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const items = getItems();
    if (items.length === 0) return;

    const currentIndex = getCurrentIndex(items);
    let nextIndex = currentIndex;

    const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

    switch (event.key) {
      case prevKey:
        event.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = wrap ? items.length - 1 : 0;
        }
        break;

      case nextKey:
        event.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = wrap ? 0 : items.length - 1;
        }
        break;

      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        nextIndex = items.length - 1;
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onSelect && currentIndex >= 0) {
          onSelect(items[currentIndex]);
        }
        return;

      default:
        return;
    }

    focusItem(items, nextIndex);
  }

  containerEl.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    containerEl.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Create roving tabindex for tab-like navigation
 */
export function createRovingTabindex(containerEl: HTMLElement, itemSelector: string): () => void {
  function getItems(): HTMLElement[] {
    return Array.from(containerEl.querySelectorAll(itemSelector));
  }

  function updateTabindex(items: HTMLElement[], activeIndex: number): void {
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
    });
  }

  function handleFocus(event: FocusEvent): void {
    const items = getItems();
    const target = event.target as HTMLElement;
    const index = items.indexOf(target);

    if (index >= 0) {
      updateTabindex(items, index);
    }
  }

  // Initialize
  const items = getItems();
  if (items.length > 0) {
    updateTabindex(items, 0);
  }

  containerEl.addEventListener('focusin', handleFocus);

  return () => {
    containerEl.removeEventListener('focusin', handleFocus);
  };
}

// ============================================================================
// REDUCED MOTION
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get appropriate animation duration
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

// ============================================================================
// COLOR CONTRAST
// ============================================================================

/**
 * Calculate relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA standards
 */
export function meetsContrastAA(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number },
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeText ? 3 : 4.5;
  return ratio >= threshold;
}

/**
 * Check if contrast meets WCAG AAA standards
 */
export function meetsContrastAAA(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number },
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeText ? 4.5 : 7;
  return ratio >= threshold;
}

// ============================================================================
// SKIP LINKS
// ============================================================================

/**
 * Create a skip link element
 */
export function createSkipLink(
  targetId: string,
  text: string = 'Skip to main content'
): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = text;
  link.className = 'skip-link';
  link.style.cssText = `
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;

  // Show on focus
  link.addEventListener('focus', () => {
    link.style.left = '0';
    link.style.width = 'auto';
    link.style.height = 'auto';
    link.style.padding = '8px 16px';
    link.style.background = '#000';
    link.style.color = '#fff';
    link.style.zIndex = '9999';
  });

  link.addEventListener('blur', () => {
    link.style.left = '-10000px';
    link.style.width = '1px';
    link.style.height = '1px';
    link.style.padding = '0';
  });

  return link;
}

export default {
  createFocusTrap,
  focusElement,
  getFirstFocusableElement,
  announce,
  announceFormErrors,
  generateId,
  setAriaDescribedBy,
  setAriaLabelledBy,
  createVisuallyHidden,
  createListNavigation,
  createRovingTabindex,
  prefersReducedMotion,
  getAnimationDuration,
  getContrastRatio,
  meetsContrastAA,
  meetsContrastAAA,
  createSkipLink,
};
