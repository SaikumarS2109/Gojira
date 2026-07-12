# Card Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small "Edit Card" modal with a large two-column `CardView` component used in both a modal overlay and a standalone full-page route, with click-to-edit auto-save on all fields.

**Architecture:** A shared `CardView` component holds all UI; `CardModal` wraps it in a `max-w-4xl` overlay; a new `/boards/[id]/cards/[cardId]` route renders it full-page inside the existing sidebar+navbar shell. All saves fire `PATCH /api/cards/[id]` per field on blur/Enter — no save button.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Mongoose, NextAuth.

## Global Constraints

- No save button anywhere — every field auto-saves on blur/Enter (Ctrl+Enter for description)
- `onClose` prop on `CardView` is optional: when `undefined` (full-page route), render "← Back to board" link instead of ✕
- Placeholder right-panel rows: `pointer-events-none opacity-40` — never interactive until their feature lands
- Modal: `max-w-4xl`, backdrop `bg-black/50`, Escape closes, backdrop click closes
- Build verification: `node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build` from `C:\Code\Gojira`
- Shell: PowerShell
- No test framework — build success is verification
- Dynamic route params are Promises: `{ params }: { params: Promise<{ id: string }> }`, must `await params`

---

### Task 1: Add GET /api/cards/[id]

**Files:**
- Modify: `app/api/cards/[id]/route.ts`

**Interfaces:**
- Produces: `GET /api/cards/[id]` → `Card` with `assigneeId` populated `{ _id, name, email }`. Used by the full-page route in Task 4.

- [ ] **Step 1: Add GET handler to `app/api/cards/[id]/route.ts`**

