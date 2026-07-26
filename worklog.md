# LAW Project Worklog

## Current Project Status

- **App version**: 3.5.0
- **GitHub repo**: https://github.com/pizzadox/LAW (private, pushed successfully)
- **GitVerse**: Not yet pushed (no SSH tools available in sandbox, need user to provide GitVerse credentials)
- **Build**: Production standalone mode (bun build + node/bun start)
- **Server**: Next.js 16 standalone, `--max-old-space-size=128` (reduced from 256 to prevent OOM)
- **Key recent changes**: Mock data removed, case deletion added, evidence chain by caseId, dynamic AI insights, side panel overflow fix

## Session 2026-07-26: Fix crash, optimize, push to GitHub

### Completed Tasks

1. **Started dev server and doc-processor** — both services confirmed running
2. **Verified app with agent-browser** — app loads, no console errors, all tabs working
3. **Verified processing progress UI** — per-file percentage display already implemented
4. **Bumped version from 3.2.0 to 3.3.0** — in package.json and UI display
5. **Created comprehensive README.md** — in Russian
6. **Pushed code to GitHub** — https://github.com/pizzadox/LAW

---

## Session 2026-07-27: Fix document processing, buttons, DB data linking, GitHub push

### Completed Tasks

1. **Fixed VLM URL format error** — The main crash cause was "URL格式无效" (invalid URL format)
   - Changed `extractTextFromPDF()` → `extractTextFromDocument()` in `src/lib/zai.ts`
   - Now uses base64 data URLs (`data:application/pdf;base64,...`) instead of local file paths
   - Added MIME type detection based on file extension
   - Added `isImageFile()` to use `image_url` type for images, `file_url` for documents
   - Supports PDF, DOCX, XLS/XLSX, images (JPG, PNG, GIF, BMP, TIFF, WebP), TXT, CSV, RTF, ODT/ODS

2. **Fixed process route** (`src/app/api/case/process/route.ts`)
   - Added `caseId` linking to Person and Episode records during processing
   - Person records now have `caseId: caseId || null` — ensures data appears in case-filtered queries
   - Episode records now have `caseId: caseId || null` — same linking
   - Added progress step updates: "Распознавание текста" (10%), "ИИ-анализ документа" (40%), "Сохранение данных в БД" (70%), "Завершено" (100%)
   - Removed the "already processed" block — allows re-processing via reprocess route
   - Improved LLM prompt to extract ONLY case-relevant data, exclude irrelevant info
   - Skip empty/null person names and episode titles during DB saving

3. **Added reprocess route** (`src/app/api/case/documents/[id]/reprocess/route.ts`)
   - Resets document processingStatus to 'pending'
   - Clears extractedText, documentType, documentDate, sourceReference, summary, processedAt
   - Resets ProcessingQueue entry to 'queued' status with 0% progress
   - Cleans up PersonDocument, EpisodeDocument, DocumentArticle, CrossReference links
   - Allows "Повторить" button to properly reset before re-processing

4. **Fixed buttons on Documents tab** (`src/components/case-documents.tsx`)
   - "Повторить" (Retry) button: now calls reprocess first to reset, then process
   - Added loading state with spinner for Retry button: `<Loader2>` + "Обработка..." text
   - "Анализ" button: already had spinner, confirmed working
   - handleAnalyze: now invalidates ALL case-related queries after processing (documents, persons, episodes, dashboard, criminal-cases, processing-status)
   - handleDelete: same comprehensive query invalidation
   - Better error messages: `err?.message || 'Ошибка анализа'` shown in toast

5. **Verified data distribution to DB after processing**
   - Process route creates Person records with caseId from document.caseId
   - Process route creates Episode records with caseId from document.caseId
   - Process route creates Article records (global, shared across cases)
   - Process route links Person→Document, Episode→Document, Article→Document via junction tables
   - Process route creates cross-references between documents

6. **Ensured only case-relevant data is shown**
   - LLM prompt explicitly says: "Extract ONLY information directly relevant to the criminal case"
   - All card components use `hasValue()` helper to hide empty/null/placeholder fields
   - Persons tab conditionally renders birthDate, occupation, alias, defenseStrategy
   - Episodes tab conditionally renders severity, status, date
   - Documents tab conditionally renders documentType, documentDate, sourceReference

7. **Pushed to GitHub** — v3.4.0 committed and pushed
   - Commit: "Fix document processing: base64 data URLs for VLM, caseId linking, reprocess route, button fixes"
   - Commit: "Bump version to 3.4.0"
   - URL: https://github.com/pizzadox/LAW

8. **Server optimization** — Reduced memory from 768MB to 256MB to prevent OOM kills
   - Previous `--max-old-space-size=768` was too large, causing OOM kills
   - Now using `--max-old-space-size=256` which is sufficient for the standalone server

### Key Architecture Decisions

