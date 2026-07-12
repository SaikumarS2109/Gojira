# Admin Role System Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin role to Gojira with a seed script to bootstrap the first admin, and an admin-only dashboard for managing user roles.

**Architecture:** Role is stored on the User model and stamped into the NextAuth JWT/session via `lib/auth.ts` callbacks. Admin API routes and the admin page gate on `session.user.role === 'admin'`. The sidebar shows an Admin link only to admins.

**Tech Stack:** Next.js 15 App Router, NextAuth v5, Mongoose, Tailwind CSS v4, TypeScript.

## Global Constraints

- Role values: `'user'` | `'admin'` only — no other values
- Default role for all users (new and existing): `'user'`
- An admin cannot demote themselves
- Admin API routes return HTTP 403 when a non-admin accesses them
- No separate middleware file — access checks are co-located in each route/page
- `authOptions` is imported from `@/lib/auth` (not from the nextauth route file)
- DB connection: `import { connectDB } from '@/lib/mongodb'`
- Route params pattern: `{ params }: { params: Promise<{ id: string }> }` — must `await params`
- UI style matches existing app: same sidebar pattern, same color tokens (`#0066CC`, `#172B4D`, `#F4F5F7`, etc.)
- TypeScript strict — no `any` in new code

---

### Task 1: Add role to User model + extend NextAuth session

**Files:**
- Modify: `models/User.ts`
- Modify: `lib/auth.ts`
- Create: `types/next-auth.d.ts`

**Interfaces:**
- Produces: `session.user.role: 'user' | 'admin'` and `session.user.id: string` available in all routes and pages

- [ ] **Step 1: Add role field to User schema**

In `models/User.ts`, add after `passwordHash`:
```ts
role: {
  type: String,
  enum: ['user', 'admin'],
  default: 'user',
},
```

- [ ] **Step 2: Extend NextAuth types**

Create `types/next-auth.d.ts`:
```ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'user' | 'admin';
    };
  }

  interface User {
    role: 'user' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'user' | 'admin';
    id: string;
  }
}
```

- [ ] **Step 3: Stamp role into JWT and session**

Read `lib/auth.ts` to find the current callbacks and `authorize` function.

In `authorize`, return role alongside existing fields:
```ts
return { id: user._id.toString(), name: user.name, email: user.email, role: user.role ?? 'user' };
```

In `callbacks.jwt`:
```ts
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.role = (user as { role?: 'user' | 'admin' }).role ?? 'user';
  }
  return token;
},
```

In `callbacks.session`:
```ts
async session({ session, token }) {
  if (token && session.user) {
    session.user.id = token.id as string;
    session.user.role = (token.role as 'user' | 'admin') ?? 'user';
  }
  return session;
},
```

- [ ] **Step 4: Commit**

```bash
git add models/User.ts lib/auth.ts types/next-auth.d.ts
git commit -m "feat: add role field to User model and stamp into NextAuth session"
```

---

### Task 2: Seed script

**Files:**
- Create: `scripts/seed-admin.ts`

**Interfaces:**
- Consumes: `MONGODB_URI` from environment
- Usage: `npx ts-node scripts/seed-admin.ts <email>`

- [ ] **Step 1: Write seed script**

Create `scripts/seed-admin.ts`:
```ts
import mongoose from 'mongoose';
import { User } from '../models/User';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node scripts/seed-admin.ts <email>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: 'admin' },
    { new: true }
  );

  if (!user) {
    console.error(`No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✓ ${user.name} (${user.email}) is now an admin.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-admin.ts
git commit -m "feat: add seed-admin script to promote a user by email"
```

---

### Task 3: Admin API routes

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`

**Interfaces:**
- `GET /api/admin/users` → `{ users: Array<{ _id, name, email, role }> }`
- `PATCH /api/admin/users/[id]` body: `{ role: 'user' | 'admin' }` → `{ user: { _id, name, email, role } }`
- Both return 403 if `session.user.role !== 'admin'`
- PATCH returns 400 if trying to change own role

