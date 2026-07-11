'use client';

import { useState, useEffect } from 'react';

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

interface CardModalProps {
  card: Card | null;
  onClose: () => void;
  onSave: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  boardMembers: User[];
  sequencePrefix: string;
}

export function CardModal({ card, onClose, onSave, onDelete, boardMembers, sequencePrefix }: CardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setAssigneeId(card.assigneeId?._id || '');
    }
  }, [card]);

  if (!card) return null;

  const ticketId = card.ticketNumber != null ? `${sequencePrefix}-${card.ticketNumber}` : null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        title,
        description,
        assigneeId: assigneeId || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this card?')) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            {ticketId && (
              <span className="inline-block text-xs font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded mb-1">
                {ticketId}
              </span>
            )}
            <h2 className="text-xl font-semibold">Edit Card</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 ml-4">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assign To</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {boardMembers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
