/**
 * TipTap Editor Configuration
 * Phase 3.1: Core setup, configure, all extensions
 */

import { Extension, Node } from '@tiptap/core';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Color from '@tiptap/extension-color';
import Dropcursor from '@tiptap/extension-dropcursor';
import Focus from '@tiptap/extension-focus';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import StarterKit from '@tiptap/starter-kit';
import { all, createLowlight } from 'lowlight';

// Create lowlight with all languages pre-registered
const lowlight = createLowlight(all);

// ============================================================================
// CUSTOM EXTENSIONS
// ============================================================================

/**
 * Custom Callout Block Extension
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addOptions() {
    return {
      types: ['info', 'warning', 'error', 'success', 'tip'],
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-callout-type'),
        renderHTML: (attributes: { type: string }) => ({
          'data-callout-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['div', { 'data-callout': '', ...HTMLAttributes }, 0];
  },
});

/**
 * Custom Spoiler Block Extension
 */
export const Spoiler = Node.create({
  name: 'spoiler',
  group: 'block',
  content: 'block+',

  parseHTML() {
    return [{ tag: 'details.spoiler' }];
  },

  renderHTML() {
    return ['details', { class: 'spoiler' }, ['summary', 'Spoiler'], ['div', 0]];
  },
});

/**
 * Custom Math Block Extension (LaTeX support)
 */
export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: 'text*',
  atom: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['div', { 'data-math-block': '', ...HTMLAttributes }, 0];
  },
});

/**
 * Custom Figure Extension for images with captions
 */
export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'inline*',
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      caption: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'figure' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      {},
      ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.alt }],
      ['figcaption', {}, HTMLAttributes.caption || ''],
    ];
  },
});

/**
 * Custom Embed Extension
 */
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: { default: null },
      type: { default: 'generic' },
      html: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-embed]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['div', { 'data-embed': '', 'data-embed-type': HTMLAttributes.type }, 0];
  },
});

/**
 * Custom Footnote Extension
 */
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      content: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-footnote]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['sup', { 'data-footnote': '', 'data-footnote-id': HTMLAttributes.id }, 0];
  },
});

// ============================================================================
// EDITOR CONFIGURATION
// ============================================================================

export interface EditorConfig {
  placeholder?: string;
  characterLimit?: number;
  autofocus?: boolean | 'start' | 'end';
  editable?: boolean;
  inlineTooltips?: boolean;
  enableCodeBlocks?: boolean;
  enableTables?: boolean;
  enableImages?: boolean;
  enableEmbeds?: boolean;
  enableMath?: boolean;
  enableTasks?: boolean;
}

export function createEditorExtensions(config: EditorConfig = {}) {
  const {
    placeholder = 'Start writing...',
    characterLimit,
    enableCodeBlocks = true,
    enableTables = true,
    enableImages = true,
    enableTasks = true,
  } = config;

  const extensions = [
    // Core starter kit
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      codeBlock: false, // Use lowlight version instead
      dropcursor: false, // Use custom dropcursor
    }),

    // Typography enhancements
    Typography,
    TextStyle,
    Color,
    FontFamily,
    Underline,
    Subscript,
    Superscript,
    Highlight.configure({
      multicolor: true,
    }),

    // Text alignment
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),

    // Links
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),

    // Placeholder
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
    }),

    // Character count
    ...(characterLimit
      ? [
          CharacterCount.configure({
            limit: characterLimit,
          }),
        ]
      : [CharacterCount]),

    // Focus ring
    Focus.configure({
      className: 'has-focus',
      mode: 'all',
    }),

    // Drag cursor
    Dropcursor.configure({
      color: '#3b82f6',
      width: 2,
    }),

    // Custom extensions
    Callout,
    Spoiler,
    Footnote,
  ];

  // Code blocks with syntax highlighting
  if (enableCodeBlocks) {
    extensions.push(
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      })
    );
  }

  // Tables
  if (enableTables) {
    extensions.push(
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader
    );
  }

  // Images
  if (enableImages) {
    extensions.push(
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Figure,
      Youtube.configure({
        controls: true,
        nocookie: true,
      })
    );
  }

  // Task lists
  if (enableTasks) {
    extensions.push(
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
      })
    );
  }

  return extensions;
}

// ============================================================================
// EDITOR STYLES
// ============================================================================