- [ ] **Step 1: Create GET /api/admin/users**

Create `app/api/admin/users/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({}, '_id name email role').sort({ createdAt: 1 }).lean();
  return NextResponse.json({ users });
}
```

- [ ] **Step 2: Create PATCH /api/admin/users/[id]**

Create `app/api/admin/users/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const body = await req.json();
  const role: unknown = body.role;
  if (role !== 'user' && role !== 'admin') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(id, { role }, { new: true, select: '_id name email role' }).lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin
git commit -m "feat: add admin user management API (GET + PATCH /api/admin/users)"
```

---

### Task 4: Admin page UI

**Files:**
- Create: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/users`, `PATCH /api/admin/users/[id]`
- Redirects to `/boards` if session missing or `role !== 'admin'`
- Self row: shows role badge but no action button

- [ ] **Step 1: Create admin page**

Create `app/admin/page.tsx`:
```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export default function AdminPage() {
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
      const data = await res.json();
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
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
      const data = await res.json();
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: data.user.role } : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F5F7] p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-[#172B4D] mb-6">Admin — Users</h1>

          {error && <p className="text-sm text-[#D93025] mb-4">{error}</p>}

          {loading ? (
            <p className="text-sm text-[#7A8699]">Loading...</p>
          ) : (
            <div className="bg-white border border-[#E0E3E8] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F4F5F7] border-b border-[#E0E3E8]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7A8699] uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7A8699] uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7A8699] uppercase tracking-wider">Role</th>
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
                              onClick={() => handleRoleChange(user._id, user.role === 'admin' ? 'user' : 'admin')}
                              disabled={updating === user._id}
                              className="text-xs text-[#0066CC] hover:text-[#0052A3] font-medium transition disabled:opacity-50"
                            >
                              {updating === user._id
                                ? 'Saving...'
                                : user.role === 'admin' ? 'Revoke admin' : 'Make admin'}
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
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: add admin page with user role management table"
```

---

### Task 5: Sidebar admin link

**Files:**
- Modify: `app/boards/[id]/page.tsx`
- Modify: `app/boards/page.tsx`

**Interfaces:**
- Renders an "Admin" link in the sidebar only when `session?.user?.role === 'admin'`
- Uses a red dot marker (`bg-[#D93025]`) to distinguish it from board links

- [ ] **Step 1: Add Admin link to board detail page sidebar**

In `app/boards/[id]/page.tsx`, inside the sidebar `<nav>` after the boards list, add:
```tsx
{session?.user?.role === 'admin' && (
  <Link
    href="/admin"
    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]"
  >
    <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#D93025]" />
    <span className="truncate">Admin</span>
  </Link>
)}
```

- [ ] **Step 2: Apply same change to boards list page sidebar**

In `app/boards/page.tsx`, find the equivalent sidebar nav and add the same Admin link block.

- [ ] **Step 3: Commit**

```bash
git add app/boards
git commit -m "feat: show Admin sidebar link for admin users"
```

---

### Task 6: Build verification

- [ ] **Step 1: Run TypeScript build**

```bash
npm run build
```

Expected: zero type errors, zero build failures.

- [ ] **Step 2: Run seed script**

```bash
MONGODB_URI=<your-uri> npx ts-node scripts/seed-admin.ts saikumarrajan@gmail.com
```

Expected: `✓ Sai (saikumarrajan@gmail.com) is now an admin.`

- [ ] **Step 3: Manual smoke test**

1. Sign in — confirm "Admin" link appears in sidebar
2. Navigate to `/admin` — confirm user table loads with correct roles
3. Promote a second user — confirm role badge updates to "admin"
4. Demote that user — confirm badge reverts to "user"
5. Confirm own row shows role badge but no action button
6. Sign in as a non-admin — confirm `/admin` redirects to `/boards`
