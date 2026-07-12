# Admin Role System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `admin` role to users, bootstrap it via a seed script, expose admin API routes for user management, and build an admin-only dashboard page accessible from the sidebar/navbar.

**Architecture:** `role` is stored on the User Mongoose model and stamped into the NextAuth JWT at sign-in via `lib/auth.ts` callbacks. Every admin route reads `session.user.role` from `getServerSession`. The admin page at `/admin` client-side redirects non-admins. The sidebar in `app/boards/[id]/page.tsx` and the navbar in `app/boards/page.tsx` conditionally render an Admin link.

**Tech Stack:** Next.js 15 App Router, NextAuth v4 (`next-auth`), Mongoose, Tailwind CSS v4, TypeScript.

## Global Constraints

- Role values: `'user'` | `'admin'` only — no other strings
- Default role for all users (new and existing): `'user'`
- An admin cannot change their own role
- Admin routes return HTTP 403 (not 401) for non-admins
- `authOptions` is imported from `@/lib/auth`
- DB helper: `import { connectDB } from '@/lib/mongodb'`
- Route params in Next.js 15: `{ params }: { params: Promise<{ id: string }> }` — always `await params`
- No `any` in new code; existing `any` in unchanged files is fine
- UI colors: `#0066CC` (blue), `#172B4D` (dark navy), `#42526E` (mid), `#7A8699` (muted), `#F4F5F7` (bg), `#E0E3E8` (border), `#D93025` (red)

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `models/User.ts` | Add `role` field |
| Modify | `types/next-auth.d.ts` | Add `role` to Session, User, JWT types |
| Modify | `lib/auth.ts` | Return `role` from `authorize`; stamp into JWT + session |
| Create | `scripts/seed-admin.ts` | One-time script to promote a user to admin by email |
| Create | `app/api/admin/users/route.ts` | `GET /api/admin/users` |
| Create | `app/api/admin/users/[id]/route.ts` | `PATCH /api/admin/users/[id]` |
| Create | `app/admin/page.tsx` | Admin dashboard UI (user table) |
| Modify | `app/boards/[id]/page.tsx` | Add Admin link in sidebar |
| Modify | `app/boards/page.tsx` | Add Admin link in navbar |

---

### Task 1: User model role field + NextAuth session

**Files:**
- Modify: `models/User.ts`
- Modify: `types/next-auth.d.ts`
- Modify: `lib/auth.ts`

**Interfaces:**
- Produces: `session.user.role: 'user' | 'admin'` — consumed by Tasks 3, 4, 5

- [ ] **Step 1: Add `role` to User schema**

Open `models/User.ts`. It currently has `name`, `email`, `passwordHash`. Add `role` after `passwordHash`:

```ts
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
```

- [ ] **Step 2: Extend NextAuth types**

Open `types/next-auth.d.ts`. It currently declares `Session.user.id` and `JWT.id`. Replace the entire file:

```ts
import NextAuth from 'next-auth';

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
    id: string;
    name?: string | null;
    email?: string | null;
    role: 'user' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'user' | 'admin';
  }
}

declare global {
  var mongoose: any;
}
```

- [ ] **Step 3: Stamp role in `lib/auth.ts`**

Open `lib/auth.ts`. Make three changes:

**3a — `authorize` return**: change the return value to include `role`:
```ts
return {
  id: user._id.toString(),
  email: user.email,
  name: user.name,
  role: (user.role ?? 'user') as 'user' | 'admin',
};
```

**3b — `jwt` callback**: add `token.role`:
```ts
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.role = (user as { role?: 'user' | 'admin' }).role ?? 'user';
  }
  return token;
},
```

**3c — `session` callback**: add `session.user.role`:
```ts
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.role = (token.role as 'user' | 'admin') ?? 'user';
  }
  return session;
},
```

The full updated `lib/auth.ts`:
```ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import { connectDB } from './mongodb';
import { User } from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcryptjs.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: (user.role ?? 'user') as 'user' | 'admin',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: 'user' | 'admin' }).role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as 'user' | 'admin') ?? 'user';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors about `session.user.role` not existing, check that `types/next-auth.d.ts` is being picked up (it should be in the project root's `types/` folder which TypeScript picks up automatically).

- [ ] **Step 5: Commit**

```bash
git add models/User.ts types/next-auth.d.ts lib/auth.ts
git commit -m "feat: add role field to User model and stamp into NextAuth JWT/session"
```

---

### Task 2: Seed script

**Files:**
- Create: `scripts/seed-admin.ts`

**Interfaces:**
- Consumes: `MONGODB_URI` env var, email as `process.argv[2]`
- Consumes: `User` model from `../models/User` (role field from Task 1)

- [ ] **Step 1: Create the script**

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
    console.error('MONGODB_URI not set in environment');
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

- [ ] **Step 2: Run it against the dev database**

```bash
MONGODB_URI="<your-mongodb-uri-from-.env>" npx ts-node scripts/seed-admin.ts saikumarrajan@gmail.com
```

Expected output:
```
✓ Sai (saikumarrajan@gmail.com) is now an admin.
```

If you see `No user found`, check that the email matches exactly (case-insensitive lookup is applied).

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-admin.ts
git commit -m "feat: add seed-admin script to promote a user to admin by email"
```

