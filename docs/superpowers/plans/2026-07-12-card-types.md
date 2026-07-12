# Card Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement admin-configurable card types with required type selection on card creation, type icons displayed on cards, and a modal-based type-change UI.

**Architecture:** Card types (Epic, Story, Subtask, Task, Bug) are predefined constants managed globally. Each board stores an `enabledCardTypes` array to control which types are available. Cards have a required `type` field. Type selection is required during creation; type changes happen via a modal that displays enabled types for the board.

**Tech Stack:** Next.js 15 App Router, MongoDB/Mongoose, React, Tailwind CSS, TypeScript, SVG icons

## Global Constraints

- Card types are predefined and hardcoded: Epic, Story, Subtask, Task, Bug
- Each board controls which types are enabled via admin interface (defaults to all 5)
- Card type is required; selected during creation, changeable via modal
- Type icons live in `public/icons/`: epic.svg, story.svg, subtask.svg, task.svg, bug.svg
- Type change UI is modal-based, not dropdown
- Admin-only access (`session.user.role === 'admin'`) for managing board types
- Type icons display 20x20px on cards (DraggableCard), 24x24px in details (CardView)
- API validation: type must be one of 5 predefined types and enabled on the board

---

### Task 1: Create CardType Utilities

**Files:**
- Create: `lib/cardTypes.ts`

**Interfaces:**
- Produces: `CARD_TYPES` object, `CARD_TYPE_ICONS` mapping, `CARD_TYPE_COLORS` mapping, `CardTypeConfig` interface

- [ ] **Step 1: Create lib/cardTypes.ts with constants and mappings**

```typescript
// lib/cardTypes.ts
export const CARD_TYPES = {
  EPIC: 'Epic',
  STORY: 'Story',
  SUBTASK: 'Subtask',
  TASK: 'Task',
  BUG: 'Bug',
} as const;

export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES];

export const CARD_TYPE_ICONS: Record<CardType, string> = {
  Epic: '/icons/epic.svg',
  Story: '/icons/story.svg',
  Subtask: '/icons/subtask.svg',
  Task: '/icons/task.svg',
  Bug: '/icons/bug.svg',
};

export const CARD_TYPE_COLORS: Record<CardType, string> = {
  Epic: '#904EE2',    // Purple
  Story: '#63BA3C',   // Green
  Subtask: '#4BADE8', // Blue
  Task: '#4BADE8',    // Blue
  Bug: '#E5493A',     // Red
};

export const CARD_TYPE_LIST: CardType[] = Object.values(CARD_TYPES);

export interface CardTypeConfig {
  label: CardType;
  icon: string;
  color: string;
}

export function getCardTypeConfig(type: CardType): CardTypeConfig {
  return {
    label: type,
    icon: CARD_TYPE_ICONS[type],
    color: CARD_TYPE_COLORS[type],
  };
}

export function isValidCardType(value: any): value is CardType {
  return CARD_TYPE_LIST.includes(value);
}
```

- [ ] **Step 2: Verify file created**

```bash
ls -la lib/cardTypes.ts
```

Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add lib/cardTypes.ts
git commit -m "feat: add CardType utilities and constants"
```

---

### Task 2: Update Card Schema with Type Field

**Files:**
- Modify: `models/Card.ts`

**Interfaces:**
- Consumes: `CardType` from `lib/cardTypes.ts`
- Produces: Card schema with required `type` field

- [ ] **Step 1: Read current Card.ts**

```bash
cat models/Card.ts
```

- [ ] **Step 2: Add type field to Card schema**

Add this field after `storyPoints` in the schema:

```typescript
type: {
  type: String,
  enum: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
  required: true,
}
```

Full updated schema section (after storyPoints):

```typescript
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
    type: {
      type: String,
      enum: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
      required: true,
    },
  },
  { timestamps: true }
);
```

- [ ] **Step 3: Commit**

```bash
git add models/Card.ts
git commit -m "feat: add required type field to Card schema"
```

---

### Task 3: Update Board Schema with EnabledCardTypes Field

**Files:**
- Modify: `models/Board.ts`

**Interfaces:**
- Produces: Board schema with `enabledCardTypes` array

- [ ] **Step 1: Add enabledCardTypes field to Board schema**

Add this field after `memberIds` in the schema:

```typescript
enabledCardTypes: {
  type: [String],
  enum: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
  default: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
}
```

Full updated schema:

```typescript
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
    enabledCardTypes: {
      type: [String],
      enum: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
      default: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
    },
  },
  { timestamps: true }
);
```

- [ ] **Step 2: Commit**

```bash
git add models/Board.ts
git commit -m "feat: add enabledCardTypes array to Board schema"
```

---

### Task 4: Create CardTypeSelector Component

**Files:**
- Create: `components/CardTypeSelector.tsx`

**Interfaces:**
- Consumes: `CARD_TYPE_ICONS`, `CARD_TYPE_LIST`, `CardType` from `lib/cardTypes.ts`
- Produces: React component that renders type grid, accepts `selectedType`, `enabledTypes`, `onSelect` props

- [ ] **Step 1: Create CardTypeSelector.tsx**

```typescript
// components/CardTypeSelector.tsx
'use client';

