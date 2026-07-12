# Admin Board Columns Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict column (list) management to admins only, consolidate management into `/admin/columns` page with dnd-kit reordering, and remove column controls from board pages.

**Architecture:** Three-layer implementation — API gates list mutations to admin role, board page removes all column management UI, new `/admin` sidebar structure with Users and Board Management sub-pages. `/admin/columns` provides board selector, sortable columns list, and CRUD operations.

**Tech Stack:** Next.js 15 App Router, NextAuth v4 sessions, Mongoose, dnd-kit/sortable (already installed), React hooks for state management.

## Global Constraints

- Admin role check: `session?.user?.role === 'admin'` (string enum: 'user' | 'admin')
- Drag-and-drop: Use existing `@dnd-kit/core` + `@dnd-kit/sortable` packages
- Authenticated users can fetch all boards via `GET /api/boards`
- No changes to List or Board Mongoose schemas
- Existing List model has `boardId`, `title`, `order`, `timestamps`

---

### Task 1: Upgrade List API Endpoints to Admin-Only

**Files:**
- Modify: `app/api/lists/route.ts` (POST handler)
- Modify: `app/api/lists/[id]/route.ts` (PATCH and DELETE handlers)

**Interfaces:**
- Consumes: `session` from `getServerSession(authOptions)`, existing `user.role` field
- Produces: 403 Forbidden response for non-admins; unchanged success responses for admins

- [ ] **Step 1: Update POST /api/lists to check admin role**

In `app/api/lists/route.ts`, replace the board member check with an admin check:

```typescript
// OLD: Check if user is board member
const isMember = board.memberIds.some((id: any) => id.toString() === session.user.id);
if (!isMember) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// NEW: Check if user is admin
if (session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Admins only' }, { status: 403 });
}
```

- [ ] **Step 2: Update PATCH /api/lists/[id] to check admin role**

In `app/api/lists/[id]/route.ts`, replace the board member check in PATCH handler with:

```typescript
if (session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Admins only' }, { status: 403 });
}
```

- [ ] **Step 3: Update DELETE /api/lists/[id] to check admin role**

In `app/api/lists/[id]/route.ts`, replace the board member check in DELETE handler with:

```typescript
if (session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Admins only' }, { status: 403 });
}
```

- [ ] **Step 4: Test API endpoints reject non-admins**

In the browser:
1. Log in as non-admin user
2. In console, try: `fetch('/api/lists', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ boardId: '...', title: 'Test' }) }).then(r => r.json()).then(d => console.log(d))`
3. Verify response: `{ error: 'Admins only' }` with status 403
4. Log in as admin, retry same POST
5. Verify success (201 with list object)

- [ ] **Step 5: Commit**

```bash
git add app/api/lists/route.ts app/api/lists/[id]/route.ts
git commit -m "feat: restrict list mutations to admin role"
```

---

### Task 2: Remove Column Management from Board Page

**Files:**
- Modify: `app/boards/[id]/page.tsx` (entire file)

**Interfaces:**
- Consumes: existing board state, card state, member management
- Produces: board page without `showAddList` state, `handleCreateList`, `handleDeleteList`, or UI controls for adding/deleting columns

- [ ] **Step 1: Remove showAddList state and handlers**

In `app/boards/[id]/page.tsx`, remove or comment out these lines:

```typescript
// REMOVE:
const [showAddList, setShowAddList] = useState(false);
```

Also remove the `handleCreateList` function entirely (lines 146-165).

Also remove the `handleDeleteList` function entirely (lines 187-199).

- [ ] **Step 2: Remove "Add a list" form and button from render**

In the kanban render section (around line 529-565), find and remove:

```typescript
{/* Add list */}
{showAddList ? (
  <div className="bg-white border border-[#D0D4DC] rounded-lg p-3 h-auto flex flex-col gap-2 shadow-sm">
    <input
      type="text"
      value={newListTitle}
      onChange={(e) => setNewListTitle(e.target.value)}
      placeholder="Add a list title"
      autoFocus
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleCreateList(e as unknown as React.FormEvent);
      }}
      className="px-2 py-1.5 text-sm rounded-md border border-[#D0D4DC] text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
    />
    <div className="flex gap-2">
      <button
        onClick={(e) => handleCreateList(e as unknown as React.FormEvent)}
        className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-3 py-1 text-xs rounded-md transition"
      >
        Create
      </button>
      <button
        onClick={() => {
          setShowAddList(false);
          setNewListTitle('');
        }}
        className="text-[#42526E] hover:text-[#172B4D] text-xs transition"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <button
    onClick={() => setShowAddList(true)}
    className="bg-white border border-[#D0D4DC] rounded-lg p-4 h-auto text-[#42526E] hover:border-[#0066CC] hover:text-[#0066CC] text-sm font-medium transition text-left shadow-sm"
  >
    + Add a list
  </button>
)}
```

