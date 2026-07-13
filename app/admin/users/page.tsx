'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Loader } from '@/components/Loader';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface Board {
  _id: string;
  title: string;
  enabledCardTypes?: string[];
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'admin') {
      router.push('/boards');
      return;
    }
    fetchUsers();
    fetchBoards();
  }, [session, status]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json() as { users: AdminUser[] };
      setUsers(data.users);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      const data = await res.json();
      setBoards(data);
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    setUpdating(userId);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json() as { error: string };
        throw new Error(data.error || 'Failed to update role');
      }
      const data = await res.json() as { user: AdminUser };
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: data.user.role } : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

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
            {/* Admin section */}
            {session?.user?.role === 'admin' && (
              <div className="w-56 px-3 pt-4 pb-3 border-b border-[#E8EAED]">
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

            <div className="w-56 px-3 pt-4 pb-1 text-xs font-semibold text-[#7A8699] uppercase tracking-wider whitespace-nowrap">
              Boards
            </div>
            <nav className="w-56 flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
              {boards.map((board) => (
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
          </aside>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl font-bold text-[#172B4D] mb-6">Admin — Users</h1>

              {error && (
                <p className="text-sm text-[#D93025] mb-4">{error}</p>
              )}

              {loading ? (
                <Loader />
              ) : (
                <div className="bg-white border border-[#E0E3E8] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F4F5F7] border-b border-[#E0E3E8]">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#7A8699] uppercase tracking-wider">
                          Name
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#7A8699] uppercase tracking-wider">
                          Email
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#7A8699] uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E3E8]">
                      {users.map(user => {
                        const isSelf = user._id === session?.user?.id;
                        return (
                          <tr key={user._id} className="hover:bg-[#F9FAFB]">
                            <td className="px-4 py-3 text-[#172B4D] font-medium">{user.name}</td>
                            <td className="px-4 py-3 text-[#42526E]">{user.email}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                                user.role === 'admin'
                                  ? 'bg-[#E8F0FE] text-[#0066CC]'
                                  : 'bg-[#F4F5F7] text-[#42526E]'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!isSelf && (
                                <button
                                  onClick={() =>
                                    handleRoleChange(
                                      user._id,
                                      user.role === 'admin' ? 'user' : 'admin'
                                    )
                                  }
                                  disabled={updating === user._id}
                                  className="text-xs text-[#0066CC] hover:text-[#0052A3] font-medium transition disabled:opacity-50"
                                >
                                  {updating === user._id
                                    ? 'Saving...'
                                    : user.role === 'admin'
                                    ? 'Revoke admin'
                                    : 'Make admin'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
