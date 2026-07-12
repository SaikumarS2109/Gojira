'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminSidebar } from '@/components/AdminSidebar';

export default function AdminColumnsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'admin') {
      router.push('/boards');
      return;
    }
  }, [session, status]);

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
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold text-[#172B4D] mb-6">Admin — Board Management</h1>
              {/* Content will be added in Task 5 and 6 */}
              <p className="text-[#7A8699]">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
