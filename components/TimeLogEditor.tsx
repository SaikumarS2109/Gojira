'use client';

import React, { useState } from 'react';
import { parseDuration } from '@/lib/durationUtils';

interface TimeLogEditorProps {
  cardId: string;
  onTimeLogCreated: () => void;
}

export function TimeLogEditor({ cardId, onTimeLogCreated }: TimeLogEditorProps) {
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async () => {
    if (!duration.trim()) return;

    const durationMinutes = parseDuration(duration);
    if (durationMinutes <= 0) {
      alert('Please enter a valid duration (e.g., 30m, 2h, or 2h 30m)');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/timelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          durationMinutes,
          description: description.trim(),
        }),
      });

      if (res.ok) {
        setDuration('');
        setDescription('');
        setIsOpen(false);
        onTimeLogCreated();
      }
    } catch (err) {
      console.error('Failed to create timelog:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setDuration('');
    setDescription('');
    setIsOpen(false);
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-2.5 text-sm text-[#42526E] border border-[#D0D4DC] rounded-lg bg-white hover:bg-[#F4F5F7] transition text-left"
      >
        Add work log
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/10 z-40" onClick={handleClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-md z-50 w-96 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-[#E8EAED]">
          <h2 className="text-sm font-semibold text-[#172B4D]">Add Work Log</h2>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-[#7A8699] mb-1 block">
              Duration (e.g., 30m, 2h, or 2h 30m)
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="2h 30m"
              autoFocus
              className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#7A8699] mb-1 block">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end p-4 border-t border-[#E8EAED] bg-[#F4F5F7]">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm text-[#42526E] bg-white border border-[#D0D4DC] rounded hover:bg-[#F4F5F7] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !duration.trim()}
            className="px-3 py-1.5 text-sm text-white bg-[#0066CC] rounded hover:bg-[#0052A3] transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Log Time'}
          </button>
        </div>
      </div>
    </>
  );
}
