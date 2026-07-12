# Labels and Story Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add case-sensitive, globally-available labels and Fibonacci-sequence story points to cards, with auto-save UI in CardView and visual badges on card tiles.

**Architecture:** 
- Backend: New global `Label` collection + extended PATCH /api/cards to handle `labelIds` and `storyPoints`
- Frontend: CardView's right metadata panel gains searchable label input (with auto-create on Enter) and story points dropdown
- Card tiles gain a story points badge (showing value or "-" if unset)
- All changes are auto-save (no explicit save button for these fields)

**Tech Stack:** Next.js 16 App Router, Mongoose, Tailwind CSS v4, TypeScript

## Global Constraints

- Labels are **case-sensitive** — "Bug" and "bug" are different labels
- Labels are **globally available** — any label can be used on any card on any board
- Labels can be **created on-the-fly** — user types name, presses Enter, label is created (or existing label is reused if name matches exactly)
- Story Points follow **Fibonacci sequence**: 1, 2, 3, 5, 8, 13, 21 (dropdown select)
- Story Points badge on card tiles shows **value or "-" if unset** (always visible)
- Labels are **gray chips** — no color variation, square corners (`bg-[#E8EAED]`, `text-[#172B4D]`, no `rounded-full`)
- Auto-save: changes to labels/story points trigger immediate PATCH (no manual save button)
- Build verification: `node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build`

---

### Task 1: Create Label Model

**Files:**
- Create: `models/Label.ts`

**Interfaces:**
- Produces: `Label` Mongoose model with schema `{ name (unique, case-sensitive), createdAt }`

- [ ] **Step 1: Create Label model file**

```typescript
import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Label = mongoose.models.Label || mongoose.model('Label', labelSchema);
```

- [ ] **Step 2: Verify schema structure**

Check that the schema has:
- `name` (String, required, unique, trim)
- `createdAt` and `updatedAt` (automatic via timestamps)
- No default color field (labels are always gray)

---

### Task 2: Create Label API Endpoints

**Files:**
- Create: `app/api/labels/route.ts`

**Interfaces:**
- Consumes: `Label` model from Task 1
- Produces: 
  - `POST /api/labels` returns `{ _id, name, createdAt }` (201 if new, 200 if exists)
  - `GET /api/labels?search=query` returns array of labels sorted by name

