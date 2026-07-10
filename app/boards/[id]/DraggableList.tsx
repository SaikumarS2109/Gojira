'use client';

import { useDroppable } from '@dnd-kit/core';
import { DraggableCard } from './DraggableCard';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  assigneeId?: { _id: string; name: string; email: string };
}

interface DraggableListProps {
  listId: string;
  title: string;
  cards: Card[];
  draggingCardId: string | null;
  onCardClick: (card: Card) => void;
  onDeleteList: (listId: string) => void;
  onAddCard: (listId: string) => void;
  selectedListId: string;
  newCardTitle: string;
  onNewCardTitleChange: (title: string) => void;
  onCreateCard: (e: React.FormEvent) => void;
}

export function DraggableList({
  listId,
  title,
  cards,
  draggingCardId,
  onCardClick,
  onDeleteList,
  onAddCard,
  selectedListId,
  newCardTitle,
  onNewCardTitleChange,
  onCreateCard,
}: DraggableListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `list-${listId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg shadow p-4 min-w-80 flex-shrink-0 transition ${
        isOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
    >
      <div className="flex justify-between items-center mb-4 cursor-grab active:cursor-grabbing">
        <h3 className="font-semibold text-lg">{title}</h3>
        <button
          onClick={() => onDeleteList(listId)}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-2 mb-4 min-h-20">
        {cards.map((card) => (
          <DraggableCard key={card._id} card={card} onCardClick={onCardClick} />
        ))}
      </div>

      {/* Add Card Form */}
      {selectedListId === listId ? (
        <form onSubmit={onCreateCard} className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={newCardTitle}
            onChange={(e) => onNewCardTitleChange(e.target.value)}
            placeholder="Card title"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
          >
            Add
          </button>
        </form>
      ) : (
        <button
          onClick={() => onAddCard(listId)}
          className="w-full text-left text-gray-600 hover:text-gray-900 text-sm py-2 px-2 rounded hover:bg-gray-100"
        >
          + Add card
        </button>
      )}
    </div>
  );
}
