'use client';

/**
 * Editor Toolbar Component
 * Phase 3.2: All formatting buttons, dropdowns, responsive layout
 */

import type { Editor } from '@tiptap/react';
import { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ToolbarProps {
  editor: Editor | null;
  onImageUpload?: () => void;
  onEmbedInsert?: () => void;
  onTableInsert?: () => void;
  compact?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  icon: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EditorToolbar({
  editor,
  onImageUpload,
  onEmbedInsert,
  onTableInsert,
  compact = false,
}: ToolbarProps) {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!editor) {
    return null;
  }

  const textColors = [
    '#000000',
    '#374151',
    '#6b7280',
    '#9ca3af',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#84cc16',
    '#22c55e',
    '#10b981',
    '#14b8a6',
    '#06b6d4',
    '#0ea5e9',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#d946ef',
    '#ec4899',
  ];

  const highlightColors = [
    '#fef08a',
    '#bbf7d0',
    '#a7f3d0',
    '#99f6e4',
    '#a5f3fc',
    '#bae6fd',
    '#bfdbfe',
    '#c7d2fe',
    '#ddd6fe',
    '#e9d5ff',
    '#f5d0fe',
    '#fbcfe8',
    '#fecdd3',
    '#fed7aa',
    '#fde68a',
    '#d9f99d',
  ];

  const fontFamilies = [
    { label: 'Default', value: '' },
    { label: 'Sans Serif', value: 'Inter, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Mono', value: 'monospace' },
    { label: 'Comic', value: 'Comic Sans MS, cursive' },
  ];

  return (
    <div className={`editor-toolbar ${compact ? 'compact' : ''}`}>
      {/* Text Style Group */}
      <div className="toolbar-group">
        {/* Heading Dropdown */}
        <div className="dropdown">
          <ToolbarButton
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            title="Heading"
            icon="H"
            isActive={editor.isActive('heading')}
          />
          {showHeadingMenu && (
            <div className="dropdown-menu" onMouseLeave={() => setShowHeadingMenu(false)}>
              <button
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setShowHeadingMenu(false);
                }}
              >
                Paragraph
              </button>
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
                      .run();
                    setShowHeadingMenu(false);
                  }}
                  className={editor.isActive('heading', { level }) ? 'active' : ''}
                  style={{ fontSize: `${1.5 - level * 0.1}rem` }}
                >
                  Heading {level}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font Family */}
        {!compact && (
          <select
            className="font-select"
            onChange={(e) => {
              if (e.target.value) {
                editor.chain().focus().setFontFamily(e.target.value).run();
              } else {
                editor.chain().focus().unsetFontFamily().run();
              }
            }}
            title="Font Family"
          >
            {fontFamilies.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Basic Formatting */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
          icon="B"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
          icon="I"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
          icon="U"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
          icon="S̶"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
          icon="<>"
        />
      </div>

      <div className="toolbar-divider" />

      {/* Text Color & Highlight */}
      <div className="toolbar-group">
        <div className="dropdown">
          <ToolbarButton
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Text Color"
            icon="A"
          />
          {showColorPicker && (
            <div
              className="dropdown-menu color-picker"
              onMouseLeave={() => setShowColorPicker(false)}
            >
              <div className="color-grid">
                {textColors.map((color) => (
                  <button
                    key={color}
                    className="color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    title={color}
                  />
                ))}
              </div>
              <button
                className="reset-color"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
              >
                Reset Color
              </button>
            </div>
          )}
        </div>

        <div className="dropdown">
          <ToolbarButton
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            isActive={editor.isActive('highlight')}
            title="Highlight"
            icon="🖍️"
          />
          {showHighlightPicker && (
            <div
              className="dropdown-menu color-picker"
              onMouseLeave={() => setShowHighlightPicker(false)}
            >
              <div className="color-grid">
                {highlightColors.map((color) => (
                  <button
                    key={color}
                    className="color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      editor.chain().focus().setHighlight({ color }).run();
                      setShowHighlightPicker(false);
                    }}
                    title={color}
                  />
                ))}
              </div>
              <button
                className="reset-color"
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightPicker(false);
                }}
              >
                Remove Highlight
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* Alignment */}
      <div className="toolbar-group">
        <div className="dropdown">
          <ToolbarButton
            onClick={() => setShowAlignMenu(!showAlignMenu)}
            title="Text Alignment"
            icon="≡"
          />
          {showAlignMenu && (
            <div className="dropdown-menu" onMouseLeave={() => setShowAlignMenu(false)}>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('left').run();
                  setShowAlignMenu(false);
                }}
                className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''}
              >
                ⬅️ Left
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('center').run();
                  setShowAlignMenu(false);
                }}
                className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''}
              >
                ↔️ Center
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('right').run();
                  setShowAlignMenu(false);
                }}
                className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''}
              >
                ➡️ Right
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('justify').run();
                  setShowAlignMenu(false);
                }}
                className={editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}
              >
                ⬛ Justify
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* Lists */}
      <div className="toolbar-group">
        <div className="dropdown">
          <ToolbarButton
            onClick={() => setShowListMenu(!showListMenu)}
            isActive={
              editor.isActive('bulletList') ||
              editor.isActive('orderedList') ||
              editor.isActive('taskList')
            }
            title="Lists"
            icon="☰"
          />
          {showListMenu && (
            <div className="dropdown-menu" onMouseLeave={() => setShowListMenu(false)}>
              <button
                onClick={() => {
                  editor.chain().focus().toggleBulletList().run();
                  setShowListMenu(false);
                }}
                className={editor.isActive('bulletList') ? 'active' : ''}
              >
                • Bullet List
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleOrderedList().run();
                  setShowListMenu(false);
                }}
                className={editor.isActive('orderedList') ? 'active' : ''}
              >
                1. Numbered List
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleTaskList().run();
                  setShowListMenu(false);
                }}
                className={editor.isActive('taskList') ? 'active' : ''}
              >
                ☑️ Task List
              </button>
            </div>
          )}
        </div>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
          icon="❝"
        />
      </div>

      <div className="toolbar-divider" />

      {/* Links & Media */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          isActive={editor.isActive('link')}
          title="Insert Link"
          icon="🔗"
        />

        {onImageUpload && <ToolbarButton onClick={onImageUpload} title="Insert Image" icon="🖼️" />}

        {onEmbedInsert && <ToolbarButton onClick={onEmbedInsert} title="Insert Embed" icon="▶️" />}
      </div>

      <div className="toolbar-divider" />

      {/* Code & Tables */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
          icon="{ }"
        />

        {onTableInsert && (
          <ToolbarButton
            onClick={onTableInsert}
            isActive={editor.isActive('table')}
            title="Insert Table"
            icon="⊞"
          />
        )}
      </div>

      <div className="toolbar-divider" />

      {/* More Options */}
      <div className="toolbar-group">
        <div className="dropdown">
          <ToolbarButton
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="More Options"
            icon="⋯"
          />
          {showMoreMenu && (
            <div className="dropdown-menu" onMouseLeave={() => setShowMoreMenu(false)}>
              <button
                onClick={() => {
                  editor.chain().focus().setHorizontalRule().run();
                  setShowMoreMenu(false);
                }}
              >
                ― Horizontal Rule
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleSubscript().run();
                  setShowMoreMenu(false);
                }}
              >
                X₂ Subscript
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleSuperscript().run();
                  setShowMoreMenu(false);
                }}
              >
                X² Superscript
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().clearNodes().unsetAllMarks().run();
                  setShowMoreMenu(false);
                }}
              >
                🧹 Clear Formatting
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-spacer" />

      {/* Undo/Redo */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
          icon="↶"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
          icon="↷"
        />
      </div>

      <style jsx>{`
        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .editor-toolbar.compact {
          padding: 0.25rem;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 0.125rem;
        }

        .toolbar-divider {
          width: 1px;
          height: 24px;
          background: #e5e7eb;
          margin: 0 0.25rem;
        }

        .toolbar-spacer {
          flex: 1;
        }

        .dropdown {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 150px;
          z-index: 20;
          padding: 0.25rem;
        }

        .dropdown-menu button {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          border-radius: 4px;
        }

        .dropdown-menu button:hover {
          background: #f3f4f6;
        }

        .dropdown-menu button.active {
          background: #dbeafe;
          color: #1e40af;
        }

        .color-picker {
          min-width: 180px;
          padding: 0.5rem;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
          margin-bottom: 0.5rem;
        }

        .color-swatch {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 0 0 1px #e5e7eb;
        }

        .color-swatch:hover {
          transform: scale(1.1);
        }

        .reset-color {
          width: 100%;
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .font-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          font-size: 0.875rem;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .editor-toolbar {
            justify-content: flex-start;
          }

          .toolbar-divider {
            display: none;
          }

          .toolbar-spacer {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// TOOLBAR BUTTON
// ============================================================================

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  icon,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
    >
      {icon}

      <style jsx>{`
        .toolbar-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.15s;
        }

        .toolbar-btn:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .toolbar-btn.active {
          background: #dbeafe;
          color: #1e40af;
        }

        .toolbar-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </button>
  );
}