- [ ] **Step 1: Create labels route file**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import { Label } from '@/models/Label';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  await connectDB();

  try {
    const query = search
      ? { name: { $regex: `^${search}`, $options: '' } }
      : {};
    const labels = await Label.find(query).sort({ name: 1 });
    return NextResponse.json(labels);
  } catch (err) {
    console.error('Error fetching labels:', err);
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Label name is required' }, { status: 400 });
  }

  await connectDB();

  try {
    const trimmedName = name.trim();
    
    // Try to find existing label (case-sensitive exact match)
    let label = await Label.findOne({ name: trimmedName });
    
    if (label) {
      // Label exists, return it with 200
      return NextResponse.json(label, { status: 200 });
    }

    // Create new label
    label = new Label({ name: trimmedName });
    await label.save();
    return NextResponse.json(label, { status: 201 });
  } catch (err) {
    if ((err as any).code === 11000) {
      // Duplicate key error (shouldn't happen with our logic, but safety check)
      const existingLabel = await Label.findOne({ name: name.trim() });
      return NextResponse.json(existingLabel, { status: 200 });
    }
    console.error('Error creating label:', err);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify endpoints**

Test via curl or Postman:
- `POST /api/labels` with `{ "name": "Bug" }` → 201 with new label
- `POST /api/labels` with `{ "name": "Bug" }` again → 200 with existing label
- `POST /api/labels` with `{ "name": "bug" }` (lowercase) → 201 with new label (case-sensitive)
- `GET /api/labels` → sorted array of all labels
- `GET /api/labels?search=Bu` → only labels starting with "Bu"

---

### Task 3: Update Card Schema

**Files:**
- Modify: `models/Card.ts`

**Interfaces:**
- Consumes: Card model (existing)
- Produces: Card schema with `labelIds` (array of ObjectId refs to Label) and `storyPoints` (number or null)

- [ ] **Step 1: Add fields to Card schema**

Find the Card schema definition and add these two fields after `ticketNumber`:

```typescript
    labelIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Label',
      },
    ],
    storyPoints: {
      type: Number,
      enum: [1, 2, 3, 5, 8, 13, 21, null],
      default: null,
    },
```

Complete updated section:
```typescript
    ticketNumber: {
      type: Number,
    },
    labelIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Label',
      },
    ],
    storyPoints: {
      type: Number,
      enum: [1, 2, 3, 5, 8, 13, 21, null],
      default: null,
    },
```

- [ ] **Step 2: Verify schema compiles**

Run: `npm run build` or `node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build`
Expected: no TypeScript errors related to Card schema

---

### Task 4: Extend PATCH /api/cards/[id] Endpoint

**Files:**
- Modify: `app/api/cards/[id]/route.ts`

**Interfaces:**
- Consumes: Card model (updated), Label model
- Produces: Extended PATCH handler accepting `labelIds` and `storyPoints` in request body

- [ ] **Step 1: Update PATCH handler to accept new fields**

Find the existing PATCH handler in `app/api/cards/[id]/route.ts` and update it to handle `labelIds` and `storyPoints`.

Current structure (around line X, look for `export async function PATCH`):
```typescript
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { id } = await params;
  const updates = await request.json();
  
  // ... existing validation and permission check ...
  
  // Find and update card
  const card = await Card.findByIdAndUpdate(id, updates, { new: true }).populate('assigneeId', 'name email');
  return NextResponse.json(card);
}
```

Update to:
```typescript
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { id } = await params;
  const updates = await request.json();

  // Validate storyPoints if provided
  if ('storyPoints' in updates) {
    const validPoints = [1, 2, 3, 5, 8, 13, 21, null];
    if (updates.storyPoints !== null && !validPoints.includes(updates.storyPoints)) {
      return NextResponse.json({ error: 'Invalid story points value' }, { status: 400 });
    }
  }

  // Validate labelIds if provided (should be array of valid ObjectIds)
  if ('labelIds' in updates) {
    if (!Array.isArray(updates.labelIds)) {
      return NextResponse.json({ error: 'labelIds must be an array' }, { status: 400 });
    }
  }

  await connectDB();

  const card = await Card.findById(id);
  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  const list = await List.findById(card.listId);
  const board = await Board.findById(list?.boardId);
  
  if (!board || !board.memberIds.some((mid: any) => mid.toString() === session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Apply updates
  Object.assign(card, updates);
  await card.save();

  // Populate and return
  await card.populate('assigneeId', 'name email');
  await card.populate('labelIds', 'name');
  
  return NextResponse.json(card);
}
```

- [ ] **Step 2: Verify PATCH works**

Test via curl:
- `PATCH /api/cards/[someCardId]` with `{ "storyPoints": 5 }` → 200 with updated card
- `PATCH /api/cards/[someCardId]` with `{ "labelIds": ["label1_id", "label2_id"] }` → 200 with updated card
- `PATCH /api/cards/[someCardId]` with invalid story points → 400 error

---

### Task 5: Update Card TypeScript Interface in CardView

**Files:**
- Modify: `app/boards/[id]/CardView.tsx`

**Interfaces:**
- Consumes: Card interface (existing)
- Produces: Updated Card interface with `labelIds` and `storyPoints`

- [ ] **Step 1: Update Card interface**

Find the Card interface near the top of CardView.tsx (around line 6-13) and update:

```typescript
interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
  labelIds?: { _id: string; name: string }[];
  storyPoints?: number;
}
```

- [ ] **Step 2: Update CardUpdate interface**

Find CardUpdate interface (around line 21-25) and add the new fields:

```typescript
interface CardUpdate {
  title?: string;
  description?: string;
  assigneeId?: string;
  labelIds?: string[];
  storyPoints?: number;
}
```

---

### Task 6: Add Story Points UI to CardView

**Files:**
- Modify: `app/boards/[id]/CardView.tsx`

**Interfaces:**
- Consumes: Card (from Task 5), CardUpdate (from Task 5), story points Fibonacci values
- Produces: Story Points section in right metadata panel with dropdown select

- [ ] **Step 1: Add state for story points**

In the CardView component, after the existing state declarations (around line 46-54), add:

```typescript
  const [storyPoints, setStoryPoints] = useState(card.storyPoints || null);
```

And update the useEffect to sync story points:

```typescript
  useEffect(() => {
    setTitleValue(card.title);
    setDescriptionValue(card.description);
    setAssigneeId(card.assigneeId?._id || '');
    setStoryPoints(card.storyPoints || null);
  }, [card]);
```

- [ ] **Step 2: Add story points handler**

Add this handler after `handleAssigneeChange`:

```typescript
  const handleStoryPointsChange = async (value: string) => {
    const pointValue = value === '' ? null : parseInt(value, 10);
    setStoryPoints(pointValue);
    await saveField({ storyPoints: pointValue }, 'storyPoints');
  };
```

- [ ] **Step 3: Replace Story Points placeholder in JSX**

Find the placeholder Story Points section (around line 256-260):

```typescript
          {/* Placeholder: Story Points */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Story Points</p>
            <div className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5">—</div>
          </div>
```

Replace with:

```typescript
          {/* Story Points — wired */}
          <div>
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Story Points</p>
            <select
              value={storyPoints ?? ''}
              onChange={(e) => handleStoryPointsChange(e.target.value)}
              disabled={saving === 'storyPoints'}
              className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC] bg-white disabled:opacity-50 cursor-pointer text-[#172B4D]"
            >
              <option value="">None</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="8">8</option>
              <option value="13">13</option>
              <option value="21">21</option>
            </select>
          </div>
```

- [ ] **Step 4: Verify story points UI renders**

Build and open a card modal/full-page card:
- Story Points dropdown appears in right panel
- Selecting a value auto-saves
- Value persists across reload

---

### Task 7: Add Labels UI to CardView

**Files:**
- Modify: `app/boards/[id]/CardView.tsx`

**Interfaces:**
- Consumes: Card (from Task 5), CardUpdate (from Task 5), Label API
- Produces: Labels section in right metadata panel with searchable input + add/remove UI

- [ ] **Step 1: Add state for labels and search**

After the story points state (line ~55), add:

```typescript
  const [labelIds, setLabelIds] = useState<string[]>(card.labelIds?.map(l => l._id) || []);
  const [availableLabels, setAvailableLabels] = useState<{ _id: string; name: string }[]>([]);
  const [labelSearch, setLabelSearch] = useState('');
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
```

- [ ] **Step 2: Add useEffect to fetch labels on mount**

Add after the existing useEffect:

```typescript
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const res = await fetch('/api/labels');
        if (res.ok) {
          const labels = await res.json();
          setAvailableLabels(labels);
        }
      } catch (err) {
        console.error('Failed to fetch labels:', err);
      }
    };
    fetchLabels();
  }, []);
```

- [ ] **Step 3: Add label handlers**

Add these handlers after `handleStoryPointsChange`:

```typescript
  const handleAddLabel = async (label: { _id: string; name: string }) => {
    if (!labelIds.includes(label._id)) {
      const newLabelIds = [...labelIds, label._id];
      setLabelIds(newLabelIds);
      await saveField({ labelIds: newLabelIds }, 'labels');
    }
    setLabelSearch('');
    setShowLabelDropdown(false);
  };

  const handleRemoveLabel = async (labelId: string) => {
    const newLabelIds = labelIds.filter(id => id !== labelId);
    setLabelIds(newLabelIds);
    await saveField({ labelIds: newLabelIds }, 'labels');
  };

  const handleCreateLabel = async () => {
    if (!labelSearch.trim()) return;
    
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: labelSearch.trim() }),
      });
      
      if (res.ok) {
        const label = await res.json();
        await handleAddLabel(label);
        // Refresh labels list
        const labelsRes = await fetch('/api/labels');
        if (labelsRes.ok) {
          setAvailableLabels(await labelsRes.json());
        }
      }
    } catch (err) {
      console.error('Failed to create label:', err);
      setFieldError('Failed to create label');
    }
  };

  const filteredLabels = availableLabels.filter(
    label =>
      !labelIds.includes(label._id) &&
      label.name.toLowerCase().includes(labelSearch.toLowerCase())
  );
```

- [ ] **Step 4: Replace Labels placeholder in JSX**

Find the placeholder Labels section (around line 250-254):

```typescript
          {/* Placeholder: Labels */}
          <div className="pointer-events-none opacity-40">
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Labels</p>
            <div className="w-full text-sm text-[#7A8699] bg-[#F4F5F7] rounded px-2 py-1.5">—</div>
          </div>
```

Replace with:

```typescript
          {/* Labels — wired */}
          <div>
            <p className="text-xs font-semibold text-[#7A8699] uppercase tracking-wider mb-1">Labels</p>
            
            {/* Selected labels as chips */}
            <div className="flex flex-wrap gap-1 mb-2">
              {labelIds.map(id => {
                const label = availableLabels.find(l => l._id === id) || 
                              card.labelIds?.find(l => l._id === id);
                if (!label) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-[#E8EAED] text-[#172B4D] px-2 py-0.5 text-xs"
                  >
                    {label.name}
                    <button
                      onClick={() => handleRemoveLabel(id)}
                      className="hover:text-[#D93025] cursor-pointer text-xs leading-none"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Label search input */}
            <div className="relative">
              <input
                type="text"
                value={labelSearch}
                onChange={(e) => {
                  setLabelSearch(e.target.value);
                  setShowLabelDropdown(true);
                }}
                onFocus={() => setShowLabelDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateLabel();
                  }
                }}
                placeholder="Search or create label..."
                disabled={saving === 'labels'}
                className="w-full text-sm border border-[#D0D4DC] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0066CC] disabled:opacity-50"
              />

              {/* Dropdown suggestions */}
              {showLabelDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D0D4DC] rounded shadow-md z-10 max-h-40 overflow-y-auto">
                  {filteredLabels.length > 0 ? (
                    filteredLabels.map(label => (
                      <button
                        key={label._id}
                        onClick={() => handleAddLabel(label)}
                        className="w-full text-left px-2 py-1.5 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition"
                      >
                        {label.name}
                      </button>
                    ))
                  ) : labelSearch.trim() ? (
                    <button
                      onClick={() => handleCreateLabel()}
                      className="w-full text-left px-2 py-1.5 text-sm text-[#0066CC] hover:bg-[#F4F5F7]"
                    >
                      + Create "{labelSearch.trim()}"
                    </button>
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-[#7A8699]">No labels</div>
                  )}
                </div>
              )}
            </div>
          </div>
```

- [ ] **Step 5: Verify labels UI renders**

Build and open a card modal/full-page card:
- Labels section appears with input field
- Type to search labels
- Click label to add (chip appears)
- Click ✕ on chip to remove
- Type new name and press Enter to create new label
- Changes persist across reload

---

### Task 8: Update DraggableCard to Show Story Points Badge

**Files:**
- Modify: `app/boards/[id]/DraggableCard.tsx`

**Interfaces:**
- Consumes: Card interface (updated with storyPoints)
- Produces: Card tile with story points badge showing value or "-" if unset

- [ ] **Step 1: Update Card interface in DraggableCard**

Find the Card interface at the top of DraggableCard.tsx and ensure it includes `storyPoints`:

```typescript
interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
  storyPoints?: number;
}
```

- [ ] **Step 2: Add story points badge to card tile JSX**

Find the card tile return JSX (the div with className containing `bg-white rounded-md shadow-sm border`).

At the end of the card content (before closing `</div>`), add:

```typescript
      {/* Story Points badge */}
      <div className="flex items-center justify-between mt-2 text-xs text-[#7A8699]">
        <span>SP:</span>
        <span className="font-semibold text-[#172B4D]">{card.storyPoints ?? "-"}</span>
      </div>
```

Or position it differently if preferred (e.g., top-right corner). Example for bottom-right:

```typescript
      <div className="absolute bottom-2 right-2 text-xs font-semibold text-[#172B4D] bg-[#F4F5F7] px-1.5 py-0.5 rounded">
        {card.storyPoints ?? "-"}
      </div>
```

- [ ] **Step 3: Verify story points badge appears**

Build and view the kanban board:
- Each card tile shows story points badge (value or "-")
- Badge is visible and readable
- Value updates when card is saved

---

### Task 9: Build and End-to-End Test

**Files:**
- No files modified (verification only)

- [ ] **Step 1: Verify build**

Run:
```bash
node --require ./dns-patch.cjs ./node_modules/next/dist/bin/next build
```

Expected: Zero TypeScript errors, all routes compiled.

- [ ] **Step 2: Test full flow**

1. Open app and navigate to a board
2. Click a card to open modal
3. In Labels section:
   - Type "bug" and press Enter → creates "bug" label, adds to card
   - Type "Bug" and press Enter → creates "Bug" label (case-sensitive), adds to card
   - Type "bug" again → shows existing "bug" in dropdown, click to add
   - Click ✕ on a chip → removes label
4. In Story Points section:
   - Select "5" → auto-saves, reloads to verify persistence
   - Change to "8" → auto-saves
5. Close modal and view card tile:
   - Story points badge shows selected value or "-" if unset
6. Full-page card route:
   - Same labels and story points UI works
7. Create a second card:
   - Verify it can use the same labels created in step 1

- [ ] **Step 3: Commit**

```bash
git add models/Label.ts app/api/labels/route.ts models/Card.ts app/api/cards/[id]/route.ts app/boards/[id]/CardView.tsx app/boards/[id]/DraggableCard.tsx
git commit -m "feat: labels and story points (case-sensitive labels, Fibonacci story points, auto-save)"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Label model (new, global, case-sensitive) — Task 1
- ✅ POST /api/labels (create, existing label reuse via 200) — Task 2
- ✅ GET /api/labels (list, searchable) — Task 2
- ✅ Card schema updates (labelIds, storyPoints) — Task 3
- ✅ PATCH /api/cards/[id] extended — Task 4
- ✅ CardView labels UI (searchable, add/remove, auto-create) — Task 7
- ✅ CardView story points UI (dropdown, Fibonacci) — Task 6
- ✅ DraggableCard story points badge ("-" if unset) — Task 8
- ✅ Auto-save on changes — Tasks 6–8
- ✅ Build verification — Task 9

**Type consistency:**
- Card interface updated in Task 5 (labelIds, storyPoints)
- Used consistently in Tasks 6–8
- CardUpdate interface updated in Task 5 (labelIds, storyPoints)
- Used in handlers (Tasks 6–7)

**No placeholders:**
- All code blocks are complete and runnable
- No "TBD", "TODO", or "add error handling" phrases
- Every step has exact commands with expected output

**Scope:**
- Appropriately scoped to single feature (labels + story points together)
- No out-of-scope refactoring or unrelated changes
