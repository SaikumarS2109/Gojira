'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import { DraggableCard } from './DraggableCard';
import { CardType } from '@/lib/cardTypes';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  type?: CardType;
  storyPoints?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface List {
  _id: string;
  title: string;
  order: number;
}

interface SimpleDragDropProps {
  lists: List[];
  cards: Record<string, Card[]>;
  onCardMove: (cardId: string, newListId: string) => Promise<void>;
  sequencePrefix: string;
  children: (
    lists: List[],
    cards: Record<string, Card[]>,
    draggingCardId: string | null
  ) => React.ReactNode;
}

export function SimpleDragDrop({
  lists,
  cards,
  onCardMove,
  sequencePrefix,
  children,
}: SimpleDragDropProps) {
  const [localCards, setLocalCards] = useState(cards);
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);

  // Sync localCards when external state changes (create, update, delete)
  useEffect(() => {
    setLocalCards(cards);
  }, [cards]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (!activeId.startsWith('card-')) return;

    const cardId = activeId.replace('card-', '');
    for (const cardList of Object.values(localCards)) {
      const found = cardList.find((c) => c._id === cardId);
      if (found) {
        setDraggingCard(found);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingCard(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (!activeId.startsWith('card-') || !overId.startsWith('list-')) return;

    const cardId = activeId.replace('card-', '');
    const newListId = overId.replace('list-', '');

    let sourceListId = '';
    for (const [listId, cardList] of Object.entries(localCards)) {
      if (cardList.some((c) => c._id === cardId)) {
        sourceListId = listId;
        break;
      }
    }

    if (!sourceListId || sourceListId === newListId) return;

    const card = localCards[sourceListId]?.find((c) => c._id === cardId);
    if (!card) return;

    const newCards = {
      ...localCards,
      [sourceListId]: localCards[sourceListId].filter((c) => c._id !== cardId),
      [newListId]: [...(localCards[newListId] || []), { ...card, listId: newListId }],
    };

    setLocalCards(newCards);

    try {
      await onCardMove(cardId, newListId);
    } catch (err) {
      console.error('Failed to move card:', err);
      setLocalCards(localCards);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children(lists, localCards, draggingCard?._id ?? null)}

      <DragOverlay dropAnimation={null}>
        {draggingCard ? (
          <div className="opacity-95 cursor-grabbing rotate-1 shadow-xl">
            <DraggableCard
              card={draggingCard}
              onCardClick={() => {}}
              sequencePrefix={sequencePrefix}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
