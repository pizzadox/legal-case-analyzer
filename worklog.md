# Worklog

---
Task ID: 1
Agent: Main Coordinator
Task: Restore project from GitHub, run in production, fix documents tab reloading, fix file recognition

Work Log:
- Pulled latest code from GitHub (git reset --hard origin/main → v3.11.1)
- Rebuilt production bundle (bun run build)
- Started production server via pm2 (nextjs-prod on port 3000)
- Started doc-processor via pm2 (port 3005)
- Fixed documents tab reloading: added staleTime, refetchOnWindowFocus:false, dynamic refetchInterval for processing-status, changed useEffect deps from processingStatus object to primitive values (curCompleted, curFailed, curProcessing)
- Fixed criminal-cases query: added staleTime:60s, refetchInterval:120s, refetchOnWindowFocus:false
- Subagent fixed 29 queries across 11 components (removed 10s polling for static data, added 60s for processing data, added caseId to query keys)
- Fixed doc-processor Prisma client: regenerated after schema had progressPercent/progressStep fields missing from generated client
- Re-registered 3 PDF documents in database (том 1_0001 pages 1-3) for case cms3kk2u60000tsp6ikdk3nez
- Reset stuck processing queue entries back to "queued" state
- Verified with agent-browser: documents tab loads correctly, no reloading, 3 documents visible, processing active

Stage Summary:
- Production server running via pm2 (bun run start on port 3000)
- Doc-processor running via pm2 (bun --hot on port 3005)
- Documents tab no longer has infinite re-render loop
- File recognition (OCR) is working - doc-processor uses VLM CLI to OCR scanned PDFs
- One document hit 429 (Too Many Requests) from AI API rate limiting
- 29 queries across 11 components fixed for proper caching/polling

---
Task ID: 2
Agent: Main Coordinator
Task: Clear database, re-seed with real PDF documents, create persistent seed script

Work Log:
- Cleared all database tables completely (all junction tables, dependent tables, core entities)
- Rewrote prisma/seed.ts to use real PDF files instead of mock data:
  - Creates CriminalCase (№ 2024-00145, Колесниченко Д.А.)
  - Registers 3 real PDF documents with proper file paths
  - Creates ProcessingQueue entries so doc-processor can pick them up
  - Fixed copyFileSync bug (was using filename instead of full path)
- Ran seed: case cms3lyvkl0000ts1q3w3xbc34 created, 3 documents registered
- Verified all 3 document file paths exist and match actual file sizes
- Restarted doc-processor to begin processing
- Verified with agent-browser: dashboard shows case with 3 documents, documents tab shows all 3 PDFs with processing statuses
- No page errors, no reloading issues

Stage Summary:
- Database completely cleared and re-seeded with real documents
- Seed script (prisma/seed.ts) now uses real PDF files, not mock data
- 3 PDFs registered: том 1_0001-страницы-1.pdf (43.1MB), -2.pdf (47.9MB), -3.pdf (40.1MB)
- Doc-processor actively OCRing documents (some VLM rate limiting on pages)
- Application working correctly in production mode

## Task 3-b: Fix TanStack Query polling intervals

**Date:** 2025-03-05
**Status:** Completed

### Problem
Multiple components across the app had aggressive `refetchInterval` values (10s or 30s) that caused constant network polling and re-rendering, even for static data that never changes unless processing completes. 7 dashboard queries polled every 30s simultaneously. Many static-data queries (analytics, risk, brief, compliance, bookmarks, cross-ref-graph, defense lines, sentencing) polled every 10s.

### Changes Made

#### 1. case-dashboard.tsx (7 queries)
- `dashboard`: 30s → 60s, added staleTime: 60000 (changes during processing)
- `health-score`: 30s → 60s, added staleTime: 60000 (changes during processing)
- `evidence-timeline`: 30s → 60s, added staleTime: 60000 (evidence-chain)
- `case-brief`: 30s → false (STATIC)
- `bookmarks`: 30s → false (STATIC)
- `case-timeline`: 30s → false (STATIC)
- `audit-log`: 30s → false (STATIC)

