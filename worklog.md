# Criminal Case Management System - Worklog

## Project Overview
Building a comprehensive criminal case management application (Система Управления Уголовным Делом) for analyzing materials of a criminal case. The system includes:
- PDF/document upload and text extraction with queue processing
- AI-powered analysis extracting persons, places, articles, episodes
- Per-file processing progress display with percentage and step names
- Error reason display for failed processing
- Cross-reference search by links in text
- Search by date, document, person, article
- Legal compliance checking against Russian Federation norms
- Kolesnichenko defense line analysis
- AI Q&A system for case-related questions
- Participant visualization with guilt status and forecasts
- Document management interface
- Real-time auto-refresh without page reload
- Export Center (CSV, JSON, PDF, HTML)

## Tech Stack
- Next.js 16 with App Router (production standalone server)
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM (SQLite)
- z-ai-web-dev-sdk (LLM, VLM for document analysis)
- Zustand for client state
- TanStack Query for server state (with refetchInterval for auto-refresh)
- React.lazy for component lazy loading
- doc-processor mini-service (Bun, port 3005)

---
Task ID: 1
Agent: Main Coordinator
Task: Add per-file processing percentage, error display, version bump, API fixes

## Current Session Work

### Per-file Processing Progress (Main Feature)
1. **Added `progressPercent` and `progressStep` fields to ProcessingQueue model** in Prisma schema
   - Both main project (`prisma/schema.prisma`) and doc-processor (`mini-services/doc-processor/prisma/schema.prisma`)
   - progressPercent: Int (0-100) - percentage of processing for this document
   - progressStep: String? - current step description in Russian (e.g. "Распознавание текста", "ИИ-анализ документа")

2. **Updated processor.ts** in doc-processor mini-service to report progress at each step
   - 10 progress steps defined with Russian labels:
     - starting (5%), extracting_text (20%), text_extracted (35%), analyzing (50%), analysis_complete (70%)
     - creating_persons (80%), creating_episodes (85%), creating_articles (90%), finalizing (95%), completed (100%)
   - Each step updates the ProcessingQueue entry's progressPercent and progressStep
   - On failure, progressPercent resets to 0 and progressStep shows the error description
   - Error messages are cleaned (truncated to 200 chars, stack traces removed)

3. **Updated /api/case/processing-status route** to include new fields
   - Returns progressPercent and progressStep for each item
   - Calculates overall progress: completed=100%, failed=100%, processing=its progressPercent, queued=0%
   - Also returns document.processingError as fallback for error display

4. **Updated frontend ProcessingStatusItem type** in case-store.ts and case-api.ts
   - Added progressPercent: number and progressStep: string | null

5. **Updated Processing Status Panel in case-documents.tsx** (major UI upgrade)
   - Each file now has its own card with border and background
   - Shows per-file percentage (e.g. "35%")
   - Shows progress step label in Russian (e.g. "Распознавание текста")
   - Per-file mini Progress bar for processing/queued items
   - Failed items show error details in a red box with AlertTriangle icon
   - Overall progress counter: "completed+failed/total" display
   - Max height increased to 264px for better readability

### Export Center Fix
- Fixed caseNumber derivation: was using `dashboard?.summary?.totalDocuments` (wrong)
- Now correctly uses `dashboard?.caseInfo?.caseNumber ?? caseId`

### Version Bump
- Version updated from 3.1.0 to 3.2.0 in package.json
- Sidebar footer: v3.2
- Footer text: ИИ-аналитик v3.2

### API Verification
- All endpoints verified working via curl:
  - `/` - 200 (170KB HTML)
  - `/api/case/cases` - 200
  - `/api/case/processing-status?caseId=xxx` - 200 (with progress fields)
  - `/api/case/documents?caseId=xxx` - 200
  - `/api/case/dashboard?caseId=xxx` - 200

### Memory/OOM Issue
- Container has 4GB RAM; agent-browser Chrome consumes ~800MB
- Combined Chrome + Node.js server (SSR) pushes past 4GB limit → OOM kill
- Server works fine with curl testing; agent-browser causes OOM during page rendering
- Production standalone server is the only viable approach (dev server uses even more memory)

### Unresolved Issues
1. **Agent-browser testing** - Cannot use agent-browser due to OOM; need to reduce page complexity or use lighter browser
2. **Export CSV/PDF buttons** in Documents section - Should work (same functions as in export center)
3. **Gitverse publishing** - Still need to publish code

### Priority Recommendations
1. Reduce page complexity to allow agent-browser testing (consider splitting into lighter sub-pages)
2. Publish code to gitverse.ru/pizzadox/LAW with README
3. Clear case "111" data if user requests again
