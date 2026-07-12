# Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark-gradient AI-generated aesthetic with a dense, professional light-theme design system (Inter font, neutral text, color only on icons and interactive controls).

**Architecture:** Six sequential tasks — foundation first (font + CSS), then each surface. All changes are pure styling: no logic, no API, no new components. Tailwind arbitrary-value syntax (`bg-[#F4F5F7]`) is used throughout so no theme configuration is needed.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, `next/font/google` (Inter)

## Global Constraints

- Font: **Inter** via `next/font/google`, CSS variable `--font-inter`
- Rule: **text is always neutral**. `#0066CC` appears only on icons, badges, avatars, and button backgrounds — never on plain body/label text
- Accent: `#0066CC` (hover darken: `#0052A3`)
- Shell/page bg: `#F4F5F7`
- Sidebar + Navbar bg: `#FFFFFF`, border `1px solid #E8EAED`
- Primary text: `#172B4D` · Secondary text: `#42526E` · Muted/labels: `#7A8699`
- Column border: `1px solid #D0D4DC` · Card border: `1px solid #E0E3E8`
- Active sidebar item: `bg-[#E8F0FE] text-[#0066CC]`
- Buttons — Primary: `bg-[#0066CC] text-white rounded-md` · Destructive: `text-[#D93025]` text-only · Secondary: `bg-[#F4F5F7] text-[#42526E] border border-[#D0D4DC]`
- Modal backdrop: `bg-black/30` (was `bg-black/50`)
- Build verification: `node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build` (PowerShell)
- No test framework — build success is verification
- Shell: PowerShell

---

### Task 1: Foundation — font and global CSS

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS variable `--font-inter` available globally; `body` uses Inter; scrollbar styled for light backgrounds

- [ ] **Step 1: Replace `app/globals.css` entirely**

```css
@import "tailwindcss";

:root {
  --background: #F4F5F7;
  --foreground: #172B4D;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, sans-serif;
}

/* Custom scrollbar — light-mode appropriate */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.25); }
::-webkit-scrollbar-corner { background: transparent; }
```

- [ ] **Step 2: Replace `app/layout.tsx` entirely**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gojira",
  description: "Project management for teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Commit**

```powershell
git add app/globals.css app/layout.tsx
git commit -m "feat: switch to Inter font and light-mode CSS foundation"
```

---

### Task 2: Auth pages — login and signup

**Files:**
- Modify: `app/(auth)/login/LoginForm.tsx`
- Modify: `app/(auth)/signup/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: both auth pages use `#F4F5F7` bg, `#FFFFFF` card, `#0066CC` branding

- [ ] **Step 1: Replace `app/(auth)/login/LoginForm.tsx` entirely**