Add this function at the top of the file, before the existing `PATCH` export. Keep all existing PATCH and DELETE handlers unchanged:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const card = await Card.findById(id);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const list = await List.findById(card.listId);
    const board = await Board.findById(list?.boardId);
    const isMember = board?.memberIds.some((mid: any) => mid.toString() === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await card.populate('assigneeId', 'name email');
    return NextResponse.json(card);
  } catch (error) {
    console.error('Get card error:', error);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Commit**

```powershell
git add app/api/cards/[id]/route.ts
git commit -m "feat: add GET /api/cards/[id] endpoint"
```

---

### Task 2: Create CardView component

**Files:**
- Create: `app/boards/[id]/CardView.tsx`

**Interfaces:**
- Produces:
```typescript
// exported from app/boards/[id]/CardView.tsx
export function CardView(props: CardViewProps): JSX.Element

interface CardViewProps {
  card: Card;
  sequencePrefix: string;
  boardMembers: User[];
  boardId: string;
  onUpdate: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose?: () => void; // undefined on full-page route
}

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface User { _id: string; name: string; email: string; }
interface CardUpdate { title?: string; description?: string; assigneeId?: string; }
```

- [ ] **Step 1: Create `app/boards/[id]/CardView.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface CardUpdate {
  title?: string;
  description?: string;
  assigneeId?: string;
}

interface CardViewProps {
  card: Card;
  sequencePrefix: string;
  boardMembers: User[];
  boardId: string;
  onUpdate: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose?: () => void;
}

export function CardView({
  card,
  sequencePrefix,
  boardMembers,
  boardId,
  onUpdate,
  onDelete,
  onClose,
}: CardViewProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(card.description);
  const [assigneeId, setAssigneeId] = useState(card.assigneeId?._id || '');
  const [saving, setSaving] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Sync local state when card prop changes (e.g. parent refreshes)
  useEffect(() => {
    setTitleValue(card.title);
    setDescriptionValue(card.description);
    setAssigneeId(card.assigneeId?._id || '');
  }, [card]);

  const ticketId = card.ticketNumber != null ? `${sequencePrefix}-${card.ticketNumber}` : null;

  const saveField = async (updates: CardUpdate, fieldName: string) => {
    setSaving(fieldName);
    setFieldError(null);
    try {
      await onUpdate(updates);
    } catch {
      setFieldError(`Failed to save ${fieldName}`);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveTitle = async () => {
    const trimmed = titleValue.trim();
    if (!trimmed) { setTitleValue(card.title); setEditingTitle(false); return; }
    if (trimmed === card.title) { setEditingTitle(false); return; }
    await saveField({ title: trimmed }, 'title');
    setEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (descriptionValue === card.description) { setEditingDescription(false); return; }
    await saveField({ description: descriptionValue }, 'description');
    setEditingDescription(false);
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    setAssigneeId(newAssigneeId);
    await saveField({ assigneeId: newAssigneeId || undefined }, 'assignee');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this card? This cannot be undone.')) return;
    await onDelete();
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-gray-300 text-xl flex-shrink-0 select-none">□</span>
          {ticketId && (
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex-shrink-0">
              {ticketId}
            </span>
          )}
          {editingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSaveTitle(); }
                if (e.key === 'Escape') { setTitleValue(card.title); setEditingTitle(false); }
              }}
              className="flex-1 text-lg font-semibold text-gray-900 border-b-2 border-blue-400 focus:outline-none bg-transparent pb-0.5"
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className="flex-1 text-lg font-semibold text-gray-900 cursor-text hover:text-blue-700 transition-colors"
              title="Click to edit title"
            >
              {card.title}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {onClose && (
            <Link
              href={`/boards/${boardId}/cards/${card._id}`}
              className="text-gray-400 hover:text-gray-600 text-base transition-colors"
              title="Open full page"
            >
              ↗
            </Link>
          )}
          {onClose ? (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors"
              title="Close"
            >
              ✕
            </button>
          ) : (
            <Link
              href={`/boards/${boardId}`}
              className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
            >
              ← Back to board
            </Link>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex gap-6">
        {/* Left: Description + Comments */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Description
          </p>
          {editingDescription ? (
            <textarea
              autoFocus
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={handleSaveDescription}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDescriptionValue(card.description);
                  setEditingDescription(false);
                }
                if (e.ctrlKey && e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveDescription();
                }
              }}
              rows={8}
              className="w-full text-sm text-gray-700 border border-blue-400 rounded-lg p-3 focus:outline-none resize-none"
              placeholder="Add a description... (Ctrl+Enter to save)"
            />
          ) : (
            <div
              onClick={() => setEditingDescription(true)}
              className="min-h-32 text-sm text-gray-700 cursor-text hover:bg-gray-50 rounded-lg p-3 border border-transparent hover:border-gray-200 transition whitespace-pre-wrap"
            >
              {descriptionValue || (
                <span className="text-gray-400">Click to add a description...</span>
              )}
            </div>
          )}

          {/* Comments placeholder */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Comments
            </p>
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400 text-center">
              Coming soon
            </div>
          </div>
        </div>

        {/* Right: Metadata panel */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-3">
          {/* Placeholder: Status */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
            <div className="w-full text-sm text-gray-400 bg-gray-100 rounded px-2 py-1.5">—</div>
          </div>

          {/* Assignee — wired */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Assignee</p>
            <select
              value={assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              disabled={saving === 'assignee'}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white disabled:opacity-50 cursor-pointer"
            >
              <option value="">Unassigned</option>
              {boardMembers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholder: Labels */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Labels</p>
            <div className="w-full text-sm text-gray-400 bg-gray-100 rounded px-2 py-1.5">—</div>
          </div>

          {/* Placeholder: Story Points */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Story Points</p>
            <div className="w-full text-sm text-gray-400 bg-gray-100 rounded px-2 py-1.5">—</div>
          </div>

          {/* Placeholder: Time Logging */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Time Logging</p>
            <div className="w-full text-sm text-gray-400 bg-gray-100 rounded px-2 py-1.5">—</div>
          </div>

          {/* Placeholder: Card Type */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Card Type</p>
            <div className="w-full text-sm text-gray-400 bg-gray-100 rounded px-2 py-1.5">—</div>
          </div>

          {fieldError && (
            <p className="text-xs text-red-500">{fieldError}</p>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="mt-auto pt-4 text-xs text-red-400 hover:text-red-600 text-left transition-colors"
          >
            Delete card
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Commit**

```powershell
git add app/boards/[id]/CardView.tsx
git commit -m "feat: create CardView two-column click-to-edit component"
```

---

### Task 3: Rewrite CardModal to wrap CardView

**Files:**
- Modify: `app/boards/[id]/CardModal.tsx` (replace entirely)

**Interfaces:**
- Consumes: `CardView` from Task 2
- Produces:
```typescript
// exported from app/boards/[id]/CardModal.tsx
export function CardModal(props: CardModalProps): JSX.Element | null

interface CardModalProps {
  card: Card | null;          // null = modal hidden
  boardId: string;
  sequencePrefix: string;
  boardMembers: User[];
  onUpdate: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}
// Card, User, CardUpdate same shapes as Task 2
```

- [ ] **Step 1: Replace `app/boards/[id]/CardModal.tsx` entirely**

```typescript
'use client';

import { useEffect } from 'react';
import { CardView } from './CardView';

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface CardUpdate {
  title?: string;
  description?: string;
  assigneeId?: string;
}

interface CardModalProps {
  card: Card | null;
  boardId: string;
  sequencePrefix: string;
  boardMembers: User[];
  onUpdate: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function CardModal({
  card,
  boardId,
  sequencePrefix,
  boardMembers,
  onUpdate,
  onDelete,
  onClose,
}: CardModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!card) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <CardView
          card={card}
          sequencePrefix={sequencePrefix}
          boardMembers={boardMembers}
          boardId={boardId}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds. (page.tsx still passes old props — will fix in Task 5.)

- [ ] **Step 3: Commit**

```powershell
git add app/boards/[id]/CardModal.tsx
git commit -m "feat: rewrite CardModal to wrap CardView"
```

---

### Task 4: Full-page card route

**Files:**
- Create: `app/boards/[id]/cards/[cardId]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/cards/[cardId]` from Task 1; `CardView` from Task 2
- Produces: Route `/boards/[id]/cards/[cardId]` renders `CardView` full-page with sidebar + navbar (no `onClose` prop)

- [ ] **Step 1: Create the directory and file**

Create `app/boards/[id]/cards/[cardId]/page.tsx` with the following content:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { AuthGuard } from '@/components/AuthGuard';
import { CardView } from '../../CardView';
import Link from 'next/link';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Board {
  _id: string;
  title: string;
  sequencePrefix?: string;
  memberIds?: User[];
}

interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

interface CardUpdate {
  title?: string;
  description?: string;
  assigneeId?: string;
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

export default function CardFullPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const boardId = params.id as string;
  const cardId = params.cardId as string;

  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [boardMembers, setBoardMembers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardPrefix, setNewBoardPrefix] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [boardId, cardId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [boardsRes, cardRes] = await Promise.all([
        fetch('/api/boards'),
        fetch(`/api/cards/${cardId}`),
      ]);
      if (!boardsRes.ok) throw new Error('Failed to fetch boards');
      const boardsList = await boardsRes.json();
      setAllBoards(boardsList);
      const currentBoard = boardsList.find((b: Board) => b._id === boardId);
      if (!currentBoard) { router.push('/boards'); return; }
      setBoard(currentBoard);
      setBoardMembers(currentBoard.memberIds || []);
      if (!cardRes.ok) throw new Error('Failed to fetch card');
      setCard(await cardRes.json());
    } catch (err) {
      setError('Failed to load card');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: CardUpdate) => {
    const res = await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update card');
    setCard(await res.json());
  };

  const handleDelete = async () => {
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
    router.push(`/boards/${boardId}`);
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newBoardTitle, sequencePrefix: newBoardPrefix }),
    });
    if (!res.ok) return;
    const newBoard = await res.json();
    setAllBoards([...allBoards, newBoard]);
    setNewBoardTitle('');
    setNewBoardPrefix('');
    setShowNewBoardForm(false);
    router.push(`/boards/${newBoard._id}`);
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
          <div className="text-white/50">Loading...</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        {/* Top nav */}
        <nav className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-2 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/60 hover:text-white transition p-1 rounded hover:bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v1.5H2V3zm0 4.25h12v1.5H2v-1.5zm0 4.25h12V13H2v-1.5z" />
              </svg>
            </button>
            <span className="text-white font-bold text-lg tracking-tight">Gojira</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold">
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

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
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
                  <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${getBoardColor(b._id)}`} />
                  <span className="truncate">{b.title}</span>
                </Link>
              ))}
            </nav>
            <div className="w-56 px-2 py-3 border-t border-white/10">
              {showNewBoardForm ? (
                <form onSubmit={handleCreateBoard} className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => { setNewBoardTitle(e.target.value); setNewBoardPrefix(suggestPrefix(e.target.value)); }}
                    placeholder="Board name"
                    className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50"
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowNewBoardForm(false); setNewBoardTitle(''); setNewBoardPrefix(''); } }}
                  />
                  <input
                    type="text"
                    value={newBoardPrefix}
                    onChange={(e) => setNewBoardPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8))}
                    placeholder="Prefix e.g. GENSYS"
                    className="w-full px-2 py-1.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 font-mono"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded-lg transition">Create</button>
                    <button type="button" onClick={() => { setShowNewBoardForm(false); setNewBoardTitle(''); setNewBoardPrefix(''); }} className="text-white/50 hover:text-white text-xs transition">✕</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowNewBoardForm(true)} className="w-full text-left text-white/50 hover:text-white hover:bg-white/10 text-sm px-2 py-1.5 rounded-lg transition">
                  + New board
                </button>
              )}
            </div>
          </aside>

          {/* Card content */}
          <main className="flex-1 overflow-y-auto p-6">
            {error && <p className="text-red-400 mb-4">{error}</p>}
            {card && board ? (
              <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-6">
                <CardView
                  card={card}
                  sequencePrefix={board.sequencePrefix || ''}
                  boardMembers={boardMembers}
                  boardId={boardId}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </div>
            ) : (
              !error && <p className="text-white/50">Card not found.</p>
            )}
          </main>
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

Expected: build succeeds, route `/boards/[id]/cards/[cardId]` appears in the route table.

- [ ] **Step 3: Commit**

```powershell
git add "app/boards/[id]/cards/[cardId]/page.tsx"
git commit -m "feat: add full-page card route /boards/[id]/cards/[cardId]"
```

---

### Task 5: Update page.tsx to use new CardModal props

The new `CardModal` has different props (`onUpdate` instead of `onSave`, adds `boardId`). This task updates the usage in `app/boards/[id]/page.tsx`.

**Files:**
- Modify: `app/boards/[id]/page.tsx`

**Interfaces:**
- Consumes: `CardModal` from Task 3 with props `{ card, boardId, sequencePrefix, boardMembers, onUpdate, onDelete, onClose }`
- The `handleUpdateCard` function already accepts `{ title?, description?, assigneeId? }` and calls `PATCH /api/cards/[id]` — it is compatible, just referenced via `onUpdate` now instead of `onSave`

- [ ] **Step 1: Update the `CardModal` usage in `app/boards/[id]/page.tsx`**

Find the `<CardModal` JSX block at the bottom of the component (just before the closing `</AuthGuard>`) and replace it:

```tsx
<CardModal
  card={selectedCard}
  boardId={boardId}
  sequencePrefix={board?.sequencePrefix || ''}
  boardMembers={boardMembers}
  onUpdate={handleUpdateCard}
  onDelete={handleDeleteCardFromModal}
  onClose={() => setSelectedCard(null)}
/>
```

Note: `handleUpdateCard` is unchanged — it already accepts `{ title?, description?, assigneeId? }` and patches the card. The only change is the prop name from `onSave` to `onUpdate`.

- [ ] **Step 2: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 3: Commit**

```powershell
git add "app/boards/[id]/page.tsx"
git commit -m "feat: update CardModal usage with new prop interface"
```
