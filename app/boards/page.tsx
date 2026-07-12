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

export default function BoardsPage() {
  const { data: session } = useSession();
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [boardPrefix, setBoardPrefix] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchBoards(); }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      setBoards(await res.json());
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
    if (!title.trim()) { setError('Board title is required'); return; }
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sequencePrefix: boardPrefix }),
      });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to create board'); return; }
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
      <div className="min-h-screen bg-[#F4F5F7]">
        {/* Navbar */}
        <nav className="bg-white border-b border-[#E8EAED] px-4 py-2 flex justify-between items-center">
          <span className="text-xl font-bold text-[#0066CC] tracking-tight">Gojira</span>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full bg-[#0066CC] text-white flex items-center justify-center text-sm font-bold"
              title={session?.user?.name || session?.user?.email || ''}
            >
              {getInitials(session?.user?.name || session?.user?.email || 'U')}
            </div>
            {session?.user?.role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm text-[#42526E] hover:text-[#172B4D] font-medium transition"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
              className="text-sm text-[#42526E] hover:text-[#172B4D] transition"
            >
              Logout
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6">
          <h2 className="text-lg font-semibold text-[#172B4D] mb-4">Your Boards</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-[#D93025] border border-red-200 rounded text-sm">{error}</div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-[#E8EAED] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {boards.map((board) => (
                <Link key={board._id} href={`/boards/${board._id}`}>
                  <div className="bg-white border border-[#D0D4DC] rounded-lg p-4 h-24 relative group cursor-pointer hover:shadow-md hover:border-[#0066CC] transition shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${getBoardColor(board._id)}`} />
                      <p className="text-[#172B4D] font-semibold text-sm">{board.title}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteBoard(board._id, e)}
                      className="absolute top-2 right-2 text-[#7A8699] opacity-0 group-hover:opacity-100 hover:text-[#D93025] rounded p-1 transition text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </Link>
              ))}

              {showForm ? (
                <div className="bg-white border border-[#D0D4DC] rounded-lg p-3 h-auto flex flex-col gap-2 shadow-sm">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setBoardPrefix(suggestPrefix(e.target.value)); }}
                    placeholder="Board title"
                    autoFocus
                    className="px-2 py-1.5 text-sm rounded-md border border-[#D0D4DC] text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowForm(false); setTitle(''); setBoardPrefix(''); } }}
                  />
                  <input
                    type="text"
                    value={boardPrefix}
                    onChange={(e) => setBoardPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8))}
                    placeholder="Prefix e.g. GENSYS"
                    className="px-2 py-1.5 text-sm rounded-md border border-[#D0D4DC] text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateBoard}
                      className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-3 py-1 text-xs rounded-md transition"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setTitle(''); setBoardPrefix(''); }}
                      className="text-[#42526E] hover:text-[#172B4D] text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-white border border-[#D0D4DC] rounded-lg p-4 h-24 text-[#42526E] hover:border-[#0066CC] hover:text-[#0066CC] text-sm font-medium transition text-left shadow-sm"
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
