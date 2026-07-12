'use client';

import React, { useState, useEffect } from 'react';
import { formatDuration } from '@/lib/durationUtils';

interface TimeLogSummaryProps {
  cardId: string;
}

export function TimeLogSummary({ cardId }: TimeLogSummaryProps) {
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeLogs = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/timelogs?cardId=${cardId}&page=0`);
        if (res.ok) {
          const data = await res.json();
          const total = data.timelogs.reduce(
            (sum: number, log: any) => sum + log.durationMinutes,
            0
          );
          setTotalMinutes(total);
        }
      } catch (err) {
        console.error('Failed to fetch time logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeLogs();
  }, [cardId]);

  if (loading) {
    return (
      <div className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full text-sm font-semibold text-[#0066CC] bg-[#F4F5F7] rounded px-2 py-1.5">
      {totalMinutes > 0 ? formatDuration(totalMinutes) : '—'}
    </div>
  );
}
