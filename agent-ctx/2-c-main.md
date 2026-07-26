# Task 2-c: Fix API routes and case-dashboard component

## Agent: main

## Summary
Fixed all API routes to use real DB data instead of mock data, removed mock-data imports from case-dashboard.tsx, and ensured all routes filter by caseId.

## Key Changes
1. Removed PROCEDURE_STAGES, PROCEDURE_CURRENT_INDEX, PROCEDURAL_DEADLINES mock imports from case-dashboard.tsx
2. Defined PROCEDURE_STAGES as local constants (legal reference, not mock data)
3. Created getProcedureIndex() to derive current stage from case status
4. Rewrote ProcStages and Deadlines components to use real data
5. Updated case-api.ts: 6 API functions now pass caseId
6. Updated case-dashboard.tsx: 7 useQuery calls now pass caseId
7. Rewrote 14+ API routes to use real DB data (zero mock-data imports remaining in API routes)
8. Fixed defense routes to accept caseId
9. Added episodesWithDates to dashboard response and DashboardStats type
10. Verified processing-status route works (returns 200, not 502)

## Dev Log Status
- Server started and compiled successfully
- All API routes returned 200 status codes
- Lint passed cleanly

## Files Modified
See worklog.md for complete list of 19+ modified files