---

### Task 3: Admin API routes

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`

**Interfaces:**
- Consumes: `session.user.role` from Task 1, `session.user.id` for self-check
- `GET /api/admin/users` → `200 { users: Array<{ _id: string; name: string; email: string; role: 'user' | 'admin' }> }`
- `PATCH /api/admin/users/[id]` body `{ role: 'user' | 'admin' }` → `200 { user: { _id, name, email, role } }`
- Both → `403 { error: 'Forbidden' }` if not admin
- PATCH → `400 { error: 'Cannot change your own role' }` if `id === session.user.id`
- PATCH → `400 { error: 'Invalid role' }` if role not `'user'` or `'admin'`
- PATCH → `404 { error: 'User not found' }` if id not in DB

- [ ] **Step 1: Create `GET /api/admin/users`**

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

- [ ] **Step 2: Create `PATCH /api/admin/users/[id]`**

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

  const body = await req.json() as { role?: unknown };
  const { role } = body;
  if (role !== 'user' && role !== 'admin') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true, select: '_id name email role' }
  ).lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin
git commit -m "feat: add admin user management API routes (GET + PATCH /api/admin/users)"
```

---

### Task 4: Admin page UI

**Files:**
- Create: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/users` (Task 3), `PATCH /api/admin/users/[id]` (Task 3)
- Consumes: `session.user.role` and `session.user.id` (Task 1)
- Redirects to `/boards` if `role !== 'admin'` or no session

- [ ] **Step 1: Create the admin page**

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
      <div className="min-h-screen bg-[#F4F5F7] p-8">
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
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: add admin page with user role management table"
```

---

### Task 5: Admin navigation links

**Files:**
- Modify: `app/boards/[id]/page.tsx` — sidebar nav
- Modify: `app/boards/page.tsx` — top navbar

**Interfaces:**
- Consumes: `session?.user?.role` from Task 1

**Note on layout difference:** `app/boards/[id]/page.tsx` has a left sidebar with a boards nav list — the Admin link goes there. `app/boards/page.tsx` has no sidebar; it has a top navbar — the Admin link goes in the navbar next to Logout.

- [ ] **Step 1: Add Admin link to board detail page sidebar**

In `app/boards/[id]/page.tsx`, find the sidebar `<nav>` element (it contains the `allBoards.map(...)` list). Add the Admin link immediately after the closing `</nav>` tag of the boards list and before the `{/* New board */}` div:

```tsx
{session?.user?.role === 'admin' && (
  <Link
    href="/admin"
    className="flex items-center gap-2 px-2 py-1.5 mx-2 rounded-lg text-sm transition text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]"
  >
    <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#D93025]" />
    <span className="truncate">Admin</span>
  </Link>
)}
```

- [ ] **Step 2: Add Admin link to boards list page navbar**

In `app/boards/page.tsx`, find the `<nav>` element. It currently has a user avatar div and a Logout button. Add an Admin link between them:

```tsx
{session?.user?.role === 'admin' && (
  <Link
    href="/admin"
    className="text-sm text-[#42526E] hover:text-[#172B4D] font-medium transition"
  >
    Admin
  </Link>
)}
```

The navbar `<div className="flex items-center gap-3">` block should look like this after the change:
```tsx
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
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/boards/[id]/page.tsx app/boards/page.tsx
git commit -m "feat: show Admin link in sidebar and navbar for admin users"
```

---

### Task 6: Build verification + smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: zero TypeScript errors, zero build failures, all pages compile.

- [ ] **Step 2: Start dev server and smoke test**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:

1. **Sign in as the seeded admin** (`saikumarrajan@gmail.com`) — after login, on the boards list page, confirm "Admin" link appears in the top navbar
2. **Navigate to a board** — confirm "Admin" link appears in the sidebar
3. **Click Admin link** — confirm `/admin` loads with a user table showing all users with name, email, role columns
4. **Promote a user** — click "Make admin" on a non-admin row — confirm button changes to "Saving..." then role badge updates to "admin" with blue styling
5. **Demote that user** — click "Revoke admin" — confirm role badge reverts to "user" with grey styling
6. **Own row** — confirm your own row shows the role badge but no action button
7. **Sign in as a non-admin** — navigate to `http://localhost:3000/admin` — confirm it immediately redirects to `/boards`
8. **API guard** — in browser console run `fetch('/api/admin/users').then(r => r.status)` while signed in as non-admin — confirm returns `403`

- [ ] **Step 3: Commit any fixes**

If any fixes were needed during smoke testing:

```bash
git add -p
git commit -m "fix: admin smoke test fixes"
```
