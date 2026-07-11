# Card Modal Redesign — Design Spec

**Date:** 2026-07-11  
**Status:** Approved

## Summary

Replace the current small "Edit Card" modal with a large two-column card view. The same `CardView` component is used in both a modal overlay (accessed from the board) and a standalone full-page route. All fields are click-to-edit with auto-save — no save button.

## Architecture

One shared component, two surfaces:

- **`app/boards/[id]/CardView.tsx`** — the card UI (two-column layout, all fields)
- **`app/boards/[id]/CardModal.tsx`** — wraps `CardView` in a large `max-w-4xl` overlay with backdrop
- **`app/boards/[id]/cards/[cardId]/page.tsx`** — renders `CardView` full-page inside the existing sidebar + navbar shell

The existing `CardModal` is replaced entirely. `CardView` receives the card data and callbacks as props.

## Layout

```
┌─────────────────────────────────────────────────────┐
│ [Card Type icon] GENSYS-1  [card title — editable] ↗│
├──────────────────────────┬──────────────────────────┤
│                          │  Status       [placeholder]│
│  Description             │  Assignee     [dropdown]  │
│  (click to edit)         │  Labels       [placeholder]│
│                          │  Story Points [placeholder]│
│                          │  Time Logging [placeholder]│
│                          │  Card Type    [placeholder]│
├──────────────────────────┴──────────────────────────┤
│  Comments  (placeholder — "Coming soon")            │
└─────────────────────────────────────────────────────┘
```

- Modal: `max-w-4xl` centered overlay, `bg-black/50` backdrop, board visible behind it
- Left column: ~60% width — description area
- Right column: ~40% width — metadata fields
- Header spans full width: card type icon (placeholder `□`) + ticket ID badge + editable title + ↗ link to full-page route + ✕ close button

## Click-to-Edit Behavior

| Field | Trigger to edit | Saves on | Reverts on |
|---|---|---|---|
| Title | Click on title text | Blur or Enter | Escape |
| Description | Click on description area | Blur or Ctrl+Enter | Escape |
| Assignee | Click on assignee row | Select change (immediate) | — |

Each save fires `PATCH /api/cards/[id]` with only the changed field. On success the local state is updated. On error a brief inline error message is shown under the field.

## Right Panel Fields

All rows are always rendered. Fields not yet implemented show as disabled/grayed with a lock icon or muted styling — they are visually present so the layout is stable from day one.

| Field | This feature | Landed in |
|---|---|---|
| Status | Disabled placeholder | Feature 4 |
| Assignee | Fully wired (click-to-edit dropdown) | Now |
| Labels | Disabled placeholder | Feature 2 |
| Story Points | Disabled placeholder | Feature 3 |
| Time Logging | Disabled placeholder | Feature 7 |
| Card Type | Disabled placeholder | Feature 8 |

## Full-Page Route

- Path: `/boards/[boardId]/cards/[cardId]`
- Fetches board + card data server-side (or client-side with `useEffect`, consistent with existing patterns)
- Renders `CardView` inside the existing sidebar + navbar layout (same shell as the board detail page)
- The ↗ icon in the modal header is a `<Link>` to this route
- Browser back button returns to the board

## API Changes

No new endpoints. The existing `PATCH /api/cards/[id]` already accepts `title`, `description`, and `assigneeId`. The modal now calls it per-field on blur/Enter instead of batching all fields on a save button click.

The existing `GET /api/lists/[id]/cards` already returns cards with `assigneeId` populated. The full-page route needs the card individually — use a new `GET /api/cards/[id]` endpoint that returns the card with `assigneeId` populated.

## New API Endpoint

**`GET /api/cards/[id]`** — add a GET handler to the existing `app/api/cards/[id]/route.ts` (which already has PATCH and DELETE). Returns the card with `assigneeId` populated (`name`, `email`). Auth-guarded: user must be a member of the card's board.

## Component Interfaces

```typescript
// CardView props
interface CardViewProps {
  card: Card;                          // full card object
  sequencePrefix: string;              // e.g. "GENSYS"
  boardMembers: User[];                // for assignee dropdown
  boardId: string;                     // for ↗ link and navigation
  onUpdate: (updates: CardUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose?: () => void;                // undefined on full-page route
}

// Card shape (extended from current)
interface Card {
  _id: string;
  title: string;
  description: string;
  listId: string;
  ticketNumber?: number;
  assigneeId?: { _id: string; name: string; email: string };
}

// CardUpdate (unchanged from current)
interface CardUpdate {
  title?: string;
  description?: string;
  assigneeId?: string;
}
```

## Constraints

- Delete card button moves to the bottom of the right panel (small, muted "Delete card" text link)
- No save button anywhere in the UI
- `onClose` is optional: when undefined (full-page route), the ✕ button is hidden and replaced by a "← Back to board" link in the header
- Placeholder rows must not be interactive — `pointer-events-none opacity-50`
- The modal backdrop click closes the modal (existing behavior retained)
- Escape key closes the modal
