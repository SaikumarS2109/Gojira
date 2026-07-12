'use client';

import React, { useState, useEffect } from 'react';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface Comment {
  _id: string;
  authorId: { _id: string; name: string; email: string };
  content: string;
  mentions: Array<{ userId: string; email: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

interface CommentListProps {
  cardId: string;
  currentUserId: string;
  onCommentDeleted: () => void;
}

export function CommentList({
  cardId,
  currentUserId,
  onCommentDeleted,
}: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchComments(0);
  }, []);

  const fetchComments = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/comments?cardId=${cardId}&page=${pageNum}`);
      if (res.ok) {
        const data = await res.json();
        const orderedComments = sortNewest
          ? data.comments
          : data.comments.reverse();
        if (pageNum === 0) {
          setComments(orderedComments);
        } else {
          setComments(prev => [...prev, ...orderedComments]);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchComments(page + 1);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setComments(comments.filter(c => c._id !== commentId));
        onCommentDeleted();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleEditSave = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });

      if (res.ok) {
        const updated = await res.json();
        setComments(
          comments.map(c => (c._id === commentId ? updated : c))
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      const html = generateHTML(parsed, [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Link,
        Placeholder,
      ]);
      return (
        <div
          className="tiptap text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return <p className="text-sm text-[#172B4D]">{content}</p>;
    }
  };

  function getInitials(name: string) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#172B4D]">
          Comments ({total})
        </h3>
        <button
          onClick={() => setSortNewest(!sortNewest)}
          className="text-xs text-[#0066CC] hover:text-[#0052A3] transition"
        >
          {sortNewest ? 'Newest' : 'Oldest'} first
        </button>
      </div>

      <div className="space-y-3">
        {comments.map(comment => (
          <div
            key={comment._id}
            className="border border-[#E0E3E8] rounded-lg p-3 bg-white"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#0066CC] text-white text-xs flex items-center justify-center font-bold">
                {getInitials(comment.authorId.name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#172B4D]">
                    {comment.authorId.name}
                  </span>
                  <span className="text-xs text-[#7A8699]">
                    {formatDate(comment.createdAt)}
                  </span>
                  {new Date(comment.updatedAt) > new Date(comment.createdAt) && (
                    <span className="text-xs text-[#7A8699] italic">
                      (edited)
                    </span>
                  )}
                </div>
              </div>

              {comment.authorId._id === currentUserId && (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingId(comment._id);
                      setEditContent(comment.content);
                    }}
                    className="text-xs text-[#0066CC] hover:text-[#0052A3] transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(comment._id)}
                    className="text-xs text-[#D93025] hover:text-[#B91C1C] transition"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {editingId === comment._id ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full text-sm border border-[#D0D4DC] rounded p-2 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleEditSave(comment._id);
                    }}
                    className="text-xs px-2 py-1 bg-[#0066CC] text-white rounded hover:bg-[#0052A3] transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs px-2 py-1 bg-[#F4F5F7] text-[#172B4D] rounded hover:bg-[#E8EAED] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#172B4D]">
                {renderContent(comment.content)}
              </div>
            )}

            {comment.mentions.length > 0 && (
              <div className="mt-2 text-xs text-[#0066CC]">
                Mentioned:{' '}
                {comment.mentions.map(m => `@${m.name}`).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loading}
          className="w-full text-sm text-[#0066CC] hover:text-[#0052A3] py-2 transition disabled:opacity-50"
        >
          {loading ? 'Loading...' : `Load more (${total - comments.length} remaining)`}
        </button>
      )}

      {!loading && total === 0 && (
        <p className="text-sm text-[#7A8699] text-center py-4">
          No comments yet. Be the first!
        </p>
      )}
    </div>
  );
}
