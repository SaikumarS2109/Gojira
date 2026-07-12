# Ticket Numbering System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-assign immutable ticket IDs (e.g. `GENSYS-1`) to every card, scoped to a board-level sequence prefix set at board creation.

**Architecture:** `sequencePrefix` and `nextTicketNumber` live on the Board document. On card creation the server atomically `$inc`s the counter (`new: false` returns the pre-increment value) and writes it as `card.ticketNumber`. The full ticket ID is computed on the client as `board.sequencePrefix + '-' + card.ticketNumber` — never stored as a string.

**Tech Stack:** Next.js 16 App Router, Mongoose, MongoDB Atlas, TypeScript, Tailwind CSS v4.

## Global Constraints

- `sequencePrefix`: 2–8 uppercase A–Z letters only; required; unique across all boards
- `ticketNumber` on Card: set once at creation; never patched via the PATCH endpoint
- No test framework is present — use `node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build` as the verification step after each task
- All dynamic route handlers use `{ params }: { params: Promise<{ id: string }> }` and must `await params`
- PowerShell is the shell on this machine

---

### Task 1: Update Mongoose models

**Files:**
- Modify: `models/Board.ts`
- Modify: `models/Card.ts`

**Interfaces:**
- Produces:
  - `Board` document shape: `{ sequencePrefix: string, nextTicketNumber: number, ... }`
  - `Card` document shape: `{ ticketNumber: number, ... }`

- [ ] **Step 1: Update `models/Board.ts`**

Replace the entire file with:

```typescript
import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    sequencePrefix: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{2,8}$/,
    },
    nextTicketNumber: {
      type: Number,
      default: 1,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

boardSchema.index({ sequencePrefix: 1 }, { unique: true });

export const Board = mongoose.models.Board || mongoose.model('Board', boardSchema);
```

- [ ] **Step 2: Update `models/Card.ts`**

Add `ticketNumber` field after `order`:

```typescript
import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      nullable: true,
    },
    parentCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      nullable: true,
    },
    subtasks: [
      {
        text: String,
        done: Boolean,
      },
    ],
    attachments: [String],
    order: {
      type: Number,
      default: 0,
    },
    ticketNumber: {
      type: Number,
    },
  },
  { timestamps: true }
);

export const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);
```

- [ ] **Step 3: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Commit**

```powershell
git add models/Board.ts models/Card.ts
git commit -m "feat: add sequencePrefix/nextTicketNumber to Board, ticketNumber to Card"
```

---

### Task 2: Update `POST /api/boards` to require sequencePrefix

**Files:**
- Modify: `app/api/boards/route.ts`

**Interfaces:**
- Consumes: `Board` model with `sequencePrefix`, `nextTicketNumber` from Task 1
- Produces: Board POST now accepts `{ title, sequencePrefix }`, returns 400 if missing/invalid, 409 if prefix taken

- [ ] **Step 1: Update `app/api/boards/route.ts`**

Replace the entire file with:

