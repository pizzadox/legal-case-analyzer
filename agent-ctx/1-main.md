# Task ID 1 — Remove Mock Data, Fix Overflow, Fix Evidence Chain

## Agent: main

## Summary

Completed all 6 sub-tasks for Task ID 1:

1. **Side panel overflow fix** — Wrapped Sheet inner content in `<ScrollArea>` so sections don't overlap. SheetHeader stays fixed at top, content scrolls below.

2. **AI Insights hardcoded data removal** — Replaced entire hardcoded section with dynamic data derived from `documents` array. Only renders when completed documents exist. Computes document types, pages, processing time, and source references from actual case data.

3. **Evidence Chain caseId filtering** — Changed `useQuery` to pass `caseId` in queryKey and queryFn, added `enabled: !!caseId`.

4. **getEvidenceChain function** — Added `caseId?: string` parameter, passes it as query string, returns `[]` on error instead of mock data.

5. **Evidence-chain API route** — Replaced mock data return with real DB query using Prisma. Accepts `caseId` from URL params, returns `[]` if missing. Builds chain data from completed documents.

6. **All mock data fallbacks removed from case-api.ts** — All 15 functions that previously imported from `./mock-data` now return empty arrays or sensible empty defaults inline.

## Files Modified

- `src/components/case-documents.tsx`
- `src/lib/case-api.ts`
- `src/app/api/case/evidence-chain/route.ts`
- `worklog.md`

## Lint Check

Passed with no errors.
