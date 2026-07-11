'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';

interface Board {
  _id: string;
  title: string;
  ownerId: { name: string };
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

export default function BoardsPage() {
  const { data: session } = useSession();
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [boardPrefix, setBoardPrefix] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      const data = await res.json();
      setBoards(data);
    } catch (err) {
      setError('Failed to load boards');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Board title is required');
      return;
    }

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sequencePrefix: boardPrefix }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create board');
        return;
      }

      const newBoard = await res.json();
      setBoards([...boards, newBoard]);
      setTitle('');
      setBoardPrefix('');
      setShowForm(false);
    } catch (err) {
      setError('Failed to create board');
      console.error(err);
    }
  };

  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this board? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete board');
      setBoards(boards.filter((b) => b._id !== boardId));
    } catch (err) {
      setError('Failed to delete board');
      console.error(err);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        {/* Navbar */}
        <nav className="bg-[#026AA7] text-white px-4 py-2 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Gojira</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-100">{session?.user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-blue-300 text-blue-900 flex items-center justify-center text-sm font-bold">
              {getInitials(session?.user?.name || session?.user?.email || 'U')}
            </div>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
              className="text-sm text-blue-100 hover:text-white hover:bg-blue-700 px-3 py-1 rounded transition"
            >
              Logout
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Your Boards</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {boards.map((board) => (
                <Link key={board._id} href={`/boards/${board._id}`}>
                  <div
                    className={`${getBoardColor(board._id)} rounded-lg p-4 h-24 relative group cursor-pointer hover:opacity-90 transition shadow`}
                  >
                    <p className="text-white font-semibold text-sm">{board.title}</p>
                    <button
                      onClick={(e) => handleDeleteBoard(board._id, e)}
                      className="absolute top-2 right-2 text-white opacity-0 group-hover:opacity-100 hover:bg-black/20 rounded p-1 transition text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </Link>
              ))}

              {/* Create Board Card */}
              {showForm ? (
                <div className="bg-gray-200 rounded-lg p-3 h-auto flex flex-col gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setBoardPrefix(suggestPrefix(e.target.value));
                    }}
                    placeholder="Board title"
                    autoFocus
                    className="px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowForm(false);
                    }}
                  />
                  <input
                    type="text"
                    value={boardPrefix}
                    onChange={(e) => setBoardPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8))}
                    placeholder="Prefix e.g. GENSYS"
                    className="px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateBoard}
                      className="bg-blue-600 text-white px-3 py-1 text-xs rounded hover:bg-blue-700"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setTitle(''); setBoardPrefix(''); }}
                      className="text-gray-600 hover:text-gray-900 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-gray-200 hover:bg-gray-300 rounded-lg p-4 h-24 text-gray-600 hover:text-gray-800 text-sm font-medium transition text-left"
                >
                  + Create new board
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
