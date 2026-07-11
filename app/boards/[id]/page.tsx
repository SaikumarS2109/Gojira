'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
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
  sequencePrefix?: string;
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
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

const BOARD_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
];

function getBoardColor(id: string) {
  const index = id.charCodeAt(id.length - 1) % BOARD_COLORS.length;
  return BOARD_COLORS[index];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function suggestPrefix(title: string): string {
  return title
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
}

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const boardId = params.id as string;

  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Record<string, Card[]>>({});
  const [boardMembers, setBoardMembers] = useState<User[]>([]);
  const [newListTitle, setNewListTitle] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardPrefix, setNewBoardPrefix] = useState('');

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      const boardsRes = await fetch('/api/boards');
      if (!boardsRes.ok) throw new Error('Failed to fetch boards');
      const boardsList = await boardsRes.json();
      setAllBoards(boardsList);

      const currentBoard = boardsList.find((b: Board) => b._id === boardId);
      if (!currentBoard) {
        router.push('/boards');
        return;
      }
      setBoard(currentBoard);
      setBoardMembers(currentBoard.memberIds || []);

      const listsRes = await fetch(`/api/boards/${boardId}/lists`);
      if (listsRes.ok) {
        const listData = await listsRes.json();
        setLists(listData.sort((a: List, b: List) => a.order - b.order));

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
      setShowAddList(false);
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
      setCards({ ...cards, [selectedListId]: [...(cards[selectedListId] || []), newCard] });
      setNewCardTitle('');
      setSelectedListId('');
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
      setCards({ ...cards, [listId]: cards[listId].filter((c) => c._id !== cardId) });
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

  const handleCreateBoardFromSidebar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBoardTitle, sequencePrefix: newBoardPrefix }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error);
        return;
      }
      const newBoard = await res.json();
      setAllBoards([...allBoards, newBoard]);
      setNewBoardTitle('');
      setNewBoardPrefix('');
      setShowNewBoardForm(false);
      router.push(`/boards/${newBoard._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
          <div className="text-white/50">Loading...</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>

        {/* Top nav — slim */}
        <nav className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/60 hover:text-white transition p-1 rounded hover:bg-white/10"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                {sidebarOpen ? (
                  <path d="M2 3h12v1.5H2V3zm0 4.25h8v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
                ) : (
                  <path d="M2 3h12v1.5H2V3zm0 4.25h12v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
                )}
              </svg>
            </button>
            <span className="text-white font-bold text-lg tracking-tight">Gojira</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold"
              title={session?.user?.name || session?.user?.email || ''}
            >
              {getInitials(session?.user?.name || session?.user?.email || 'U')}
            </div>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
              className="text-white/60 hover:text-white text-sm transition"
            >
              Logout
            </button>
          </div>
        </nav>


        {/* Body: sidebar + canvas */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <aside
            className={`flex-shrink-0 bg-black/20 backdrop-blur border-r border-white/10 flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${
              sidebarOpen ? 'w-56' : 'w-0'
            }`}
          >
            <div className="w-56 px-3 pt-4 pb-1 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap">
              Boards
            </div>

            <nav className="w-56 flex-1 px-2 py-1 space-y-0.5">
              {allBoards.map((b) => (
                <Link
                  key={b._id}
                  href={`/boards/${b._id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                    b._id === boardId
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${getBoardColor(b._id)}`} />
                  <span className="truncate">{b.title}</span>
                </Link>
              ))}
            </nav>

            {/* New board */}
            <div className="w-56 px-2 py-3 border-t border-white/10">
              {showNewBoardForm ? (
                <form onSubmit={handleCreateBoardFromSidebar} className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => {
                      setNewBoardTitle(e.target.value);
                      setNewBoardPrefix(suggestPrefix(e.target.value));
                    }}
                    placeholder="Board name"
                    className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowNewBoardForm(false);
                        setNewBoardTitle('');
                        setNewBoardPrefix('');
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={newBoardPrefix}
                    onChange={(e) => setNewBoardPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8))}
                    placeholder="Prefix e.g. GENSYS"
                    className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 font-mono"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded-lg transition">
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewBoardForm(false); setNewBoardTitle(''); setNewBoardPrefix(''); }}
                      className="text-white/50 hover:text-white text-xs transition"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowNewBoardForm(true)}
                  className="w-full text-left text-white/50 hover:text-white hover:bg-white/10 text-sm px-2 py-1.5 rounded-lg transition"
                >
                  + New board
                </button>
              )}
            </div>
          </aside>

          {/* Main canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Board title + members bar */}
            <div className="flex-shrink-0 px-5 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-white text-2xl font-bold">{board?.title}</h1>
                  {boardMembers.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {boardMembers.slice(0, 5).map((member) => (
                        <div
                          key={member._id}
                          title={member.name}
                          className="w-6 h-6 rounded-full bg-white/30 border border-white/50 text-white text-xs flex items-center justify-center font-bold"
                        >
                          {getInitials(member.name)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="text-white/70 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
                >
                  Members
                </button>
              </div>

              {/* Members panel */}
              {showMembers && (
                <div className="mt-3 bg-white/10 backdrop-blur rounded-xl p-3 max-w-sm">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {boardMembers.map((member) => (
                      <div key={member._id} className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                        {member.name}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Add member by email"
                      className="flex-1 px-2 py-1 text-xs rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50"
                    />
                    <button type="submit" className="bg-white text-gray-800 px-3 py-1 text-xs rounded-lg font-medium hover:bg-white/90 transition">
                      Add
                    </button>
                  </form>
                  {error && <p className="text-red-300 text-xs mt-1">{error}</p>}
                </div>
              )}
            </div>

            {/* Kanban */}
            <div className="flex-1 overflow-x-auto px-5 pb-4">
              <SimpleDragDrop lists={lists} cards={cards} onCardMove={handleCardMove}>
                {(dragLists, dragCards, draggingCardId) => (
                  <div className="flex gap-3 items-start h-full">
                    {dragLists.map((list) => (
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
                        sequencePrefix={board?.sequencePrefix || ''}
                      />
                    ))}

                    {/* Add list */}
                    <div className="min-w-64 flex-shrink-0">
                      {showAddList ? (
                        <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                          <input
                            type="text"
                            autoFocus
                            value={newListTitle}
                            onChange={(e) => setNewListTitle(e.target.value)}
                            placeholder="Enter list name"
                            className="w-full px-3 py-2 text-sm rounded-lg bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateList(e as unknown as React.FormEvent);
                              if (e.key === 'Escape') {
                                setShowAddList(false);
                                setNewListTitle('');
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleCreateList(e as unknown as React.FormEvent)}
                              className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600 transition"
                            >
                              Add list
                            </button>
                            <button
                              onClick={() => setShowAddList(false)}
                              className="text-white/70 hover:text-white text-sm transition"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddList(true)}
                          className="w-full text-left text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-sm font-medium transition"
                        >
                          + Add a list
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </SimpleDragDrop>
            </div>
          </div>
        </div>

        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={handleUpdateCard}
          onDelete={handleDeleteCardFromModal}
          boardMembers={boardMembers}
          sequencePrefix={board?.sequencePrefix || ''}
        />
      </div>
    </AuthGuard>
  );
}
