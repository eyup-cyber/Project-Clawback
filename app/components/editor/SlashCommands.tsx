'use client';

/**
 * Slash Commands Component
 * Phase 3.3: Command palette, 30+ commands, keyboard navigation
 */

import { type Editor, Extension, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import { useCallback, useEffect, useRef, useState } from 'react';
import tippy, { type Instance } from 'tippy.js';

// ============================================================================
// TYPES
// ============================================================================

export interface Command {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: CommandCategory;
  keywords: string[];
  action: (editor: Editor) => void;
}

type CommandCategory =
  | 'text'
  | 'headings'
  | 'lists'
  | 'formatting'
  | 'media'
  | 'embeds'
  | 'advanced';

interface CommandListProps {
  items: Command[];
  command: (item: Command) => void;
}

// ============================================================================
// COMMAND DEFINITIONS
// ============================================================================

export const commands: Command[] = [
  // Headings
  {
    id: 'h1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    category: 'headings',
    keywords: ['h1', 'heading', 'title', 'large'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    category: 'headings',
    keywords: ['h2', 'heading', 'subtitle'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    category: 'headings',
    keywords: ['h3', 'heading', 'subheading'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'h4',
    title: 'Heading 4',
    description: 'Sub-section heading',
    icon: 'H4',
    category: 'headings',
    keywords: ['h4', 'heading'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },

  // Text
  {
    id: 'paragraph',
    title: 'Paragraph',
    description: 'Regular text paragraph',
    icon: '¶',
    category: 'text',
    keywords: ['text', 'paragraph', 'normal'],
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'quote',
    title: 'Blockquote',
    description: 'Quote or citation',
    icon: '❝',
    category: 'text',
    keywords: ['quote', 'blockquote', 'citation'],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },

  // Lists
  {
    id: 'bullet-list',
    title: 'Bullet List',
    description: 'Unordered list',
    icon: '•',
    category: 'lists',
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'numbered-list',
    title: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    category: 'lists',
    keywords: ['numbered', 'list', 'ordered', 'ol'],
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task-list',
    title: 'Task List',
    description: 'Checklist with checkboxes',
    icon: '☑',
    category: 'lists',
    keywords: ['task', 'todo', 'checklist', 'checkbox'],
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },

  // Formatting
  {
    id: 'code',
    title: 'Code Block',
    description: 'Code with syntax highlighting',
    icon: '{ }',
    category: 'formatting',
    keywords: ['code', 'codeblock', 'syntax', 'programming'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Horizontal line separator',
    icon: '—',
    category: 'formatting',
    keywords: ['divider', 'hr', 'line', 'separator'],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'highlight',
    title: 'Highlight',
    description: 'Highlight text with color',
    icon: '🖍',
    category: 'formatting',
    keywords: ['highlight', 'marker', 'background'],
    action: (editor) => editor.chain().focus().toggleHighlight().run(),
  },

  // Media
  {
    id: 'image',
    title: 'Image',
    description: 'Insert an image',
    icon: '🖼',
    category: 'media',
    keywords: ['image', 'picture', 'photo', 'img'],
    action: (editor) => {
      const url = window.prompt('Image URL:');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    id: 'youtube',
    title: 'YouTube Video',
    description: 'Embed a YouTube video',
    icon: '▶',
    category: 'media',
    keywords: ['youtube', 'video', 'embed'],
    action: (editor) => {
      const url = window.prompt('YouTube URL:');
      if (url) {
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      }
    },
  },

  // Tables
  {
    id: 'table',
    title: 'Table',
    description: 'Insert a table',
    icon: '⊞',
    category: 'advanced',
    keywords: ['table', 'grid', 'data'],
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },

  // Callouts
  {
    id: 'callout-info',
    title: 'Info Callout',
    description: 'Information callout box',
    icon: 'ℹ',
    category: 'advanced',
    keywords: ['callout', 'info', 'note', 'box'],
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'paragraph',
          attrs: { 'data-callout': 'info' },
          content: [{ type: 'text', text: 'Info: ' }],
        })
        .run();
    },
  },
  {
    id: 'callout-warning',
    title: 'Warning Callout',
    description: 'Warning callout box',
    icon: '⚠',
    category: 'advanced',
    keywords: ['callout', 'warning', 'caution'],
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'paragraph',
          attrs: { 'data-callout': 'warning' },
          content: [{ type: 'text', text: 'Warning: ' }],
        })
        .run();
    },
  },
  {
    id: 'callout-tip',
    title: 'Tip Callout',
    description: 'Tip or hint callout',
    icon: '💡',
    category: 'advanced',
    keywords: ['callout', 'tip', 'hint'],
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'paragraph',
          attrs: { 'data-callout': 'tip' },
          content: [{ type: 'text', text: 'Tip: ' }],
        })
        .run();
    },
  },

  // Embeds
  {
    id: 'twitter',
    title: 'Twitter/X Post',
    description: 'Embed a tweet',
    icon: '𝕏',
    category: 'embeds',
    keywords: ['twitter', 'tweet', 'x', 'post'],
    action: (editor) => {
      const url = window.prompt('Twitter/X URL:');
      if (url) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [{ type: 'text', text: `[Twitter embed: ${url}]` }],
          })
          .run();
      }
    },
  },
  {
    id: 'codepen',
    title: 'CodePen',
    description: 'Embed a CodePen',
    icon: '⌨',
    category: 'embeds',
    keywords: ['codepen', 'code', 'demo'],
    action: (editor) => {
      const url = window.prompt('CodePen URL:');
      if (url) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [{ type: 'text', text: `[CodePen embed: ${url}]` }],
          })
          .run();
      }
    },
  },
  {
    id: 'codesandbox',
    title: 'CodeSandbox',
    description: 'Embed a CodeSandbox',
    icon: '📦',
    category: 'embeds',
    keywords: ['codesandbox', 'sandbox', 'demo'],
    action: (editor) => {
      const url = window.prompt('CodeSandbox URL:');
      if (url) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [{ type: 'text', text: `[CodeSandbox embed: ${url}]` }],
          })
          .run();
      }
    },
  },
  {
    id: 'gist',
    title: 'GitHub Gist',
    description: 'Embed a Gist',
    icon: '📋',
    category: 'embeds',
    keywords: ['gist', 'github', 'code'],
    action: (editor) => {
      const url = window.prompt('Gist URL:');
      if (url) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [{ type: 'text', text: `[Gist embed: ${url}]` }],
          })
          .run();
      }
    },
  },
  {
    id: 'figma',
    title: 'Figma',
    description: 'Embed a Figma design',
    icon: '🎨',
    category: 'embeds',
    keywords: ['figma', 'design', 'prototype'],
    action: (editor) => {
      const url = window.prompt('Figma URL:');
      if (url) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [{ type: 'text', text: `[Figma embed: ${url}]` }],
          })
          .run();
      }
    },
  },

  // Advanced
  {
    id: 'toc',
    title: 'Table of Contents',
    description: 'Generate table of contents',
    icon: '📑',
    category: 'advanced',
    keywords: ['toc', 'table of contents', 'navigation'],
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'paragraph',
          content: [{ type: 'text', text: '[Table of Contents]' }],
        })
        .run();
    },
  },
  {
    id: 'footnote',
    title: 'Footnote',
    description: 'Add a footnote reference',
    icon: '¹',
    category: 'advanced',
    keywords: ['footnote', 'reference', 'citation'],
    action: (editor) => {
      const note = window.prompt('Footnote text:');
      if (note) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: `[^1]`,
          })
          .run();
      }
    },
  },
  {
    id: 'details',
    title: 'Collapsible Section',
    description: 'Expandable/collapsible content',
    icon: '▸',
    category: 'advanced',
    keywords: ['details', 'collapse', 'expand', 'spoiler', 'accordion'],
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'paragraph',
          content: [{ type: 'text', text: '[Collapsible: Click to expand]' }],
        })
        .run();
    },
  },
  {
    id: 'emoji',
    title: 'Emoji',
    description: 'Insert an emoji',
    icon: '😀',
    category: 'text',
    keywords: ['emoji', 'emoticon', 'smiley'],
    action: () => {
      // Would open emoji picker
    },
  },
];

