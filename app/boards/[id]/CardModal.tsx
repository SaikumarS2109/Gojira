'use client';

import { useEffect } from 'react';
import { CardView } from './CardView';
import { CardType } from '@/lib/cardTypes';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  type?: CardType;
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
  boardId: string;
  sequencePrefix: string;
  boardMembers: User[];
  enabledCardTypes?: CardType[];
  onUpdate: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function CardModal({
  card,
  boardId,
  sequencePrefix,
  boardMembers,
  enabledCardTypes,
  onUpdate,
  onDelete,
  onClose,
}: CardModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!card) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-md border border-[#E8EAED] w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <CardView
          card={card}
          sequencePrefix={sequencePrefix}
          boardMembers={boardMembers}
          boardId={boardId}
          enabledCardTypes={enabledCardTypes}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
