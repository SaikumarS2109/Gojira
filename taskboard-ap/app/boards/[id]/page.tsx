'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import Link from 'next/link';

interface Board {
  _id: string;
  title: string;
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
  assigneeId?: { name: string; email: string };
}

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Record<string, Card[]>>({});
  const [newListTitle, setNewListTitle] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
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

      // Get lists for this board
      // Note: API doesn't have GET /api/boards/:id/lists, so we'll fetch all and filter
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

          {/* Lists and Cards */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {lists.length === 0 ? (
              <p className="text-gray-500">No lists yet. Create one to get started!</p>
            ) : (
              lists.map((list) => (
                <div key={list._id} className="bg-white rounded-lg shadow p-4 min-w-80">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">{list.title}</h3>
                    <button
                      onClick={() => handleDeleteList(list._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Cards in List */}
                  <div className="space-y-2 mb-4 min-h-20">
                    {cards[list._id]?.map((card) => (
                      <div key={card._id} className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{card.title}</p>
                            {card.description && (
                              <p className="text-xs text-gray-600 mt-1">{card.description}</p>
                            )}
                            {card.assigneeId && (
                              <p className="text-xs text-blue-600 mt-1">
                                Assigned to {card.assigneeId.name}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteCard(card._id, list._id)}
                            className="text-red-600 hover:text-red-800 text-xs ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Card Form */}
                  {selectedListId === list._id ? (
                    <form
                      onSubmit={handleCreateCard}
                      className="flex gap-2"
                      onBlur={() => {
                        if (!newCardTitle) setSelectedListId('');
                      }}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
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
                      onClick={() => setSelectedListId(list._id)}
                      className="w-full text-left text-gray-600 hover:text-gray-900 text-sm py-2 px-2 rounded hover:bg-gray-100"
                    >
                      + Add card
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
