# Labels and Story Points Design

## Overview

Add **labels** (JIRA-style gray chip tags, globally available, freeform creation) and **story points** (Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21) to cards. Both live in the card's right metadata panel in CardView.

## Goals

- Enable cards to be tagged with categories (Bug, Feature, Urgent, etc.)
- Support effort estimation via Fibonacci-sequence story points
- Implement with minimal schema changes and clean, reusable patterns

## Design Decisions

**Labels:**
- Globally available, card-specific (any card on any board can use any label)
- Stored in a separate `Label` collection (indexed by name for fast lookup)
- Freeform: users create labels on the fly when editing cards
- Visual: gray chip (`bg-[#E8EAED]`, `text-[#172B4D]`), square corners (no border-radius), no color variation
- UI: searchable dropdown input; type to find/filter; Enter to create if label doesn't exist; click chip ✕ to remove
- No limit on labels per card

**Story Points:**
- Single value per card (null if not set)
- Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21
- Single-select dropdown in CardView
- Auto-save on selection

## Data Model

### Label Collection (new)

```typescript
{
  _id: ObjectId,
  name: String (unique index),
  createdAt: Date
}
```

### Card Schema (modified)

Add two fields to existing Card schema:
```typescript
labelIds: [ObjectId] (refs to Label, default [])
storyPoints: Number (one of [1, 2, 3, 5, 8, 13, 21], nullable, default null)
```

## API

### POST /api/labels
Create a new label (or return existing if name already exists).

**Request:**
```json
{
  "name": "Bug"
}
```

**Response:**
```json
{
  "_id": "...",
  "name": "Bug",
  "createdAt": "2026-07-12T..."
}
```

**Status codes:**
- 201: label created
- 200: label already existed (return existing)
- 400: name missing or invalid

**Behavior:** Labels are case-sensitive. "Bug" and "bug" are different labels. If a label with exact name already exists, return it with 200 status instead of trying to create (prevents duplicate creation errors on frontend).

### GET /api/labels
List all labels (for dropdown population and search).

**Query params:**
- `search` (optional): filter labels by name (case-sensitive prefix match)

**Response:**
```json
[
  { "_id": "...", "name": "Bug", "createdAt": "..." },
  { "_id": "...", "name": "Feature", "createdAt": "..." }
]
```

Sorted by name, ascending. Labels are case-sensitive: "Bug" and "bug" are separate entries.

**Status codes:**
- 200: OK
- 401: Unauthorized (sessionless requests blocked)

### PATCH /api/cards/[id]
Update card (existing endpoint extended).

**Request body (either or both):**
```json
{
  "labelIds": ["id1", "id2"],
  "storyPoints": 5
}
```

**Response:** Updated card with new fields populated.

**Status codes:**
- 200: updated
- 400: invalid storyPoints value (not in Fibonacci set)
- 404: card not found
- 403: forbidden (not a board member)

## Frontend

### CardView (app/boards/[id]/CardView.tsx)

**Props update (Card interface):**
```typescript
interface Card {
  // ... existing fields
  labelIds?: { _id: string; name: string }[];
  storyPoints?: number;
}
```

**Right panel sections (replace placeholders):**

**Labels:**
- Label: "LABELS" (uppercase, gray text, small font)
- Display: gray chips (horizontal flex, wrapping)
  - Each chip: `bg-[#E8EAED]`, `text-[#172B4D]`, `px-2 py-1`, square corners
  - Show label name + inline ✕ button to remove
- Edit UI: searchable input dropdown
  - Fetch labels on mount (GET /api/labels)
  - Filter as user types (case-sensitive prefix match)
  - Show matching labels below input
  - Click label or press Enter to add label to card
  - If user types text and presses Enter: POST /api/labels with that name
    - If label already exists (200 response), add the existing label to card
    - If label is new (201 response), add newly created label to card
  - Selected labels appear as chips; click ✕ to deselect
  - Auto-save on chip add/remove (PATCH /api/cards/[id])

**Story Points:**
- Label: "STORY POINTS" (uppercase, gray text, small font)
- Display: badge showing value (e.g., "5") or "—" if unset
- Edit UI: dropdown select
  - Options: "None", "1", "2", "3", "5", "8", "13", "21"
  - Auto-save on change

**State management:**
- Track editing state for labels (show dropdown vs chips)
- Track selected labels locally before save
- Auto-save story points on select (no dropdown edit state needed)

**Error handling:**
- Show error if label creation or card update fails
- Retry UI for failed saves

### Card Tile (app/boards/[id]/DraggableCard.tsx)

Display story points as a small badge on card tile:
- Format: show value (e.g., "5") or "-" if not set
- Position: bottom-right corner, small font
- Always visible so user knows a story point value must be assigned

## Testing

- Labels: create label, add to card, remove from card, search labels, create on-the-fly, auto-save
- Story Points: select value, change value, clear (set to null), persist across reload
- Edge cases: empty label name, duplicate label creation (should reuse), invalid story points value

## Future Enhancements

- Label deletion (and cascade to cards)
- Bulk label operations (apply label to multiple cards)
- Label filtering view (show all cards with label X)
- Label color customization (future; currently fixed to gray)
- Story points as burndown/velocity tracking

## Out of Scope

- Status field (future feature, separate design)
- Comments (separate feature)
- Card types (separate feature)
- Time logging (separate feature)
