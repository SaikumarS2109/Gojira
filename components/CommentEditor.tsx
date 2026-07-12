'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface CommentEditorProps {
  cardId: string;
  boardMembers: User[];
  onCommentCreated: () => void;
}

export function CommentEditor({
  cardId,
  boardMembers,
  onCommentCreated,
}: CommentEditorProps) {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<
    Array<{ userId: string; email: string; name: string }>
  >([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Add a comment...' }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      setContent(json);

      const text = editor.getText();
      const atIndex = text.lastIndexOf('@');
      if (atIndex !== -1) {
        const searchText = text.substring(atIndex + 1);
        if (searchText && !searchText.includes(' ')) {
          setMentionSearch(searchText);
          setShowMentionDropdown(true);
        }
      } else {
        setShowMentionDropdown(false);
      }
    },
  });

  if (!editor) return null;

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          content,
          mentions,
        }),
      });

      if (res.ok) {
        editor.commands.clearContent();
        setContent('');
        setMentions([]);
        onCommentCreated();
      }
    } catch (err) {
      console.error('Failed to create comment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMembers = boardMembers.filter(
    member =>
      !mentions.some(m => m.userId === member._id) &&
      (member.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        member.email.toLowerCase().includes(mentionSearch.toLowerCase()))
  );

  const handleSelectMention = (member: User) => {
    const newMention = {
      userId: member._id,
      email: member.email,
      name: member.name,
    };
    setMentions([...mentions, newMention]);
    setShowMentionDropdown(false);
    setMentionSearch('');

    editor
      .chain()
      .focus()
      .insertContent(`@${member.name} `)
      .run();
  };

  return (
    <div className="border border-[#D0D4DC] rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap gap-1 p-2 border-b border-[#E8EAED] bg-[#F4F5F7]">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
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
      </div>

      <div className="px-4 py-3 min-h-[120px] bg-white relative">
        <EditorContent
          editor={editor}
          className="tiptap focus:outline-none text-[#172B4D]"
        />

        {showMentionDropdown && filteredMembers.length > 0 && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-[#D0D4DC] rounded shadow-md z-10 min-w-48 max-h-48 overflow-y-auto">
            {filteredMembers.map(member => (
              <button
                key={member._id}
                onClick={() => handleSelectMention(member)}
                className="w-full text-left px-2 py-1.5 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition"
              >
                {member.name} ({member.email})
              </button>
            ))}
          </div>
        )}
      </div>

      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 py-2 border-t border-[#E8EAED] bg-[#F4F5F7]">
          {mentions.map(mention => (
            <span
              key={mention.userId}
              className="inline-flex items-center gap-1 bg-[#E8EAED] text-[#172B4D] px-2 py-0.5 text-xs rounded"
            >
              @{mention.name}
              <button
                onClick={() =>
                  setMentions(mentions.filter(m => m.userId !== mention.userId))
                }
                className="hover:text-[#D93025] cursor-pointer text-xs"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-end p-3 border-t border-[#E8EAED] bg-[#F4F5F7]">
        <button
          onClick={() => {
            editor.commands.clearContent();
            setContent('');
            setMentions([]);
          }}
          disabled={isSaving}
          className="px-3 py-1.5 text-sm text-[#42526E] bg-white border border-[#D0D4DC] rounded hover:bg-[#F4F5F7] transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !content.trim()}
          className="px-3 py-1.5 text-sm text-white bg-[#0066CC] rounded hover:bg-[#0052A3] transition disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Comment'}
        </button>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  active = false,
  onClick,
  title,
  children,
}: ToolbarButtonProps) {
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
