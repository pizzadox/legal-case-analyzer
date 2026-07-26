# Task 4-b: Hide empty data fields in case cards

## Agent: full-stack-developer

## Task Summary
Added conditional rendering across all case card components to hide empty/missing data fields. Fields that previously showed placeholders like "—", "Не указано", or "Не определена" now only appear when the data actually has a value.

## Files Modified
1. `case-persons.tsx` - ComparisonView dims conditional filtering and rendering
2. `case-episodes.tsx` - Involvement badge, article description, punishment, category conditional rendering
3. `case-documents.tsx` - Added hasValue helper, document metadata conditional rendering, comparison dialog field filtering
4. `case-brief.tsx` - Added hasValue helper, conditional rendering for brief fields (caseTitle, summary, role, date, description, source, legalBasis, defense/prosecution summaries)
5. `case-dashboard.tsx` - StatsBar delta conditional rendering
6. `case-witness-matrix.tsx` - ConflictsSummary conditional stat inclusion
7. `case-search.tsx` - CrossRefCard documentType badge conditional rendering

## Key Pattern
```typescript
function hasValue(v: unknown): boolean {
  return v != null && v !== '' && v !== undefined && v !== '—'
}

// Then use:
{hasValue(person.role) && <p className="text-xs text-muted-foreground">Роль: {person.role}</p>}
```

## Files NOT Modified
- `case-violations.tsx` - all data is hardcoded mock, no empty patterns
- `case-export-center.tsx` - '—' placeholders in HTML export templates are standard for tabular format
- Helper functions (personLabel, articleCode, etc.) - these are identifiers, not data fields