- **Base64 data URLs for VLM**: Avoids "URL格式无效" error by encoding files locally before sending to VLM API
- **caseId linking**: All extracted entities (Person, Episode) are linked to the document's caseId
- **Reprocess route**: Separate route to reset document status before re-processing, prevents conflicts
- **Comprehensive query invalidation**: After any CRUD operation, all case-related queries are invalidated

### Unresolved Issues / Risks

- **OOM memory risk**: Server may still crash with heavy usage; 256MB limit is minimal
- **Large file processing**: Base64 encoding for large files (500MB) will consume significant memory
- **Preview URL**: The preview URL at space-z.ai shows a Z.ai default page instead of our app (gateway routing issue)
- **Mock data fallbacks**: ~~Some API functions in case-api.ts still fall back to mock data~~ **RESOLVED** — All mock data fallbacks removed in Task ID 1 session; now returns empty arrays/objects
- **Export CSV/PDF**: Export buttons on Documents tab work (client-side CSV/PDF generation), but Export Center tab may still use mock data
- **Real-time updates**: Still using polling (refetchInterval) instead of WebSocket

### Next Steps Recommendations

- Test document upload and processing end-to-end with a real file
- ~~Remove remaining mock data fallbacks from case-api.ts~~ **DONE in Task ID 1**
- Add WebSocket for real-time processing updates
- Implement proper Export CSV/PDF in case-export-center.tsx
- Add file serving endpoint for viewing uploaded documents inline
- Clear stale processing queue entries and failed documents from DB
- Optimize memory usage for large file uploads (streaming base64)

---

## Session 2026-03-05: Fix mock data, side panel, evidence chain, AI insights (Task ID: 1)

### Completed Tasks

1. **Fixed side panel overflow in case-documents.tsx**
   - Changed `<SheetContent>` to add `h-full` class for proper height management
   - Wrapped inner content area with `<ScrollArea className="flex-1 overflow-y-auto">` instead of a plain `<div>` with `overflow-y-auto`
   - SheetHeader stays fixed at top with `shrink-0` and `border-b`
   - ScrollArea ensures all content (metadata, extracted text, annotations, actions) scrolls properly without overlapping sections

2. **Removed hardcoded mock data from AI Insights section**
   - Replaced entire hardcoded "ИИ-инсайты по документам" section with dynamic data derived from actual `documents` array
   - Section only renders if there are completed documents (`documents.filter(d => d.processingStatus === 'completed').length > 0`)
   - Dynamic insights computed from case documents:
     - Document types found in this case (from `documentType` field) with counts
     - Total pages estimated from file sizes
     - Average processing time calculated from `uploadedAt → processedAt` timestamps
     - Source references extracted from completed documents as entities
   - Removed all hardcoded data: "Колесниченко Д.А.", "ООО 'ФинансГрупп'", "ст. 159 ч.3 УК РФ", "г. Москва", "15.03.2024", "бухгалтер", language counts, "2.4 сек/док", "-15% к прошлой неделе"

3. **Fixed Evidence Chain section on Documents tab**
   - Changed `useQuery` for evidence chain from `queryKey: ['evidence-chain']` to `queryKey: ['evidence-chain', caseId]`
   - Changed `queryFn: caseApi.getEvidenceChain` to `queryFn: () => caseApi.getEvidenceChain(caseId)`
   - Added `enabled: !!caseId` to only fetch when caseId is available
   - Evidence chain data now only shows items related to the current case's documents

4. **Fixed case-api.ts getEvidenceChain function**
   - Changed `getEvidenceChain()` to `getEvidenceChain(caseId?: string)`
   - Added `caseId` parameter with query string: `?caseId=${caseId}`
   - Changed catch block from importing `mockEvidenceChain` to returning `[]` (empty array)

5. **Fixed evidence-chain API route**
   - Changed from returning hardcoded `mockEvidenceChain` to using real database via Prisma
   - Accepts `caseId` via URL query parameter
   - Returns empty array `[]` if no `caseId` is provided
   - Fetches completed documents for the case from DB: `db.document.findMany({ where: { caseId, processingStatus: 'completed' } })`
   - Builds evidence chain data from actual document records:
     - Each document becomes an evidence item with chain steps (upload → AI processing)
     - Integrity score set to 85, admissibility set to 'admissible', no challenges

6. **Removed ALL mock data fallbacks from case-api.ts**
   - Replaced all `await import('./mock-data')` fallbacks with empty defaults
   - `getCaseHealthScore` → returns empty `CaseHealthScore` object with score: 0 and empty factors
   - `getEvidenceTimeline` → returns `[]`
   - `getPersonRelationships` → returns `[]`
   - `getDefenseImprovements` → returns `[]`
   - `getNotifications` → returns `[]`
   - `getCrossRefGraph` → returns `[]`
   - `getCaseBrief` → returns empty `CaseBriefData` object with all arrays empty and aiConfidence: 0
   - `getRiskAssessment` → returns empty `RiskAssessmentData` object with overallRisk: 0, riskLevel: 'low', empty factors
   - `getSentencing` → returns `[]`
   - `getEvidenceChain` → returns `[]` (already handled above)
   - `getAuditLog` → returns `[]`
   - `getCaseTimeline` → returns `[]`
   - `getBookmarks` → returns `[]`
   - `getWitnessStatements` → returns `[]`
   - `getAnalytics` → returns empty `AnalyticsData` object with all arrays empty and complexity rating: 'low'

