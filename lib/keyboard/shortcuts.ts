/**
 * Comprehensive Keyboard Shortcuts System
 * Phase 58: Global and contextual keyboard shortcuts
 */

// ============================================================================
// TYPES
// ============================================================================

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: KeyCombo;
  action: string;
  context: ShortcutContext;
  enabled: boolean;
  customizable: boolean;
}

export interface KeyCombo {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

export type ShortcutContext =
  | 'global'
  | 'editor'
  | 'dashboard'
  | 'media'
  | 'comments'
  | 'admin'
  | 'navigation';

export interface ShortcutGroup {
  id: string;
  name: string;
  context: ShortcutContext;
  shortcuts: KeyboardShortcut[];
}

export interface ShortcutHandler {
  action: string;
  handler: (event: KeyboardEvent) => void | Promise<void>;
}

// ============================================================================
// DEFAULT SHORTCUTS
// ============================================================================

export const DEFAULT_SHORTCUTS: ShortcutGroup[] = [
  // Global shortcuts
  {
    id: 'global',
    name: 'Global',
    context: 'global',
    shortcuts: [
      {
        id: 'search',
        name: 'Open Search',
        description: 'Open the global search dialog',
        keys: { key: 'k', meta: true },
        action: 'global.search',
        context: 'global',
        enabled: true,
        customizable: true,
      },
      {
        id: 'shortcuts-help',
        name: 'Show Shortcuts',
        description: 'Show keyboard shortcuts help',
        keys: { key: '?', shift: true },
        action: 'global.showShortcuts',
        context: 'global',
        enabled: true,
        customizable: false,
      },
      {
        id: 'escape',
        name: 'Close Modal',
        description: 'Close any open modal or dialog',
        keys: { key: 'Escape' },
        action: 'global.escape',
        context: 'global',
        enabled: true,
        customizable: false,
      },
      {
        id: 'notifications',
        name: 'Open Notifications',
        description: 'Open the notifications panel',
        keys: { key: 'n', alt: true },
        action: 'global.notifications',
        context: 'global',
        enabled: true,
        customizable: true,
      },
      {
        id: 'dark-mode',
        name: 'Toggle Dark Mode',
        description: 'Switch between light and dark mode',
        keys: { key: 'd', alt: true, shift: true },
        action: 'global.toggleDarkMode',
        context: 'global',
        enabled: true,
        customizable: true,
      },
    ],
  },

  // Navigation shortcuts
  {
    id: 'navigation',
    name: 'Navigation',
    context: 'navigation',
    shortcuts: [
      {
        id: 'go-home',
        name: 'Go to Home',
        description: 'Navigate to home page',
        keys: { key: 'h', alt: true },
        action: 'nav.home',
        context: 'navigation',
        enabled: true,
        customizable: true,
      },
      {
        id: 'go-dashboard',
        name: 'Go to Dashboard',
        description: 'Navigate to dashboard',
        keys: { key: 'd', alt: true },
        action: 'nav.dashboard',
        context: 'navigation',
        enabled: true,
        customizable: true,
      },
      {
        id: 'go-profile',
        name: 'Go to Profile',
        description: 'Navigate to your profile',
        keys: { key: 'p', alt: true },
        action: 'nav.profile',
        context: 'navigation',
        enabled: true,
        customizable: true,
      },
      {
        id: 'go-settings',
        name: 'Go to Settings',
        description: 'Navigate to settings',
        keys: { key: ',', meta: true },
        action: 'nav.settings',
        context: 'navigation',
        enabled: true,
        customizable: true,
      },
      {
        id: 'go-back',
        name: 'Go Back',
        description: 'Navigate to previous page',
        keys: { key: '[', meta: true },
        action: 'nav.back',
        context: 'navigation',
        enabled: true,
        customizable: false,
      },
      {
        id: 'go-forward',
        name: 'Go Forward',
        description: 'Navigate to next page',
        keys: { key: ']', meta: true },
        action: 'nav.forward',
        context: 'navigation',
        enabled: true,
        customizable: false,
      },
    ],
  },

  // Editor shortcuts
  {
    id: 'editor',
    name: 'Editor',
    context: 'editor',
    shortcuts: [
      {
        id: 'save',
        name: 'Save',
        description: 'Save the current document',
        keys: { key: 's', meta: true },
        action: 'editor.save',
        context: 'editor',
        enabled: true,
        customizable: false,
      },
      {
        id: 'publish',
        name: 'Publish',
        description: 'Publish the current document',
        keys: { key: 's', meta: true, shift: true },
        action: 'editor.publish',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'preview',
        name: 'Toggle Preview',
        description: 'Toggle preview mode',
        keys: { key: 'p', meta: true, shift: true },
        action: 'editor.preview',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'focus-mode',
        name: 'Focus Mode',
        description: 'Toggle distraction-free writing',
        keys: { key: 'f', meta: true, shift: true },
        action: 'editor.focusMode',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'bold',
        name: 'Bold',
        description: 'Make text bold',
        keys: { key: 'b', meta: true },
        action: 'editor.bold',
        context: 'editor',
        enabled: true,
        customizable: false,
      },
      {
        id: 'italic',
        name: 'Italic',
        description: 'Make text italic',
        keys: { key: 'i', meta: true },
        action: 'editor.italic',
        context: 'editor',
        enabled: true,
        customizable: false,
      },
      {
        id: 'underline',
        name: 'Underline',
        description: 'Underline text',
        keys: { key: 'u', meta: true },
        action: 'editor.underline',
        context: 'editor',
        enabled: true,
        customizable: false,
      },
      {
        id: 'strikethrough',
        name: 'Strikethrough',
        description: 'Strike through text',
        keys: { key: 's', meta: true, shift: true, alt: true },
        action: 'editor.strikethrough',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'link',
        name: 'Insert Link',
        description: 'Insert or edit link',
        keys: { key: 'k', meta: true },
        action: 'editor.link',
        context: 'editor',
        enabled: true,
        customizable: false,
      },
      {
        id: 'heading-1',
        name: 'Heading 1',
        description: 'Convert to heading 1',
        keys: { key: '1', meta: true, alt: true },
        action: 'editor.heading1',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'heading-2',
        name: 'Heading 2',
        description: 'Convert to heading 2',
        keys: { key: '2', meta: true, alt: true },
        action: 'editor.heading2',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'heading-3',
        name: 'Heading 3',
        description: 'Convert to heading 3',
        keys: { key: '3', meta: true, alt: true },
        action: 'editor.heading3',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'bullet-list',
        name: 'Bullet List',
        description: 'Convert to bullet list',
        keys: { key: '8', meta: true, shift: true },
        action: 'editor.bulletList',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'numbered-list',
        name: 'Numbered List',
        description: 'Convert to numbered list',
        keys: { key: '7', meta: true, shift: true },
        action: 'editor.numberedList',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'code-block',
        name: 'Code Block',
        description: 'Insert code block',
        keys: { key: '`', meta: true, shift: true },
        action: 'editor.codeBlock',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'quote',
        name: 'Quote',
        description: 'Insert blockquote',
        keys: { key: "'", meta: true, shift: true },
        action: 'editor.quote',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'undo',
        name: 'Undo',
        description: 'Undo last change',
        keys: { key: 'z', meta: true },
        action: 'editor.undo',
        context: 'editor',
        enabled: true,
        customizable: false,
      },
      {
        id: 'redo',
        name: 'Redo',
        description: 'Redo last undone change',
        keys: { key: 'z', meta: true, shift: true },
        action: 'editor.redo',
        context: 'editor',
        enabled: true,
        customizable: false,
      },
      {
        id: 'insert-image',
        name: 'Insert Image',
        description: 'Insert an image',
        keys: { key: 'i', meta: true, shift: true },
        action: 'editor.insertImage',
        context: 'editor',
        enabled: true,
        customizable: true,
      },
      {
        id: 'slash-command',
        name: 'Slash Commands',
        description: 'Open slash command menu',
        keys: { key: '/' },
        action: 'editor.slashCommand',
        context: 'editor',
        enabled: true,
        customizable: false,
      },
    ],
  },

  // Dashboard shortcuts
  {
    id: 'dashboard',
    name: 'Dashboard',
    context: 'dashboard',
    shortcuts: [
      {
        id: 'new-post',
        name: 'New Post',
        description: 'Create a new post',
        keys: { key: 'n', meta: true },
        action: 'dashboard.newPost',
        context: 'dashboard',
        enabled: true,
        customizable: true,
      },
      {
        id: 'view-posts',
        name: 'View Posts',
        description: 'View all posts',
        keys: { key: '1', alt: true },
        action: 'dashboard.viewPosts',
        context: 'dashboard',
        enabled: true,
        customizable: true,
      },
      {
        id: 'view-drafts',
        name: 'View Drafts',
        description: 'View all drafts',
        keys: { key: '2', alt: true },
        action: 'dashboard.viewDrafts',
        context: 'dashboard',
        enabled: true,
        customizable: true,
      },
      {
        id: 'view-media',
        name: 'View Media',
        description: 'View media library',
        keys: { key: '3', alt: true },
        action: 'dashboard.viewMedia',
        context: 'dashboard',
        enabled: true,
        customizable: true,
      },
      {
        id: 'view-analytics',
        name: 'View Analytics',
        description: 'View analytics',
        keys: { key: '4', alt: true },
        action: 'dashboard.viewAnalytics',
        context: 'dashboard',
        enabled: true,
        customizable: true,
      },
    ],
  },

  // Media library shortcuts
  {
    id: 'media',
    name: 'Media Library',
    context: 'media',
    shortcuts: [
      {
        id: 'upload',
        name: 'Upload',
        description: 'Upload new files',
        keys: { key: 'u', meta: true },
        action: 'media.upload',
        context: 'media',
        enabled: true,
        customizable: true,
      },
      {
        id: 'select-all',
        name: 'Select All',
        description: 'Select all items',
        keys: { key: 'a', meta: true },
        action: 'media.selectAll',
        context: 'media',
        enabled: true,
        customizable: false,
      },
      {
        id: 'delete-selected',
        name: 'Delete Selected',
        description: 'Delete selected items',
        keys: { key: 'Backspace', meta: true },
        action: 'media.deleteSelected',
        context: 'media',
        enabled: true,
        customizable: true,
      },
      {
        id: 'toggle-view',
        name: 'Toggle View',
        description: 'Toggle between grid and list view',
        keys: { key: 'v', alt: true },
        action: 'media.toggleView',
        context: 'media',
        enabled: true,
        customizable: true,
      },
    ],
  },

  // Comments shortcuts
  {
    id: 'comments',
    name: 'Comments',
    context: 'comments',
    shortcuts: [
      {
        id: 'reply',
        name: 'Reply',
        description: 'Reply to selected comment',
        keys: { key: 'r' },
        action: 'comments.reply',
        context: 'comments',
        enabled: true,
        customizable: true,
      },
      {
        id: 'like',
        name: 'Like',
        description: 'Like selected comment',
        keys: { key: 'l' },
        action: 'comments.like',
        context: 'comments',
        enabled: true,
        customizable: true,
      },
      {
        id: 'next-comment',
        name: 'Next Comment',
        description: 'Move to next comment',
        keys: { key: 'j' },
        action: 'comments.next',
        context: 'comments',
        enabled: true,
        customizable: true,
      },
      {
        id: 'prev-comment',
        name: 'Previous Comment',
        description: 'Move to previous comment',
        keys: { key: 'k' },
        action: 'comments.prev',
        context: 'comments',
        enabled: true,
        customizable: true,
      },
    ],
  },

  // Admin shortcuts
  {
    id: 'admin',
    name: 'Admin',
    context: 'admin',
    shortcuts: [
      {
        id: 'admin-users',
        name: 'Manage Users',
        description: 'Go to user management',
        keys: { key: 'u', alt: true, shift: true },
        action: 'admin.users',
        context: 'admin',
        enabled: true,
        customizable: true,
      },
      {
        id: 'admin-settings',
        name: 'Site Settings',
        description: 'Go to site settings',
        keys: { key: 's', alt: true, shift: true },
        action: 'admin.settings',
        context: 'admin',
        enabled: true,
        customizable: true,
      },
      {
        id: 'admin-moderation',
        name: 'Moderation Queue',
        description: 'Go to moderation queue',
        keys: { key: 'm', alt: true, shift: true },
        action: 'admin.moderation',
        context: 'admin',
        enabled: true,
        customizable: true,
      },
    ],
  },
];

// ============================================================================
// SHORTCUT MANAGER
// ============================================================================

export class ShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private handlers: Map<string, ShortcutHandler> = new Map();
  private activeContexts: Set<ShortcutContext> = new Set(['global']);
  private enabled: boolean = true;
  private listener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.loadDefaults();
  }

  /**
   * Load default shortcuts
   */
  loadDefaults(): void {
    for (const group of DEFAULT_SHORTCUTS) {
      for (const shortcut of group.shortcuts) {
        this.shortcuts.set(shortcut.id, { ...shortcut });
      }
    }
  }

  /**
   * Register a handler for an action
   */
  registerHandler(action: string, handler: (e: KeyboardEvent) => void | Promise<void>): void {
    this.handlers.set(action, { action, handler });
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(action: string): void {
    this.handlers.delete(action);
  }

  /**
   * Set active contexts
   */
  setActiveContexts(contexts: ShortcutContext[]): void {
    this.activeContexts = new Set(['global', ...contexts]);
  }

  /**
   * Add context
   */
  addContext(context: ShortcutContext): void {
    this.activeContexts.add(context);
  }

  /**
   * Remove context
   */
  removeContext(context: ShortcutContext): void {
    if (context !== 'global') {
      this.activeContexts.delete(context);
    }
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Start listening for keyboard events
   */
  startListening(): void {
    if (this.listener) return;

    this.listener = (event: KeyboardEvent) => {
      if (!this.enabled) return;
      if (this.shouldIgnoreEvent(event)) return;

      const shortcut = this.findMatchingShortcut(event);
      if (shortcut) {
        const handler = this.handlers.get(shortcut.action);
        if (handler) {
          event.preventDefault();
          event.stopPropagation();
          void Promise.resolve(handler.handler(event));
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.listener);
    }
  }

  /**
   * Stop listening for keyboard events
   */
  stopListening(): void {
    if (this.listener && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.listener);
      this.listener = null;
    }
  }

  /**
   * Check if event should be ignored
   */
  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    // Ignore if focus is in an input, textarea, or contenteditable
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable = target.isContentEditable;
    const isInput = tagName === 'input' || tagName === 'textarea';

    // Allow certain shortcuts even in editable elements
    if (isInput || isEditable) {
      // Allow meta/ctrl shortcuts in inputs for common operations
      if (event.metaKey || event.ctrlKey) {
        const allowedInInput = ['s', 'k', 'b', 'i', 'u', 'z'];
        if (allowedInInput.includes(event.key.toLowerCase())) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Find matching shortcut for event
   */
  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | null {
    for (const shortcut of this.shortcuts.values()) {
      if (!shortcut.enabled) continue;
      if (!this.activeContexts.has(shortcut.context)) continue;

      if (this.matchesKeyCombo(event, shortcut.keys)) {
        return shortcut;
      }
    }
    return null;
  }

  /**
   * Check if event matches key combo
   */
  private matchesKeyCombo(event: KeyboardEvent, keys: KeyCombo): boolean {
    const key = event.key.toLowerCase();
    const expectedKey = keys.key.toLowerCase();

    if (key !== expectedKey) return false;
    if (!!keys.ctrl !== event.ctrlKey) return false;
    if (!!keys.alt !== event.altKey) return false;
    if (!!keys.shift !== event.shiftKey) return false;
    if (!!keys.meta !== event.metaKey) return false;

    return true;
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): ShortcutGroup[] {
    const groups: Map<ShortcutContext, KeyboardShortcut[]> = new Map();

    for (const shortcut of this.shortcuts.values()) {
      const existing = groups.get(shortcut.context) || [];
      existing.push(shortcut);
      groups.set(shortcut.context, existing);
    }

    return DEFAULT_SHORTCUTS.map((group) => ({
      ...group,
      shortcuts: groups.get(group.context) || [],
    }));
  }

  /**
   * Get shortcuts for context
   */
  getShortcutsForContext(context: ShortcutContext): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter((s) => s.context === context);
  }

  /**
   * Update shortcut key combo
   */
  updateShortcut(id: string, keys: KeyCombo): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut || !shortcut.customizable) return false;

    // Check for conflicts
    for (const other of this.shortcuts.values()) {
      if (other.id === id) continue;
      if (
        other.context === shortcut.context &&
        this.keyComboEquals(other.keys, keys)
      ) {
        return false; // Conflict
      }
    }

    shortcut.keys = keys;
    return true;
  }

  /**
   * Reset shortcut to default
   */
  resetShortcut(id: string): void {
    const defaultShortcut = DEFAULT_SHORTCUTS
      .flatMap((g) => g.shortcuts)
      .find((s) => s.id === id);

    if (defaultShortcut) {
      const shortcut = this.shortcuts.get(id);
      if (shortcut) {
        shortcut.keys = { ...defaultShortcut.keys };
      }
    }
  }

  /**
   * Check if key combos are equal
   */
  private keyComboEquals(a: KeyCombo, b: KeyCombo): boolean {
    return (
      a.key.toLowerCase() === b.key.toLowerCase() &&
      !!a.ctrl === !!b.ctrl &&
      !!a.alt === !!b.alt &&
      !!a.shift === !!b.shift &&
      !!a.meta === !!b.meta
    );
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format key combo for display
 */
export function formatKeyCombo(keys: KeyCombo): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  if (keys.meta) parts.push(isMac ? '⌘' : 'Ctrl');
  if (keys.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (keys.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (keys.shift) parts.push(isMac ? '⇧' : 'Shift');

  // Format the key
  let key = keys.key;
  if (key === ' ') key = 'Space';
  else if (key === 'ArrowUp') key = '↑';
  else if (key === 'ArrowDown') key = '↓';
  else if (key === 'ArrowLeft') key = '←';
  else if (key === 'ArrowRight') key = '→';
  else if (key === 'Escape') key = 'Esc';
  else if (key === 'Backspace') key = '⌫';
  else if (key === 'Enter') key = '↵';
  else if (key === 'Tab') key = '⇥';
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);

  return parts.join(isMac ? '' : '+');
}

/**
 * Parse key combo from string
 */
export function parseKeyCombo(str: string): KeyCombo {
  const parts = str.toLowerCase().split('+');
  const key = parts.pop() || '';

  return {
    key,
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('⌘'),
    ctrl: parts.includes('ctrl') || parts.includes('⌃'),
    alt: parts.includes('alt') || parts.includes('⌥'),
    shift: parts.includes('shift') || parts.includes('⇧'),
  };
}

/**
 * Create singleton instance
 */
let instance: ShortcutManager | null = null;

export function getShortcutManager(): ShortcutManager {
  if (!instance) {
    instance = new ShortcutManager();
  }
  return instance;
}