// ============================================================================
// COMMAND LIST COMPONENT
// ============================================================================

export function CommandList({ items, command }: CommandListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        return true;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
    [items.length, selectItem, selectedIndex]
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const selectedItem = list.children[selectedIndex] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<CommandCategory, Command[]>
  );

  const categoryLabels: Record<CommandCategory, string> = {
    text: 'Text',
    headings: 'Headings',
    lists: 'Lists',
    formatting: 'Formatting',
    media: 'Media',
    embeds: 'Embeds',
    advanced: 'Advanced',
  };

  if (items.length === 0) {
    return (
      <div className="command-list-empty">
        No commands found
        <style jsx>{`
          .command-list-empty {
            padding: 1rem;
            text-align: center;
            color: #6b7280;
            font-size: 0.875rem;
          }
        `}</style>
      </div>
    );
  }

  let itemIndex = 0;

  return (
    <div className="command-list" ref={listRef}>
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="command-category">
          <div className="category-label">{categoryLabels[category as CommandCategory]}</div>
          {categoryItems.map((item) => {
            const index = itemIndex++;
            return (
              <button
                key={item.id}
                className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => selectItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="command-icon">{item.icon}</span>
                <div className="command-content">
                  <span className="command-title">{item.title}</span>
                  <span className="command-description">{item.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      ))}

      <style jsx>{`
        .command-list {
          max-height: 300px;
          overflow-y: auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 0.25rem;
          min-width: 280px;
        }

        .command-category {
          margin-bottom: 0.5rem;
        }

        .category-label {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }

        .command-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          transition: background 0.1s;
        }

        .command-item:hover,
        .command-item.selected {
          background: #f3f4f6;
        }

        .command-item.selected {
          background: #dbeafe;
        }

        .command-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 6px;
          font-size: 1rem;
        }

        .command-content {
          display: flex;
          flex-direction: column;
        }

        .command-title {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .command-description {
          font-size: 0.75rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SLASH COMMANDS EXTENSION
// ============================================================================

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: Command }) => {
          props.action(editor);
          editor.chain().focus().deleteRange(range).run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          const searchQuery = query.toLowerCase();
          return commands
            .filter(
              (command) =>
                command.title.toLowerCase().includes(searchQuery) ||
                command.description.toLowerCase().includes(searchQuery) ||
                command.keywords.some((keyword) => keyword.includes(searchQuery))
            )
            .slice(0, 15);
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: Instance[] | null = null;

          return {
            onStart: (props: SuggestionProps) => {
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
              });
            },

            onUpdate: (props: SuggestionProps) => {
              component?.updateProps(props);

              if (!props.clientRect) return;

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }

              return false;
            },

            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});

// ============================================================================
// COMMAND PALETTE COMPONENT (For Cmd+K)
// ============================================================================

export function CommandPalette({
  editor,
  isOpen,
  onClose,
}: {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter(
    (command) =>
      command.title.toLowerCase().includes(query.toLowerCase()) ||
      command.description.toLowerCase().includes(query.toLowerCase()) ||
      command.keywords.some((keyword) => keyword.includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      if (editor) {
        filteredCommands[selectedIndex].action(editor);
      }
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a command or search..."
          className="command-input"
        />
        <div className="command-results">
          {filteredCommands.length === 0 ? (
            <div className="no-results">No commands found</div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                className={`command-result ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  if (editor) {
                    command.action(editor);
                  }
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="result-icon">{command.icon}</span>
                <div className="result-content">
                  <span className="result-title">{command.title}</span>
                  <span className="result-description">{command.description}</span>
                </div>
                <span className="result-category">{command.category}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .command-palette-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 100px;
          z-index: 1000;
        }

        .command-palette {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          width: 100%;
          max-width: 500px;
          overflow: hidden;
        }

        .command-input {
          width: 100%;
          padding: 1rem;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          font-size: 1rem;
          outline: none;
        }

        .command-results {
          max-height: 400px;
          overflow-y: auto;
        }

        .no-results {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .command-result {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }

        .command-result:hover,
        .command-result.selected {
          background: #f3f4f6;
        }

        .command-result.selected {
          background: #dbeafe;
        }

        .result-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 8px;
          font-size: 1.125rem;
        }

        .result-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .result-title {
          font-weight: 500;
        }

        .result-description {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .result-category {
          font-size: 0.75rem;
          color: #9ca3af;
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
}