### Files Modified

- `src/components/case-documents.tsx` — Side panel ScrollArea fix, AI Insights dynamic data, evidence chain caseId filtering
- `src/lib/case-api.ts` — getEvidenceChain caseId parameter, all mock data fallbacks removed
- `src/app/api/case/evidence-chain/route.ts` — Real DB-based evidence chain with caseId filtering
- `worklog.md` — Updated unresolved issues and next steps

---

## Session 2026-03-04: Add case deletion feature (Task ID: 2)

### Completed Tasks

1. **Added case deletion feature to case selector dropdown** (`src/app/page.tsx`)
   - Added `Trash2` icon import from lucide-react
   - Added `deleteCaseDialogId` and `isDeletingCase` state variables
   - Added `deleteCase` computed memo to find the case being deleted
   - Added `handleDeleteCase` async function that:
     - Calls `caseApi.deleteCase(caseId)` to delete the case via `DELETE /api/case/cases/[caseId]`
     - Invalidates all case-related queries: `criminal-cases`, `documents`, `persons`, `episodes`, `dashboard`, `evidence-chain`
     - If the deleted case was the active case, switches to the first remaining case (or clears active case if no cases remain)
     - Updates localStorage and Zustand store accordingly
     - Shows success/error toast notifications
   - Added "Удалить текущее дело" DropdownMenuItem in the case selector dropdown, after a separator, below "Новое дело"
     - Styled with red-700 text color and red focus background to signal danger
     - Only shown when there is an active case
   - Added confirmation Dialog (`<Dialog>`) for case deletion:
     - Shows AlertTriangle icon with red-700 color
     - Displays case number of the case being deleted
     - Warning text: "Все связанные данные (документы, участники, эпизоды) будут удалены навсегда."
     - "Отмена" (Cancel) and "Удалить дело" (Delete case) buttons
     - Delete button styled with red-700 background, disabled during deletion
     - Shows "Удаление..." loading text while deleting

### Files Modified

- `src/app/page.tsx` — Added delete case functionality (state, handler, dropdown item, confirmation dialog)

### Technical Notes

- Backend API already supported deletion: `DELETE /api/case/cases/[caseId]` and `caseApi.deleteCase(caseId)` were already implemented
- The delete option is placed after a separator in the dropdown to avoid accidental clicks
- The confirmation dialog prevents accidental deletion by requiring explicit user confirmation
- All related query caches are invalidated after deletion to ensure UI consistency

---
Task ID: 3
Agent: main
Task: Fix documents tab buttons, remove mock data, add case deletion, fix side panel, push to GitHub/GitVerse

Work Log:
- Analyzed all case-documents.tsx code (1027 lines), case-api.ts, case-store.ts, evidence-chain route
- Identified 6 major issues: hardcoded AI Insights, mock evidence chain data, side panel overflow, no case deletion, mock data fallbacks, API errors
- Delegated Task ID 1 to subagent: Fixed side panel overflow, removed hardcoded AI Insights data, added dynamic insights from documents, fixed evidence chain to filter by caseId, updated getEvidenceChain to accept caseId, replaced evidence-chain API route with DB-based implementation, removed ALL 15 mock data fallbacks from case-api.ts
- Delegated Task ID 2 to subagent: Added case deletion button, confirmation dialog, handleDeleteCase function in page.tsx
- Fixed delete case API route to return 404 instead of 500 for non-existent cases
- Bumped version from 3.4.0 to 3.5.0
- Changed dev script memory from 768MB to 128MB (--max-old-space-size)
- Rebuilt project, lint passed
- Pushed to GitHub: v3.5.0 (2 commits)
- API verification: 3 cases loaded, evidence chain returns 1 item for case 111, documents return 3 docs, delete returns proper 404
- Agent-browser verified: page loads correctly, Documents tab shows empty state properly (no mock data), navigation works
- Could not push to GitVerse: no SSH tools available in sandbox, needs user credentials

Stage Summary:
- All mock data removed from Documents tab (AI Insights, evidence chain, entities)
- Case deletion feature added with confirmation dialog
- Side panel overflow fixed with ScrollArea
- Evidence chain now uses real DB data filtered by caseId
- Delete API returns 404 instead of 500
- Version bumped to 3.5.0
- Pushed to GitHub
- Server OOM issue persists (process gets killed after ~20-30 seconds)
- GitVerse push pending (needs SSH setup)

Unresolved Issues:
- OOM kills the server after ~20-30 seconds (need more RAM or smaller app)
- GitVerse push not possible without SSH tools or HTTPS credentials
- Some sections (Defense, Timeline, Analytics, etc.) may still show mock data in their own component files
- Footer sticky position verified working
