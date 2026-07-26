# LAW Project Worklog

## Current Project Status

- **App is running** on port 3000 (Next.js 16 standalone server, `--max-old-space-size=256` to avoid OOM)
- **Version**: 3.4.0
- **GitHub repo**: https://github.com/pizzadox/LAW (private, pushed successfully)
- **Build**: Production standalone mode (bun build + node/bun start)

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
- **Mock data fallbacks**: Some API functions in case-api.ts still fall back to mock data for missing endpoints (health-score, timeline, relationships, etc.)
- **Export CSV/PDF**: Export buttons on Documents tab work (client-side CSV/PDF generation), but Export Center tab may still use mock data
- **Real-time updates**: Still using polling (refetchInterval) instead of WebSocket

### Next Steps Recommendations

- Test document upload and processing end-to-end with a real file
- Remove remaining mock data fallbacks from case-api.ts for real DB endpoints
- Add WebSocket for real-time processing updates
- Implement proper Export CSV/PDF in case-export-center.tsx
- Add file serving endpoint for viewing uploaded documents inline
- Clear stale processing queue entries and failed documents from DB
- Optimize memory usage for large file uploads (streaming base64)
