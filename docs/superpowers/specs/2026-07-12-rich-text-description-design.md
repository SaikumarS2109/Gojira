# Rich Text Description Implementation Design

## Goal
Replace plain-text description field with a WYSIWYG editor (Tiptap) that supports formatted text, links, lists, and code while maintaining auto-save behavior.

## Architecture
- **Frontend:** Tiptap editor with toolbar in CardView modal
- **Storage:** Store JSON document state in `description` field (replaces plain text)
- **Rendering:** Convert JSON to HTML on display for safe rendering
- **UX:** Click-to-edit pattern (consistent with current title/description)
- **Toolbar:** Bold, italic, strikethrough, link, bullet list, ordered list, code block, blockquote

## Tech Stack
- Next.js 16 App Router
- Tiptap (headless editor)
- @tiptap/react, @tiptap/pm, @tiptap/extension-* (formatting extensions)
- Tailwind CSS v4 for styling

## Global Constraints
- Existing `Card.description` field stores JSON (string type via JSON.stringify, no schema change needed)
- JSON format: Tiptap's internal document state (type, content nodes, marks, attributes)
- Auto-save via existing `saveField` pattern in CardView
- Toolbar styling: neutral gray (#7A8699) icons, hover blue (#0066CC)
- Editor styling: light theme with borders matching existing inputs
- Modal backdrop: `bg-black/30`
- Build verification: `npm run build`
- No test framework — build success is verification
- Shell: PowerShell

## Design Details

### Editor Features
- **Text formatting:** Bold, italic, strikethrough
- **Blocks:** Heading (h1-h3), paragraph, bullet list, ordered list, blockquote, code block
- **Links:** Inline link insertion with dialog
- **Toolbar:** Floating or fixed above editor, collapsible on mobile
- **Placeholder:** "Add a description..." (when empty)
- **Height:** Fixed ~200px or expandable to fill available space

### Display (View Mode)
- Parse JSON and render as HTML using Tiptap's `generateHTML` utility
- Styling: neutral colors matching card aesthetic
- Code blocks: monospace font, light background (#F4F5F7)
- Lists: proper indentation and bullets
- Links: blue (#0066CC), underlined, hoverable
- XSS safety: Tiptap's JSON format is inherently safe (no script injection risk)

### Edit Mode
- Click description area to enter edit mode
- Toolbar appears above editor
- Escape to discard, click outside or Ctrl+Enter to save
- Auto-save on blur (like current behavior)
- Toolbar buttons: text labels or icons with tooltips

### Database & API
- No schema changes — store JSON in existing `description` string field (as JSON.stringify)
- PATCH /api/cards/[id] accepts `description` (JSON string from Tiptap)
- GET /api/cards/[id] returns `description` as JSON string
- Frontend converts JSON → HTML on display using `generateHTML`
- No sanitization needed: Tiptap's JSON format is XSS-safe by design

## Component Structure
- New file: `components/RichTextEditor.tsx` (reusable Tiptap editor with toolbar)
- Modify: `app/boards/[id]/CardView.tsx` (replace textarea with RichTextEditor)
- Utilities: Use Tiptap's built-in `generateHTML` for rendering JSON → HTML

## User Flow
1. User views card description (JSON converted to HTML on display)
2. Clicks description area → enters edit mode
3. Toolbar appears with formatting buttons
4. User types and applies formatting (bold, lists, etc.)
5. Clicks outside or presses Escape → saves and exits edit mode
6. JSON is auto-saved via PATCH /api/cards/[id]

## Success Criteria
- Editor renders in CardView with toolbar visible
- Formatting buttons work (bold, italic, etc.)
- Saves JSON to database via PATCH
- Displays formatted content in view mode (JSON → HTML)
- No XSS vulnerabilities
- Build passes with no errors