Preserve all logic (state, handlers, router, searchParams). Only the returned JSX changes:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) setSuccess(message);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (!result?.ok) { setError(result?.error || 'Invalid email or password'); return; }
      router.push('/boards');
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-[#F4F5F7]">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-[#E8EAED] shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#0066CC]">Gojira</h1>
          <p className="text-[#7A8699] text-sm mt-1">Log in to your account</p>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">{success}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-[#D93025] border border-red-200 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#42526E] mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4DC] rounded-md text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#42526E] mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4DC] rounded-md text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white py-2 rounded-md font-medium disabled:opacity-50 transition"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#42526E]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#0066CC] font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/(auth)/signup/page.tsx` entirely**

Preserve all logic. Only the returned JSX changes:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed'); return; }
      router.push('/login?message=Account created. Please login.');
    } catch (err) {
      setError('An error occurred during signup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-[#F4F5F7]">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-[#E8EAED] shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#0066CC]">Gojira</h1>
          <p className="text-[#7A8699] text-sm mt-1">Create your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-[#D93025] border border-red-200 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#42526E] mb-1">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4DC] rounded-md text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#42526E] mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4DC] rounded-md text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#42526E] mb-1">
              Password <span className="text-[#7A8699] font-normal">(min 6 characters)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4DC] rounded-md text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white py-2 rounded-md font-medium disabled:opacity-50 transition"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#42526E]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0066CC] font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```powershell
git add "app/(auth)/login/LoginForm.tsx" "app/(auth)/signup/page.tsx"
git commit -m "feat: light theme for login and signup pages"
```

---

### Task 3: Boards list page

**Files:**
- Modify: `app/boards/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `/boards` page with light navbar, white board cards (colored dot + dark title), `#0066CC` create button

- [ ] **Step 1: Replace `app/boards/page.tsx` entirely**

All logic (state, handlers) is unchanged. Only the JSX changes:

```tsx
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
```

- [ ] **Step 2: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```powershell
git add app/boards/page.tsx
git commit -m "feat: light theme for boards list page"
```

---

### Task 4: Board detail page shell

**Files:**
- Modify: `app/boards/[id]/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: board detail page with light navbar, light sidebar, light board title bar, light members panel, light add-list area. All logic/state/handlers unchanged.

- [ ] **Step 1: Update the loading state in `app/boards/[id]/page.tsx`**

Find this block (around line 302):
```tsx
    if (loading) {
    return (
      <AuthGuard>
        <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
          <div className="text-white/50">Loading...</div>
        </div>
      </AuthGuard>
    );
  }
```

Replace with:
```tsx
  if (loading) {
    return (
      <AuthGuard>
        <div className="h-screen flex items-center justify-center bg-[#F4F5F7]">
          <div className="text-[#7A8699]">Loading...</div>
        </div>
      </AuthGuard>
    );
  }
```

- [ ] **Step 2: Update the outer wrapper div**

Find:
```tsx
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
```

Replace with:
```tsx
      <div className="h-screen flex flex-col overflow-hidden bg-[#F4F5F7]">
```

- [ ] **Step 3: Update the navbar**

Find:
```tsx
        <nav className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/60 hover:text-white transition p-1 rounded hover:bg-white/10"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                {sidebarOpen ? (
                  <path d="M2 3h12v1.5H2V3zm0 4.25h8v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
                ) : (
                  <path d="M2 3h12v1.5H2V3zm0 4.25h12v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
                )}
              </svg>
            </button>
            <span className="text-white font-bold text-lg tracking-tight">Gojira</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold"
              title={session?.user?.name || session?.user?.email || ''}
            >
              {getInitials(session?.user?.name || session?.user?.email || 'U')}
            </div>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
              className="text-white/60 hover:text-white text-sm transition"
            >
              Logout
            </button>
          </div>
        </nav>
```

Replace with:
```tsx
        <nav className="bg-white border-b border-[#E8EAED] px-4 py-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#42526E] hover:text-[#172B4D] transition p-1 rounded hover:bg-[#F4F5F7]"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                {sidebarOpen ? (
                  <path d="M2 3h12v1.5H2V3zm0 4.25h8v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
                ) : (
                  <path d="M2 3h12v1.5H2V3zm0 4.25h12v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
                )}
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
```

- [ ] **Step 4: Update the sidebar**

Find:
```tsx
          <aside
            className={`flex-shrink-0 bg-black/20 backdrop-blur border-r border-white/10 flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${
              sidebarOpen ? 'w-56' : 'w-0'
            }`}
          >
            <div className="w-56 px-3 pt-4 pb-1 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap">
              Boards
            </div>

            <nav className="w-56 flex-1 px-2 py-1 space-y-0.5">
              {allBoards.map((b) => (
                <Link
                  key={b._id}
                  href={`/boards/${b._id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                    b._id === boardId
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${getBoardColor(b._id)}`} />
                  <span className="truncate">{b.title}</span>
                </Link>
              ))}
            </nav>

            {/* New board */}
            <div className="w-56 px-2 py-3 border-t border-white/10">
              {showNewBoardForm ? (
                <form onSubmit={handleCreateBoardFromSidebar} className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => {
                      setNewBoardTitle(e.target.value);
                      setNewBoardPrefix(suggestPrefix(e.target.value));
                    }}
                    placeholder="Board name"
                    className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowNewBoardForm(false);
                        setNewBoardTitle('');
                        setNewBoardPrefix('');
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={newBoardPrefix}
                    onChange={(e) => setNewBoardPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8))}
                    placeholder="Prefix e.g. GENSYS"
                    className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 font-mono"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded-lg transition">
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewBoardForm(false); setNewBoardTitle(''); setNewBoardPrefix(''); }}
                      className="text-white/50 hover:text-white text-xs transition"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowNewBoardForm(true)}
                  className="w-full text-left text-white/50 hover:text-white hover:bg-white/10 text-sm px-2 py-1.5 rounded-lg transition"
                >
                  + New board
                </button>
              )}
            </div>
          </aside>
