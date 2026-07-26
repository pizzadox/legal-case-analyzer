# Criminal Case Management System - Worklog

## Project Overview
Система Управления Уголовным Делом (Criminal Case Management System) v3.2
- Per-file processing progress with percentage and step names
- Error reason display for failed processing
- AI-powered document analysis
- Real-time auto-refresh
- Export Center (CSV, JSON, PDF, HTML)

## Tech Stack
- Next.js 16 with App Router (production standalone, --max-old-space-size=768)
- TypeScript 5, Tailwind CSS 4, shadcn/ui
- Prisma ORM (SQLite), Zustand, TanStack Query
- z-ai-web-dev-sdk, doc-processor mini-service (Bun, port 3005)

---
Task ID: 1
Agent: Main Coordinator
Task: Add per-file processing progress percentage, error display, version bump, export fix

## Completed Modifications

### Per-file Processing Progress (Main Feature)
1. Added `progressPercent` (Int, 0-100) and `progressStep` (String?) to ProcessingQueue schema
2. Updated doc-processor processor.ts with 10 progress steps:
   - starting (5%), extracting_text (20%), text_extracted (35%), analyzing (50%)
   - analysis_complete (70%), creating_persons (80%), creating_episodes (85%)
   - creating_articles (90%), finalizing (95%), completed (100%)
3. Updated /api/case/processing-status route to return new fields per item
4. Updated frontend ProcessingStatusItem type (progressPercent, progressStep)
5. Redesigned Processing Status Panel in case-documents.tsx:
   - Per-file cards with progress percentage and step label
   - Mini Progress bars for processing items
   - Error details in red box with AlertTriangle icon for failed items
   - Overall "completed+failed/total" counter

### Export Center Fix
- Fixed caseNumber: was using `dashboard?.summary?.totalDocuments` (wrong)
- Now uses `dashboard?.caseInfo?.caseNumber ?? caseId`

### Version & Memory Management
- Version bumped to 3.2.0
- Added `--max-old-space-size=768` to dev script for memory constraint management
- Server runs stable with curl testing (170KB main page served correctly)

## Verification Results
- Server responds 200 on main page, all API endpoints working
- Processing-status API returns progressPercent and progressStep per item
- Error details correctly displayed for failed items
- Overall progress calculation working (completed=100%, failed=100%, processing=its progress, queued=0%)

## Unresolved Issues
1. **Agent-browser OOM**: Chrome + Node.js combined exceed 4GB RAM; server crashes when browser renders page
   - Server works fine with curl requests
   - Agent-browser causes immediate OOM kill
   - Recommendation: reduce page complexity or use lighter testing approach
2. **Gitverse publishing**: No SSH keys or HTTPS credentials available; user needs to push manually
3. **Case "111" data**: Has 1 processing, 1 completed, 1 failed document; 3 episodes; user may want to clear it again

## Priority Recommendations
1. User should push code to gitverse.ru/pizzadox/LAW manually (SSH key needed)
2. Consider reducing page JS bundle size to allow agent-browser testing
3. Clear case "111" data on user request
4. Fix the "processing" document in case 111 (stuck since previous session)
