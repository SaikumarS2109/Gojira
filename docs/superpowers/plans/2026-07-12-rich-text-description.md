# Rich Text Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain-text description textarea with a Tiptap WYSIWYG editor that stores and renders formatted text as JSON while maintaining auto-save behavior.

**Architecture:** Six sequential tasks — install dependencies, create reusable RichTextEditor component with toolbar, update CardView to use it, handle JSON serialization/deserialization, render JSON to HTML in view mode, verify build. All changes preserve existing auto-save pattern and click-to-edit UX.

**Tech Stack:** Next.js 16 App Router, Tiptap (headless editor), @tiptap/react, @tiptap/extension-bold/italic/strike/link/list/code/blockquote, Tailwind CSS v4

## Global Constraints

- Store `description` as JSON string (via `JSON.stringify`), no schema changes needed
- Toolbar styling: `#7A8699` icons, hover `#0066CC`
- Editor height: ~200px with fixed or expandable container
- Auto-save via existing `saveField` pattern in CardView
- Render JSON → HTML on display using Tiptap's `generateHTML` utility
- No XSS sanitization needed (JSON is inherently safe)
- Build verification: `npm run build` (PowerShell)
- No test framework — build success is verification

---

### Task 1: Install Tiptap Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: Tiptap npm packages installed and available for import

- [ ] **Step 1: Install Tiptap core and extensions**

Run:
```powershell
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder
```

Expected: Installation completes without errors, packages added to `package.json`

- [ ] **Step 2: Verify installation**

Run:
```powershell
npm list @tiptap/react
```

Expected: Version output (e.g., `@tiptap/react@2.x.x`)

- [ ] **Step 3: Commit**

```powershell
git add package.json package-lock.json
git commit -m "deps: add tiptap for rich text editor"
```

---

### Task 2: Create RichTextEditor Component

**Files:**
- Create: `components/RichTextEditor.tsx`

**Interfaces:**
- Consumes: Tiptap npm packages, Tailwind CSS v4
- Produces: `RichTextEditor` React component
  - Props: `value: string` (JSON), `onChange: (json: string) => void`, `onBlur?: () => void`, `disabled?: boolean`, `placeholder?: string`
  - Returns: JSX.Element with editor + toolbar

- [ ] **Step 1: Create RichTextEditor component file**

