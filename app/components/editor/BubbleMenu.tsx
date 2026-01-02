'use client';

/**
 * Bubble Menu Component
 * Phase 3.4: Selection formatting, link editing, quick actions
 *
 * Note: TipTap v3 changed BubbleMenu to be an extension only.
 * This component provides a custom implementation.
 */

import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface BubbleMenuProps {
  editor: Editor;
}

interface LinkEditFormProps {
  editor: Editor;
  onClose: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EditorBubbleMenu({ editor }: BubbleMenuProps) {
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLinkClick = useCallback(() => {
    setShowLinkEditor(true);
  }, []);

  const handleRemoveLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    setShowLinkEditor(false);
  }, [editor]);

  // Update position based on selection
  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { state } = editor;
      const { selection } = state;
      const { empty } = selection;

      // Hide for empty selections or code blocks
      if (empty || editor.isActive('codeBlock')) {
        setIsVisible(false);
        return;
      }

      // Get selection coordinates
      const { view } = editor;
      const { from, to } = selection;
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

  if (!editor || !isVisible) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="bubble-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 50,
      }}
    >
      {showLinkEditor ? (
        <LinkEditForm editor={editor} onClose={() => setShowLinkEditor(false)} />
      ) : (
        <>
          {/* Text Formatting */}
          <div className="menu-group">
            <BubbleButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <strong>B</strong>
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <em>I</em>
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline"
            >
              <span style={{ textDecoration: 'underline' }}>U</span>
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <s>S</s>
            </BubbleButton>
          </div>

          <div className="menu-divider" />

          {/* Code */}
          <div className="menu-group">
            <BubbleButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline Code"
            >
              {'<>'}
            </BubbleButton>
          </div>

          <div className="menu-divider" />

          {/* Link */}
          <div className="menu-group">
            <BubbleButton
              onClick={handleLinkClick}
              isActive={editor.isActive('link')}
              title={editor.isActive('link') ? 'Edit Link' : 'Add Link'}
            >
              🔗
            </BubbleButton>
            {editor.isActive('link') && (
              <BubbleButton onClick={handleRemoveLink} title="Remove Link">
                🗑️
              </BubbleButton>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .bubble-menu {
          display: flex;
          align-items: center;
          background: #1f2937;
          border-radius: 8px;
          padding: 0.25rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .menu-group {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .menu-divider {
          width: 1px;
          height: 20px;
          background: #4b5563;
          margin: 0 0.25rem;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function BubbleButton({
  onClick,
  isActive = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bubble-btn ${isActive ? 'active' : ''}`}
      title={title}
    >
      {children}

      <style jsx>{`
        .bubble-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: #e5e7eb;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.1s;
        }

        .bubble-btn:hover {
          background: #374151;
        }

        .bubble-btn.active {
          background: #3b82f6;
          color: white;
        }
      `}</style>
    </button>
  );
}

function LinkEditForm({ editor, onClose }: LinkEditFormProps) {
  const currentUrl = editor.getAttributes('link').href || '';
  const [url, setUrl] = useState(currentUrl);
  const [openInNewTab, setOpenInNewTab] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .setLink({
          href: url,
          target: openInNewTab ? '_blank' : null,
        })
        .run();
    }

    onClose();
  };

  const handleRemove = () => {
    editor.chain().focus().unsetLink().run();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="link-form">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="link-input"
        autoFocus
      />
      <label className="new-tab-toggle">
        <input
          type="checkbox"
          checked={openInNewTab}
          onChange={(e) => setOpenInNewTab(e.target.checked)}
        />
        <span>New tab</span>
      </label>
      <div className="link-actions">
        <button type="submit" className="save-btn" aria-label="Save link">
          ✓
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="remove-btn"
            aria-label="Remove link"
          >
            🗑️
          </button>
        )}
        <button type="button" onClick={onClose} className="cancel-btn" aria-label="Cancel">
          ✕
        </button>
      </div>

      <style jsx>{`
        .link-form {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem;
        }

        .link-input {
          padding: 0.375rem 0.5rem;
          border: none;
          border-radius: 4px;
          background: #374151;
          color: white;
          font-size: 0.875rem;
          width: 200px;
        }

        .link-input::placeholder {
          color: #9ca3af;
        }

        .link-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px #3b82f6;
        }

        .new-tab-toggle {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #e5e7eb;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .link-actions {
          display: flex;
          gap: 0.25rem;
        }

        .save-btn,
        .remove-btn,
        .cancel-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .save-btn {
          background: #10b981;
          color: white;
        }

        .remove-btn {
          background: #ef4444;
          color: white;
        }

        .cancel-btn {
          background: #4b5563;
          color: white;
        }
      `}</style>
    </form>
  );
}

// ============================================================================
// FLOATING MENU (For empty lines)
// ============================================================================

export function EditorFloatingMenu({ editor }: { editor: Editor }) {
  return (
    <div className="floating-menu">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        •
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        1.
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        ❝
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code Block"
      >
        {'<>'}
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      >
        —
      </button>

      <style jsx>{`
        .floating-menu {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.25rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        button {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #4b5563;
          transition: all 0.1s;
        }

        button:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
      `}</style>
    </div>
  );
}
