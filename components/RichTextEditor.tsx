'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface RichTextEditorProps {
  value: string;
  onChange: (json: string) => void;
  onSave?: (json: string) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onSave,
  onCancel,
  disabled = false,
  placeholder = 'Add a description...',
}: RichTextEditorProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'blockquote',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'ordered-list',
          },
        },
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ? JSON.parse(value) : '',
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editable: !disabled,
  });

  useEffect(() => {
    if (editor && value) {
      try {
        const parsed = JSON.parse(value);
        editor.commands.setContent(parsed);
      } catch {
        editor.commands.clearContent();
      }
    }
  }, []);

  if (!editor) return null;

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(JSON.stringify(editor.getJSON()));
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="border border-[#D0D4DC] rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-[#E8EAED] bg-[#F4F5F7]">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarButton>
        <div className="w-px bg-[#D0D4DC] mx-1" />
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <div className="w-px bg-[#D0D4DC] mx-1" />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          1
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          {'<>'}
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          "
        </ToolbarButton>
        <div className="w-px bg-[#D0D4DC] mx-1" />
        <ToolbarButton
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
          }}
          title="Insert link"
        >
          🔗
        </ToolbarButton>
      </div>

      {/* Editor Content - no border, no padding on the wrapper */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 focus:outline-none min-h-[200px] text-[#172B4D] [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:p-0"
      />

      {/* Save/Cancel buttons */}
      {onSave && (
        <div className="flex gap-2 justify-end p-3 border-t border-[#E8EAED] bg-[#F4F5F7]">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-[#42526E] bg-white border border-[#D0D4DC] rounded hover:bg-[#F4F5F7] transition disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm text-white bg-[#0066CC] rounded hover:bg-[#0052A3] transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active = false, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium transition ${
        active
          ? 'bg-[#0066CC] text-white'
          : 'text-[#7A8699] hover:bg-white hover:text-[#0066CC]'
      }`}
    >
      {children}
    </button>
  );
}