Create `components/RichTextEditor.tsx`:

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (json: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = 'Add a description...',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ? JSON.parse(value) : '',
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    onBlur,
    editable: !disabled,
  });

  useEffect(() => {
    if (editor && value) {
      try {
        const parsed = JSON.parse(value);
        editor.commands.setContent(parsed);
      } catch {
        editor.commands.clearContent();
      }
    }
  }, []);

  if (!editor) return null;

  return (
    <div className="border border-[#D0D4DC] rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-[#E8EAED] bg-[#F4F5F7]">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarButton>
        <div className="w-px bg-[#D0D4DC] mx-1" />
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <div className="w-px bg-[#D0D4DC] mx-1" />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          1
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          {'<>'}
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          "
        </ToolbarButton>
        <div className="w-px bg-[#D0D4DC] mx-1" />
        <ToolbarButton
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
          }}
          title="Insert link"
        >
          🔗
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 focus:outline-none min-h-[200px] text-[#172B4D]"
      />
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active = false, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium transition ${
        active
          ? 'bg-[#0066CC] text-white'
          : 'text-[#7A8699] hover:bg-white hover:text-[#0066CC]'
      }`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Verify component syntax**

Run:
```powershell
npm run build 2>&1 | Select-String -Pattern "error|✓" | Select-Object -First 5
```

Expected: No TypeScript errors related to RichTextEditor

- [ ] **Step 3: Commit**

```powershell
git add components/RichTextEditor.tsx
git commit -m "feat: create RichTextEditor component with Tiptap toolbar"
```

---

### Task 3: Update Card Interface in CardView

**Files:**
- Modify: `app/boards/[id]/CardView.tsx:6-29` (Card and CardUpdate interfaces)

**Interfaces:**
- Consumes: Existing Card interface
- Produces: Updated Card interface with `description?: string` (JSON), updated CardUpdate interface

- [ ] **Step 1: Read CardView to find interfaces**

Run:
```powershell
Get-Content "app/boards/[id]/CardView.tsx" -TotalCount 40
```

- [ ] **Step 2: Verify current description handling**

The interfaces should have `description: string` already. No changes needed to interface types — `description` already accepts JSON strings. Proceed to Task 4.

- [ ] **Step 3: Commit (no changes)**

```powershell
git commit --allow-empty -m "chore: verify Card interface already supports JSON descriptions"
```

---

### Task 4: Replace Textarea with RichTextEditor in CardView

**Files:**
- Modify: `app/boards/[id]/CardView.tsx:1-5` (imports), `app/boards/[id]/CardView.tsx:52-53` (state), `app/boards/[id]/CardView.tsx:112-116` (handler), `app/boards/[id]/CardView.tsx:280-290` (JSX)

**Interfaces:**
- Consumes: RichTextEditor component, existing `saveField` and `handleSaveDescription` patterns
- Produces: CardView with RichTextEditor replacing textarea

- [ ] **Step 1: Add import for RichTextEditor**

At top of `app/boards/[id]/CardView.tsx`, add:

```typescript
import { RichTextEditor } from '@/components/RichTextEditor';
```

- [ ] **Step 2: Replace textarea JSX**

Find the description editing section (around line 258-290) and replace the textarea block:

```typescript
{editingDescription ? (
  <div className="w-full">
    <RichTextEditor
      value={descriptionValue}
      onChange={(json) => setDescriptionValue(json)}
      onBlur={handleSaveDescription}
      placeholder="Add a description..."
    />
    <div className="mt-2 text-xs text-[#7A8699]">
      Click outside to save
    </div>
  </div>
) : (
  <div
    onClick={() => setEditingDescription(true)}
    className="min-h-32 text-sm text-[#172B4D] cursor-text hover:bg-[#F4F5F7] rounded-lg p-3 border border-transparent hover:border-[#E8EAED] transition"
  >
    {descriptionValue && descriptionValue !== '{}' ? (
      <RenderedDescription json={descriptionValue} />
    ) : (
      <span className="text-[#7A8699]">Click to add a description...</span>
    )}
  </div>
)}
```

- [ ] **Step 3: Add RenderedDescription component within CardView file**

Before the CardView function, add:

```typescript
function RenderedDescription({ json }: { json: string }) {
  try {
    const content = JSON.parse(json);
    const html = generateHTML(content, [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link,
      Placeholder,
    ]);
    return (
      <div
        className="prose prose-sm max-w-none text-[#172B4D]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <span className="text-[#7A8699]">Invalid content</span>;
  }
}
```

- [ ] **Step 4: Add imports for generateHTML and extensions**

At top of file, add:

```typescript
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
```

- [ ] **Step 5: Update handleSaveDescription to handle escape key**

Modify the escape key handler in the textarea section (no longer needed, but keep the pattern):

```typescript
const handleSaveDescription = async () => {
  if (discardDescRef.current) { discardDescRef.current = false; return; }
  if (descriptionValue === card.description) { setEditingDescription(false); return; }
  await saveField({ description: descriptionValue }, 'description');
  setEditingDescription(false);
};
```

This handler remains unchanged — the RichTextEditor's `onBlur` will call it.

- [ ] **Step 6: Verify build**

Run:
```powershell
npm run build 2>&1 | Measure-Object -Line
```

Expected: Build completes successfully

- [ ] **Step 7: Commit**

```powershell
git add "app/boards/[id]/CardView.tsx"
git commit -m "feat: replace description textarea with RichTextEditor component"
```

---

### Task 5: Handle JSON Initialization and Empty Descriptions

**Files:**
- Modify: `app/boards/[id]/CardView.tsx:51-52` (state initialization)

**Interfaces:**
- Consumes: Card with description as JSON string or empty string
- Produces: Proper initialization of descriptionValue state

- [ ] **Step 1: Update description state initialization**

In CardView, find state initialization and update:

```typescript
const [descriptionValue, setDescriptionValue] = useState<string>(
  card.description && card.description.trim() && card.description !== '{}' 
    ? card.description 
    : ''
);
```

- [ ] **Step 2: Update sync effect**

In the useEffect that syncs card changes, update description line:

```typescript
useEffect(() => {
  setTitleValue(card.title);
  setDescriptionValue(
    card.description && card.description.trim() && card.description !== '{}' 
      ? card.description 
      : ''
  );
  // ... rest of effect
}, [card]);
```

- [ ] **Step 3: Verify RichTextEditor handles empty value**

The RichTextEditor component should handle empty string gracefully (it does in the implementation from Task 2).

- [ ] **Step 4: Commit**

```powershell
git add "app/boards/[id]/CardView.tsx"
git commit -m "fix: initialize description state to handle JSON or empty"
```

---

### Task 6: Build Verification

**Files:**
- Verify: Build succeeds with all changes

**Interfaces:**
- Consumes: All previous tasks' changes
- Produces: Successful build output

- [ ] **Step 1: Clean install and build**

Run:
```powershell
npm run build
```

Expected output should show:
```
✓ Compiled successfully
Finished TypeScript
✓ Generating static pages
Route (app)
... [list of routes]
```

- [ ] **Step 2: Verify no errors**

If build fails, check for:
- Missing imports in CardView
- RichTextEditor component syntax errors
- Tiptap package installation issues

Run error check:
```powershell
npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 10
```

Expected: No error lines

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: rich text description with Tiptap editor and JSON storage"
```

---

## Success Checklist

- [ ] Tiptap dependencies installed
- [ ] RichTextEditor component renders with toolbar
- [ ] Bold, italic, strikethrough buttons work
- [ ] Heading (h1-h3), list, code block, blockquote buttons work
- [ ] Link insertion works
- [ ] Description saves as JSON to database
- [ ] View mode renders formatted content
- [ ] Auto-save on blur works
- [ ] Escape to discard works (via blur handler)
- [ ] Build passes with no errors
