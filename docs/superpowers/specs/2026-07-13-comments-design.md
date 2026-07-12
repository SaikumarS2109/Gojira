# Comments Implementation Design

## Goal
Add a threaded comments system to cards with rich text editing, @mentions, and pagination, enabling team collaboration and discussion on card details.

## Architecture
- **Frontend:** Comment list with inline Tiptap editor, @mention dropdown, edit/delete actions
- **Storage:** MongoDB Comment collection with rich text JSON, author/mention references, timestamps
- **Sorting:** Newest first (default) or oldest first, expandable for pagination
- **Real-time:** Load 5 comments per page, lazy-load on "Load more" click
- **Mentions:** Store user email internally, display name in UI, fetch mention list from team members

## Tech Stack
- Next.js 16 App Router
- Tiptap for rich text comments
- MongoDB/Mongoose for Comment model
- NextAuth.js for authentication/authorization
- Tailwind CSS v4 for styling

## Global Constraints

- `description` field stores JSON (Tiptap JSON format)
- Comments collection is separate from Card model, linked via `cardId`
- Only comment author can edit/delete their own comments
- @mentions stored as `{ userId, email, name }` objects
- Timestamps: `createdAt` (immutable), `updatedAt` (changes only on edit)
- Pagination: 5 comments per page, load more via button
- Soft delete: `deletedAt` field marks deleted comments, don't show in UI
- Linked tickets: Store as `{ cardId, number, title }` for reference
- Auto-save: Comments auto-save on blur or explicit save
- Build verification: `npm run build`
- No test framework — build success is verification
- Shell: PowerShell

## Design Details

### Comment Model

```typescript
interface Comment {
  _id: ObjectId
  cardId: ObjectId              // parent card
  authorId: ObjectId            // User who created
  content: String               // Tiptap JSON
  mentions: Array<{
    userId: ObjectId
    email: String
    name: String
  }>
  linkedTickets: Array<{
    cardId: ObjectId
    ticketNumber: Number
    title: String
  }>
  reactions: Map<emoji, [userId]> // future: emoji reactions
  pinnedBy: ObjectId | null       // future: pin by maintainer
  createdAt: Date
  updatedAt: Date               // updated on edit only
  deletedAt: Date | null        // soft delete
}
```

### Comment Display (View Mode)

- List of comments, newest first (default sort)
- Each comment shows:
  - Author name + avatar (initials circle)
  - Created date (e.g., "2 days ago")
  - "Edited" label if `updatedAt > createdAt`
  - Rich text content (rendered HTML from JSON)
  - Action buttons (Edit, Delete) if user is author
  - @mentioned users highlighted in blue
  - Linked tickets shown as links

### Comment Input (Create Mode)

- Rich text editor (Tiptap) with toolbar
- @mention dropdown: type `@` to show team members
- Auto-suggest filtered by name/email
- Placeholder: "Add a comment..."
- Save/Cancel buttons below editor
- Auto-save on blur (optional for comments vs explicit save)

### Comment Edit Mode

- Same editor as create
- "Edited" indicator shown after save
- Updated timestamp shows new date
- Cancel reverts to view mode

### Pagination

- Load 5 comments on initial open
- "Load more" button at bottom if more exist
- Clicking loads next 5 comments
- Total comment count shown ("5 of 12 comments")

### Sort Options

- Default: Newest first (most recent at top)
- Toggle to: Oldest first
- Sort button in comments header
- Persists in local state during session

### @Mentions

- Typing `@` opens mention dropdown
- Shows team members (board members + card assignee)
- Filter by name or email
- Click or arrow+Enter to select
- Selected mention rendered as `<span class="mention">@John</span>`
- On save, extract mentions and store with userId, email, name
- In display, show as blue highlighted text

### Linked Tickets

- Support markdown syntax: `#123` auto-links to ticket
- Or drag-drop ticket references (future)
- Display as blue link: "GOJIRA-123: Card Title"
- On hover, show preview tooltip (future)

### Delete Comments

- Delete button (trash icon) if user is author
- Confirm dialog: "Delete this comment? This cannot be undone."
- Soft delete: set `deletedAt` timestamp, don't show in UI
- Preserves edit history

### Edit Timestamps

- Created: Never changes, shown as "Posted 3 days ago"
- Updated: Changes on edit, shown as "Edited 2 hours ago"
- If same day, show time (10:30 AM), if older show date (Jan 15)

### Permissions

- Only authenticated users can comment
- Only comment author can edit/delete own comments
- Read comments: all board members
- Create comments: all board members

## Component Structure

- New file: `models/Comment.ts` (Mongoose schema)
- New file: `app/api/comments/route.ts` (GET: list, POST: create)
- New file: `app/api/comments/[id]/route.ts` (PATCH: edit, DELETE: soft delete)
- New file: `components/CommentList.tsx` (display + pagination)
- New file: `components/CommentEditor.tsx` (rich text input + @mention)
- Modify: `app/boards/[id]/CardView.tsx` (add comments section)

## Data Flow

1. User opens card → fetch first 5 comments
2. Comments load with author info, timestamps
3. User types comment → rich text editor
4. User types `@` → fetch team members, show dropdown
5. User selects mention → store mention object
6. User clicks Save → POST to /api/comments with cardId, content, mentions
7. Comment appears in list (newest first)
8. User clicks Edit → PATCH /api/comments/[id] with new content
9. "Edited" indicator appears, updatedAt updates
10. User clicks Delete → soft delete via PATCH, comment disappears from UI

## User Flow

1. Open card modal → Comments section visible below description
2. Scroll comments list, see 5 most recent
3. Click "Load more" → next 5 comments load
4. Click "Write a comment" → focus editor
5. Type text, press `@` → see team members dropdown
6. Select someone → name appears as mention
7. Click Save → comment posted, appears at top of list
8. Click Edit (on own comment) → edit mode, make changes, Save
9. Click Delete (on own comment) → confirm, comment removed from view
10. Toggle sort → list reverses to oldest first

## Success Criteria

- Comments load on card open (5 per page)
- Rich text editor renders in comment input
- @mention dropdown works, shows team members
- Comments save to database with mentions extracted
- Timestamps display correctly (created, edited)
- Edit/Delete buttons appear for comment author only
- Pagination works ("Load more" button)
- Sort toggles newest/oldest first
- Build passes with no errors
