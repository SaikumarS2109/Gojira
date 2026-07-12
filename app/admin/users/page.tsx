'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminSidebar } from '@/components/AdminSidebar';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'admin') {
      router.push('/boards');
      return;
    }
    fetchUsers();
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
      <div className="min-h-screen bg-[#F4F5F7]">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-[#E8EAED] p-4 max-h-screen overflow-y-auto">
            <AdminSidebar session={session} />
          </aside>

          {/* Main content */}
          <div className="flex-1 p-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl font-bold text-[#172B4D] mb-6">Admin — Users</h1>

              {error && (
                <p className="text-sm text-[#D93025] mb-4">{error}</p>
              )}

              {loading ? (
                <p className="text-sm text-[#7A8699]">Loading...</p>
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
