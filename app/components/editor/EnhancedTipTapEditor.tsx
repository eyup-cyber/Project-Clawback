/**
 * Enhanced TipTap Editor
 * Integrates: Slash Commands, Bubble Menu, Focus Mode, Autosave
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import SlashCommands from './extensions/SlashCommands';
import { EditorBubbleMenu } from './extensions/BubbleMenu';
import { FocusMode, FocusModeToggle } from './EditorFocusMode';
import { useEditorAutosave } from '@/lib/hooks/useEditorAutosave';

// ============================================================================
// TYPES
// ============================================================================

interface EnhancedTipTapEditorProps {
  postId: string;
  initialContent?: string;
  initialTitle?: string;
  placeholder?: string;
  maxLength?: number;
  onSave?: (content: string, title: string) => Promise<{ serverVersion?: number }>;
  onChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
  showTitle?: boolean;
  readOnly?: boolean;
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  bold: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  ),
  italic: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  underline: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  ),
  undo: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  redo: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  saving: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  saved: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ============================================================================
// TOOLBAR COMPONENTS
// ============================================================================

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded-lg transition-all duration-200 min-w-[36px] min-h-[36px]
        flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed
        ${
          isActive
            ? 'bg-[var(--accent)] text-[var(--background)]'
            : 'hover:bg-[var(--surface-elevated)] text-[var(--foreground)]'
        }
      `}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 mx-1 hidden sm:block" style={{ background: 'var(--border)' }} />;
}

// ============================================================================
// AUTOSAVE STATUS COMPONENT
// ============================================================================

function AutosaveStatus({
  status,
  lastSaved,
  error,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  lastSaved: Date | null;
  error: string | null;
}) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
      style={{
        background: status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)',
        color: status === 'error' ? '#ef4444' : 'var(--foreground)',
      }}
    >
      {status === 'saving' && (
        <>
          {Icons.saving}
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && lastSaved && (
        <>
          {Icons.saved}
          <span>Saved at {formatTime(lastSaved)}</span>
        </>
      )}
      {status === 'error' && (
        <>
          {Icons.error}
          <span>{error || 'Save failed'}</span>
        </>
      )}
      {status === 'idle' && !lastSaved && <span style={{ opacity: 0.6 }}>Draft</span>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EnhancedTipTapEditor({
  postId,
  initialContent = '',
  initialTitle = '',
  placeholder = 'Start writing your story... (Type / for commands)',
  maxLength = 50000,
  onSave,
  onChange,
  onTitleChange,
  showTitle = true,
  readOnly = false,
}: EnhancedTipTapEditorProps) {
  const [focusMode, setFocusMode] = useState(false);
  const [title, setTitle] = useState(initialTitle);

  // Autosave hook
  const autosave = useEditorAutosave({
    postId,
    debounceMs: 3000,
    enableLocalBackup: true,
    onSave: onSave,
  });

  // Initialize editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: maxLength }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--primary)] underline hover:text-[var(--secondary)]',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Underline,
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'w-full aspect-video rounded-lg my-4',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      SlashCommands,
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      autosave.updateContent(html);
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[300px] focus:outline-none p-6',
        style: 'color: var(--foreground); font-family: var(--font-body);',
      },
    },
  });

  // Set initial content on autosave
  useEffect(() => {
    if (editor && initialContent) {
      autosave.setInitialContent(initialContent, initialTitle);
    }
  }, [editor, initialContent, initialTitle, autosave]);

  // Handle title changes
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      autosave.updateTitle(newTitle);
      onTitleChange?.(newTitle);
    },
    [autosave, onTitleChange]
  );

  // Check for local backup on mount
  useEffect(() => {
    if (autosave.hasBackup()) {
      // Could show a dialog to recover from backup
      // eslint-disable-next-line no-console
      console.info('[Editor] Local backup available');
    }
  }, [autosave]);

  if (!editor) return null;

  const characterCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const editorContent = (
    <div
      className="border rounded-xl overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      {/* Title input */}
      {showTitle && (
        <div className="border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Enter title..."
            disabled={readOnly}
            className="w-full px-6 py-4 text-2xl font-bold bg-transparent border-none outline-none"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          />
        </div>
      )}

      {/* Toolbar */}
      {!readOnly && (
        <div
          className="flex items-center justify-between gap-2 p-3 border-b overflow-x-auto"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}
        >
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              {Icons.bold}
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              {Icons.italic}
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
            >
              {Icons.underline}
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              {Icons.undo}
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Shift+Z)"
            >
              {Icons.redo}
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-2">
            <AutosaveStatus
              status={autosave.status}
              lastSaved={autosave.lastSaved}
              error={autosave.error}
            />

            <FocusModeToggle
              enabled={focusMode}
              onToggle={() => setFocusMode(!focusMode)}
              wordCount={wordCount}
              characterCount={characterCount}
              readingTime={readingTime}
            />
          </div>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Bubble menu */}
      {!readOnly && <EditorBubbleMenu editor={editor} />}

      {/* Footer */}
      <div
        className="flex justify-between items-center px-6 py-4 text-xs border-t"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        <div className="flex items-center gap-4">
          <span style={{ opacity: 0.6 }}>{wordCount} words</span>
          <span style={{ opacity: 0.6 }}>~{readingTime} min read</span>
          <span style={{ opacity: 0.6 }}>
            Type <kbd className="px-1 rounded bg-[var(--surface-elevated)]">/</kbd> for commands
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-24 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--border)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (characterCount / maxLength) * 100)}%`,
                background: characterCount / maxLength > 0.9 ? 'var(--accent)' : 'var(--primary)',
              }}
            />
          </div>
          <span style={{ opacity: 0.6 }}>
            {characterCount.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Editor styles */}
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: var(--foreground);
          opacity: 0.4;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          font-style: italic;
        }

        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1.5rem 0 1rem;
          font-family: var(--font-kindergarten);
          color: var(--primary);
        }

        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1.25rem 0 0.75rem;
          font-family: var(--font-kindergarten);
          color: var(--secondary);
        }

        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem;
        }

        .ProseMirror p {
          margin: 0.75rem 0;
          line-height: 1.7;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .ProseMirror ul[data-type='taskList'] {
          list-style: none;
          padding-left: 0;
        }

        .ProseMirror ul[data-type='taskList'] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .ProseMirror ul[data-type='taskList'] li > label {
          margin-top: 0.25rem;
        }

        .ProseMirror ul[data-type='taskList'] li > div {
          flex: 1;
        }

        .ProseMirror blockquote {
          border-left: 4px solid var(--accent);
          margin: 1rem 0;
          padding: 0.5rem 1rem;
          background: var(--surface-elevated);
          border-radius: 0 0.5rem 0.5rem 0;
          font-style: italic;
        }

        .ProseMirror pre {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }

        .ProseMirror code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875em;
        }

        .ProseMirror hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2rem 0;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }

        .ProseMirror iframe {
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );

  // Wrap in focus mode if enabled
  return (
    <FocusMode enabled={focusMode} onToggle={setFocusMode} wordCount={wordCount} targetWords={1500}>
      {editorContent}
    </FocusMode>
  );
}