```

Replace with:
```tsx
          <aside
            className={`flex-shrink-0 bg-white border-r border-[#E8EAED] flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${
              sidebarOpen ? 'w-56' : 'w-0'
            }`}
          >
            <div className="w-56 px-3 pt-4 pb-1 text-xs font-semibold text-[#7A8699] uppercase tracking-wider whitespace-nowrap">
              Boards
            </div>

            <nav className="w-56 flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
              {allBoards.map((b) => (
                <Link
                  key={b._id}
                  href={`/boards/${b._id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                    b._id === boardId
                      ? 'bg-[#E8F0FE] text-[#0066CC] font-medium'
                      : 'text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${getBoardColor(b._id)}`} />
                  <span className="truncate">{b.title}</span>
                </Link>
              ))}
            </nav>

            {/* New board */}
            <div className="w-56 px-2 py-3 border-t border-[#E8EAED]">
              {showNewBoardForm ? (
                <form onSubmit={handleCreateBoardFromSidebar} className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => { setNewBoardTitle(e.target.value); setNewBoardPrefix(suggestPrefix(e.target.value)); }}
                    placeholder="Board name"
                    className="w-full px-2 py-1.5 text-sm rounded-md bg-white text-[#172B4D] placeholder-[#7A8699] border border-[#D0D4DC] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowNewBoardForm(false); setNewBoardTitle(''); setNewBoardPrefix(''); } }}
                  />
                  <input
                    type="text"
                    value={newBoardPrefix}
                    onChange={(e) => setNewBoardPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8))}
                    placeholder="Prefix e.g. GENSYS"
                    className="w-full px-2 py-1.5 text-sm rounded-md bg-white text-[#172B4D] placeholder-[#7A8699] border border-[#D0D4DC] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent font-mono"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs py-1 rounded-md transition">
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewBoardForm(false); setNewBoardTitle(''); setNewBoardPrefix(''); }}
                      className="text-[#7A8699] hover:text-[#172B4D] text-xs transition"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowNewBoardForm(true)}
                  className="w-full text-left text-[#42526E] hover:text-[#172B4D] hover:bg-[#F4F5F7] text-sm px-2 py-1.5 rounded-lg transition"
                >
                  + New board
                </button>
              )}
            </div>
          </aside>
