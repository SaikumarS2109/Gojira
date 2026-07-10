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

export default function BoardsPage() {
  const { data: session } = useSession();
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        body: JSON.stringify({ title }),
      });

      if (!res.ok) throw new Error('Failed to create board');

      const newBoard = await res.json();
      setBoards([...boards, newBoard]);
      setTitle('');
    } catch (err) {
      setError('Failed to create board');
      console.error(err);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
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
        <nav className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">TaskBoard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session?.user?.email}</span>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Board</h2>
            <form onSubmit={handleCreateBoard} className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter board title"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </form>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </div>

          {loading ? (
            <p>Loading boards...</p>
          ) : boards.length === 0 ? (
            <p className="text-gray-500">No boards yet. Create one to get started!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <div key={board._id} className="bg-white rounded-lg shadow p-4">
                  <Link href={`/boards/${board._id}`}>
                    <h3 className="text-lg font-semibold mb-2 text-blue-600 hover:underline">
                      {board.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-600 mb-4">Owner: {board.ownerId.name}</p>
                  <button
                    onClick={() => handleDeleteBoard(board._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
