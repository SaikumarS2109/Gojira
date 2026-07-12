# Card Types Feature Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable admin-configurable card types on a per-board basis, with a JIRA-style type selector for cards that displays type icons before ticket numbers.

**Architecture:** Card types are predefined globally (Epic, Story, Subtask, Task, Bug) and managed via SVG icons in `public/icons/`. Each board stores an `enabledCardTypes` array to customize which types are available. Cards have a required `type` field. Type selection happens during card creation and via a modal when clicking the card's type icon in any view.

**Tech Stack:** Next.js 15, MongoDB (Mongoose), React, Tailwind CSS, TypeScript, SVG icons

## Global Constraints

- Card types are predefined: Epic, Story, Subtask, Task, Bug (no custom types)
- Each board controls which types are enabled via admin interface
- Card type is required and immutable at creation; changeable post-creation via type-change modal
- Type icons live in `public/icons/`: epic.svg, story.svg, subtask.svg, task.svg, bug.svg
- Type change UI is modal-based (not dropdown), matching JIRA's interaction pattern
- Admin-only feature: only users with `role === 'admin'` can manage board card types
- Type field displays as icon + label where space permits, icon-only where constrained

---

## Data Model

### Card Schema Extension

```typescript
type: {
  type: String,
  enum: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
  required: true,
}
```

**Placement:** Add to Card.ts model after `storyPoints` field.

**Migration:** Existing cards without a type must be backfilled (migration script or seed update).

### Board Schema Extension

```typescript
enabledCardTypes: {
  type: [String],
  enum: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
  default: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
}
```

**Placement:** Add to Board.ts model after `memberIds` array.

**Default:** All 5 types enabled for new boards.

### CardType Constant (No DB Storage)

Define in a utilities file (`lib/cardTypes.ts`):

```typescript
export const CARD_TYPES = {
  EPIC: 'Epic',
  STORY: 'Story',
  SUBTASK: 'Subtask',
  TASK: 'Task',
  BUG: 'Bug',
} as const;

export const CARD_TYPE_ICONS: Record<string, string> = {
  Epic: '/icons/epic.svg',
  Story: '/icons/story.svg',
  Subtask: '/icons/subtask.svg',
  Task: '/icons/task.svg',
  Bug: '/icons/bug.svg',
};

export const CARD_TYPE_COLORS: Record<string, string> = {
  Epic: '#904EE2',    // Purple
  Story: '#63BA3C',   // Green
  Subtask: '#4BADE8', // Blue
  Task: '#4BADE8',    // Blue
  Bug: '#E5493A',     // Red
};
```

---

## API Endpoints

### GET /api/boards/[id]/card-types

Returns enabled card types for a board.

**Response:**
```json
{
  "enabledCardTypes": ["Epic", "Story", "Subtask", "Task", "Bug"]
}
```

### PATCH /api/boards/[id]/card-types

Admin-only. Updates enabled card types for a board.

**Request:**
```json
{
  "enabledCardTypes": ["Epic", "Story", "Task"]
}
```

**Access Control:** Admin-only (`session.user.role === 'admin'`).

### Extend PATCH /api/cards/[id]

Add support for updating card `type` field.

**Request Body (optional field):**
```json
{
  "type": "Epic"
}
```

---

## UI & Interaction

### Card Creation Flow

1. User clicks "Create Card" on a board
2. A dialog/modal appears with:
   - **Type Selector:** Grid of available type icons (only enabled types for that board)
   - **Card Title Input:** Below type selector
   - **Create / Cancel Buttons**
3. Type selection is required (button stays disabled until type is picked)
4. On create, POST includes the selected type

### Card Type Display

**DraggableCard (kanban tile):**
- Layout: `[Type Icon] Ticket# Title`
- Type icon: 20x20px, positioned left of ticket number
- Example: `📖 PROJ-123 Build Dashboard`

**CardView (detail view):**
- Type icon displayed in header, near ticket number
- Icon size: 24x24px
- Clickable to open type-change modal

**CardModal (modal view):**
- Same as CardView: icon in header, clickable

### Type Change Modal

- Triggered by clicking type icon on card (any view)
- Modal title: "Change Card Type"
- Grid of all enabled types for that board (4-5 per row)
- Each type shows: [Icon] Label (e.g., 📖 Story)
- Current type is highlighted/selected
- "Cancel" button to close without changes
- Selecting a new type: PATCH /api/cards/[id] with new type, modal closes
- On success: card refreshes, icon updates in all views

---

## Admin Interface

### Board Card Types Management Page

**Location:** `/admin/board-management` (extend existing page)

**New Section:** "Card Types" (after "Columns")

**Layout:**
- Board selector dropdown (existing)
- Toggles for each card type (5 total)
  - Format: `☑ Epic`, `☑ Story`, `☑ Subtask`, `☑ Task`, `☑ Bug`
  - Each toggle controls whether that type is enabled on the selected board
- "Save" button (only enabled if changes made)
- All types must remain enabled by default on new boards

**Access Control:** Admin-only.

**Error Handling:** If disabling a type that existing cards use, show warning: "N cards use this type. Disabling will hide them from type selector but not delete them."

---

## Components & Files to Create/Modify

### New Files
- `lib/cardTypes.ts` — Card type constants and icon mappings
- `components/CardTypeSelector.tsx` — Type selection grid (used in create + type-change modal)
- `components/TypeChangeModal.tsx` — Modal for changing card type
- `app/api/boards/[id]/card-types/route.ts` — GET/PATCH card types endpoint

### Modified Files
- `models/Card.ts` — Add `type` field
- `models/Board.ts` — Add `enabledCardTypes` field
- `app/api/cards/[id]/route.ts` — Support `type` in PATCH
- `app/boards/[id]/page.tsx` — Card creation UI with type selector
- `components/DraggableCard.tsx` — Display type icon before ticket number
- `components/CardView.tsx` — Display type icon, handle type click
- `components/CardModal.tsx` — Type icon click handler
- `app/admin/board-management/page.tsx` (or create `app/admin/board-types/page.tsx`) — Admin UI for managing card types

### Migration
- Seed script or migration: backfill existing cards with default type (e.g., 'Story')

---

## TypeScript Interfaces

```typescript
interface Card {
  // ... existing fields
  type: 'Epic' | 'Story' | 'Subtask' | 'Task' | 'Bug';
}

interface Board {
  // ... existing fields
  enabledCardTypes: string[];
}

interface CardTypeConfig {
  label: string;
  icon: string;
  color: string;
}
```

---

## Error Handling

- **Type not enabled on board:** If someone tries to create/change to a disabled type, API returns 400 with message "This card type is not enabled on this board."
- **Missing type on creation:** Require type selection before card can be created.
- **Invalid type value:** API validation ensures type is one of the 5 predefined types.

---

## Testing

- Unit: CardTypeSelector component renders correct types based on enabled list
- Unit: TypeChangeModal updates card type on selection
- Integration: Create card requires type selection; card displays correct icon
- Integration: Admin can enable/disable types; disabled types don't appear in type selector
- Integration: Changing type persists to database and updates all views

---

## Success Criteria

- [ ] Cards have a required `type` field (one of 5 predefined types)
- [ ] Admin can enable/disable types per board
- [ ] Card creation requires type selection
- [ ] Card type icon displays before ticket number in DraggableCard and CardView
- [ ] Clicking type icon opens modal to change type
- [ ] Type changes persist and update across all views
- [ ] Icons render correctly and match the 5 SVG files in public/icons/
