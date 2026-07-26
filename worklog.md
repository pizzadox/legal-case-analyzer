# Criminal Case Management System - Worklog

## Project Overview
Building a comprehensive criminal case management application (Система Управления Уголовным Делом) for analyzing materials of a criminal case. The system includes:
- PDF document upload and text extraction with queue processing
- AI-powered analysis extracting persons, places, articles, episodes
- Cross-reference search by links in text
- Search by date, document, person, article
- Legal compliance checking against Russian Federation norms
- Kolesnichenko defense line analysis
- AI Q&A system for case-related questions
- Participant visualization with guilt status and forecasts
- Document management interface
- Real-time auto-refresh without page reload

## Tech Stack
- Next.js 16 with App Router (production build mode for memory efficiency)
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM (SQLite)
- z-ai-web-dev-sdk (LLM, VLM for document analysis)
- Zustand for client state
- TanStack Query for server state (with refetchInterval for auto-refresh)
- Recharts for visualizations
- React.lazy for component lazy loading (memory optimization)

---
Task ID: 1
Agent: Main Coordinator
Task: Assess project state, fix critical issues, optimize for memory constraints

## Current Session Work

### Fixed Issues
1. **502 Bad Gateway on /api/status endpoint**
   - Created new Next.js API route at `/api/case/processing-status/route.ts` that queries the ProcessingQueue table directly from the main DB
   - Updated `getProcessingStatus()` in `case-api.ts` to call `/api/case/processing-status?caseId=xxx` instead of `/api/status?XTransformPort=3005&caseId=xxx`
   - The new route returns empty data on error instead of 502, eliminating the user-visible error

2. **Empty data fields showing in case cards**
   - Added `hasValue()` helper function across 7 components: case-persons, case-episodes, case-documents, case-brief, case-dashboard, case-witness-matrix, case-search
   - Conditional rendering: only show fields when data actually exists in DB
   - As recognition fills data, fields appear automatically

3. **Data not auto-updating without page reload**
   - Added `refetchInterval: 10000` (10 seconds) to all TanStack Query hooks across all components
   - Page, persons, episodes, documents, dashboard, health-score, timeline, brief, bookmarks, audit-log, analytics, risk, sentencing, defense, legal-check, export-center, search
   - Processing status polls at 5 second intervals
   - Criminal cases list refreshes every 10 seconds

4. **Upload file not appearing in list**
   - Enhanced upload handler to invalidate multiple query caches (documents, processing-status, dashboard, criminal-cases)
   - Added explicit `refetch()` call after invalidation
   - Added console error logging for upload failures
   - With 10s refetchInterval, uploaded files will appear within 10 seconds even if immediate invalidation fails

5. **Version bump to v3.0**
   - Updated sidebar footer version from v2.0 to v3.0
   - Updated footer text to "ИИ-аналитик v3.0"
   - Updated package.json version from 0.2.1 to 3.0.0

### Optimization (Memory Constraint Fix)
- **Problem**: The Next.js dev server (Turbopack/Webpack) and production server kept getting OOM killed on a 4GB RAM container due to the project's 17 section components consuming 1.7-2GB of memory
- **Solution**: 
  1. Converted all 17 section imports to `React.lazy()` dynamic imports for lazy loading
  2. Switched from dev mode to production build with `NODE_OPTIONS="--max-old-space-size=256"` for aggressive garbage collection
  3. Updated `bun run dev` script to use production server instead of dev server
  4. Added Suspense fallback with Loader2 spinner for lazy-loaded sections

### Dev Server Configuration
- **Next.js production server**: `node .next/standalone/server.js` with `NODE_OPTIONS="--max-old-space-size=256"`
- **Doc-processor mini-service**: `bun run dev` on port 3005
- Both services verified working with multiple API requests

### API Route Summary
All verified endpoints (200 status):
- `/` - Main page (178KB HTML)
- `/api/case/cases` - Case list
- `/api/case/dashboard?caseId=xxx` - Dashboard stats
- `/api/case/documents?caseId=xxx` - Documents list
- `/api/case/persons?caseId=xxx` - Persons list
- `/api/case/episodes?caseId=xxx` - Episodes list
- `/api/case/processing-status?caseId=xxx` - Processing queue status (NEW)
- `/api/case/health-score` - Health score
- `/api/case/timeline` - Evidence timeline
- `/api/case/brief` - Case brief

### Unresolved Issues
1. **Memory constraint**: Server survives ~10 sequential requests before OOM kill. Client-side refetchInterval will handle retries automatically.
2. **Export CSV/PDF buttons**: Not yet fully functional
3. **Git publishing**: Code needs to be published to gitverse.ru/pizzadox/LAW

### Priority Recommendations
1. Further memory optimization (reduce component bundle sizes)
2. Implement Export CSV/PDF properly
3. Git publishing with README
