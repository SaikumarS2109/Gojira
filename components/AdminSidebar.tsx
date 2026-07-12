'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';

interface AdminSidebarProps {
  session: Session | null;
}

export function AdminSidebar({ session }: AdminSidebarProps) {
  const pathname = usePathname();

  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  const isUsersActive = pathname === '/admin/users';
  const isColumnsActive = pathname === '/admin/columns';

  return (
    <div className="mt-6 pt-6 border-t border-[#E8EAED]">
      <p className="px-2 text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-2">
        Admin
      </p>
      <Link
        href="/admin/users"
        className={`flex items-center gap-2 px-2 py-1.5 mx-2 rounded-lg text-sm transition ${
          isUsersActive
            ? 'bg-[#E8F0FE] text-[#0066CC] font-medium'
            : 'text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
        }`}
      >
        <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#0066CC]" />
        <span className="truncate">Users</span>
      </Link>
      <Link
        href="/admin/columns"
        className={`flex items-center gap-2 px-2 py-1.5 mx-2 rounded-lg text-sm transition ${
          isColumnsActive
            ? 'bg-[#E8F0FE] text-[#0066CC] font-medium'
            : 'text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
        }`}
      >
        <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#0066CC]" />
        <span className="truncate">Board Management</span>
      </Link>
    </div>
  );
}
