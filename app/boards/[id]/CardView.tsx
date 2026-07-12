'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface CardUpdate {
  title?: string;
  description?: string;
  assigneeId?: string;
}

interface CardViewProps {
  card: Card;
  sequencePrefix: string;
  boardMembers: User[];
  boardId: string;
  onUpdate: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose?: () => void;
}

export function CardView({
  card,
  sequencePrefix,
  boardMembers,
  boardId,
  onUpdate,
  onDelete,
  onClose,
}: CardViewProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(card.description);
  const [assigneeId, setAssigneeId] = useState(card.assigneeId?._id || '');
  const [saving, setSaving] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const discardTitleRef = useRef(false);
  const discardDescRef = useRef(false);

  // Sync local state when card prop changes (e.g. parent refreshes)
  useEffect(() => {
    setTitleValue(card.title);
    setDescriptionValue(card.description);
    setAssigneeId(card.assigneeId?._id || '');
  }, [card]);

  const ticketId = card.ticketNumber != null ? `${sequencePrefix}-${card.ticketNumber}` : null;

  const saveField = async (updates: CardUpdate, fieldName: string) => {
    setSaving(fieldName);
    setFieldError(null);
    try {
      await onUpdate(updates);
    } catch {
      setFieldError(`Failed to save ${fieldName}`);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveTitle = async () => {
    if (discardTitleRef.current) { discardTitleRef.current = false; return; }
    const trimmed = titleValue.trim();
    if (!trimmed) { setTitleValue(card.title); setEditingTitle(false); return; }
    if (trimmed === card.title) { setEditingTitle(false); return; }
    await saveField({ title: trimmed }, 'title');
    setEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (discardDescRef.current) { discardDescRef.current = false; return; }
    if (descriptionValue === card.description) { setEditingDescription(false); return; }
    await saveField({ description: descriptionValue }, 'description');
    setEditingDescription(false);
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    setAssigneeId(newAssigneeId);
    await saveField({ assigneeId: newAssigneeId || undefined }, 'assignee');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this card? This cannot be undone.')) return;
    await onDelete();
  };

  const titleComponent = () => {
    return editingTitle ? (
        <input
          autoFocus
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleSaveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSaveTitle(); }
            if (e.key === 'Escape') {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              discardTitleRef.current = true;
              setTitleValue(card.title);
              setEditingTitle(false);
            }
          }}
          className="flex-1 text-lg font-semibold text-[#172B4D] border-b-2 border-[#0066CC] focus:outline-none bg-transparent pb-0.5"
        />
      ) : (
        <h2
          onClick={() => setEditingTitle(true)}
          className="flex-1 text-lg font-semibold text-[#172B4D] cursor-text hover:text-[#0066CC] transition-colors"
          title="Click to edit title"
        >
          {card.title}
        </h2>
      );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {ticketId && (
            <Link
              href={`/boards/${boardId}/cards/${card._id}`}
              target='_blank'
              className="text-[#7A8699] hover:text-[#42526E] text-base transition-colors"
              title="Open full page"
            >
              {ticketId}
            </Link>
            // <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex-shrink-0">
            //   {ticketId}
            // </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {onClose && (
            <Link
              href={`/boards/${boardId}/cards/${card._id}`}
              target='_blank'
              className="text-[#7A8699] hover:text-[#42526E] text-base transition-colors"
              title="Open full page"
            >
              ↗
            </Link>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#7A8699] hover:text-[#172B4D] text-xl leading-none transition-colors"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex gap-6">
        {/* Left: Description + Comments */}
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex">
            { titleComponent() }
          </div>
          <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-2">
            Acceptance Criteria
          </p>
          {editingDescription ? (
            <textarea
              autoFocus
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={handleSaveDescription}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  discardDescRef.current = true;
                  setDescriptionValue(card.description);
                  setEditingDescription(false);
                }
                if (e.ctrlKey && e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveDescription();
                }
              }}
              rows={8}
              className="w-full text-sm text-[#172B4D] border border-[#0066CC] rounded-lg p-3 focus:outline-none resize-none"
              placeholder="Add a description... (Ctrl+Enter to save)"
            />
          ) : (
            <div
              onClick={() => setEditingDescription(true)}
              className="min-h-32 text-sm text-[#172B4D] cursor-text hover:bg-[#F4F5F7] rounded-lg p-3 border border-transparent hover:border-[#E8EAED] transition whitespace-pre-wrap"
            >
              {descriptionValue || (
                <span className="text-[#7A8699]">Click to add a description...</span>
              )}
            </div>
          )}

          {/* Comments placeholder */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-2 block">
              Comments
            </p>
            <div className="bg-[#F4F5F7] border border-dashed border-[#D0D4DC] rounded-lg p-4 text-sm text-[#7A8699] text-center">
              Coming soon
            </div>
          </div>
        </div>

        {/* Right: Metadata panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          {/* Placeholder: Status */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Status</p>
            <div className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5">—</div>
          </div>

          {/* Assignee — wired */}
          <div>
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Assignee</p>
            <select
              value={assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              disabled={saving === 'assignee'}
              className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC] bg-white disabled:opacity-50 cursor-pointer text-[#172B4D]"
            >
              <option value="">Unassigned</option>
              {boardMembers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholder: Labels */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Labels</p>
            <div className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5">—</div>
          </div>

          {/* Placeholder: Story Points */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Story Points</p>
            <div className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5">—</div>
          </div>

          {/* Placeholder: Time Logging */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Time Logging</p>
            <div className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5">—</div>
          </div>

          {/* Placeholder: Card Type */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Card Type</p>
            <div className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5">—</div>
          </div>

          {fieldError && (
            <p className="text-xs text-[#D93025]">{fieldError}</p>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="mt-auto pt-4 text-xs text-[#D93025] hover:text-[#B91C1C] text-left transition-colors"
          >
            Delete card
          </button>
        </div>
      </div>
    </div>
  );
}
