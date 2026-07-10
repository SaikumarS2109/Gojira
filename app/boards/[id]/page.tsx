'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { CardModal } from './CardModal';
import { SimpleDragDrop } from './SimpleDragDrop';
import { DraggableList } from './DraggableList';
import Link from 'next/link';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Board {
  _id: string;
  title: string;
  memberIds?: User[];
  ownerId?: User;
}

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

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Record<string, Card[]>>({});
  const [boardMembers, setBoardMembers] = useState<User[]>([]);
  const [newListTitle, setNewListTitle] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);

      // Get board details from the boards list
      const boardsRes = await fetch('/api/boards');
      if (!boardsRes.ok) throw new Error('Failed to fetch boards');
      const boardsList = await boardsRes.json();
      const currentBoard = boardsList.find((b: Board) => b._id === boardId);
      if (!currentBoard) {
        router.push('/boards');
        return;
      }
      setBoard(currentBoard);
      setBoardMembers(currentBoard.memberIds || []);

      // Get lists for this board
      const listsRes = await fetch(`/api/boards/${boardId}/lists`);
      if (listsRes.ok) {
        const listData = await listsRes.json();
        setLists(listData.sort((a: List, b: List) => a.order - b.order));

        // Fetch cards for each list
        const allCards: Record<string, Card[]> = {};
        for (const list of listData) {
          const cardsRes = await fetch(`/api/lists/${list._id}/cards`);
          if (cardsRes.ok) {
            allCards[list._id] = await cardsRes.json();
          }
        }
        setCards(allCards);
      }
    } catch (err) {
      setError('Failed to load board');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, title: newListTitle }),
      });

      if (!res.ok) throw new Error('Failed to create list');

      const newList = await res.json();
      setLists([...lists, newList]);
      setCards({ ...cards, [newList._id]: [] });
      setNewListTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim() || !selectedListId) return;

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: selectedListId, title: newCardTitle }),
      });

      if (!res.ok) throw new Error('Failed to create card');

      const newCard = await res.json();
      setCards({
        ...cards,
        [selectedListId]: [...(cards[selectedListId] || []), newCard],
      });
      setNewCardTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Delete this list? All cards will be deleted.')) return;

    try {
      const res = await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete list');

      setLists(lists.filter((l) => l._id !== listId));
      const newCards = { ...cards };
      delete newCards[listId];
      setCards(newCards);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCard = async (cardId: string, listId: string) => {
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete card');

      setCards({
        ...cards,
        [listId]: cards[listId].filter((c) => c._id !== cardId),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCard = async (updates: { title?: string; description?: string; assigneeId?: string }) => {
    if (!selectedCard) return;

    try {
      const res = await fetch(`/api/cards/${selectedCard._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update card');

      const updatedCard = await res.json();
      setCards({
        ...cards,
        [selectedCard.listId]: cards[selectedCard.listId].map((c) =>
          c._id === selectedCard._id ? updatedCard : c
        ),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCardFromModal = async () => {
    if (!selectedCard) return;
    await handleDeleteCard(selectedCard._id, selectedCard.listId);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    try {
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add member');
        return;
      }

      const updatedBoard = await res.json();
      setBoard(updatedBoard);
      setBoardMembers(updatedBoard.memberIds || []);
      setNewMemberEmail('');
      setError('');
    } catch (err) {
      setError('Failed to add member');
      console.error(err);
    }
  };

  const handleListReorder = async (reorderedLists: List[]) => {
    try {
      for (const list of reorderedLists) {
        await fetch(`/api/lists/${list._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: list.order }),
        });
      }
    } catch (err) {
      console.error('Failed to reorder lists:', err);
    }
  };

  const handleCardMove = async (cardId: string, newListId: string) => {
    try {
      await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: newListId }),
      });
    } catch (err) {
      console.error('Failed to move card:', err);
    }
  };

  if (loading) return <AuthGuard><div className="p-4">Loading...</div></AuthGuard>;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <Link href="/boards" className="text-blue-600 hover:underline">
                ← Back to Boards
              </Link>
              <h1 className="text-2xl font-bold mt-2">{board?.title}</h1>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6">
          {error && <p className="text-red-600 mb-4">{error}</p>}

          {/* Members Section */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Board Members</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {boardMembers.map((member) => (
                <div key={member._id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {member.name} ({member.email})
                </div>
              ))}
            </div>

            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Add member by email"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Add Member
              </button>
            </form>
          </div>

          {/* Create List Form */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Add List</h2>
            <form onSubmit={handleCreateList} className="flex gap-2">
              <input
                type="text"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder="List name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Add List
              </button>
            </form>
          </div>

          {/* Lists and Cards with Drag-Drop */}
          <SimpleDragDrop lists={lists} cards={cards} onCardMove={handleCardMove}>
            {(dragLists, dragCards, draggingCardId) => (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {dragLists.length === 0 ? (
                  <p className="text-gray-500">No lists yet. Create one to get started!</p>
                ) : (
                  dragLists.map((list) => (
                    <DraggableList
                      key={list._id}
                      listId={list._id}
                      title={list.title}
                      cards={dragCards[list._id] || []}
                      draggingCardId={draggingCardId}
                      onCardClick={setSelectedCard}
                      onDeleteList={handleDeleteList}
                      onAddCard={() => setSelectedListId(list._id)}
                      selectedListId={selectedListId}
                      newCardTitle={newCardTitle}
                      onNewCardTitleChange={setNewCardTitle}
                      onCreateCard={handleCreateCard}
                    />
                  ))
                )}
              </div>
            )}
          </SimpleDragDrop>
        </div>

        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={handleUpdateCard}
          onDelete={handleDeleteCardFromModal}
          boardMembers={boardMembers}
        />
      </div>
    </AuthGuard>
  );
}
