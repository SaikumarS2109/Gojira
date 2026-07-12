# Admin Board Columns Management Design

> **Goal:** Restrict column (list) management to admin users only. Consolidate column management (add, rename, delete, reorder) into a dedicated admin interface, removing these controls from board pages.

## Architecture

**Three-layer approach:**

1. **API Layer** — List endpoints upgraded to require admin role
2. **Board Page** — Column management UI removed; boards become read-only for structure
3. **Admin Interface** — New `/admin/columns` page with board selector and sortable columns list

## API Changes

### List Endpoints — Admin-Only Access

All three list mutation endpoints require `session.user.role === 'admin'`:

- `POST /api/lists` — Create column
- `PATCH /api/lists/[id]` — Update column (title, order)
- `DELETE /api/lists/[id]` — Delete column

**Current guard:** Checks if user is a board member (`board.memberIds.includes(session.user.id)`)
**New guard:** Checks if user is an admin (`session.user.role === 'admin'`)
**Response for non-admins:** `403 Forbidden` with error message "Admins only"

**Rationale:** Admins control board structure; members control card content.

## Board Page (`app/boards/[id]/page.tsx`)

### Removals

- Remove `showAddList` state variable
- Remove `setShowAddList` calls
- Remove `handleCreateList()` function (async handler)
- Remove entire "Add a list" inline form section from the kanban area (form with input + Create button)
- Remove "+ Add a list" button that opens the form
- Remove `handleDeleteList()` function
- Remove delete button (`✕`) from column headers

### Result

Board page becomes read-only for column structure. Users can still:
- Add/move/edit/delete cards within existing columns
- Filter/search cards
- See board members and settings

## Admin Sidebar Navigation

Add sub-navigation to the Admin section (visible only to `session?.user?.role === 'admin'`):

```
Admin
  ├─ Users        → /admin/users
  └─ Board Management → /admin/columns
```

Both pages should display the sidebar with these options, allowing navigation between admin sections.

### Sidebar Implementation

- Location: Reuse/extend the existing sidebar pattern from board detail pages
- Visibility: Render the "Admin" section only when `session?.user?.role === 'admin'`
- Sub-items: "Users" and "Board Management" as children
- Active state: Highlight the current page (Users or Board Management)

## `/admin/columns` Page

**File:** `app/admin/columns/page.tsx`

### Access Control

- Must be authenticated (`session?.user?.id`)
- Must be admin (`session?.user?.role === 'admin'`)
- Non-admins are redirected to `/boards`

### UI Structure

1. **Header:** "Admin — Board Management"

2. **Board Selector (Dropdown)**
   - Fetches all boards from `GET /api/boards`
   - Default: First board or "Select a board"
   - On change: Load columns for selected board

3. **Columns List**
   - Sortable via dnd-kit (`@dnd-kit/sortable`)
   - Each column row displays:
     - **Drag handle** (⋮⋮ icon or similar)
     - **Order badge** (e.g., "1", "2", "3")
     - **Column title** (text)
     - **Rename button** (pencil icon → modal/inline edit)
     - **Delete button** (trash icon → confirm dialog)

4. **Add Column Form**
   - Input: column title
   - Button: "Add column"
   - On success: new column added to list and persisted

5. **Empty State**
   - If no board selected: "Select a board above"
   - If board has no columns: "No columns yet. Add one to get started."

### Data Flow

**Load board columns:**
```
GET /api/boards → all boards for dropdown
GET /api/boards/{boardId}/lists → columns for selected board (sorted by order)
```

**Add column:**
```
POST /api/lists
  { boardId, title }
→ Returns new list object with _id, title, order
→ Add to local state
```

**Rename column:**
```
PATCH /api/lists/{id}
  { title }
→ Update local state
```

**Reorder columns (on dnd drop):**
```
Calculate new order values for affected columns
PATCH /api/lists/{id} { order: newOrder } (for each affected column)
→ Update local state
```

**Delete column:**
```
DELETE /api/lists/{id}
→ Confirm dialog first ("Delete this column? All cards will be deleted.")
→ Remove from local state
```

### Drag-and-Drop Behavior

- Use `@dnd-kit/sortable` (same as card drag-and-drop)
- On drag start: item becomes semi-transparent
- On drag over: insertion line shows where item will land
- On drop: 
  - Recalculate order values for all columns
  - Batch PATCH calls to persist new orders
  - Update local state
  - No full page refresh needed

### Error Handling

- Board selector fails: Show error message, allow retry
- Column fetch fails: Show error message, allow retry
- Add/rename/delete fails: Show error toast, rollback local state
- Non-admin access: Redirect to `/boards` with no error shown

## `/admin` Route Adjustment

**Current:** `/admin` is the users management page

**New:** `/admin` redirects to `/admin/users` (preserves existing admin page as the "Users" sub-section)

This allows:
- `/admin/users` — user management
- `/admin/columns` — board column management
- Direct navigation via sidebar sub-items

## Global Constraints

- Admin role check: `session?.user?.role === 'admin'` (string enum: 'user' | 'admin')
- Drag-and-drop: Use existing `@dnd-kit/core` + `@dnd-kit/sortable` (already in package.json)
- Board fetching: Authenticated users can see all boards (same as current `/api/boards`)
- No changes to Card/List data model — only API access control and UI changes

## Testing Scope

- Admin user can access `/admin/columns`, non-admin cannot (redirected)
- Admin can add/rename/delete/reorder columns via the page
- Non-admin POST/PATCH/DELETE to `/api/lists/*` returns 403
- Board page no longer shows "Add a list" button
- Sidebar shows "Admin → Users" and "Admin → Board Management" for admins only
