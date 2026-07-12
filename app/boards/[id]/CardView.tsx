'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { RichTextEditor } from '@/components/RichTextEditor';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
  labelIds?: { _id: string; name: string }[];
  storyPoints?: number;
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
  labelIds?: string[];
  storyPoints?: number | null;
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

function RenderedDescription({ json }: { json: string }) {
  try {
    const content = JSON.parse(json);
    const html = generateHTML(content, [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TipTapLink,
      Placeholder,
    ]);
    return (
      <div
        className="text-[#172B4D] text-sm space-y-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:my-2 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-[#0066CC] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#42526E] [&_blockquote]:my-2 [&_code]:bg-[#F4F5F7] [&_code]:text-[#D93025] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_pre]:bg-[#F4F5F7] [&_pre]:border [&_pre]:border-[#D0D4DC] [&_pre]:rounded [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:text-[#172B4D] [&_pre_code]:px-0 [&_pre_code]:py-0 [&_pre_code]:text-xs [&_a]:text-[#0066CC] [&_a]:underline [&_a]:hover:text-[#0052A3]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <span className="text-[#7A8699]">Invalid content</span>;
  }
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
  const [descriptionValue, setDescriptionValue] = useState<string>(
    card.description && card.description.trim() && card.description !== '{}'
      ? card.description
      : ''
  );
  const [assigneeId, setAssigneeId] = useState(card.assigneeId?._id || '');
  const [storyPoints, setStoryPoints] = useState(card.storyPoints || null);
  const [labelIds, setLabelIds] = useState<string[]>(card.labelIds?.map(l => l._id) || []);
  const [availableLabels, setAvailableLabels] = useState<{ _id: string; name: string }[]>([]);
  const [labelSearch, setLabelSearch] = useState('');
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const discardTitleRef = useRef(false);
  const discardDescRef = useRef(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  // Sync local state when card prop changes (e.g. parent refreshes)
  useEffect(() => {
    setTitleValue(card.title);
    setDescriptionValue(
      card.description && card.description.trim() && card.description !== '{}'
        ? card.description
        : ''
    );
    setAssigneeId(card.assigneeId?._id || '');
    setStoryPoints(card.storyPoints || null);
    setLabelIds(card.labelIds?.map(l => l._id) || []);
  }, [card]);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const res = await fetch('/api/labels');
        if (res.ok) {
          const labels = await res.json();
          setAvailableLabels(labels);
        }
      } catch (err) {
        console.error('Failed to fetch labels:', err);
      }
    };
    fetchLabels();
  }, []);

  useEffect(() => {
    if (!showLabelDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target as Node)) {
        setShowLabelDropdown(false);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLabelDropdown]);

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

  const handleStoryPointsChange = async (value: string) => {
    const pointValue = value === '' ? null : parseInt(value, 10);
    setStoryPoints(pointValue);
    await saveField({ storyPoints: pointValue }, 'storyPoints');
  };

  const handleAddLabel = async (label: { _id: string; name: string }) => {
    if (!labelIds.includes(label._id)) {
      const newLabelIds = [...labelIds, label._id];
      setLabelIds(newLabelIds);
      await saveField({ labelIds: newLabelIds }, 'labels');
    }
    setLabelSearch('');
    setShowLabelDropdown(false);
  };

  const handleRemoveLabel = async (labelId: string) => {
    const newLabelIds = labelIds.filter(id => id !== labelId);
    setLabelIds(newLabelIds);
    await saveField({ labelIds: newLabelIds }, 'labels');
  };

  const handleCreateLabel = async () => {
    if (!labelSearch.trim()) return;

    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: labelSearch.trim() }),
      });

      if (res.ok) {
        const label = await res.json();
        await handleAddLabel(label);
        // Refresh labels list
        const labelsRes = await fetch('/api/labels');
        if (labelsRes.ok) {
          setAvailableLabels(await labelsRes.json());
        }
      }
    } catch (err) {
      console.error('Failed to create label:', err);
      setFieldError('Failed to create label');
    }
  };

  const filteredLabels = availableLabels.filter(
    label =>
      !labelIds.includes(label._id) &&
      label.name.toLowerCase().includes(labelSearch.toLowerCase())
  );

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
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {onClose ? (
            <button
              onClick={onClose}
              className="text-[#7A8699] hover:text-[#172B4D] text-xl leading-none transition-colors"
              title="Close"
            >
              ✕
            </button>
          ) : (
            <Link
              href={`/boards/${boardId}`}
              className="text-sm text-[#42526E] hover:text-[#172B4D] font-medium transition-colors"
            >
              ← Back to board
            </Link>
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
            <RichTextEditor
              value={descriptionValue}
              onChange={(json) => setDescriptionValue(json)}
              onSave={async (json) => {
                await saveField({ description: json }, 'description');
                setEditingDescription(false);
              }}
              onCancel={() => {
                setDescriptionValue(card.description);
                setEditingDescription(false);
              }}
              placeholder="Add a description..."
            />
          ) : (
            <div
              onClick={() => setEditingDescription(true)}
              className="min-h-32 text-sm text-[#172B4D] cursor-text hover:bg-[#F4F5F7] rounded-lg p-3 border border-transparent hover:border-[#E8EAED] transition"
            >
              {descriptionValue && descriptionValue !== '{}' ? (
                <RenderedDescription json={descriptionValue} />
              ) : (
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

          {/* Labels — wired */}
          <div className="relative" ref={labelDropdownRef}>
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Labels</p>

            {/* Selected labels as chips + add button */}
            <div className="flex flex-wrap gap-1 items-center">
              {labelIds.map(id => {
                const label = availableLabels.find(l => l._id === id) ||
                              card.labelIds?.find(l => l._id === id);
                if (!label) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-[#E8EAED] text-[#172B4D] px-2 py-0.5 text-xs"
                  >
                    {label.name}
                    <button
                      onClick={() => handleRemoveLabel(id)}
                      className="hover:text-[#D93025] cursor-pointer text-xs leading-none"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}

              {/* Add label button */}
              <button
                onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                disabled={saving === 'labels'}
                className="inline-flex items-center justify-center w-6 h-6 bg-[#E8EAED] text-[#172B4D] text-sm font-semibold rounded hover:bg-[#D0D4DC] transition disabled:opacity-50"
                title="Add label"
              >
                +
              </button>
            </div>

            {/* Dropdown suggestions */}
            {showLabelDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D0D4DC] rounded shadow-md z-10 max-h-48 overflow-y-auto">
                <div className="p-2 border-b border-[#E8EAED]">
                  <input
                    autoFocus
                    type="text"
                    value={labelSearch}
                    onChange={(e) => setLabelSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateLabel();
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowLabelDropdown(false), 150);
                    }}
                    placeholder="Search or create..."
                    className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                  />
                </div>
                <div>
                  {filteredLabels.length > 0 ? (
                    filteredLabels.map(label => (
                      <button
                        key={label._id}
                        onClick={() => handleAddLabel(label)}
                        className="w-full text-left px-2 py-1.5 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition"
                      >
                        {label.name}
                      </button>
                    ))
                  ) : labelSearch.trim() ? (
                    <button
                      onClick={() => handleCreateLabel()}
                      className="w-full text-left px-2 py-1.5 text-sm text-[#0066CC] hover:bg-[#F4F5F7]"
                    >
                      + Create "{labelSearch.trim()}"
                    </button>
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-[#7A8699]">No labels</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Story Points — wired */}
          <div>
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Story Points</p>
            <select
              value={storyPoints ?? ''}
              onChange={(e) => handleStoryPointsChange(e.target.value)}
              disabled={saving === 'storyPoints'}
              className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC] bg-white disabled:opacity-50 cursor-pointer text-[#172B4D]"
            >
              <option value="">None</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="8">8</option>
              <option value="13">13</option>
              <option value="21">21</option>
            </select>
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
