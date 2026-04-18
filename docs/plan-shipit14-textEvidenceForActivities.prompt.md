# Plan: Text Evidence Feature

**TL;DR**: Add text-type evidence to activities — users can write rich-text descriptions (TipTap WYSIWYG) alongside image evidence. Same `evidences` table with new `type` + `text_content` columns. Text evidences appear in the DOCX report as formatted text pages in Encarte B. Full lifecycle: create, edit, view, soft-delete, trash, restore, reorder, report generation.

---

## Phase 1: Data Layer (blocks all other phases)

### Step 1.1 — Update Evidence Entity
- **File**: `electron/entities/Evidence.ts`
- Add `@Column({ type: 'text', default: 'image' }) type!: EvidenceType` (`'image' | 'text'`)
- Add `@Column({ type: 'text', nullable: true }) text_content!: string | null`
- Make `file_path` nullable: change `@Column({ type: 'text' })` → `@Column({ type: 'text', nullable: true })`
- Export `EvidenceType` type from this file

### Step 1.2 — Update TypeScript Interfaces
- **File**: `src/vite-env.d.ts`
- Add `EvidenceType = 'image' | 'text'` export
- Update `EvidenceData`: add `type: EvidenceType`, `text_content: string | null`, make `file_path` `string | null`

### Step 1.3 — New Database Functions
- **File**: `electron/database.ts`
- `saveTextEvidence(activityId: string, textContent: string, caption: string | null): Promise<Evidence>` — creates text evidence (no file, type='text', text_content=HTML)
- `updateTextEvidence(id: string, textContent: string): Promise<Evidence | null>` — updates text_content for existing text evidence

### Step 1.4 — Update Existing DB Functions for Text Safety
- **File**: `electron/database.ts`
- `deleteEvidence()` — skip `fs.renameSync` when `type === 'text'` (no file to move)
- `restoreEvidence()` — skip `fs.renameSync` when `type === 'text'`
- `permanentlyDeleteEvidence()` — skip `fs.unlinkSync` when `type === 'text'`
- `cleanupTrash()` — skip `fs.unlinkSync` when `type === 'text'`

### Step 1.5 — IPC Handlers
- **File**: `electron/main.ts`
- Add `ipcMain.handle('db:saveTextEvidence', ...)` → calls `saveTextEvidence()`
- Add `ipcMain.handle('db:updateTextEvidence', ...)` → calls `updateTextEvidence()`

### Step 1.6 — Preload Bridge
- **File**: `electron/preload.ts`
- Add `saveTextEvidence: (activityId, textContent, caption) => ipcRenderer.invoke('db:saveTextEvidence', ...)`
- Add `updateTextEvidence: (id, textContent) => ipcRenderer.invoke('db:updateTextEvidence', ...)`
- **File**: `src/vite-env.d.ts` — add methods to `ElectronAPI` interface

### Step 1.7 — Browser Fallback
- **File**: `src/services/localDb.ts`
- Add `saveTextEvidence()` method — stores text evidence in localStorage
- Add `updateTextEvidence()` method

---

## Phase 2: Dependencies & TipTap Setup (parallel with Phase 1)

### Step 2.1 — Install TipTap
- `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-character-count @tiptap/extension-placeholder`
- `@tiptap/starter-kit` includes Bold, Italic, BulletList, OrderedList, Heading, etc.
- `@tiptap/extension-character-count` for the 2000 char limit with counter display

### Step 2.2 — Create TipTap Editor Component
- **New file**: `src/components/TextEvidenceEditor.tsx`
- Reusable TipTap editor wrapper with:
  - Toolbar: Bold (B), Italic (I), Bullet List, Ordered List
  - Character counter (current / 2000 max)
  - `maxLength` enforcement via `@tiptap/extension-character-count`
  - Placeholder text: "Descreva a evidência..."
  - Props: `content: string`, `onChange: (html: string) => void`, `readOnly?: boolean`
  - Use theme CSS variables for styling (`bg-card`, `text-foreground`, `border-border`)
  - Read-only mode for viewing existing text evidence

---

## Phase 3: UI — Text Evidence Modal (depends on Phase 2)