import Image from 'next/image';
import { CARD_TYPE_ICONS, CARD_TYPE_LIST, CardType } from '@/lib/cardTypes';

interface CardTypeSelectorProps {
  enabledTypes: CardType[];
  selectedType?: CardType;
  onSelect: (type: CardType) => void;
  columns?: number;
}

export function CardTypeSelector({
  enabledTypes,
  selectedType,
  onSelect,
  columns = 5,
}: CardTypeSelectorProps) {
  // Filter to only show enabled types in the order they appear in CARD_TYPE_LIST
  const visibleTypes = CARD_TYPE_LIST.filter((type) =>
    enabledTypes.includes(type)
  );

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${Math.min(columns, visibleTypes.length)}, minmax(0, 1fr))`,
      }}
    >
      {visibleTypes.map((type) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition ${
            selectedType === type
              ? 'border-[#0066CC] bg-blue-50'
              : 'border-[#D0D4DC] hover:border-[#0066CC]'
          }`}
          title={type}
        >
          <Image
            src={CARD_TYPE_ICONS[type]}
            alt={type}
            width={32}
            height={32}
            className="flex-shrink-0"
          />
          <span className="text-xs font-medium text-[#172B4D]">{type}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/CardTypeSelector.tsx
git commit -m "feat: create CardTypeSelector component"
```

---

### Task 5: Create TypeChangeModal Component

**Files:**
- Create: `components/TypeChangeModal.tsx`

**Interfaces:**
- Consumes: `CardTypeSelector`, `CardType`, `CARD_TYPE_ICONS` from props and `lib/cardTypes.ts`
- Produces: React component that renders modal for changing card type

- [ ] **Step 1: Create TypeChangeModal.tsx**

```typescript
// components/TypeChangeModal.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { CardTypeSelector } from './CardTypeSelector';
import { CardType } from '@/lib/cardTypes';

interface TypeChangeModalProps {
  isOpen: boolean;
  currentType: CardType;
  enabledTypes: CardType[];
  onClose: () => void;
  onTypeChange: (type: CardType) => Promise<void>;
  isLoading?: boolean;
}

