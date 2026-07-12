'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Board {
  _id: string;
  title: string;
}

interface List {
  _id: string;
  title: string;
  order: number;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function SortableColumnItem({
  id,
  column,
  onRename,
  onDelete,
}: {
  id: string;
  column: List;
  onRename: (columnId: string, newTitle: string) => void;
  onDelete: (columnId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="px-4 py-3 flex items-center gap-3 hover:bg-[#F9FAFB] group bg-white border-b border-[#E0E3E8] last:border-b-0"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-[#7A8699] hover:text-[#172B4D] cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <span className="flex-1 text-[#172B4D] font-medium">
        {column.title}
      </span>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => {
            const newTitle = prompt('Rename column:', column.title);
            if (newTitle) onRename(id, newTitle);
          }}
          className="text-xs text-[#0066CC] hover:text-[#0052A3] font-medium transition"
        >
          Rename
        </button>
        <button
          onClick={() => onDelete(id)}
          className="text-xs text-[#D93025] hover:text-[#A01810] font-medium transition"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default function AdminColumnsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [columns, setColumns] = useState<List[]>([]);
  const [savedColumns, setSavedColumns] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      setAllBoards(data);
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
      const sorted = data.sort((a: List, b: List) => a.order - b.order);
      setColumns(sorted);
      setSavedColumns(sorted);
    } catch (err) {
      console.error('Failed to fetch columns:', err);
      setColumns([]);
      setSavedColumns([]);
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
      const updated = [...columns, newColumn].sort((a: List, b: List) => a.order - b.order);
      setColumns(updated);
      setSavedColumns(updated);
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
      const newColumns = columns.map((c) => (c._id === columnId ? updated : c));
      setColumns(newColumns);
      setSavedColumns(newColumns);
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
      const newColumns = columns.filter((c) => c._id !== columnId);
      setColumns(newColumns);
      setSavedColumns(newColumns);
    } catch (err) {
      setError('Failed to delete column');
      console.error(err);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((c) => c._id === active.id);
      const newIndex = columns.findIndex((c) => c._id === over.id);
      const newOrder = arrayMove(columns, oldIndex, newIndex);
      setColumns(newOrder);
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    setError('');
    try {
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].order !== i) {
          await fetch(`/api/lists/${columns[i]._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: i }),
          });
        }
      }
      setSavedColumns(columns);
    } catch (err) {
      setError('Failed to save column order');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(columns.map(c => c._id)) !== JSON.stringify(savedColumns.map(c => c._id));

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col overflow-hidden bg-[#F4F5F7]">
        {/* Top nav */}
        <nav className="bg-white border-b border-[#E8EAED] px-4 py-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#42526E] hover:text-[#172B4D] transition p-1 rounded hover:bg-[#F4F5F7]"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v1.5H2V3zm0 4.25h12v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
              </svg>
            </button>
            <span className="font-bold text-lg text-[#0066CC] tracking-tight">Gojira</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full bg-[#0066CC] text-white text-xs flex items-center justify-center font-bold"
              title={session?.user?.name || session?.user?.email || ''}
            >
              {getInitials(session?.user?.name || session?.user?.email || 'U')}
            </div>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
              className="text-[#42526E] hover:text-[#172B4D] text-sm transition"
            >
              Logout
            </button>
          </div>
        </nav>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`flex-shrink-0 bg-white border-r border-[#E8EAED] flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${
              sidebarOpen ? 'w-56' : 'w-0'
            }`}
          >
            <div className="w-56 px-3 pt-4 pb-1 text-xs font-semibold text-[#7A8699] uppercase tracking-wider whitespace-nowrap">
              Boards
            </div>
            <nav className="w-56 flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
              {allBoards.map((board) => (
                <Link
                  key={board._id}
                  href={`/boards/${board._id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]"
                >
                  <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#0066CC]" />
                  <span className="truncate">{board.title}</span>
                </Link>
              ))}
            </nav>

            {/* Admin section */}
            {session?.user?.role === 'admin' && (
              <div className="border-t border-[#E8EAED] px-3 py-3">
                <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider whitespace-nowrap mb-2">
                  Admin
                </p>
                <nav className="space-y-0.5">
                  <Link
                    href="/admin/users"
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                      pathname === '/admin/users'
                        ? 'bg-[#E8F0FE] text-[#0066CC] font-medium'
                        : 'text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#0066CC]" />
                    <span className="truncate">Users</span>
                  </Link>
                  <Link
                    href="/admin/columns"
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                      pathname === '/admin/columns'
                        ? 'bg-[#E8F0FE] text-[#0066CC] font-medium'
                        : 'text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#0066CC]" />
                    <span className="truncate">Board Management</span>
                  </Link>
                </nav>
              </div>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-8">
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
                  {allBoards.map((board) => (
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
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="bg-white border border-[#E0E3E8] rounded-lg overflow-hidden mb-6">
                        <SortableContext
                          items={columns.map((c) => c._id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="divide-y divide-[#E0E3E8]">
                            {columns.map((column) => (
                              <SortableColumnItem
                                key={column._id}
                                id={column._id}
                                column={column}
                                onRename={handleRenameColumn}
                                onDelete={handleDeleteColumn}
                              />
                            ))}
                          </ul>
                        </SortableContext>
                      </div>
                      {hasChanges && (
                        <button
                          onClick={handleSaveOrder}
                          disabled={saving}
                          className="bg-[#0066CC] hover:bg-[#0052A3] disabled:opacity-50 text-white px-6 py-2 text-sm font-medium rounded-md transition mb-6"
                        >
                          {saving ? 'Saving...' : 'Save Column Order'}
                        </button>
                      )}
                    </DndContext>
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
