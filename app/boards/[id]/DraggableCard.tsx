'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface DraggableCardProps {
  card: Card;
  onCardClick: (card: Card) => void;
  sequencePrefix: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function DraggableCard({ card, onCardClick, sequencePrefix }: DraggableCardProps) {
  const { setNodeRef, transform, isDragging, listeners, attributes } = useDraggable({
    id: `card-${card._id}`,
  });

  const ticketId = card.ticketNumber != null ? `${sequencePrefix}-${card.ticketNumber}` : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onCardClick(card);
      }}
      className={`bg-white rounded-lg shadow-sm border border-gray-200/80 px-3 py-2 cursor-pointer hover:shadow-md hover:border-blue-300 transition group ${
        isDragging ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {ticketId && (
        <p className="text-xs font-mono text-gray-400 mb-1">{ticketId}</p>
      )}
      <p className="text-sm text-gray-800 font-medium leading-snug">{card.title}</p>

      {card.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
      )}

      {card.assigneeId && (
        <div className="flex items-center gap-1 mt-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
            {getInitials(card.assigneeId.name)}
          </div>
          <span className="text-xs text-gray-500">{card.assigneeId.name}</span>
        </div>
      )}
    </div>
  );
}
