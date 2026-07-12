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
      className={`bg-white border border-[#D0D4DC] rounded-lg flex flex-col min-w-64 max-w-64 flex-shrink-0 max-h-[calc(100vh-120px)] transition ${
        isOver ? 'ring-2 ring-[#0066CC]' : ''
      }`}
    >
      {/* List Header */}
      <div className="flex justify-between items-center px-3 pt-3 pb-1 group">
        <h3 className="font-semibold text-sm text-[#172B4D]">{title}</h3>
        <button
          onClick={() => onDeleteList(listId)}
          className="text-[#7A8699] hover:text-[#D93025] opacity-0 group-hover:opacity-100 transition text-sm leading-none p-1 rounded hover:bg-[#F4F5F7]"
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
          <div className="h-10 rounded-md border-2 border-dashed border-[#0066CC] bg-[#E8F0FE] opacity-60" />
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
              className="w-full px-3 py-2 text-sm rounded-md border border-[#0066CC] text-[#172B4D] placeholder-[#7A8699] focus:outline-none resize-none mb-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCreateCard(e as any); }
              }}
            />
            <div className="flex gap-2 items-center">
              <button
                type="submit"
                className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-3 py-1 text-sm rounded-md transition font-medium"
              >
                Add card
              </button>
              <button
                type="button"
                onClick={() => onAddCard('')}
                className="text-[#7A8699] hover:text-[#172B4D] text-lg leading-none transition"
              >
                ✕
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => onAddCard(listId)}
            className="w-full text-left text-[#42526E] hover:text-[#172B4D] hover:bg-[#F4F5F7] text-sm px-2 py-1.5 rounded-md transition"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}