- [ ] **Step 3: Remove delete button from column headers**

In the column render section (find where columns are mapped), remove the delete button. Search for `handleDeleteList` calls and remove the button that calls it. It should look like:

```typescript
// REMOVE THIS BUTTON:
<button
  onClick={() => handleDeleteList(list._id)}
  className="... delete button styles ..."
>
  Delete
</button>
```

Also remove the state variable `newListTitle` if it's no longer used:

```typescript
// REMOVE:
const [newListTitle, setNewListTitle] = useState('');
```

- [ ] **Step 4: Test board page no longer shows "Add a list"**

1. Navigate to a board page
2. Verify no "Add a list" button or form appears
3. Verify no delete buttons on column headers
4. Verify cards still display and can be moved/edited

- [ ] **Step 5: Commit**

```bash
git add app/boards/[id]/page.tsx
git commit -m "feat: remove column management from board page"
```

---

### Task 3: Create Admin Sidebar Navigation Component

**Files:**
- Create: `components/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `session` prop with `session?.user?.role` to check admin status
- Produces: Sidebar component that renders Admin menu with Users and Board Management sub-items

- [ ] **Step 1: Create AdminSidebar component**

Create `components/AdminSidebar.tsx`:

```typescript
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
```

- [ ] **Step 2: Test component renders for admins only**

Component should render nothing if `session?.user?.role !== 'admin'`.

- [ ] **Step 3: Commit**

```bash
git add components/AdminSidebar.tsx
git commit -m "feat: create AdminSidebar component for admin navigation"
```

---

### Task 4: Restructure Admin Pages (Redirect /admin, Create /admin/users)

**Files:**
- Modify: `app/admin/page.tsx` (change to redirect)
- Move: `app/admin/page.tsx` content → `app/admin/users/page.tsx`
- Create: `app/admin/users/page.tsx`

**Interfaces:**
- Consumes: existing admin page structure and AdminSidebar component
- Produces: `/admin` redirects to `/admin/users`, `/admin/users` shows user management with sidebar, `/admin/columns` ready for next task

- [ ] **Step 1: Create /admin/users directory and page**

Create directory: `app/admin/users/`

- [ ] **Step 2: Move existing admin page content to /admin/users/page.tsx**

Read current `app/admin/page.tsx`, copy its entire content to `app/admin/users/page.tsx`. Then add the AdminSidebar import and render:

In `app/admin/users/page.tsx`:

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminSidebar } from '@/components/AdminSidebar';

// ... rest of existing admin page code ...

// In return statement, add AdminSidebar inside the main layout:
return (
  <AuthGuard>
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* ... existing navbar/header ... */}
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#E8EAED] p-4">
          <AdminSidebar session={session} />
        </aside>

        {/* Main content */}
        <div className="flex-1 p-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-[#172B4D] mb-6">Admin — Users</h1>
            {/* ... rest of user table content ... */}
          </div>
        </div>
      </div>
    </div>
  </AuthGuard>
);
```

- [ ] **Step 3: Replace /admin/page.tsx with redirect**

Replace `app/admin/page.tsx` with:

```typescript
import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/users');
}
```

- [ ] **Step 4: Create /admin/columns/page.tsx shell**

Create `app/admin/columns/page.tsx` with shell content (will be filled in Task 5):

```typescript
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
          <aside className="w-64 bg-white border-r border-[#E8EAED] p-4">
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
```

- [ ] **Step 5: Test routing and sidebar**