export const editorStyles = `
  .ProseMirror {
    min-height: 400px;
    padding: 1rem;
    outline: none;
  }

  .ProseMirror:focus {
    outline: none;
  }

  /* Placeholder */
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }

  .ProseMirror .is-empty::before {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }

  /* Headings */
  .ProseMirror h1 {
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  .ProseMirror h2 {
    font-size: 1.75rem;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.75rem;
    margin-bottom: 0.75rem;
  }

  .ProseMirror h3 {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .ProseMirror h4 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
  }

  /* Paragraphs */
  .ProseMirror p {
    margin-bottom: 1rem;
    line-height: 1.7;
  }

  /* Lists */
  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
  }

  .ProseMirror li {
    margin-bottom: 0.25rem;
  }

  .ProseMirror li p {
    margin-bottom: 0.25rem;
  }

  /* Task lists */
  .ProseMirror .task-list {
    list-style: none;
    padding-left: 0;
  }

  .ProseMirror .task-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .ProseMirror .task-list li > label {
    margin-top: 0.25rem;
  }

  .ProseMirror .task-list li[data-checked="true"] > div {
    text-decoration: line-through;
    opacity: 0.7;
  }

  /* Blockquotes */
  .ProseMirror blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 1rem;
    font-style: italic;
    color: #6b7280;
  }

  /* Code */
  .ProseMirror code {
    background: #f3f4f6;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875em;
  }

  .ProseMirror pre {
    background: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  .ProseMirror pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  /* Syntax highlighting */
  .ProseMirror pre .hljs-keyword { color: #c792ea; }
  .ProseMirror pre .hljs-string { color: #c3e88d; }
  .ProseMirror pre .hljs-number { color: #f78c6c; }
  .ProseMirror pre .hljs-comment { color: #676e95; }
  .ProseMirror pre .hljs-function { color: #82aaff; }
  .ProseMirror pre .hljs-class { color: #ffcb6b; }
  .ProseMirror pre .hljs-variable { color: #f07178; }
  .ProseMirror pre .hljs-built_in { color: #89ddff; }

  /* Links */
  .ProseMirror a {
    color: #3b82f6;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .ProseMirror a:hover {
    color: #2563eb;
  }

  /* Images */
  .ProseMirror .editor-image {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1rem 0;
  }

  .ProseMirror figure {
    margin: 1.5rem 0;
  }

  .ProseMirror figcaption {
    text-align: center;
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }

  /* Tables */
  .ProseMirror .editor-table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }

  .ProseMirror .editor-table td,
  .ProseMirror .editor-table th {
    border: 1px solid #e5e7eb;
    padding: 0.5rem 1rem;
    text-align: left;
  }

  .ProseMirror .editor-table th {
    background: #f9fafb;
    font-weight: 600;
  }

  .ProseMirror .editor-table .selectedCell {
    background: #dbeafe;
  }

  /* Horizontal rule */
  .ProseMirror hr {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 2rem 0;
  }

  /* Callouts */
  .ProseMirror [data-callout] {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border-left: 4px solid;
  }

  .ProseMirror [data-callout-type="info"] {
    background: #dbeafe;
    border-color: #3b82f6;
  }

  .ProseMirror [data-callout-type="warning"] {
    background: #fef3c7;
    border-color: #f59e0b;
  }

  .ProseMirror [data-callout-type="error"] {
    background: #fee2e2;
    border-color: #ef4444;
  }

  .ProseMirror [data-callout-type="success"] {
    background: #d1fae5;
    border-color: #10b981;
  }

  .ProseMirror [data-callout-type="tip"] {
    background: #f3e8ff;
    border-color: #8b5cf6;
  }

  /* Spoiler */
  .ProseMirror details.spoiler {
    background: #f3f4f6;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    margin-bottom: 1rem;
  }

  .ProseMirror details.spoiler summary {
    cursor: pointer;
    font-weight: 500;
  }

  /* Highlight */
  .ProseMirror mark {
    background: #fef08a;
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
  }

  /* Focus */
  .ProseMirror .has-focus {
    border-radius: 4px;
    box-shadow: 0 0 0 2px #3b82f6;
  }

  /* Selection */
  .ProseMirror ::selection {
    background: #dbeafe;
  }

  /* Dropcursor */
  .ProseMirror .ProseMirror-dropcursor {
    border-color: #3b82f6;
  }

  /* YouTube embeds */
  .ProseMirror [data-youtube-video] {
    aspect-ratio: 16/9;
    width: 100%;
    margin: 1rem 0;
  }

  .ProseMirror [data-youtube-video] iframe {
    width: 100%;
    height: 100%;
    border-radius: 8px;
  }

  /* Text alignment */
  .ProseMirror .text-left { text-align: left; }
  .ProseMirror .text-center { text-align: center; }
  .ProseMirror .text-right { text-align: right; }
  .ProseMirror .text-justify { text-align: justify; }
`;

// ============================================================================
// EDITOR UTILITIES
// ============================================================================

export function getWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function getReadingTime(text: string, wordsPerMinute = 200): number {
  const words = getWordCount(text);
  return Math.ceil(words / wordsPerMinute);
}

export function getCharacterCount(text: string, excludeSpaces = false): number {
  if (excludeSpaces) {
    return text.replace(/\s/g, '').length;
  }
  return text.length;
}

export function extractHeadings(content: string): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent || '';
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    headings.push({ level, text, id });
  });

  return headings;
}

export function generateTableOfContents(
  headings: { level: number; text: string; id: string }[]
): string {
  return headings.map((h) => `${'  '.repeat(h.level - 1)}- [${h.text}](#${h.id})`).join('\n');
}
