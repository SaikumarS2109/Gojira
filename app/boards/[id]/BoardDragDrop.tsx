'use client';

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useState, useCallback } from 'react';

interface List {
  _id: string;
  title: string;
  order: number;
}

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  assigneeId?: { _id: string; name: string; email: string };
}

interface BoardDragDropProps {
  lists: List[];
  cards: Record<string, Card[]>;
  onListReorder: (lists: List[]) => Promise<void>;
  onCardMove: (cardId: string, newListId: string, newOrder: number) => Promise<void>;
  children: (lists: List[], cards: Record<string, Card[]>) => React.ReactNode;
}

export function BoardDragDrop({
  lists,
  cards,
  onListReorder,
  onCardMove,
  children,
}: BoardDragDropProps) {
  const [localLists, setLocalLists] = useState(lists);
  const [localCards, setLocalCards] = useState(cards);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
        console.log('No drop target');
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      console.log('Drag ended:', { activeId, overId });

      // Check if we're reordering lists
      if (activeId.startsWith('list-') && overId.startsWith('list-')) {
        const activeIndex = localLists.findIndex((l) => l._id === activeId.replace('list-', ''));
        const overIndex = localLists.findIndex((l) => l._id === overId.replace('list-', ''));

        if (activeIndex !== overIndex) {
          const newLists = arrayMove(localLists, activeIndex, overIndex).map((l, i) => ({
            ...l,
            order: i,
          }));
          setLocalLists(newLists);
          await onListReorder(newLists);
        }
      }
      // Check if we're moving cards
      else if (activeId.startsWith('card-') && overId.startsWith('list-')) {
        const cardId = activeId.replace('card-', '');
        const newListId = overId.replace('list-', '');

        // Find the card
        let sourceListId = '';
        let card: Card | null = null;

        for (const [listId, cardList] of Object.entries(localCards)) {
          const found = cardList.find((c) => c._id === cardId);
          if (found) {
            sourceListId = listId;
            card = found;
            break;
          }
        }

        if (!card || sourceListId === newListId) return;

        // Update local state
        const newCards = { ...localCards };
        newCards[sourceListId] = newCards[sourceListId].filter((c) => c._id !== cardId);
        newCards[newListId] = [...(newCards[newListId] || []), { ...card, listId: newListId }];
        setLocalCards(newCards);

        // Update database
        await onCardMove(cardId, newListId, newCards[newListId].length - 1);
      }
    },
    [localLists, localCards, onListReorder, onCardMove]
  );

  const allCardIds = Object.values(localCards).flat().map((c) => `card-${c._id}`);
  const allListIds = localLists.map((l) => `list-${l._id}`);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={[...allListIds, ...allCardIds]}
        strategy={horizontalListSortingStrategy}
      >
        {children(localLists, localCards)}
      </SortableContext>
    </DndContext>
  );
}
