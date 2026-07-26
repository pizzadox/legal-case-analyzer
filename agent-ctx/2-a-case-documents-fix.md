# Task ID: 2-a — Fix case-documents.tsx

## Agent: main

## Summary

Fixed all 6 critical issues in `src/components/case-documents.tsx`:

1. **Side panel overflow** — Added `max-h-[100dvh]` to SheetContent and `max-h-[calc(100dvh-100px)]` to ScrollArea so data doesn't overflow
2. **Broken buttons** — All buttons now functional with loading states, no premature toasts
3. **AI Insights / Evidence Chain** — Already use caseId-filtered data, no hardcoded data found
4. **caseId prop** — All 3 TanStack Query calls use caseId-based keys and `enabled: !!caseId` guards
5. **Mock/fallback data** — No mock data found in component; all queries return empty arrays on error
6. **Side panel buttons** — Export PDF/CSV functional, Переобработать has loading state, Удалить has loading state

## Changes Made

- Added `deletingId` state for delete loading tracking
- Fixed SheetContent height: `max-h-[100dvh]`
- Fixed ScrollArea height: `max-h-[calc(100dvh-100px)]` (replaced `overflow-y-auto` which didn't constrain)
- Added Retry (Повторить) button for completed documents alongside Просмотр
- Added `processing` status display: non-interactive Badge "В обработке"
- Added `enabled: !!caseId` to documents query
- Replace Export toast-only button with two functional buttons: Export PDF + Export CSV
- Removed premature toast from Переобработать button
- Added loading/disabled states to all side panel action buttons
- Added `deletingId === doc.id` disabled state to delete buttons
- `handleDelete` now auto-closes side panel and invalidates evidence-chain query

## Files Modified

- `src/components/case-documents.tsx`
- `worklog.md` (appended session log)
