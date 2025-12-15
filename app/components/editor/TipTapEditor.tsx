'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import { useCallback, useState, ReactNode } from 'react';

// SVG Icons for toolbar
const Icons = {
  bold: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
    </svg>
  ),
  italic: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4"/>
      <line x1="14" y1="20" x2="5" y2="20"/>
      <line x1="15" y1="4" x2="9" y2="20"/>
    </svg>
  ),
  underline: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
      <line x1="4" y1="21" x2="20" y2="21"/>
    </svg>
  ),
  strike: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="20" y2="12"/>
      <path d="M17.5 7.5c-.5-1.5-2-2.5-4-2.5-2.5 0-4.5 1.5-4.5 4 0 1.5.5 2.5 2 3"/>
      <path d="M9.5 14.5c.5 1.5 2 2.5 4 2.5 2.5 0 4.5-1.5 4.5-4 0-1-.25-1.75-.75-2.5"/>
    </svg>
  ),
  h1: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h8"/>
      <path d="M4 6v12"/>
      <path d="M12 6v12"/>
      <path d="M17 12l3-2v8"/>
    </svg>
  ),
  h2: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h8"/>
      <path d="M4 6v12"/>
      <path d="M12 6v12"/>
      <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>
    </svg>
  ),
  bulletList: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="6" x2="20" y2="6"/>
      <line x1="9" y1="12" x2="20" y2="12"/>
      <line x1="9" y1="18" x2="20" y2="18"/>
      <circle cx="4" cy="6" r="1" fill="currentColor"/>
      <circle cx="4" cy="12" r="1" fill="currentColor"/>
      <circle cx="4" cy="18" r="1" fill="currentColor"/>
    </svg>
  ),
  orderedList: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6"/>
      <line x1="10" y1="12" x2="21" y2="12"/>
      <line x1="10" y1="18" x2="21" y2="18"/>
      <path d="M4 6h1v4"/>
      <path d="M4 10h2"/>
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
    </svg>
  ),
  quote: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/>
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/>
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  hr: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  image: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  video: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  undo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>
  ),
  redo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
};

// Toolbar button component
function ToolbarButton({
  onClick,
  isActive = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        p-2 sm:p-2.5 rounded-lg transition-all duration-200 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]
        flex items-center justify-center
        ${isActive
          ? 'bg-[var(--accent)] text-[var(--background)] shadow-lg'
          : 'hover:bg-[var(--surface-elevated)] text-[var(--foreground)]'
        }
      `}
      style={{
        boxShadow: isActive ? '0 0 15px var(--glow-accent)' : undefined,
      }}
    >
      {children}
    </button>
  );
}

// Divider component
function ToolbarDivider() {
  return (
    <div 
      className="w-px h-6 mx-1 flex-shrink-0 hidden sm:block" 
      style={{ background: 'var(--border)' }} 
    />
  );
}

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing your story...',
  maxLength = 50000,
}: TipTapEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
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
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] focus:outline-none p-4 sm:p-6',
        style: 'color: var(--foreground); font-family: var(--font-body); letter-spacing: -0.02em;',
      },
    },
  });

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkUrl}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    
    setLinkUrl('');
    setShowLinkModal(false);
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter YouTube URL:');
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const characterCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const percentUsed = Math.round((characterCount / maxLength) * 100);

  return (
    <div 
      className="border rounded-xl overflow-hidden" 
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      {/* Toolbar - horizontally scrollable on mobile */}
      <div
        className="flex items-center gap-0.5 sm:gap-1 p-2 sm:p-3 border-b overflow-x-auto scrollbar-hide"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}
      >
        {/* Text formatting */}
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
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          {Icons.strike}
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          {Icons.h1}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          {Icons.h2}
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          {Icons.bulletList}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          {Icons.orderedList}
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          {Icons.quote}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          {Icons.code}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          {Icons.hr}
        </ToolbarButton>

        <ToolbarDivider />

        {/* Media */}
        <ToolbarButton
          onClick={() => setShowLinkModal(true)}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          {Icons.link}
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Add Image">
          {Icons.image}
        </ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="Add YouTube Video">
          {Icons.video}
        </ToolbarButton>

        <ToolbarDivider />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
        >
          {Icons.undo}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo (Ctrl+Shift+Z)"
        >
          {Icons.redo}
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Footer with stats */}
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 text-xs border-t"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <span style={{ opacity: 0.6, fontFamily: 'var(--font-body)' }}>
            {wordCount} words
          </span>
          <span style={{ opacity: 0.6, fontFamily: 'var(--font-body)' }}>
            ~{readingTime} min read
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div 
            className="flex-1 sm:w-24 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--border)' }}
          >
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, percentUsed)}%`,
                background: percentUsed > 90 ? 'var(--accent)' : 'var(--primary)',
              }}
            />
          </div>
          <span 
            style={{ 
              opacity: 0.6, 
              fontFamily: 'var(--font-body)',
              color: percentUsed > 90 ? 'var(--accent)' : undefined,
            }}
          >
            {characterCount.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Link modal */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="p-5 sm:p-6 rounded-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 
              className="text-lg font-bold mb-4" 
              style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
            >
              Add Link
            </h3>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full p-3 rounded-lg border mb-4 text-sm sm:text-base"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-body)',
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') addLink();
                if (e.key === 'Escape') setShowLinkModal(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--surface-elevated)]"
                style={{ 
                  border: '1px solid var(--border)', 
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addLink}
                className="px-4 py-2 rounded-lg text-sm transition-all hover:scale-105"
                style={{ 
                  background: 'var(--primary)', 
                  color: 'var(--background)',
                  fontFamily: 'var(--font-body)',
                  boxShadow: '0 0 15px var(--glow-primary)',
                }}
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

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
          font-size: 1.75rem;
          font-weight: bold;
          margin: 1.5rem 0 1rem;
          font-family: var(--font-kindergarten);
          color: var(--primary);
        }

        @media (min-width: 640px) {
          .ProseMirror h1 {
            font-size: 2rem;
          }
        }

        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 1.25rem 0 0.75rem;
          font-family: var(--font-kindergarten);
          color: var(--secondary);
        }

        @media (min-width: 640px) {
          .ProseMirror h2 {
            font-size: 1.5rem;
          }
        }

        .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem;
        }

        @media (min-width: 640px) {
          .ProseMirror h3 {
            font-size: 1.25rem;
          }
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

        .ProseMirror li {
          margin: 0.25rem 0;
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

        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