// ============================================================================
// TABLE TOOLBAR
// ============================================================================

export function TableToolbar({ editor }: { editor: Editor | null }) {
  if (!editor || !editor.isActive('table')) {
    return null;
  }

  return (
    <div className="table-toolbar">
      <button onClick={() => editor.chain().focus().addColumnBefore().run()}>
        Add Column Before
      </button>
      <button onClick={() => editor.chain().focus().addColumnAfter().run()}>
        Add Column After
      </button>
      <button onClick={() => editor.chain().focus().deleteColumn().run()}>Delete Column</button>
      <button onClick={() => editor.chain().focus().addRowBefore().run()}>Add Row Before</button>
      <button onClick={() => editor.chain().focus().addRowAfter().run()}>Add Row After</button>
      <button onClick={() => editor.chain().focus().deleteRow().run()}>Delete Row</button>
      <button onClick={() => editor.chain().focus().mergeCells().run()}>Merge Cells</button>
      <button onClick={() => editor.chain().focus().splitCell().run()}>Split Cell</button>
      <button onClick={() => editor.chain().focus().deleteTable().run()} className="danger">
        Delete Table
      </button>

      <style jsx>{`
        .table-toolbar {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }

        .table-toolbar button {
          padding: 0.25rem 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background: white;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .table-toolbar button:hover {
          background: #f3f4f6;
        }

        .table-toolbar button.danger {
          border-color: #ef4444;
          color: #991b1b;
        }

        .table-toolbar button.danger:hover {
          background: #fee2e2;
        }
      `}</style>
    </div>
  );
}
