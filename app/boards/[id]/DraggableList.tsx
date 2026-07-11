'use client';

import { useDroppable } from '@dnd-kit/core';
import { DraggableCard } from './DraggableCard';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
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
  sequencePrefix: string;
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
  sequencePrefix,
}: DraggableListProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `list-${listId}` });

  return (
    <div
      ref={setNodeRef}
      className={`bg-[#ebecf0] rounded-xl flex flex-col min-w-64 max-w-64 flex-shrink-0 max-h-[calc(100vh-120px)] transition ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      {/* List Header */}
      <div className="flex justify-between items-center px-3 pt-3 pb-1 group">
        <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
        <button
          onClick={() => onDeleteList(listId)}
          className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition text-sm leading-none p-1 rounded hover:bg-gray-300"
        >
          ✕
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-2 min-h-8">
        {cards.map((card) => (
          <DraggableCard key={card._id} card={card} onCardClick={onCardClick} sequencePrefix={sequencePrefix} />
        ))}
        {isOver && draggingCardId && (
          <div className="h-10 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50 opacity-60" />
        )}
      </div>

      {/* Add Card */}
      <div className="px-2 pb-2 pt-1">
        {selectedListId === listId ? (
          <form onSubmit={onCreateCard}>
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(e) => onNewCardTitleChange(e.target.value)}
              placeholder="Enter a title for this card..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-blue-400 shadow-sm focus:outline-none resize-none mb-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onCreateCard(e as any);
                }
              }}
            />
            <div className="flex gap-2 items-center">
              <button
                type="submit"
                className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600 transition font-medium"
              >
                Add card
              </button>
              <button
                type="button"
                onClick={() => onAddCard('')}
                className="text-gray-500 hover:text-gray-700 text-lg leading-none"
              >
                ✕
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => onAddCard(listId)}
            className="w-full text-left text-gray-600 hover:text-gray-800 hover:bg-gray-300/60 text-sm px-2 py-1.5 rounded-lg transition"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}
