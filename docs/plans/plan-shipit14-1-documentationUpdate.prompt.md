# Plan: Documentation Update (Full Sync v1.2.2+)

**TL;DR**: Sync all 7 documentation files with the actual codebase state. Major gaps: 4 undocumented components, 19 missing dependencies, 3 entirely undocumented features (text evidence, evidence lightbox, activity navigation), and outdated Evidence entity model across all docs.

---

## Reference Data (Code vs Docs)

| Metric | Actual (Code) | Documented |
|--------|--------------|------------|
| Version | 1.2.2 | 1.2.2 ✓ |
| IPC methods | ~73 | 70+ ✓ (close) |
| Components | **13** | **9** (4 missing) |
| Pages | 8 | 8 ✓ |
| Routes | 8 | 8 ✓ |
| Entities | 6 | 6 ✓ (but Evidence fields outdated) |
| Themes | 11 | 11 ✓ |
| Prod deps | 22 | ~8 in DEPENDENCIES.md |
| Dev deps | 17 | ~12 in DEPENDENCIES.md |
| NPM scripts | 8 | 6 in DEVELOPMENT.md |

**3 Undocumented Features** (exist in code, absent from ALL docs):

1. **Text Evidence** — `TextEvidenceEditor`, `TextEvidenceModal`, `saveTextEvidence`/`updateTextEvidence` IPC, Evidence `type` ('image'|'text'), `text_content` field, 4× tiptap deps
2. **Evidence Lightbox** — `EvidenceLightbox` component, `yet-another-react-lightbox` dep
3. **Activity Navigation** — `ActivityNav` component (prev/next between activities)

---

## Phase 1: CHANGELOG.md

### Actions

1. Add `[Unreleased]` section at top with the 3 undocumented features under "Adicionado"
2. Verify comparison links in footer

---

## Phase 2: README.md

### Actions

1. Update "Evidências com Prints" feature to mention text evidence (not just screenshots)
2. Add mention of lightbox (full-screen image viewing)
3. Verify download links and "Primeiros Passos" reflect current UX

---

## Phase 3: docs/TODO.md

### Actions

1. Add completed phase(s) for text evidence, lightbox, and activity nav (or sub-items under existing phases)
2. Verify header date is current, move any implemented backlog items

---

## Phase 4: docs/ARCHITECTURE.md

### Actions

1. Add 4 missing components to table: `ActivityNav`, `EvidenceLightbox`, `TextEvidenceEditor`, `TextEvidenceModal`
2. Add `db:saveTextEvidence`, `db:updateTextEvidence` to IPC handler list
3. Update Evidence entity: add `type` (enum: 'image'|'text') and `text_content` fields
4. Update component count 9 → 13

---

## Phase 5: docs/DEVELOPMENT.md

### Actions

1. Add 2 missing scripts: `test:watch`, `postinstall`
2. Verify test count (currently says 55) — run `npm run test`
3. Add 4 new component files to directory tree

---

## Phase 6: docs/DEPENDENCIES.md *(most work — 19 missing deps)*

### Actions

1. Update date to current
2. Add 14 missing production deps (@dnd-kit/\*, @tiptap/\*, @xmldom/xmldom, electron-updater, jszip, reflect-metadata, sonner, xpath, yet-another-react-lightbox)
3. Add 5 missing dev deps (@playwright/test, electron-playwright-helpers, sql.js, vitest)
4. Verify all existing versions match `package.json`

---

## Phase 7: .github/copilot-instructions.md

### Actions

1. Add TipTap and Lightbox to Tech Stack table
2. Add text evidence IPC handlers to handler table
3. Update Evidence entity in Data Model (add `type`, `text_content`)
4. Update component list (9 → 13, list new 4)
5. Verify test count, update roadmap context

---

## Phase 8: Cross-Document Verification *(depends on 1–7)*

### Actions

1. Grep all docs for version "1.2.2" — ensure consistency
2. Verify component count (13) matches in ARCHITECTURE.md and copilot-instructions.md
3. Verify Evidence entity model is identical in both architecture docs
4. Verify all internal links between docs work
5. Diff `package.json` deps against DEPENDENCIES.md — confirm no gaps remain

---

## Relevant Files

- `CHANGELOG.md` — Add [Unreleased] section
- `README.md` — Update features
- `docs/TODO.md` — Add completed phase(s)
- `docs/ARCHITECTURE.md` — +4 components, +2 IPC, update Evidence entity
- `docs/DEVELOPMENT.md` — +2 scripts, update tree and test count
- `docs/DEPENDENCIES.md` — **+19 dependencies** (biggest gap)
- `.github/copilot-instructions.md` — Update tech stack, components, entity, IPC
- `package.json` — Source of truth for version, deps, scripts
- `electron/preload.ts` — Source of truth for IPC methods
- `electron/entities/Evidence.ts` — Source of truth for Evidence entity fields

## Verification

1. `npm run test` — capture actual test count, update all docs to match
2. Grep "1.2.2" across all docs — confirm version consistency
3. Count components in `src/components/` — confirm 13 matches docs
4. Diff `package.json` dependencies vs DEPENDENCIES.md — no gaps
5. Validate markdown table rendering in all modified files

## Decisions

- Use `[Unreleased]` in CHANGELOG (features weren't part of v1.2.2 release)
- IPC count: keep "70+" wording (actual ~73, close enough) or update to exact count — **recommend exact**
- DashboardPage is wrapped by HomePage (profile guard) — both are pages but only `/` route exposed via HomePage

## Further Considerations

1. **Version bump?** Three new features may warrant a v1.3.0 release instead of [Unreleased]. Recommend: keep [Unreleased] for now, bump when ready to release.
2. **Test count source of truth**: Need to run `npm run test` during execution to get the actual number — documented values (54+ vs 55) are inconsistent.
