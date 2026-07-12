# Ticket Numbering System — Design Spec

**Date:** 2026-07-10  
**Status:** Approved

## Summary

Each board has a short uppercase sequence prefix (e.g. `GENSYS`). Every card created on that board is automatically assigned the next ticket number (`GENSYS-1`, `GENSYS-2`, …). The counter is managed atomically on the server; clients never send a ticket number.

## Schema Changes

### Board
- `sequencePrefix: String` — required, 2–8 uppercase letters (A–Z only), unique across all boards
- `nextTicketNumber: Number` — default `1`, incremented server-side on each card creation; never exposed to clients as writable

### Card
- `ticketNumber: Number` — assigned at creation from the board's pre-increment counter value; immutable thereafter

## API Changes

### `POST /api/boards`
- Accepts `sequencePrefix` in the request body alongside `title`
- Validates: non-empty, letters only, 2–8 chars; stored as uppercase
- Returns 409 if `sequencePrefix` is already taken by another board
- `sequencePrefix` is **required** — boards cannot be created without one

### `POST /api/cards`
- After the existing membership check, fetches the board atomically:
  ```
  Board.findByIdAndUpdate(boardId, { $inc: { nextTicketNumber: 1 } }, { new: false })
  ```
  `new: false` returns the document *before* the increment, so the returned `nextTicketNumber` is the value assigned to this card.
- Sets `card.ticketNumber` to that pre-increment value
- The card's full ticket ID (`GENSYS-1`) is derived at read time: `board.sequencePrefix + '-' + card.ticketNumber`

## UI Changes

### Board creation (sidebar form + boards page)
- Add a required **Prefix** field below the title input
- Auto-suggest: take first letter of each word in the title, uppercase (e.g. "Generic Systems" → `GENSYS`); user can override freely
- Show a short validation hint: "2–8 letters, e.g. GENSYS"
- On submit, show a clear error if the prefix is already taken

### Card kanban tile
- Small grey pill badge at top-left: `GENSYS-1`
- Styled as `text-xs font-mono text-gray-400`

### Card modal
- Ticket ID displayed prominently in the modal header (e.g. `GENSYS-1` in a styled badge), similar to Jira's key display

## Constraints

- `sequencePrefix` is **immutable** after board creation — changing it would orphan all existing ticket IDs
- Uniqueness enforced via a MongoDB unique index on `sequencePrefix`
- `ticketNumber` on Card is set once at creation and never patched
- The full ticket ID (prefix + number) is computed on the client from `board.sequencePrefix` and `card.ticketNumber`; it is not stored as a string in the DB
