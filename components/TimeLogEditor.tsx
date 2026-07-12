'use client';

import React, { useState } from 'react';
import { parseDuration, formatDuration } from '@/lib/durationUtils';

interface TimeLogEditorProps {
  cardId: string;
  onTimeLogCreated: () => void;
}

export function TimeLogEditor({ cardId, onTimeLogCreated }: TimeLogEditorProps) {
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        onTimeLogCreated();
      }
    } catch (err) {
      console.error('Failed to create timelog:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-[#D0D4DC] rounded-lg overflow-hidden bg-white">
      <div className="p-3 space-y-3">
        <div>
          <label className="text-xs font-medium text-[#7A8699] mb-1 block">
            Duration (e.g., 30m, 2h, or 2h 30m)
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="2h 30m"
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

      <div className="flex gap-2 justify-end p-3 border-t border-[#E8EAED] bg-[#F4F5F7]">
        <button
          onClick={() => {
            setDuration('');
            setDescription('');
          }}
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
  );
}
