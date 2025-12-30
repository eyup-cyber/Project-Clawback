/**
 * TipTap Bubble Menu Extension
 * Phase 3.4: Selection formatting and quick actions
 *
 * Note: TipTap v3 changed BubbleMenu to an extension only.
 * This component provides a custom React implementation.
 */

'use client';

import type { Editor } from '@tiptap/react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface BubbleMenuProps {
  editor: Editor;
}

interface MenuButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: ReactNode;
  title: string;
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
      aria-hidden="true"
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
      aria-hidden="true"
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
      aria-hidden="true"
    >
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  ),
  strike: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M17.5 7.5c-.5-1.5-2-2.5-4-2.5-2.5 0-4.5 1.5-4.5 4 0 1.5.5 2.5 2 3" />
      <path d="M9.5 14.5c.5 1.5 2 2.5 4 2.5 2.5 0 4.5-1.5 4.5-4 0-1-.25-1.75-.75-2.5" />
    </svg>
  ),
  code: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  link: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  unlink: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" />
      <path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" />
      <line x1="8" y1="2" x2="8" y2="5" />
      <line x1="2" y1="8" x2="5" y2="8" />
      <line x1="16" y1="19" x2="16" y2="22" />
      <line x1="19" y1="16" x2="22" y2="16" />
    </svg>
  ),
  copy: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
};

// ============================================================================
// MENU BUTTON COMPONENT
// ============================================================================

function MenuButton({ onClick, isActive = false, children, title }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`
        p-2 rounded-md transition-all duration-150
        ${
          isActive
            ? 'bg-[var(--primary)] text-[var(--background)]'
            : 'hover:bg-[var(--surface-elevated)] text-[var(--foreground)]'
        }
      `}
    >
      {children}
    </button>
  );
}

function MenuDivider() {
  return <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />;
}

// ============================================================================
// LINK INPUT COMPONENT
// ============================================================================

interface LinkInputProps {
  onSubmit: (url: string) => void;
  onCancel: () => void;
  initialUrl?: string;
}

function LinkInput({ onSubmit, onCancel, initialUrl = '' }: LinkInputProps) {
  const [url, setUrl] = useState(initialUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      onSubmit(url.startsWith('http') ? url : `https://${url}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL..."
        autoFocus
        className="w-48 px-2 py-1 text-sm rounded border"
        style={{
          background: 'var(--background)',
          borderColor: 'var(--border)',
          color: 'var(--foreground)',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onCancel();
          }
        }}
      />
      <button
        type="submit"
        className="px-2 py-1 text-xs rounded"
        style={{
          background: 'var(--primary)',
          color: 'var(--background)',
        }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1 text-xs rounded"
        style={{
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      >
        Cancel
      </button>
    </form>
  );
}

// ============================================================================
// BUBBLE MENU COMPONENT
// ============================================================================

export function EditorBubbleMenu({ editor }: BubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const addLink = useCallback(
    (url: string) => {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      setShowLinkInput(false);
    },
    [editor]
  );

  const removeLink = useCallback(() => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  }, [editor]);

  const copyText = useCallback(async () => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    await navigator.clipboard.writeText(text);
  }, [editor]);

  // Update position based on selection
  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { state } = editor;
      const { selection } = state;
      const { from, to } = selection;
      const isEmpty = from === to;

      // Check if selection is in a node that shouldn't have bubble menu
      const node = state.selection.$head.parent;
      const isCodeBlock = node.type.name === 'codeBlock';

      if (isEmpty || isCodeBlock) {
        setIsVisible(false);
        return;
      }

      // Get selection coordinates
      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Calculate position (centered above selection)
      const left = (start.left + end.left) / 2;
      const top = start.top - 10;

      setPosition({ top, left });
      setIsVisible(true);
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('transaction', updatePosition);

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('transaction', updatePosition);
    };
  }, [editor]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg shadow-xl"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 50,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {showLinkInput ? (
        <LinkInput
          onSubmit={addLink}
          onCancel={() => setShowLinkInput(false)}
          initialUrl={editor.getAttributes('link').href}
        />
      ) : (
        <>
          {/* Text formatting */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            {Icons.bold}
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            {Icons.italic}
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            {Icons.underline}
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            {Icons.strike}
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            {Icons.code}
          </MenuButton>

          <MenuDivider />

          {/* Link */}
          {editor.isActive('link') ? (
            <>
              <MenuButton onClick={() => setShowLinkInput(true)} isActive={true} title="Edit Link">
                {Icons.link}
              </MenuButton>
              <MenuButton onClick={removeLink} title="Remove Link">
                {Icons.unlink}
              </MenuButton>
            </>
          ) : (
            <MenuButton onClick={() => setShowLinkInput(true)} title="Add Link">
              {Icons.link}
            </MenuButton>
          )}

          <MenuDivider />

          {/* Actions */}
          <MenuButton onClick={() => void copyText()} title="Copy">
            {Icons.copy}
          </MenuButton>
        </>
      )}
    </div>
  );
}

export default EditorBubbleMenu;