### Step 3.1 — Create TextEvidenceModal Component
- **New file**: `src/components/TextEvidenceModal.tsx`
- Props: `open`, `onClose`, `onSave(textContent, caption)`, `initialContent?`, `initialCaption?`, `mode: 'create' | 'edit' | 'view'`
- Modal overlay with:
  - Title: "Adicionar Texto como Evidência" / "Editar Evidência de Texto" / "Evidência de Texto"
  - Caption input field (text, optional)
  - `TextEvidenceEditor` component (readOnly in 'view' mode)
  - Character count display
  - Buttons: "Salvar" + "Cancelar" (hidden in view mode)
  - Close on Escape key
  - Validation: at least 1 char of actual text content (strip HTML tags for count)
- Reuse the existing modal pattern from `ActivityDetailPage` confirm-delete modal

---

## Phase 4: UI — Evidence Cards & Grid (depends on Phase 1 + 3)

### Step 4.1 — Text Evidence Card in EvidenceUpload
- **File**: `src/components/EvidenceUpload.tsx`
- Create `SortableTextEvidenceCard` (or extend `SortableEvidenceCard`) for text type:
  - Show `fa-file-lines` icon instead of image
  - Truncated text preview (first ~100 chars, strip HTML)
  - Click → open `TextEvidenceModal` in 'view' mode
  - Edit button → open `TextEvidenceModal` in 'edit' mode
  - Delete button (same as image)
  - Drag handle (same as image)
- Add "Adicionar Texto como Evidência" button next to upload zone:
  - `fa-file-circle-plus` icon
  - Opens `TextEvidenceModal` in 'create' mode
  - On save → calls `saveTextEvidence` IPC → `onEvidenceAdded()`