```typescript
import { connectDB } from '@/lib/mongodb';
import { Board } from '@/models/Board';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const boards = await Board.find({
      $or: [{ ownerId: session.user.id }, { memberIds: session.user.id }],
    })
      .populate('ownerId', 'name email')
      .populate('memberIds', 'name email');

    return NextResponse.json(boards);
  } catch (error) {
    console.error('Get boards error:', error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, sequencePrefix } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!sequencePrefix) {
      return NextResponse.json({ error: 'Sequence prefix is required' }, { status: 400 });
    }

    const prefix = String(sequencePrefix).toUpperCase().trim();
    if (!/^[A-Z]{2,8}$/.test(prefix)) {
      return NextResponse.json(
        { error: 'Prefix must be 2–8 letters (A–Z only)' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Board.findOne({ sequencePrefix: prefix });
    if (existing) {
      return NextResponse.json(
        { error: `Prefix "${prefix}" is already in use` },
        { status: 409 }
      );
    }

    const board = await Board.create({
      title,
      sequencePrefix: prefix,
      ownerId: session.user.id,
      memberIds: [session.user.id],
    });

    await board.populate('ownerId', 'name email');
    await board.populate('memberIds', 'name email');

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error('Create board error:', error);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```powershell
git add app/api/boards/route.ts
git commit -m "feat: require sequencePrefix on board creation, validate and enforce uniqueness"
```

---

### Task 3: Assign ticketNumber on card creation

**Files:**
- Modify: `app/api/cards/route.ts`

**Interfaces:**
- Consumes: `Board` model with `nextTicketNumber` from Task 1; `Card` model with `ticketNumber` from Task 1
- Produces: `POST /api/cards` response includes `ticketNumber: number`

- [ ] **Step 1: Update `app/api/cards/route.ts`**

Replace the entire file with:

```typescript
import { connectDB } from '@/lib/mongodb';
import { List } from '@/models/List';
import { Card } from '@/models/Card';
import { Board } from '@/models/Board';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listId, title, description } = body;

    if (!listId || !title) {
      return NextResponse.json({ error: 'listId and title are required' }, { status: 400 });
    }

    await connectDB();

    const list = await List.findById(listId);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Atomically claim the next ticket number (new: false → pre-increment value)
    const boardBefore = await Board.findByIdAndUpdate(
      list.boardId,
      { $inc: { nextTicketNumber: 1 } },
      { new: false }
    );

    if (!boardBefore) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const isMember = boardBefore.memberIds.some(
      (id: any) => id.toString() === session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const maxOrder = await Card.findOne({ listId }).sort({ order: -1 });
    const newOrder = (maxOrder?.order ?? -1) + 1;

    const card = await Card.create({
      listId,
      title,
      description: description || '',
      order: newOrder,
      ticketNumber: boardBefore.nextTicketNumber,
    });

    await card.populate('assigneeId', 'name email');

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```powershell
git add app/api/cards/route.ts
git commit -m "feat: atomically assign ticketNumber on card creation"
```

---

### Task 4: Board creation UI — add Prefix field

Both the sidebar form (in `app/boards/[id]/page.tsx`) and the boards page (`app/boards/page.tsx`) have board creation forms. Both need a **Prefix** field with auto-suggest.

**Files:**
- Modify: `app/boards/[id]/page.tsx`
- Modify: `app/boards/page.tsx`

**Interfaces:**
- Consumes: `POST /api/boards` now requires `sequencePrefix` from Task 2
- Produces: Both forms send `{ title, sequencePrefix }` on submit

**Auto-suggest logic** (shared, inline in both files — don't extract, YAGNI):
```typescript
function suggestPrefix(title: string): string {
  return title
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
}
```

- [ ] **Step 1: Update sidebar board creation form in `app/boards/[id]/page.tsx`**

Add the `suggestPrefix` helper above the component, then add `newBoardPrefix` state and update the sidebar new-board form section:

Add after the existing state declarations:
```typescript
const [newBoardPrefix, setNewBoardPrefix] = useState('');
```

Add this helper above the `export default` line:
```typescript
function suggestPrefix(title: string): string {
  return title
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
}
```

Update `handleCreateBoardFromSidebar` to send `sequencePrefix`:
```typescript
const handleCreateBoardFromSidebar = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newBoardTitle.trim()) return;
  try {
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newBoardTitle, sequencePrefix: newBoardPrefix }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error(data.error);
      return;
    }
    const newBoard = await res.json();
    setAllBoards([...allBoards, newBoard]);
    setNewBoardTitle('');
    setNewBoardPrefix('');
    setShowNewBoardForm(false);
    router.push(`/boards/${newBoard._id}`);
  } catch (err) {
    console.error(err);
  }
};
```

Replace the sidebar new-board form JSX (the `{showNewBoardForm ? ... : ...}` block) with:
```tsx
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
        if (e.key === 'Escape') setShowNewBoardForm(false);
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
```

- [ ] **Step 2: Update `app/boards/page.tsx`**

Add the same `suggestPrefix` helper above `export default BoardsPage`, add `boardPrefix` state:
```typescript
const [boardPrefix, setBoardPrefix] = useState('');
```

Add `suggestPrefix` helper above the component:
```typescript
function suggestPrefix(title: string): string {
  return title
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
}
```

Update `handleCreateBoard` to send `sequencePrefix`:
```typescript
const handleCreateBoard = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  if (!title.trim()) {
    setError('Board title is required');
    return;
  }

  try {
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, sequencePrefix: boardPrefix }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create board');
      return;
    }

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
```

Replace the create-board card JSX (the `{showForm ? ... : ...}` block) with:
```tsx
{showForm ? (
  <div className="bg-gray-200 rounded-lg p-3 h-auto flex flex-col gap-2">
    <input
      type="text"
      value={title}
      onChange={(e) => {
        setTitle(e.target.value);
        setBoardPrefix(suggestPrefix(e.target.value));
      }}
      placeholder="Board title"
      autoFocus
      className="px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setShowForm(false);
      }}
    />
    <input
      type="text"
      value={boardPrefix}
      onChange={(e) => setBoardPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8))}
      placeholder="Prefix e.g. GENSYS"
      className="px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
    />
    <div className="flex gap-2">
      <button
        onClick={handleCreateBoard}
        className="bg-blue-600 text-white px-3 py-1 text-xs rounded hover:bg-blue-700"
      >
        Create
      </button>
      <button
        onClick={() => { setShowForm(false); setTitle(''); setBoardPrefix(''); }}
        className="text-gray-600 hover:text-gray-900 text-xs"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <button
    onClick={() => setShowForm(true)}
    className="bg-gray-200 hover:bg-gray-300 rounded-lg p-4 h-24 text-gray-600 hover:text-gray-800 text-sm font-medium transition text-left"
  >
    + Create new board
  </button>
)}
```

- [ ] **Step 3: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Commit**

```powershell
git add app/boards/[id]/page.tsx app/boards/page.tsx
git commit -m "feat: add sequence prefix field to board creation forms with auto-suggest"
```

---

### Task 5: Display ticket IDs on cards and in modal

The board's `sequencePrefix` is already fetched in `page.tsx`. It needs to flow down to `DraggableList` → `DraggableCard` and to `CardModal`. Cards need `ticketNumber` added to their TypeScript interfaces.

**Files:**
- Modify: `app/boards/[id]/page.tsx` — pass `sequencePrefix` to DraggableList and CardModal; add `ticketNumber` to Card interface
- Modify: `app/boards/[id]/DraggableList.tsx` — accept and forward `sequencePrefix` to DraggableCard
- Modify: `app/boards/[id]/DraggableCard.tsx` — accept `sequencePrefix`, show ticket badge
- Modify: `app/boards/[id]/CardModal.tsx` — accept `sequencePrefix`, show ticket ID in header

**Interfaces:**
- Consumes: `card.ticketNumber: number` from Task 1; `board.sequencePrefix: string` from Task 1
- Produces: `DraggableCard` and `CardModal` show full ticket ID

- [ ] **Step 1: Update Card interface and prop passing in `app/boards/[id]/page.tsx`**

Add `ticketNumber` to the `Card` interface:
```typescript
interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}
```

In the JSX, update the `DraggableList` usage to pass `sequencePrefix`:
```tsx
<DraggableList
  key={list._id}
  listId={list._id}
  title={list.title}
  cards={dragCards[list._id] || []}
  draggingCardId={draggingCardId}
  onCardClick={setSelectedCard}
  onDeleteList={handleDeleteList}
  onAddCard={() => setSelectedListId(list._id)}
  selectedListId={selectedListId}
  newCardTitle={newCardTitle}
  onNewCardTitleChange={setNewCardTitle}
  onCreateCard={handleCreateCard}
  sequencePrefix={board?.sequencePrefix || ''}
/>
```

Update `CardModal` usage to pass `sequencePrefix`:
```tsx
<CardModal
  card={selectedCard}
  onClose={() => setSelectedCard(null)}
  onSave={handleUpdateCard}
  onDelete={handleDeleteCardFromModal}
  boardMembers={boardMembers}
  sequencePrefix={board?.sequencePrefix || ''}
/>
```

- [ ] **Step 2: Update `app/boards/[id]/DraggableList.tsx`**

Add `sequencePrefix` to `DraggableListProps` and forward it to `DraggableCard`:

```typescript
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
```

Update the destructured props and the `DraggableCard` usage:
```tsx
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
```

In the cards map, pass `sequencePrefix`:
```tsx
{cards.map((card) => (
  <DraggableCard
    key={card._id}
    card={card}
    onCardClick={onCardClick}
    sequencePrefix={sequencePrefix}
  />
))}
```

Also add `ticketNumber` to the Card interface in this file:
```typescript
interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}
```

- [ ] **Step 3: Update `app/boards/[id]/DraggableCard.tsx`**

Add `ticketNumber` to the Card interface and `sequencePrefix` to props, then show the badge:

```typescript
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
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
      onClick={(e) => {
        e.stopPropagation();
        onCardClick(card);
      }}
      className={`bg-white rounded-lg shadow-sm border border-gray-200/80 px-3 py-2 cursor-pointer hover:shadow-md hover:border-blue-300 transition group ${
        isDragging ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {ticketId && (
        <p className="text-xs font-mono text-gray-400 mb-1">{ticketId}</p>
      )}
      <p className="text-sm text-gray-800 font-medium leading-snug">{card.title}</p>

      {card.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
      )}

      {card.assigneeId && (
        <div className="flex items-center gap-1 mt-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
            {getInitials(card.assigneeId.name)}
          </div>
          <span className="text-xs text-gray-500">{card.assigneeId.name}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `app/boards/[id]/CardModal.tsx`**

Add `sequencePrefix` to props and `ticketNumber` to the Card interface, then show the ticket ID badge in the header:

```typescript
'use client';

import { useState, useEffect } from 'react';

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
  onClose: () => void;
  onSave: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  boardMembers: User[];
  sequencePrefix: string;
}

export function CardModal({ card, onClose, onSave, onDelete, boardMembers, sequencePrefix }: CardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setAssigneeId(card.assigneeId?._id || '');
    }
  }, [card]);

  if (!card) return null;

  const ticketId = card.ticketNumber != null ? `${sequencePrefix}-${card.ticketNumber}` : null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        title,
        description,
        assigneeId: assigneeId || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this card?')) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            {ticketId && (
              <span className="inline-block text-xs font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded mb-1">
                {ticketId}
              </span>
            )}
            <h2 className="text-xl font-semibold">Edit Card</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 ml-4">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assign To</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {boardMembers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```powershell
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: build succeeds, no TypeScript errors.
