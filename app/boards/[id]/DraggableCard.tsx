'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  assigneeId?: { _id: string; name: string; email: string };
}

interface DraggableCardProps {
  card: Card;
  onCardClick: (card: Card) => void;
}

export function DraggableCard({ card, onCardClick }: DraggableCardProps) {
  const { setNodeRef, transform, isDragging, listeners, attributes } = useDraggable({
    id: `card-${card._id}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onCardClick(card);
      }}
      className={`bg-gray-50 p-3 rounded border border-gray-200 cursor-grab hover:shadow-md hover:border-blue-300 active:cursor-grabbing transition ${
        isDragging ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <p className="font-medium text-sm">{card.title}</p>
      {card.description && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{card.description}</p>
      )}
      {card.assigneeId && (
        <p className="text-xs text-blue-600 mt-1">Assigned to {card.assigneeId.name}</p>
      )}
    </div>
  );
}