#### 2. case-persons.tsx (3 queries)
- `persons`: 30s → 60s, added staleTime: 60000 (changes during processing)
- `personRelationships`: 30s → 60s, added staleTime: 60000
- `witnessStatements`: 30s → 60s, added staleTime: 60000

#### 3. case-episodes.tsx (1 query)
- `episodes`: 30s → 60s, added staleTime: 60000 (changes during processing)

#### 4. case-legal-check.tsx (3 queries)
- `compliance-results`: 10s → false, added caseId to queryKey (STATIC/compliance)
- `documents`: 10s → 60s, added staleTime: 60000, added enabled: !!caseId (changes during processing)
- `audit-log`: 10s → false, added enabled: !!caseId (STATIC)

#### 5. case-risk.tsx (2 queries)
- `risk-assessment`: 10s → false, added caseId to queryKey (STATIC/risk)
- `sentencing`: 10s → false, added caseId to queryKey (STATIC/sentencing)
- Added `{ caseId }: { caseId: string }` prop to CaseRisk component

#### 6. case-timeline.tsx (1 query)
- `case-timeline`: 10s → false, added caseId to queryKey (STATIC)
- Added `{ caseId }: { caseId: string }` prop to CaseTimeline component

#### 7. case-search.tsx (2 queries)
- `bookmarks`: 10s → false, added caseId to queryKey (STATIC)
- `cross-ref-graph`: 10s → false, added caseId to queryKey (STATIC)
- Added `{ caseId }: { caseId: string }` prop to CaseSearch component

#### 8. case-export-center.tsx (4 queries)
- `documents`: 10s → 60s, added staleTime: 60000 (changes during processing)
- `persons`: 10s → 60s, added staleTime: 60000
- `episodes`: 10s → 60s, added staleTime: 60000
- `dashboard`: 10s → 60s, added staleTime: 60000

#### 9. case-defense.tsx (4 queries)
- `persons`: 10s → 60s, added staleTime: 60000, added caseId to queryKey (changes during processing)
- `defense` (defense lines): 10s → false, added caseId to queryKey (STATIC)
- `defense-improvements`: 10s → false, added caseId to queryKey (STATIC)
- `risk-assessment`: 10s → false, added caseId to queryKey (STATIC/risk)
- Added `{ caseId }: { caseId: string }` prop to CaseDefense component

#### 10. case-analytics.tsx (1 query)
- `analytics`: 10s → false, added caseId to queryKey (STATIC)
- Added `{ caseId }: { caseId: string }` prop to CaseAnalytics component

#### 11. case-brief.tsx (1 query)
- `case-brief`: 10s → false, added caseId to queryKey (STATIC)
- Added `{ caseId }: { caseId: string }` prop to CaseBrief component

#### 12. page.tsx (routing)
- Extended `needsCaseId` list to include: 'search', 'defense', 'timeline', 'risk', 'brief', 'analytics'
- These components now receive `caseId` prop from the SectionRenderer

### Summary of Rules Applied
- **STATIC data** (analytics, risk, brief, compliance, search bookmarks, cross-ref-graph, defense lines, sentencing): `refetchInterval: false` — fetched once per mount, invalidated only when processing completes
- **Processing data** (dashboard, persons, episodes, documents, evidence-chain): `refetchInterval: 60000` + `staleTime: 60000` — gentle polling that will be overridden by transition-detection invalidation
- **All queries**: caseId included in queryKey to prevent cross-case contamination
- **All queries**: No explicit `refetchOnWindowFocus` (global default handles this)
- **All new caseId props**: Made required (`{ caseId: string }`) since SectionRenderer always passes it

### TypeScript Verification
- All modified files compile without new type errors
- Pre-existing errors in case-dashboard, case-export-center, case-persons remain unchanged (not caused by this task)
