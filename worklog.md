# Criminal Case Management System - Worklog

## Current Project Status
- Application is running on Turbopack dev server with `--max-old-space-size=512` Node flag
- Server restarts automatically via `setsid bash -c 'while true; do ...; done'` loop
- Doc-processor microservice running on port 3005 with auto-restart
- Pushed to GitHub (commit `0d183ae`): https://github.com/pizzadox/LAW.git
- Gitverse push failed (SSH not available, no token configured)
- Version: 3.9.0

## Memory Constraints
- Total system memory: 4GB, available for app: ~3.4GB
- Next.js server uses ~1.1GB (Turbopack with hot reloading)
- Doc-processor uses ~0.07GB
- Agent-browser Chrome uses ~1.2GB (causes OOM if both run simultaneously)
- Server crashes after ~5-6 page requests due to memory accumulation
- Restart loop ensures continuous availability

## Completed Changes (v3.9.0)

### 1. Text Overflow Fix (case-documents.tsx)
- Changed extracted text area from `max-h-64` to `max-h-[500px]`
- Changed `overflow-hidden` to `overflow-y-auto` for proper scrolling
- Changed text container from `<p>` to `<div>` with `break-words overflow-wrap-anywhere`
- Removed `overflow-hidden` from ScrollArea wrapper div
- Removed `max-h-[calc(100dvh-100px)]` from ScrollArea (caused content clipping)

### 2. Processing Hang at 10% Fix (doc-processor/lib/processor.ts)
- Added `fetching_document` progress step at 10% between `starting` (5%) and `extracting_text` (20%)
- This fills the gap where processing appeared stuck at 10%

### 3. VLM/LLM Timeout Handling (doc-processor/lib/zai.ts)
- Added 60s timeout for VLM CLI calls using `setTimeout + clearTimeout`
- Added 120s timeout for LLM analysis using `Promise.race`
- Prevents processing from hanging indefinitely on AI calls

### 4. Memory Optimization (page.tsx)
- Replaced `lazy()` imports (17 components) with component registry pattern
- Components load ONLY when user navigates to that section
- Used `SectionRenderer` component that dynamically imports via `COMPONENT_REGISTRY`
- Eliminated `ssr: false` `dynamic()` imports (removed 17 import closures from module scope)
- Reduced initial page bundle size significantly

### 5. Server Configuration
- Dev script: `next dev --turbopack -p 3000` (Turbopack for memory efficiency)
- Build script: Simplified (removed standalone copy that was failing)
- Server runs with `--max-old-space-size=512` to limit heap growth
- Both services have auto-restart loops

### 6. Processing Status API
- `/api/case/processing-status` reads directly from DB (no proxy to port 3005)
- Eliminates 502 errors when doc-processor microservice is unreachable

## Unresolved Issues

### Critical: OOM (Out of Memory) Crashes
- Server crashes after ~5-6 page requests due to memory accumulation
- No swap space available (root required)
- Agent-browser Chrome processes consume ~1.2GB, cannot run simultaneously with Next.js
- Server auto-restarts but users may experience brief downtime

### Pending Tasks from Previous Sessions
- Translate "Этапы производства по делу" section to full Russian (currently "Этапы")
- Fix AI Insights and Chain of Custody showing irrelevant data (need caseId filtering)
- Fix Retry/Повторить button and other buttons on Documents tab
- Verify DB population after processing
- Hide empty fields in case cards
- Fix uploaded file not appearing in list
- Multi-format support improvements (DOCX, images)
- Fix Export CSV and Export PDF buttons
- Gitverse push (SSH not available)
- Lazy loading improvements
- Per-file processing percentage display (already working)
- Error reason display for failed processing (already working)
- Fix side panel overflow (already fixed with text area changes)
- Add case deletion (already implemented in page.tsx)

## Priority Recommendations for Next Phase
1. **Stabilize memory**: Reduce component sizes, implement aggressive garbage collection
2. **Filter irrelevant data**: Ensure AI Insights and Evidence Chain only show caseId-related data
3. **Fix Document buttons**: Ensure all buttons (Retry, Delete, Export) work correctly
4. **Complete Russian translation**: Translate all remaining English text in episodes and other sections
5. **Gitverse push**: Configure SSH or token for Gitverse remote
