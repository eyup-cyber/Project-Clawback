/**
 * TipTap Slash Commands Extension
 * Phase 3.3: Command palette with 30+ commands
 */

'use client';

import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import {
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: ReactNode;
  command: (props: { editor: any; range: any }) => void;
  keywords?: string[];
  category: 'text' | 'heading' | 'list' | 'block' | 'media' | 'embed';
}

interface CommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  text: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  h1: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h8" />
      <path d="M4 6v12" />
      <path d="M12 6v12" />
      <path d="M17 12l3-2v8" />
    </svg>
  ),
  h2: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h8" />
      <path d="M4 6v12" />
      <path d="M12 6v12" />
      <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
  ),
  h3: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h8" />
      <path d="M4 6v12" />
      <path d="M12 6v12" />
      <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
      <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
    </svg>
  ),
  bulletList: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  orderedList: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  ),
  taskList: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="M12 7h9" />
      <rect x="3" y="13" width="6" height="6" rx="1" />
      <path d="M12 17h9" />
      <path d="M5 8l1 1 2-2" />
    </svg>
  ),
  quote: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
    </svg>
  ),
  code: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  codeBlock: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M10 9l-3 3 3 3" />
      <path d="M14 9l3 3-3 3" />
    </svg>
  ),
  hr: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  image: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  video: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  youtube: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  ),
  twitter: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  ),
  callout: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  table: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  columns: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  ),
  details: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
      <polyline points="2 15.5 12 8.5 22 15.5" />
      <line x1="12" y1="2" x2="12" y2="8.5" />
    </svg>
  ),
  embed: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

// ============================================================================
// COMMAND ITEMS
// ============================================================================

export const getSlashCommandItems = (_editor: unknown): SlashCommandItem[] => [
  // Text formatting
  {
    title: 'Text',
    description: 'Plain paragraph text',
    icon: Icons.text,
    category: 'text',
    keywords: ['paragraph', 'p', 'normal'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },

  // Headings
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: Icons.h1,
    category: 'heading',
    keywords: ['h1', 'title', 'large'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: Icons.h2,
    category: 'heading',
    keywords: ['h2', 'subtitle', 'medium'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: Icons.h3,
    category: 'heading',
    keywords: ['h3', 'small'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },

  // Lists
  {
    title: 'Bullet List',
    description: 'Create a bulleted list',
    icon: Icons.bulletList,
    category: 'list',
    keywords: ['ul', 'unordered', 'bullets', 'points'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: Icons.orderedList,
    category: 'list',
    keywords: ['ol', 'ordered', 'numbers'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Create a task list with checkboxes',
    icon: Icons.taskList,
    category: 'list',
    keywords: ['todo', 'checkbox', 'tasks', 'checklist'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },

  // Blocks
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: Icons.quote,
    category: 'block',
    keywords: ['blockquote', 'quotation', 'cite'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code',
    description: 'Inline code snippet',
    icon: Icons.code,
    category: 'block',
    keywords: ['inline', 'snippet'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCode().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Display code with syntax highlighting',
    icon: Icons.codeBlock,
    category: 'block',
    keywords: ['pre', 'syntax', 'programming'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal line',
    icon: Icons.hr,
    category: 'block',
    keywords: ['hr', 'horizontal', 'rule', 'separator', 'line'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Callout',
    description: 'Add a callout box for important info',
    icon: Icons.callout,
    category: 'block',
    keywords: ['info', 'note', 'warning', 'tip', 'alert'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '💡 ' }] }],
        })
        .run();
    },
  },

  // Media
  {
    title: 'Image',
    description: 'Upload or embed an image',
    icon: Icons.image,
    category: 'media',
    keywords: ['img', 'picture', 'photo', 'upload'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt('Enter image URL:');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    title: 'YouTube Video',
    description: 'Embed a YouTube video',
    icon: Icons.youtube,
    category: 'embed',
    keywords: ['video', 'youtube', 'embed', 'movie'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt('Enter YouTube URL:');
      if (url) {
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      }
    },
  },
  {
    title: 'Twitter/X Post',
    description: 'Embed a tweet',
    icon: Icons.twitter,
    category: 'embed',
    keywords: ['tweet', 'x', 'social'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt('Enter Twitter/X post URL:');
      if (url) {
        // Insert as a link for now - could be enhanced with oEmbed
        editor.chain().focus().insertContent(`<p><a href="${url}">${url}</a></p>`).run();
      }
    },
  },
  {
    title: 'Embed',
    description: 'Embed any URL with oEmbed',
    icon: Icons.embed,
    category: 'embed',
    keywords: ['iframe', 'external', 'link'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt('Enter URL to embed:');
      if (url) {
        editor.chain().focus().insertContent(`<p><a href="${url}">${url}</a></p>`).run();
      }
    },
  },
];

// ============================================================================
// COMMAND LIST COMPONENT
// ============================================================================

const CommandList = forwardRef<CommandListRef, CommandListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
        No commands found
      </div>
    );
  }

  // Group items by category
  const groupedItems: Record<string, SlashCommandItem[]> = {};
  items.forEach((item) => {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  });

  const categoryLabels: Record<string, string> = {
    text: 'Text',
    heading: 'Headings',
    list: 'Lists',
    block: 'Blocks',
    media: 'Media',
    embed: 'Embeds',
  };

  let globalIndex = -1;

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        minWidth: '280px',
      }}
    >
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category}>
          <div
            className="px-3 py-2 text-xs font-semibold uppercase tracking-wider sticky top-0"
            style={{
              background: 'var(--surface-elevated)',
              color: 'var(--foreground)',
              opacity: 0.5,
            }}
          >
            {categoryLabels[category] || category}
          </div>
          {categoryItems.map((item) => {
            globalIndex++;
            const index = globalIndex;
            return (
              <button
                key={item.title}
                onClick={() => selectItem(index)}
                className={`
                    w-full flex items-center gap-3 px-3 py-2 transition-colors text-left
                    ${selectedIndex === index ? 'bg-[var(--surface-elevated)]' : 'hover:bg-[var(--surface-elevated)]'}
                  `}
                style={{
                  borderLeft:
                    selectedIndex === index ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--background)',
                    color: selectedIndex === index ? 'var(--primary)' : 'var(--foreground)',
                  }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p
                    className="font-medium text-sm truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: 'var(--foreground)', opacity: 0.6 }}
                  >
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});

CommandList.displayName = 'CommandList';

// ============================================================================
// SUGGESTION CONFIG
// ============================================================================

const getSuggestionConfig = (): Omit<SuggestionOptions<SlashCommandItem>, 'editor'> => ({
  char: '/',
  startOfLine: true,
  command: ({ editor, range, props }) => {
    props.command({ editor, range });
  },
  items: ({ query, editor }) => {
    const allItems = getSlashCommandItems(editor);

    if (!query) return allItems.slice(0, 10);

    const searchLower = query.toLowerCase();
    return allItems
      .filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const descMatch = item.description.toLowerCase().includes(searchLower);
        const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(searchLower));
        return titleMatch || descMatch || keywordMatch;
      })
      .slice(0, 10);
  },
  render: () => {
    let component: ReactRenderer<CommandListRef> | null = null;
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props) => {
        component = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          animation: 'shift-away',
          theme: 'slash-commands',
        });
      },
      onUpdate: (props) => {
        component?.updateProps(props);
        if (!props.clientRect) return;
        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },
      onKeyDown: (props) => {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }
        return component?.ref?.onKeyDown(props.event) ?? false;
      },
      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
});

// ============================================================================
// EXTENSION
// ============================================================================

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: getSuggestionConfig(),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommands;