- Update `EvidenceUploadProps` — add `onTextEvidenceUpdated?: (id: string, textContent: string) => void`
- Skip text evidences in lightbox slides (they're not images)

### Step 4.2 — Text Evidence Card in ActivityDetailPage
- **File**: `src/pages/ActivityDetailPage.tsx`
- Update `SortableEvidenceCard` to handle `type === 'text'`:
  - Show text icon + preview instead of `<img>`
  - Click → open `TextEvidenceModal` in 'view' mode (instead of lightbox)
- Filter text evidences out of lightbox slides
- Add "Adicionar Texto como Evidência" button in the evidence section

### Step 4.3 — Text Evidence in TrashPage
- **File**: `src/pages/TrashPage.tsx`
- Update trash evidence card to handle `type === 'text'`:
  - Show text icon + preview instead of image thumbnail
  - Rest of card stays the same (restore, delete, expiry badge)

---

## Phase 5: UI — ActivityFormPage Integration (depends on Phase 3 + 4)

### Step 5.1 — Wire Text Evidence in Form
- **File**: `src/pages/ActivityFormPage.tsx`
- Add `handleTextEvidenceAdded()` — calls `saveTextEvidence` IPC, updates evidence state
- Add `handleTextEvidenceUpdated()` — calls `updateTextEvidence` IPC, updates evidence state
- Pass new handlers to `EvidenceUpload` component

---

## Phase 6: DOCX Report Generation (depends on Phase 1)

### Step 6.1 — Text Evidence Pages in Encarte B
- **File**: `electron/report-generator.ts`
- In the evidence processing loop (Encarte B), check `ev.type`:
  - If `'image'` → existing image page logic (unchanged)
  - If `'text'` → build a text page XML:
    - Page break + bookmark
    - Parse `text_content` HTML → convert to OpenXML `<w:p>` runs:
      - `<strong>` / `<b>` → `<w:rPr><w:b/></w:rPr>`
      - `<em>` / `<i>` → `<w:rPr><w:i/></w:rPr>`
      - `<ul>/<li>` → `<w:pPr><w:numPr>...</w:numPr></w:pPr>` (bullet list)
      - `<ol>/<li>` → `<w:pPr><w:numPr>...</w:numPr></w:pPr>` (numbered list)
      - `<p>` → `<w:p>...</w:p>`
    - Caption below text content
    - Bookmark end
- Create helper: `buildTextEvidencePageXml(bookmarkId, bookmarkName, htmlContent, caption, idx)` — converts TipTap HTML to OpenXML

---

## Phase 7: Tests (parallel with Phases 4-6)

### Step 7.1 — Database Unit Tests
- **File**: `electron/database.test.ts`
- Test `saveTextEvidence()` — creates evidence with type='text', text_content set, file_path null
- Test `updateTextEvidence()` — updates text_content
- Test `deleteEvidence()` for text type — no file operation errors
- Test `permanentlyDeleteEvidence()` for text type — no file operation errors

### Step 7.2 — Report Generator Tests
- **File**: `electron/report-generator.integration.test.ts`
- Test activity with text evidence — verify text content appears in DOCX XML
- Test activity with mixed evidence (image + text) — both rendered correctly

### Step 7.3 — Validation Tests
- **File**: `src/utils/validation.test.ts` (if validation logic added there)
- Test 2000 character limit
- Test empty text rejection

---

## Relevant Files

### Modified
- `electron/entities/Evidence.ts` — add `type`, `text_content` columns, make `file_path` nullable
- `electron/database.ts` — new functions + update file-dependent functions for text safety
- `electron/main.ts` — 2 new IPC handlers
- `electron/preload.ts` — 2 new preload methods
- `electron/report-generator.ts` — text evidence pages in Encarte B + HTML→OpenXML converter
- `src/vite-env.d.ts` — update `EvidenceData`, `ElectronAPI`, add `EvidenceType`
- `src/services/localDb.ts` — browser fallback for text evidence
- `src/components/EvidenceUpload.tsx` — text evidence card, "Add Text" button, skip in lightbox
- `src/pages/ActivityDetailPage.tsx` — text evidence card rendering, text modal trigger
- `src/pages/ActivityFormPage.tsx` — wire text evidence handlers
- `src/pages/TrashPage.tsx` — text evidence card in trash
- `electron/database.test.ts` — new tests for text evidence DB ops
- `electron/report-generator.integration.test.ts` — new tests for text evidence in DOCX

### New Files
- `src/components/TextEvidenceEditor.tsx` — TipTap editor wrapper
- `src/components/TextEvidenceModal.tsx` — create/edit/view modal

---

## Verification

1. `npm run build` — compiles without errors
2. `npm run test` — all existing + new tests pass
3. **Visual check**: ActivityFormPage → "Adicionar Texto como Evidência" button visible after saving activity
4. **Create flow**: click button → modal opens → type text with bold/italic/lists → character counter shows → save → text evidence card appears in grid with text icon
5. **View flow**: click text evidence card → modal shows content in read-only mode
6. **Edit flow**: click edit on text evidence → modal opens with content → modify → save → card updates
7. **Delete flow**: delete text evidence → moves to trash → TrashPage shows text evidence with expiry
8. **Restore flow**: restore from trash → back in activity
9. **Reorder flow**: drag text evidence cards alongside image cards → order persists
10. **Character limit**: type > 2000 chars → editor blocks input, counter shows red
11. **DOCX report**: generate report with text + image evidence → text evidence appears as formatted text page in Encarte B
12. **Edge cases**: activity with only text evidence, activity with mixed evidence, empty text content rejected
13. **All 11 themes**: modal and editor look correct
14. **Browser fallback**: text evidence CRUD works in browser dev mode

## Decisions

- **Same table**: `evidences` table gains `type` ('image'|'text') + `text_content` columns. `file_path` becomes nullable. Backward compatible (default type='image')
- **TipTap WYSIWYG**: rich text editor with Bold, Italic, BulletList, OrderedList toolbar. Stores HTML in `text_content`
- **2000 char limit**: enforced via `@tiptap/extension-character-count` (counts text chars, not HTML tags)
- **DOCX integration**: text evidences render as formatted text pages in Encarte B alongside image pages
- **Reorder**: text and image evidences share the same sort_index, fully interleaved
- **Lightbox**: text evidences are excluded from image lightbox; they open in their own read-only modal
- **Schema migration**: TypeORM `synchronize: true` handles adding new columns automatically (dev mode)
- **Content validation**: strip HTML tags to check for actual text content (no empty `<p></p>` saves)
- **Excluded scope**: no search by text evidence content in `searchActivities` (can be added later)

## Further Considerations

1. **Search integration**: `searchActivities()` could also query `text_content LIKE :like` for text evidence search. Low effort but expanding scope — recommend deferring.
2. **Export/Import**: if a data export feature is ever added, text evidences would need to be included. No action needed now.
