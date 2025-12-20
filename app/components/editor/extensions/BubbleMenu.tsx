/**
 * TipTap Bubble Menu Extension
 * Phase 3.4: Selection formatting and quick actions
 */

'use client';

import { BubbleMenu as TipTapBubbleMenu, type Editor } from '@tiptap/react';
import { useCallback, useState, type ReactNode } from 'react';

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
    >
      <path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" />
      <path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" />
      <line x1="8" y1="2" x2="8" y2="5" />
      <line x1="2" y1="8" x2="5" y2="8" />
      <line x1="16" y1="19" x2="16" y2="22" />
      <line x1="19" y1="16" x2="22" y2="16" />
    </svg>
  ),
  highlight: (
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
      <path d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
  ),
  textColor: (
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
      <path d="m4 20 8-16 8 16" />
      <path d="M6.5 16h11" />
      <line x1="2" y1="22" x2="22" y2="22" stroke="var(--primary)" strokeWidth="3" />
    </svg>
  ),
  alignLeft: (
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
      <line x1="17" y1="10" x2="3" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="17" y1="18" x2="3" y2="18" />
    </svg>
  ),
  alignCenter: (
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
      <line x1="18" y1="10" x2="6" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="18" y1="18" x2="6" y2="18" />
    </svg>
  ),
  alignRight: (
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
      <line x1="21" y1="10" x2="7" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="21" y1="18" x2="7" y2="18" />
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
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  comment: (
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

  // Don't show bubble menu if nothing is selected or if it's an image
  const shouldShow = useCallback(() => {
    const { state } = editor;
    const { from, to } = state.selection;
    const isEmpty = from === to;

    // Check if selection is in a node that shouldn't have bubble menu
    const node = state.selection.$head.parent;
    const isCodeBlock = node.type.name === 'codeBlock';

    return !isEmpty && !isCodeBlock;
  }, [editor]);

  return (
    <TipTapBubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 150,
        animation: 'shift-away',
        moveTransition: 'transform 0.15s ease-out',
      }}
      shouldShow={shouldShow}
      className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg shadow-xl"
      style={{
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
    </TipTapBubbleMenu>
  );
}

export default EditorBubbleMenu;
