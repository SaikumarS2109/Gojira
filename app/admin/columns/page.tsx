'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminSidebar } from '@/components/AdminSidebar';

interface Board {
  _id: string;
  title: string;
}

interface List {
  _id: string;
  title: string;
  order: number;
}

export default function AdminColumnsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [columns, setColumns] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'admin') {
      router.push('/boards');
      return;
    }
    fetchBoards();
  }, [session, status]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      const data = await res.json();
      setBoards(data);
      if (data.length > 0) {
        setSelectedBoardId(data[0]._id);
        fetchColumns(data[0]._id);
      }
    } catch (err) {
      setError('Failed to load boards');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchColumns = async (boardId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/lists`);
      if (!res.ok) throw new Error('Failed to fetch columns');
      const data = await res.json();
      setColumns(data.sort((a: List, b: List) => a.order - b.order));
    } catch (err) {
      console.error('Failed to fetch columns:', err);
      setColumns([]);
    }
  };

  const handleBoardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const boardId = e.target.value;
    setSelectedBoardId(boardId);
    if (boardId) {
      fetchColumns(boardId);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('columnTitle') as string;

    if (!title.trim() || !selectedBoardId) return;

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: selectedBoardId, title }),
      });
      if (!res.ok) throw new Error('Failed to add column');
      const newColumn = await res.json();
      setColumns([...columns, newColumn].sort((a: List, b: List) => a.order - b.order));
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError('Failed to add column');
      console.error(err);
    }
  };

  const handleRenameColumn = async (columnId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      const res = await fetch(`/api/lists/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error('Failed to rename column');
      const updated = await res.json();
      setColumns(columns.map((c) => (c._id === columnId ? updated : c)));
    } catch (err) {
      setError('Failed to rename column');
      console.error(err);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm('Delete this column? All cards will be deleted.')) return;

    try {
      const res = await fetch(`/api/lists/${columnId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete column');
      setColumns(columns.filter((c) => c._id !== columnId));
    } catch (err) {
      setError('Failed to delete column');
      console.error(err);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F5F7]">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-[#E8EAED] p-4 max-h-screen overflow-y-auto">
            <AdminSidebar session={session} />
          </aside>

          {/* Main content */}
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-[#172B4D] mb-6">Admin — Board Management</h1>

              {error && (
                <p className="text-sm text-[#D93025] mb-4">{error}</p>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-[#172B4D] mb-2">
                  Select Board
                </label>
                <select
                  value={selectedBoardId}
                  onChange={handleBoardChange}
                  className="px-3 py-2 border border-[#D0D4DC] rounded-md text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                >
                  <option value="">Select a board</option>
                  {boards.map((board) => (
                    <option key={board._id} value={board._id}>
                      {board.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBoardId && (
                <div>
                  <h2 className="text-lg font-semibold text-[#172B4D] mb-4">Columns</h2>
                  {columns.length === 0 ? (
                    <p className="text-[#7A8699]">No columns yet.</p>
                  ) : (
                    <div className="bg-white border border-[#E0E3E8] rounded-lg overflow-hidden mb-6">
                      <ul className="divide-y divide-[#E0E3E8]">
                        {columns.map((column) => (
                          <li
                            key={column._id}
                            className="px-4 py-3 flex items-center gap-3 hover:bg-[#F9FAFB] group"
                          >
                            <span className="text-sm font-medium text-[#7A8699] w-8">
                              {column.order + 1}
                            </span>
                            <span className="flex-1 text-[#172B4D] font-medium">
                              {column.title}
                            </span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => {
                                  const newTitle = prompt('Rename column:', column.title);
                                  if (newTitle) handleRenameColumn(column._id, newTitle);
                                }}
                                className="text-xs text-[#0066CC] hover:text-[#0052A3] font-medium transition"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteColumn(column._id)}
                                className="text-xs text-[#D93025] hover:text-[#A01810] font-medium transition"
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <form onSubmit={handleAddColumn} className="bg-white border border-[#E0E3E8] rounded-lg p-4">
                    <label className="block text-sm font-medium text-[#172B4D] mb-2">
                      Add Column
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="columnTitle"
                        placeholder="Column title"
                        className="flex-1 px-3 py-2 border border-[#D0D4DC] rounded-md text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-4 py-2 text-sm font-medium rounded-md transition"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
