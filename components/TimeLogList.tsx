'use client';

import React, { useState, useEffect } from 'react';
import { formatDuration, parseDuration } from '@/lib/durationUtils';

interface TimeLog {
  _id: string;
  userId: { _id: string; name: string; email: string };
  durationMinutes: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimeLogListProps {
  cardId: string;
  currentUserId: string;
  onTimeLogDeleted: () => void;
}

export function TimeLogList({
  cardId,
  currentUserId,
  onTimeLogDeleted,
}: TimeLogListProps) {
  const [timelogs, setTimelogs] = useState<TimeLog[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    fetchTimeLogs(0);
  }, []);

  const fetchTimeLogs = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/timelogs?cardId=${cardId}&page=${pageNum}`);
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 0) {
          setTimelogs(data.timelogs);
        } else {
          setTimelogs(prev => [...prev, ...data.timelogs]);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to fetch timelogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchTimeLogs(page + 1);
  };

  const handleDelete = async (timelogId: string) => {
    if (!confirm('Delete this time log entry?')) return;

    try {
      const res = await fetch(`/api/timelogs/${timelogId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTimelogs(timelogs.filter(t => t._id !== timelogId));
        onTimeLogDeleted();
      }
    } catch (err) {
      console.error('Failed to delete timelog:', err);
    }
  };

  const handleEditSave = async (timelogId: string) => {
    if (!editDuration.trim()) return;

    const durationMinutes = parseDuration(editDuration);
    if (durationMinutes <= 0) {
      alert('Please enter a valid duration');
      return;
    }

    try {
      const res = await fetch(`/api/timelogs/${timelogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes,
          description: editDescription.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTimelogs(timelogs.map(t => (t._id === timelogId ? updated : t)));
        setEditingId(null);
      }
    } catch (err) {
      console.error('Failed to edit timelog:', err);
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

  function getInitials(name: string) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  if (total === 0 && !loading) {
    return (
      <p className="text-sm text-[#7A8699] text-center py-4">
        No time logged yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {timelogs.map(timelog => (
        <div
          key={timelog._id}
          className="border border-[#E0E3E8] rounded-lg p-3 bg-white"
        >
          {editingId === timelog._id ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                placeholder="2h 30m"
                className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditSave(timelog._id)}
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
            <>
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#0066CC] text-white text-xs flex items-center justify-center font-bold">
                  {getInitials(timelog.userId.name)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#172B4D]">
                      {timelog.userId.name}
                    </span>
                    <span className="text-sm font-semibold text-[#0066CC]">
                      {formatDuration(timelog.durationMinutes)}
                    </span>
                    <span className="text-xs text-[#7A8699]">
                      {formatDate(timelog.createdAt)}
                    </span>
                  </div>
                </div>

                {timelog.userId._id === currentUserId && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingId(timelog._id);
                        setEditDuration(formatDuration(timelog.durationMinutes));
                        setEditDescription(timelog.description || '');
                      }}
                      className="text-xs text-[#0066CC] hover:text-[#0052A3] transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(timelog._id)}
                      className="text-xs text-[#D93025] hover:text-[#B91C1C] transition"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {timelog.description && (
                <p className="text-sm text-[#172B4D] ml-11">
                  {timelog.description}
                </p>
              )}
            </>
          )}
        </div>
      ))}

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loading}
          className="w-full text-sm text-[#0066CC] hover:text-[#0052A3] py-2 transition disabled:opacity-50"
        >
          {loading ? 'Loading...' : `Load more (${total - timelogs.length} remaining)`}
        </button>
      )}
    </div>
  );
}