```

- [ ] **Step 5: Update board title bar and members panel**

Find:
```tsx
            {/* Board title + members bar */}
            <div className="flex-shrink-0 px-5 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-white text-2xl font-bold">{board?.title}</h1>
                  {boardMembers.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {boardMembers.slice(0, 5).map((member) => (
                        <div
                          key={member._id}
                          title={member.name}
                          className="w-6 h-6 rounded-full bg-white/30 border border-white/50 text-white text-xs flex items-center justify-center font-bold"
                        >
                          {getInitials(member.name)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="text-white/70 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
                >
                  Members
                </button>
              </div>

              {/* Members panel */}
              {showMembers && (
                <div className="mt-3 bg-white/10 backdrop-blur rounded-xl p-3 max-w-sm">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {boardMembers.map((member) => (
                      <div key={member._id} className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                        {member.name}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Add member by email"
                      className="flex-1 px-2 py-1 text-xs rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50"
                    />
                    <button type="submit" className="bg-white text-gray-800 px-3 py-1 text-xs rounded-lg font-medium hover:bg-white/90 transition">
                      Add
                    </button>
                  </form>
                  {error && <p className="text-red-300 text-xs mt-1">{error}</p>}
                </div>
              )}
            </div>
```

Replace with:
```tsx
            {/* Board title + members bar */}
            <div className="flex-shrink-0 px-5 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[#172B4D] text-2xl font-bold">{board?.title}</h1>
                  {boardMembers.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {boardMembers.slice(0, 5).map((member) => (
                        <div
                          key={member._id}
                          title={member.name}
                          className="w-6 h-6 rounded-full bg-[#E8F0FE] border border-[#D0D4DC] text-[#0066CC] text-xs flex items-center justify-center font-bold"
                        >
                          {getInitials(member.name)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="text-[#42526E] hover:text-[#172B4D] text-sm bg-[#F4F5F7] hover:bg-[#E8EAED] border border-[#D0D4DC] px-3 py-1.5 rounded-md transition"
                >
                  Members
                </button>
              </div>

              {/* Members panel */}
              {showMembers && (
                <div className="mt-3 bg-white border border-[#E8EAED] rounded-xl p-3 max-w-sm shadow-sm">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {boardMembers.map((member) => (
                      <div key={member._id} className="bg-[#F4F5F7] text-[#42526E] border border-[#E8EAED] px-2 py-0.5 rounded-full text-xs">
                        {member.name}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Add member by email"
                      className="flex-1 px-2 py-1 text-xs rounded-md border border-[#D0D4DC] text-[#172B4D] placeholder-[#7A8699] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                    />
                    <button type="submit" className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-3 py-1 text-xs rounded-md font-medium transition">
                      Add
                    </button>
                  </form>
                  {error && <p className="text-[#D93025] text-xs mt-1">{error}</p>}
                </div>
              )}
            </div>
```

- [ ] **Step 6: Update the "Add a list" area**

Find:
```tsx
                    {/* Add list */}
                    <div className="min-w-64 flex-shrink-0">
                      {showAddList ? (
                        <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                          <input
                            type="text"
                            autoFocus
                            value={newListTitle}
                            onChange={(e) => setNewListTitle(e.target.value)}
                            placeholder="Enter list name"
                            className="w-full px-3 py-2 text-sm rounded-lg bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateList(e as unknown as React.FormEvent);
                              if (e.key === 'Escape') {
                                setShowAddList(false);
                                setNewListTitle('');
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleCreateList(e as unknown as React.FormEvent)}
                              className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600 transition"
                            >
                              Add list
                            </button>
                            <button
                              onClick={() => setShowAddList(false)}
                              className="text-white/70 hover:text-white text-sm transition"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddList(true)}
                          className="w-full text-left text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-sm font-medium transition"
                        >
                          + Add a list
                        </button>
                      )}
                    </div>
```

Replace with:
```tsx
                    {/* Add list */}
                    <div className="min-w-64 flex-shrink-0">
                      {showAddList ? (
                        <div className="bg-white border border-[#D0D4DC] rounded-lg p-3 shadow-sm">
                          <input
                            type="text"
                            autoFocus
                            value={newListTitle}
                            onChange={(e) => setNewListTitle(e.target.value)}
                            placeholder="Enter list name"
                            className="w-full px-3 py-2 text-sm rounded-md border border-[#D0D4DC] text-[#172B4D] placeholder-[#7A8699] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent mb-2"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateList(e as unknown as React.FormEvent);
                              if (e.key === 'Escape') { setShowAddList(false); setNewListTitle(''); }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleCreateList(e as unknown as React.FormEvent)}
                              className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-3 py-1 text-sm rounded-md transition"
                            >
                              Add list
                            </button>
                            <button
                              onClick={() => setShowAddList(false)}
                              className="text-[#7A8699] hover:text-[#172B4D] text-sm transition"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddList(true)}
                          className="w-full text-left text-[#42526E] hover:text-[#172B4D] bg-white border border-[#D0D4DC] hover:border-[#0066CC] rounded-lg px-4 py-3 text-sm font-medium transition shadow-sm"
                        >
                          + Add a list
                        </button>
                      )}
                    </div>
```

- [ ] **Step 7: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```powershell
git add "app/boards/[id]/page.tsx"
git commit -m "feat: light theme for board detail shell (navbar, sidebar, title bar)"
```

---

### Task 5: Kanban columns and card tiles

**Files:**
- Modify: `app/boards/[id]/DraggableList.tsx`
- Modify: `app/boards/[id]/DraggableCard.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: columns white with `#D0D4DC` border; cards white with `#E0E3E8` border and `shadow-sm`

- [ ] **Step 1: Replace `app/boards/[id]/DraggableList.tsx` entirely**

All props and logic unchanged. Only className strings change:

```tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { DraggableCard } from './DraggableCard';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface DraggableListProps {
  listId: string;
  title: string;
  cards: Card[];
  draggingCardId: string | null;
  onCardClick: (card: Card) => void;
  onDeleteList: (listId: string) => void;
  onAddCard: (listId: string) => void;
  selectedListId: string;
  newCardTitle: string;
  onNewCardTitleChange: (title: string) => void;
  onCreateCard: (e: React.FormEvent) => void;
  sequencePrefix: string;
}

export function DraggableList({
  listId,
  title,
  cards,
  draggingCardId,
  onCardClick,
  onDeleteList,
  onAddCard,
  selectedListId,
  newCardTitle,
  onNewCardTitleChange,
  onCreateCard,
  sequencePrefix,
}: DraggableListProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `list-${listId}` });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white border border-[#D0D4DC] rounded-lg flex flex-col min-w-64 max-w-64 flex-shrink-0 max-h-[calc(100vh-120px)] transition ${
        isOver ? 'ring-2 ring-[#0066CC]' : ''
      }`}
    >
      {/* List Header */}
      <div className="flex justify-between items-center px-3 pt-3 pb-1 group">
        <h3 className="font-semibold text-sm text-[#172B4D]">{title}</h3>
        <button
          onClick={() => onDeleteList(listId)}
          className="text-[#7A8699] hover:text-[#D93025] opacity-0 group-hover:opacity-100 transition text-sm leading-none p-1 rounded hover:bg-[#F4F5F7]"
        >
          ✕
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-2 min-h-8">
        {cards.map((card) => (
          <DraggableCard key={card._id} card={card} onCardClick={onCardClick} sequencePrefix={sequencePrefix} />
        ))}
        {isOver && draggingCardId && (
          <div className="h-10 rounded-md border-2 border-dashed border-[#0066CC] bg-[#E8F0FE] opacity-60" />
        )}
      </div>

      {/* Add Card */}
      <div className="px-2 pb-2 pt-1">
        {selectedListId === listId ? (
          <form onSubmit={onCreateCard}>
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(e) => onNewCardTitleChange(e.target.value)}
              placeholder="Enter a title for this card..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border border-[#0066CC] text-[#172B4D] placeholder-[#7A8699] focus:outline-none resize-none mb-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCreateCard(e as any); }
              }}
            />
            <div className="flex gap-2 items-center">
              <button
                type="submit"
                className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-3 py-1 text-sm rounded-md transition font-medium"
              >
                Add card
              </button>
              <button
                type="button"
                onClick={() => onAddCard('')}
                className="text-[#7A8699] hover:text-[#172B4D] text-lg leading-none transition"
              >
                ✕
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => onAddCard(listId)}
            className="w-full text-left text-[#42526E] hover:text-[#172B4D] hover:bg-[#F4F5F7] text-sm px-2 py-1.5 rounded-md transition"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/boards/[id]/DraggableCard.tsx` entirely**

All props and logic unchanged:

```tsx
'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface DraggableCardProps {
  card: Card;
  onCardClick: (card: Card) => void;
  sequencePrefix: string;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function DraggableCard({ card, onCardClick, sequencePrefix }: DraggableCardProps) {
  const { setNodeRef, transform, isDragging, listeners, attributes } = useDraggable({
    id: `card-${card._id}`,
  });

  const ticketId = card.ticketNumber != null ? `${sequencePrefix}-${card.ticketNumber}` : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onCardClick(card); }}
      className={`bg-white rounded-md shadow-sm border border-[#E0E3E8] px-3 py-2 cursor-pointer hover:shadow-md hover:border-[#0066CC] transition group ${
        isDragging ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {ticketId && (
        <p className="text-xs font-mono text-[#7A8699] mb-1">{ticketId}</p>
      )}
      <p className="text-sm text-[#172B4D] font-medium leading-snug">{card.title}</p>

      {card.description && (
        <p className="text-xs text-[#42526E] mt-1 line-clamp-2">{card.description}</p>
      )}

      {card.assigneeId && (
        <div className="flex items-center gap-1 mt-2">
          <div className="w-5 h-5 rounded-full bg-[#0066CC] text-white text-xs flex items-center justify-center font-bold">
            {getInitials(card.assigneeId.name)}
          </div>
          <span className="text-xs text-[#42526E]">{card.assigneeId.name}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```powershell
git add "app/boards/[id]/DraggableList.tsx" "app/boards/[id]/DraggableCard.tsx"
git commit -m "feat: light theme for kanban columns and card tiles"
```

---

### Task 6: Card surfaces — CardView, CardModal, full-page card

**Files:**
- Modify: `app/boards/[id]/CardView.tsx`
- Modify: `app/boards/[id]/CardModal.tsx`
- Modify: `app/boards/[id]/cards/[cardId]/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: CardView uses `#172B4D` text throughout; modal backdrop is `bg-black/30`; full-page card uses light navbar + sidebar identical to board detail page

- [ ] **Step 1: Update text colors in `app/boards/[id]/CardView.tsx`**

The file has complete logic already. Apply these className changes throughout the file:

**In `titleComponent()`:**
- Input: `className="flex-1 text-lg font-semibold text-[#172B4D] border-b-2 border-[#0066CC] focus:outline-none bg-transparent pb-0.5"`
- H2: `className="flex-1 text-lg font-semibold text-[#172B4D] cursor-text hover:text-[#0066CC] transition-colors"`

**In the header div:**
- Card type icon placeholder: `className="text-[#7A8699] text-xl flex-shrink-0 select-none"`
- ↗ link: `className="text-[#7A8699] hover:text-[#42526E] text-base transition-colors"`
- ✕ button: `className="text-[#7A8699] hover:text-[#172B4D] text-xl leading-none transition-colors"`
- ← Back link: `className="text-sm text-[#42526E] hover:text-[#172B4D] font-medium transition-colors"`

**Description section:**
- "DESCRIPTION" label: `className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-2"`
- Textarea: `className="w-full text-sm text-[#172B4D] border border-[#0066CC] rounded-lg p-3 focus:outline-none resize-none"`
- Description display div: `className="min-h-32 text-sm text-[#172B4D] cursor-text hover:bg-[#F4F5F7] rounded-lg p-3 border border-transparent hover:border-[#E8EAED] transition whitespace-pre-wrap"`
- Placeholder span: `className="text-[#7A8699]"`

**Comments placeholder:**
- Label: `className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-2 block"`
- Coming-soon box: `className="bg-[#F4F5F7] border border-dashed border-[#D0D4DC] rounded-lg p-4 text-sm text-[#7A8699] text-center"`

**Right panel:**
- All placeholder labels (STATUS, LABELS, etc.): `className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1"`
- All placeholder value divs: `className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5"`
- Keep `pointer-events-none opacity-40` on placeholder wrapper divs
- Assignee label: `className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1"`
- Assignee select: `className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC] bg-white disabled:opacity-50 cursor-pointer text-[#172B4D]"`
- Error text: `className="text-xs text-[#D93025]"`
- Delete button: `className="mt-auto pt-4 text-xs text-[#D93025] hover:text-[#B91C1C] text-left transition-colors"`

Apply all changes and write the complete updated file. The logic (state, handlers, refs, useEffect) is completely unchanged — only className strings are modified.

- [ ] **Step 2: Update `app/boards/[id]/CardModal.tsx`**

Change only the backdrop and card container classNames:

Find:
```tsx
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
```

Replace with:
```tsx
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-md border border-[#E8EAED] w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 3: Update `app/boards/[id]/cards/[cardId]/page.tsx` — loading state and outer wrapper**

Find:
```tsx
        <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
          <div className="text-white/50">Loading...</div>
```
Replace with:
```tsx
        <div className="h-screen flex items-center justify-center bg-[#F4F5F7]">
          <div className="text-[#7A8699]">Loading...</div>
```

Find:
```tsx
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
```
Replace with:
```tsx
      <div className="h-screen flex flex-col overflow-hidden bg-[#F4F5F7]">
```

- [ ] **Step 4: Update full-page card navbar**

Find (in `cards/[cardId]/page.tsx`):
```tsx
        <nav className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/60 hover:text-white transition p-1 rounded hover:bg-white/10"
            >
```
Replace with:
```tsx
        <nav className="bg-white border-b border-[#E8EAED] px-4 py-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#42526E] hover:text-[#172B4D] transition p-1 rounded hover:bg-[#F4F5F7]"
            >
```

Find the "Gojira" span in the full-page card navbar:
```tsx
            <span className="text-white font-bold text-lg tracking-tight">Gojira</span>
```
Replace with:
```tsx
            <span className="font-bold text-lg text-[#0066CC] tracking-tight">Gojira</span>
```

Find the avatar div in the full-page card navbar:
```tsx
            <div className="w-7 h-7 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold">
```
Replace with:
```tsx
            <div className="w-7 h-7 rounded-full bg-[#0066CC] text-white text-xs flex items-center justify-center font-bold">
```

Find the logout button in the full-page card navbar:
```tsx
              className="text-white/60 hover:text-white text-sm transition"
```
Replace with:
```tsx
              className="text-[#42526E] hover:text-[#172B4D] text-sm transition"
```

- [ ] **Step 5: Update full-page card sidebar**

Find (in `cards/[cardId]/page.tsx`):
```tsx
          <aside className={`flex-shrink-0 bg-black/20 backdrop-blur border-r border-white/10 flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-56' : 'w-0'}`}>
            <div className="w-56 px-3 pt-4 pb-1 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap">
              Boards
            </div>
            <nav className="w-56 flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
              {allBoards.map((b) => (
                <Link
                  key={b._id}
                  href={`/boards/${b._id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                    b._id === boardId
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
```
Replace with:
```tsx
          <aside className={`flex-shrink-0 bg-white border-r border-[#E8EAED] flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-56' : 'w-0'}`}>
            <div className="w-56 px-3 pt-4 pb-1 text-xs font-semibold text-[#7A8699] uppercase tracking-wider whitespace-nowrap">
              Boards
            </div>
            <nav className="w-56 flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
              {allBoards.map((b) => (
                <Link
                  key={b._id}
                  href={`/boards/${b._id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                    b._id === boardId
                      ? 'bg-[#E8F0FE] text-[#0066CC] font-medium'
                      : 'text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
                  }`}
                >
```

Find the sidebar new-board form section border and button (in `cards/[cardId]/page.tsx`):
```tsx
            <div className="w-56 px-2 py-3 border-t border-white/10">
```
Replace with:
```tsx
            <div className="w-56 px-2 py-3 border-t border-[#E8EAED]">
```

Find the new-board form inputs and buttons in the full-page card sidebar. They use dark glass styles (`bg-white/10 text-white placeholder-white/40 border border-white/20`). Replace all of them with:
- Inputs: `bg-white text-[#172B4D] placeholder-[#7A8699] border border-[#D0D4DC] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent`
- Create button: `bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs py-1 rounded-md transition`
- Cancel ✕ button: `text-[#7A8699] hover:text-[#172B4D] text-xs transition`
- "+ New board" button: `text-[#42526E] hover:text-[#172B4D] hover:bg-[#F4F5F7] text-sm px-2 py-1.5 rounded-lg transition`

- [ ] **Step 6: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds, zero TypeScript errors.

- [ ] **Step 7: Commit**

```powershell
git add "app/boards/[id]/CardView.tsx" "app/boards/[id]/CardModal.tsx" "app/boards/[id]/cards/[cardId]/page.tsx"
git commit -m "feat: light theme for card view, modal, and full-page card route"
```