export function TypeChangeModal({
  isOpen,
  currentType,
  enabledTypes,
  onClose,
  onTypeChange,
  isLoading = false,
}: TypeChangeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTypeSelect = async (type: CardType) => {
    if (type !== currentType) {
      await onTypeChange(type);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="text-lg font-semibold text-[#172B4D] mb-4">
          Change Card Type
        </h2>

        <div className="mb-6">
          <CardTypeSelector
            enabledTypes={enabledTypes}
            selectedType={currentType}
            onSelect={handleTypeSelect}
            columns={4}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[#42526E] hover:text-[#172B4D] transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/TypeChangeModal.tsx
git commit -m "feat: create TypeChangeModal component"
```

---

### Task 6: Create Board Card-Types API Endpoints

**Files:**
- Create: `app/api/boards/[id]/card-types/route.ts`

**Interfaces:**
- Consumes: Board model, session from auth
- Produces: GET and PATCH endpoints for managing board card types

- [ ] **Step 1: Create app/api/boards/[id]/card-types directory and route.ts**

```typescript
// app/api/boards/[id]/card-types/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Board } from '@/models/Board';
import dbConnect from '@/lib/dbConnect';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const board = await Board.findById(id).select('enabledCardTypes');
    if (!board) {
      return Response.json({ error: 'Board not found' }, { status: 404 });
    }

    return Response.json({
      enabledCardTypes: board.enabledCardTypes,
    });
  } catch (error) {
    console.error('[GET card-types]', error);
    return Response.json({ error: 'Failed to fetch card types' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { enabledCardTypes } = await request.json();

    // Validate enabledCardTypes
    const validTypes = ['Epic', 'Story', 'Subtask', 'Task', 'Bug'];
    if (!Array.isArray(enabledCardTypes) || !enabledCardTypes.every((t) => validTypes.includes(t))) {
      return Response.json({ error: 'Invalid card types' }, { status: 400 });
    }

    await dbConnect();

    const board = await Board.findByIdAndUpdate(
      id,
      { enabledCardTypes },
      { new: true }
    ).select('enabledCardTypes');

    if (!board) {
      return Response.json({ error: 'Board not found' }, { status: 404 });
    }

    return Response.json({ enabledCardTypes: board.enabledCardTypes });
  } catch (error) {
    console.error('[PATCH card-types]', error);
    return Response.json({ error: 'Failed to update card types' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/boards/[id]/card-types/route.ts
git commit -m "feat: create board card-types API endpoints"
```

---

### Task 7: Update PATCH /api/cards/[id] to Support Type Field

**Files:**
- Modify: `app/api/cards/[id]/route.ts`

**Interfaces:**
- Consumes: Request body with optional `type` field
- Produces: Updated PATCH handler that validates and saves card type

- [ ] **Step 1: Read current route.ts**

```bash
head -100 app/api/cards/[id]/route.ts
```

- [ ] **Step 2: Find the PATCH handler and update it**

In the PATCH handler, add type validation and update:

```typescript
// Add this near the top of PATCH function, after getting the body
const { title, description, assigneeId, labelIds, storyPoints, type } = await request.json();

// Add type validation (before the Card.findByIdAndUpdate call)
if (type !== undefined) {
  const validTypes = ['Epic', 'Story', 'Subtask', 'Task', 'Bug'];
  if (!validTypes.includes(type)) {
    return Response.json({ error: 'Invalid card type' }, { status: 400 });
  }
  
  // Check if type is enabled on the board
  const card = await Card.findById(id).populate('listId');
  const boardId = card?.listId?.boardId;
  if (boardId) {
    const board = await Board.findById(boardId);
    if (!board?.enabledCardTypes.includes(type)) {
      return Response.json(
        { error: 'This card type is not enabled on this board' },
        { status: 400 }
      );
    }
  }
}

// Update the Card.findByIdAndUpdate to include type in updateData
const updateData: any = {};
if (title !== undefined) updateData.title = title;
if (description !== undefined) updateData.description = description;
if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
if (labelIds !== undefined) updateData.labelIds = labelIds;
if (storyPoints !== undefined) updateData.storyPoints = storyPoints;
if (type !== undefined) updateData.type = type;

const updatedCard = await Card.findByIdAndUpdate(id, updateData, { new: true })
  .populate(['assigneeId', 'labelIds']);
```

- [ ] **Step 3: Commit**

```bash
git add app/api/cards/[id]/route.ts
git commit -m "feat: add type field support to PATCH /api/cards/[id]"
```

---

### Task 8: Update Card Creation Flow to Require Type Selection

**Files:**
- Modify: `app/boards/[id]/page.tsx`

**Interfaces:**
- Consumes: `CardTypeSelector` component, board's `enabledCardTypes`
- Produces: Updated card creation modal that requires type selection

- [ ] **Step 1: Find the card creation modal/dialog in the board page**

Locate where `onCreateCard` is handled and the modal/dialog is rendered.

- [ ] **Step 2: Add type state and selector to creation flow**

Add state for selected type:

```typescript
const [selectedCardType, setSelectedCardType] = useState<CardType | undefined>();
```

Add CardTypeSelector to the creation modal/dialog (before or as first field):

```tsx
<div className="mb-4">
  <label className="block text-sm font-medium text-[#172B4D] mb-2">
    Card Type *
  </label>
  <CardTypeSelector
    enabledTypes={board.enabledCardTypes || CARD_TYPE_LIST}
    selectedType={selectedCardType}
    onSelect={setSelectedCardType}
  />
</div>
```

- [ ] **Step 3: Modify create card handler to require type**

Update the create card function to:
1. Check that `selectedCardType` is set before creating
2. Include type in POST /api/cards request
3. Reset selectedCardType on success

```typescript
const handleCreateCard = async (title: string) => {
  if (!selectedCardType) {
    alert('Please select a card type');
    return;
  }

  const response = await fetch(`/api/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listId: selectedListId,
      title,
      type: selectedCardType,
    }),
  });

  if (response.ok) {
    setSelectedCardType(undefined);
    // ... rest of success handling
  }
};
```

- [ ] **Step 4: Import CardTypeSelector and CardType**

```typescript
import { CardTypeSelector } from '@/components/CardTypeSelector';
import { CardType, CARD_TYPE_LIST } from '@/lib/cardTypes';
```

- [ ] **Step 5: Commit**

```bash
git add app/boards/[id]/page.tsx
git commit -m "feat: require card type selection on card creation"
```

---

### Task 9: Update DraggableCard to Show Type Icon

**Files:**
- Modify: `components/DraggableCard.tsx`

**Interfaces:**
- Consumes: Card object with `type` field, `CARD_TYPE_ICONS`
- Produces: Updated card tile showing type icon before ticket number

- [ ] **Step 1: Read current DraggableCard.tsx**

Locate the section that displays the ticket number.

- [ ] **Step 2: Add type icon display**

Find where ticket number is rendered (typically something like `{card.ticketNumber}`):

```typescript
import Image from 'next/image';
import { CARD_TYPE_ICONS } from '@/lib/cardTypes';

// In the render section, update the ticket number area:
<div className="flex items-center gap-1">
  <Image
    src={CARD_TYPE_ICONS[card.type]}
    alt={card.type}
    width={20}
    height={20}
    className="flex-shrink-0"
  />
  <span className="font-semibold text-[#172B4D]">{card.ticketNumber}</span>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add components/DraggableCard.tsx
git commit -m "feat: display card type icon on draggable card tile"
```

---

### Task 10: Update CardView to Show Type Icon and Handle Click

**Files:**
- Modify: `components/CardView.tsx`

**Interfaces:**
- Consumes: Card object with `type`, board's `enabledCardTypes`, TypeChangeModal component
- Produces: CardView with clickable type icon and type-change modal

- [ ] **Step 1: Add state for type-change modal**

```typescript
const [isTypeChangeModalOpen, setIsTypeChangeModalOpen] = useState(false);
const [isUpdatingType, setIsUpdatingType] = useState(false);
```

- [ ] **Step 2: Add type change handler**

```typescript
const handleTypeChange = async (newType: CardType) => {
  setIsUpdatingType(true);
  try {
    const response = await fetch(`/api/cards/${card._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: newType }),
    });

    if (response.ok) {
      const updated = await response.json();
      // Update local card state - adjust based on your state management
      onCardUpdate?.(updated);
    }
  } finally {
    setIsUpdatingType(false);
  }
};
```

- [ ] **Step 3: Add type icon to header**

Find the header section where ticket number is displayed and add:

```typescript
import Image from 'next/image';
import { CARD_TYPE_ICONS, CardType } from '@/lib/cardTypes';
import { TypeChangeModal } from './TypeChangeModal';

// In the header section:
<button
  onClick={() => setIsTypeChangeModalOpen(true)}
  className="flex items-center gap-1 hover:opacity-70 transition"
  title="Change card type"
>
  <Image
    src={CARD_TYPE_ICONS[card.type]}
    alt={card.type}
    width={24}
    height={24}
  />
</button>

<span className="font-semibold text-[#172B4D]">{card.ticketNumber}</span>
```

- [ ] **Step 4: Add TypeChangeModal component at bottom**

```typescript
<TypeChangeModal
  isOpen={isTypeChangeModalOpen}
  currentType={card.type as CardType}
  enabledTypes={(board?.enabledCardTypes || []) as CardType[]}
  onClose={() => setIsTypeChangeModalOpen(false)}
  onTypeChange={handleTypeChange}
  isLoading={isUpdatingType}
/>
```

- [ ] **Step 5: Commit**

```bash
git add components/CardView.tsx
git commit -m "feat: add clickable type icon to CardView with type-change modal"
```

---

### Task 11: Update CardModal to Handle Type Icon Click

**Files:**
- Modify: `components/CardModal.tsx`

**Interfaces:**
- Consumes: CardView component which now handles type icon click
- Produces: Updated CardModal that passes through type-change functionality

- [ ] **Step 1: Verify CardModal integration**

If CardModal wraps CardView, the type-change functionality should already work. Verify by checking that CardView is rendered inside CardModal.

- [ ] **Step 2: Test integration**

No code changes needed if CardView is properly wrapped. If CardModal has its own header handling, apply the same changes as Task 10 to this component.

- [ ] **Step 3: Commit**

```bash
git add components/CardModal.tsx
git commit -m "refactor: CardModal inherits type-change from CardView"
```

---

### Task 12: Create Admin UI for Managing Board Card Types

**Files:**
- Modify: `app/admin/board-management/page.tsx` (or create new admin route)

**Interfaces:**
- Consumes: GET /api/boards, PATCH /api/boards/[id]/card-types endpoint
- Produces: Admin interface with card type toggles per board

- [ ] **Step 1: Add Card Types section to admin page**

In the board management page, after the columns section, add:

```typescript
const [selectedBoardCardTypes, setSelectedBoardCardTypes] = useState<string[]>([]);
const [cardTypeChanges, setCardTypeChanges] = useState(false);

// Fetch card types when board is selected
useEffect(() => {
  if (selectedBoard) {
    fetch(`/api/boards/${selectedBoard._id}/card-types`)
      .then((res) => res.json())
      .then((data) => setSelectedBoardCardTypes(data.enabledCardTypes));
  }
}, [selectedBoard]);

// Handler for toggling card types
const handleCardTypeToggle = (type: string) => {
  setSelectedBoardCardTypes((prev) =>
    prev.includes(type)
      ? prev.filter((t) => t !== type)
      : [...prev, type]
  );
  setCardTypeChanges(true);
};

// Save card type changes
const handleSaveCardTypes = async () => {
  const response = await fetch(
    `/api/boards/${selectedBoard._id}/card-types`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabledCardTypes: selectedBoardCardTypes }),
    }
  );

  if (response.ok) {
    setCardTypeChanges(false);
    // Show success message
  }
};
```

UI Section:

```tsx
<div className="mt-8 pt-8 border-t border-[#D0D4DC]">
  <h3 className="text-lg font-semibold text-[#172B4D] mb-4">Card Types</h3>
  
  <div className="space-y-2 mb-4">
    {['Epic', 'Story', 'Subtask', 'Task', 'Bug'].map((type) => (
      <label key={type} className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={selectedBoardCardTypes.includes(type)}
          onChange={() => handleCardTypeToggle(type)}
          className="w-4 h-4"
        />
        <span className="text-[#172B4D]">{type}</span>
      </label>
    ))}
  </div>

  {cardTypeChanges && (
    <button
      onClick={handleSaveCardTypes}
      className="px-4 py-2 bg-[#0066CC] text-white rounded-md hover:bg-[#0052A3] transition"
    >
      Save Card Types
    </button>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/board-management/page.tsx
git commit -m "feat: add card type toggles to admin board management"
```

---

### Task 13: Backfill Existing Cards with Default Type

**Files:**
- Modify: `scripts/seed.ts` or create migration script

**Interfaces:**
- Consumes: Card model
- Produces: Migration that sets type='Story' for all cards without a type

- [ ] **Step 1: Create or update seed script**

In your seed script (or create a new migration), add:

```typescript
// After database connection setup
const cardsWithoutType = await Card.find({ type: { $exists: false } });

if (cardsWithoutType.length > 0) {
  console.log(`Backfilling ${cardsWithoutType.length} cards with default type...`);
  await Card.updateMany(
    { type: { $exists: false } },
    { $set: { type: 'Story' } }
  );
  console.log('Backfill complete');
}
```

- [ ] **Step 2: Run seed script**

```bash
npm run seed
```

Expected: "Backfilling X cards with default type..." message, then "Backfill complete"

- [ ] **Step 3: Verify migration**

```bash
npx ts-node -e "
const mongoose = require('mongoose');
const { Card } = require('./models/Card');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const cards = await Card.find({});
  console.log('Total cards:', cards.length);
  console.log('Cards without type:', cards.filter((c: any) => !c.type).length);
  console.log('Types:', cards.reduce((acc: any, c: any) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {}));
  process.exit(0);
});
"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: backfill existing cards with default type 'Story'"
```

---

## Testing Checklist

- [ ] CardTypeSelector renders all enabled types with correct icons
- [ ] CardTypeSelector highlights selected type correctly
- [ ] TypeChangeModal opens on type icon click
- [ ] TypeChangeModal closes on cancel or type selection
- [ ] Card creation requires type selection (create button disabled until type picked)
- [ ] Created card has correct type saved to database
- [ ] DraggableCard displays type icon before ticket number
- [ ] CardView displays clickable type icon
- [ ] Clicking type icon opens TypeChangeModal
- [ ] Selecting new type in modal updates card via API
- [ ] Card type updates across all views after change
- [ ] Admin can toggle card types for a board
- [ ] Disabled card types don't appear in type selector
- [ ] GET /api/boards/[id]/card-types returns correct enabled types
- [ ] PATCH /api/boards/[id]/card-types updates types (admin-only)
- [ ] PATCH /api/cards/[id] with type field updates card type
- [ ] Invalid type returns 400 error
- [ ] Non-enabled type returns 400 error
- [ ] Existing cards have type='Story' after backfill
