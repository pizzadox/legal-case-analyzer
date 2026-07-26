# Task 2-b: Fix case-episodes.tsx — Fully Russian, No Mock Data

## Summary

Rewrote the entire case-episodes.tsx component to be fully in Russian, remove all hardcoded/mock data, and properly hide empty fields.

## Key Changes

1. **Added 'не доказано' (disproven) status** — was missing from all status maps and filter options
2. **Fixed 'потерпевшая' → 'потерпевший'** — correct Russian masculine form for victim
3. **Translated CSV export** — header row and filename now in Russian
4. **Changed severity 'небольшое' → 'небольшой'** — grammatically correct with "тяжести"
5. **Removed 3 mock/hardcoded sections**:
   - Defense coverage (5 static items not from DB)
   - Statute of limitations (hardcoded "~7 лет" text)
   - Evidence strength (heuristic with hardcoded thresholds)
6. **Fixed helper functions** — return '' instead of '—' for empty values
7. **Added hasValue checks** — empty person names, article codes, location data now hidden
8. **Changed "Эпизод №" → "Этап №"** — consistent with section naming
9. **Added empty state for zero episodes** — guidance text when no episodes at all
10. **Updated filter dropdowns** — added 'Не доказано' status option, 'Небольшой тяжести' severity

## Verification

- `bun run lint` — passed (0 errors)
- Dev log — no compilation errors
- Query key `['episodes', caseId]` — already correct
- No mock data fallbacks in getEpisodes API function