1. Navigate to `/admin` → should redirect to `/admin/users`
2. On `/admin/users` → sidebar should show "Users" (highlighted) and "Board Management" links
3. Click "Board Management" → navigate to `/admin/columns`
4. On `/admin/columns` → sidebar should show "Board Management" (highlighted) and "Users" link
5. Non-admin user tries `/admin/users` or `/admin/columns` → redirect to `/boards`

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx app/admin/users/page.tsx app/admin/columns/page.tsx components/AdminSidebar.tsx
git commit -m "feat: restructure admin pages with sidebar navigation"
```

---

### Task 5: Build /admin/columns Page — Board Selector and Columns List

**Files:**
- Modify: `app/admin/columns/page.tsx` (replace shell with full implementation)

**Interfaces:**
- Consumes: `GET /api/boards` to fetch all boards, `GET /api/boards/{boardId}/lists` to fetch board columns
- Produces: Page with board dropdown selector and columns list display (read-only for now)

- [ ] **Step 1: Add state and fetch hooks to /admin/columns/page.tsx**

Update the page component to add:

```typescript
import { useEffect, useState } from 'react';

// ... existing imports ...

interface Board {
  _id: string;
  title: string;
}

interface List {
  _id: string;
  title: string;
  order: number;
}

export default function AdminColumnsPage() {
  // ... existing session/router code ...

  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [columns, setColumns] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setBoards(data);
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
      setColumns(data.sort((a: List, b: List) => a.order - b.order));
    } catch (err) {
      console.error('Failed to fetch columns:', err);
      setColumns([]);
    }
  };

  const handleBoardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const boardId = e.target.value;
    setSelectedBoardId(boardId);
    if (boardId) {
      fetchColumns(boardId);
    }
  };

  // ... rest of component
}
```

- [ ] **Step 2: Render board dropdown selector**

In the return statement, replace the loading placeholder with:

```typescript
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
    {boards.map((board) => (
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
      <div className="bg-white border border-[#E0E3E8] rounded-lg overflow-hidden">
        <ul className="divide-y divide-[#E0E3E8]">
          {columns.map((column) => (
            <li
              key={column._id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-[#F9FAFB]"
            >
              <span className="text-sm font-medium text-[#7A8699] w-8">
                {column.order + 1}
              </span>
              <span className="flex-1 text-[#172B4D] font-medium">
                {column.title}
              </span>
              {/* Action buttons will be added in Task 6 */}
              <span className="text-xs text-[#7A8699]">Actions coming soon</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Test board selector and columns list**

1. Navigate to `/admin/columns`
2. Board dropdown should show all boards
3. Select a board → columns list should populate below
4. Switch to another board → columns list should update
5. Select a board with no columns → "No columns yet" message shows

- [ ] **Step 4: Commit**

```bash
git add app/admin/columns/page.tsx
git commit -m "feat: add board selector and columns list to /admin/columns"
```

---

### Task 6: Add Column CRUD Operations (Add, Rename, Delete)

**Files:**
- Modify: `app/admin/columns/page.tsx` (add CRUD handlers and UI controls)

**Interfaces:**
- Consumes: `POST /api/lists`, `PATCH /api/lists/[id]`, `DELETE /api/lists/[id]` (admin-only from Task 1)
- Produces: Add column form, rename/delete buttons on columns, with optimistic state updates

- [ ] **Step 1: Add CRUD handler functions**

Add these handlers to the component:

```typescript
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
    setColumns([...columns, newColumn].sort((a: List, b: List) => a.order - b.order));
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
    setColumns(columns.map((c) => (c._id === columnId ? updated : c)));
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
    setColumns(columns.filter((c) => c._id !== columnId));
  } catch (err) {
    setError('Failed to delete column');
    console.error(err);
  }
};
```

- [ ] **Step 2: Update column list item to include rename and delete buttons**

Replace the column list item render with:

```typescript
<li
  key={column._id}
  className="px-4 py-3 flex items-center gap-3 hover:bg-[#F9FAFB] group"
>
  <span className="text-sm font-medium text-[#7A8699] w-8">
    {column.order + 1}
  </span>
  <span className="flex-1 text-[#172B4D] font-medium">
    {column.title}
  </span>
  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
    <button
      onClick={() => {
        const newTitle = prompt('Rename column:', column.title);
        if (newTitle) handleRenameColumn(column._id, newTitle);
      }}
      className="text-xs text-[#0066CC] hover:text-[#0052A3] font-medium transition"
    >
      Rename
    </button>
    <button
      onClick={() => handleDeleteColumn(column._id)}
      className="text-xs text-[#D93025] hover:text-[#A01810] font-medium transition"
    >
      Delete
    </button>
  </div>
</li>
```

- [ ] **Step 3: Add "Add column" form below the columns list**

Add this after the columns `</div>` closing tag:

```typescript
{selectedBoardId && (
  <form onSubmit={handleAddColumn} className="mt-6 bg-white border border-[#E0E3E8] rounded-lg p-4">
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
)}
```

- [ ] **Step 4: Test CRUD operations**

1. Select a board → click "Rename" on a column → enter new name → verify update
2. Click "Delete" → confirm → verify column is removed
3. Enter new column title → click "Add" → verify column appears in list
4. Verify operations persist (refresh page, column changes should be saved)

- [ ] **Step 5: Commit**

```bash
git add app/admin/columns/page.tsx
git commit -m "feat: add column CRUD operations (add, rename, delete)"
```

---

### Task 7: Implement Drag-and-Drop Reordering with dnd-kit

**Files:**
- Modify: `app/admin/columns/page.tsx` (replace list render with dnd-kit sortable)

**Interfaces:**
- Consumes: `@dnd-kit/core`, `@dnd-kit/sortable` packages (already in package.json), columns state
- Produces: Draggable columns list, reorder on drop, persist new order values via PATCH

- [ ] **Step 1: Add dnd-kit imports**

At the top of `app/admin/columns/page.tsx`, add:

```typescript
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
```

- [ ] **Step 2: Create SortableColumnItem component**

Add this component inside the file (before the main page component):

```typescript
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
      <span className="text-sm font-medium text-[#7A8699] w-8">
        {column.order + 1}
      </span>
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
```

- [ ] **Step 3: Add sensors to main component**

Inside the main `AdminColumnsPage` component, after the state declarations, add:

```typescript
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

- [ ] **Step 4: Add drag end handler**

Add this handler function to the component:

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;

  if (over && active.id !== over.id) {
    const oldIndex = columns.findIndex((c) => c._id === active.id);
    const newIndex = columns.findIndex((c) => c._id === over.id);

    const newOrder = arrayMove(columns, oldIndex, newIndex);
    setColumns(newOrder);

    // Persist new order values
    try {
      for (let i = 0; i < newOrder.length; i++) {
        if (newOrder[i].order !== i) {
          await fetch(`/api/lists/${newOrder[i]._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: i }),
          });
        }
      }
    } catch (err) {
      setError('Failed to save column order');
      console.error(err);
      // Rollback to previous order
      fetchColumns(selectedBoardId);
    }
  }
};
```

- [ ] **Step 5: Replace static columns list with DndContext sortable**

Replace the columns list render section with:

```typescript
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
        <div className="bg-white border border-[#E0E3E8] rounded-lg overflow-hidden">
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
      </DndContext>
    )}
  </div>
)}
```

- [ ] **Step 6: Test drag-and-drop reordering**

1. Navigate to `/admin/columns`, select a board with 2+ columns
2. Hover over first column → see drag handle (⋮⋮)
3. Click and drag column to new position → verify visual feedback (opacity change)
4. Drop column → verify order numbers update
5. Refresh page → verify new order persists

- [ ] **Step 7: Commit**

```bash
git add app/admin/columns/page.tsx
git commit -m "feat: add drag-and-drop reordering for columns with dnd-kit"
```

---

## Spec Coverage Checklist

✅ API access control — Task 1 (list endpoints admin-only)
✅ Board page cleanup — Task 2 (remove column management UI)
✅ Admin sidebar — Task 3 (AdminSidebar component)
✅ Admin routing — Task 4 (/admin redirect, /admin/users, /admin/columns)
✅ Board selector — Task 5 (dropdown to select board)
✅ Columns list display — Task 5 (sorted by order)
✅ Add column — Task 6 (form to create column)
✅ Rename column — Task 6 (prompt-based rename)
✅ Delete column — Task 6 (confirm dialog before delete)
✅ Drag-and-drop reordering — Task 7 (dnd-kit sortable)
✅ Persist order — Task 7 (PATCH calls on drop)
✅ Error handling — All tasks (error state, retry, rollback)

---

Plan complete and saved to `docs/superpowers/plans/2026-07-12-admin-board-columns.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
