'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { AuthGuard } from '@/components/AuthGuard';
import { CardView } from '../../CardView';
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
}

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface CardUpdate {
  title?: string;
  description?: string;
  assigneeId?: string;
}

const BOARD_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
  'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
];

function getBoardColor(id: string) {
  return BOARD_COLORS[id.charCodeAt(id.length - 1) % BOARD_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function suggestPrefix(title: string): string {
  return title.trim().split(/\s+/).map((w) => w[0] ?? '').join('')
    .toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
}

export default function CardFullPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const boardId = params.id as string;
  const cardId = params.cardId as string;

  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [boardMembers, setBoardMembers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardPrefix, setNewBoardPrefix] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [boardId, cardId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [boardsRes, cardRes] = await Promise.all([
        fetch('/api/boards'),
        fetch(`/api/cards/${cardId}`),
      ]);
      if (!boardsRes.ok) throw new Error('Failed to fetch boards');
      const boardsList = await boardsRes.json();
      setAllBoards(boardsList);
      const currentBoard = boardsList.find((b: Board) => b._id === boardId);
      if (!currentBoard) { router.push('/boards'); return; }
      setBoard(currentBoard);
      setBoardMembers(currentBoard.memberIds || []);
      if (!cardRes.ok) throw new Error('Failed to fetch card');
      setCard(await cardRes.json());
    } catch (err) {
      setError('Failed to load card');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: CardUpdate) => {
    const res = await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update card');
    setCard(await res.json());
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
    if (!res.ok) { setError('Failed to delete card'); return; }
    router.push(`/boards/${boardId}`);
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newBoardTitle, sequencePrefix: newBoardPrefix }),
    });
    if (!res.ok) return;
    const newBoard = await res.json();
    setAllBoards([...allBoards, newBoard]);
    setNewBoardTitle('');
    setNewBoardPrefix('');
    setShowNewBoardForm(false);
    router.push(`/boards/${newBoard._id}`);
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
        {/* Top nav */}
        <nav className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/60 hover:text-white transition p-1 rounded hover:bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v1.5H2V3zm0 4.25h12v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
              </svg>
            </button>
            <span className="text-white font-bold text-lg tracking-tight">Gojira</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold">
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

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className={`flex-shrink-0 bg-black/20 backdrop-blur border-r border-white/10 flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-56' : 'w-0'}`}>
            <div className="w-56 px-3 pt-4 pb-1 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap">
              Boards
            </div>
            <nav className="w-56 flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
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
            <div className="w-56 px-2 py-3 border-t border-white/10">
              {showNewBoardForm ? (
                <form onSubmit={handleCreateBoard} className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => { setNewBoardTitle(e.target.value); setNewBoardPrefix(suggestPrefix(e.target.value)); }}
                    placeholder="Board name"
                    className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50"
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowNewBoardForm(false); setNewBoardTitle(''); setNewBoardPrefix(''); } }}
                  />
                  <input
                    type="text"
                    value={newBoardPrefix}
                    onChange={(e) => setNewBoardPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8))}
                    placeholder="Prefix e.g. GENSYS"
                    className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 font-mono"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded-lg transition">Create</button>
                    <button type="button" onClick={() => { setShowNewBoardForm(false); setNewBoardTitle(''); setNewBoardPrefix(''); }} className="text-white/50 hover:text-white text-xs transition">✕</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowNewBoardForm(true)} className="w-full text-left text-white/50 hover:text-white hover:bg-white/10 text-sm px-2 py-1.5 rounded-lg transition">
                  + New board
                </button>
              )}
            </div>
          </aside>

          {/* Card content */}
          <main className="flex-1 overflow-y-auto p-6">
            {error && <p className="text-red-400 mb-4">{error}</p>}
            {card && board ? (
              <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-6">
                <CardView
                  card={card}
                  sequencePrefix={board.sequencePrefix || ''}
                  boardMembers={boardMembers}
                  boardId={boardId}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </div>
            ) : (
              !error && <p className="text-white/50">Card not found.</p>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
