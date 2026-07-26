# LAW Project Worklog

## Current Project Status

- **App is running** on port 3000 (Next.js 16 standalone server)
- **Doc-processor** running on port 3005 (Bun microservice)
- **Version**: 3.3.0
- **GitHub repo**: https://github.com/pizzadox/LAW (private, pushed successfully)
- **Gitverse remote**: configured but SSH auth unavailable in sandbox

## Session 2026-07-26: Fix crash, optimize, push to GitHub

### Completed Tasks

1. **Started dev server and doc-processor** — both services confirmed running
2. **Verified app with agent-browser** — app loads, no console errors, all tabs working
3. **Verified processing progress UI** — per-file percentage display already implemented:
   - Processing Status Panel shows total progress and per-file percentage
   - Each file shows progress step (e.g. "Распознавание текста", "ИИ-анализ")
   - Failed items show error reasons in red panel
   - Auto-refresh when processing completes (invalidateQueries)
4. **Bumped version from 3.2.0 to 3.3.0** — in package.json and UI display
5. **Created comprehensive README.md** — in Russian, with:
   - Project overview and key features
   - Technology stack table
   - Project structure tree
   - Installation and quick start instructions
   - API routes table
   - Document processing architecture with progress steps table
   - Optimization notes (lazy loading, ErrorBoundary, polling, microservice)
6. **Pushed code to GitHub** — https://github.com/pizzadox/LAW (token-based auth)
7. **Updated .gitignore** — added exclusions for db/*.db, upload/, tool-results/, build artifacts

### Key Architecture Decisions

- **Lazy loading**: All 17 tab components are loaded via `React.lazy()` + `Suspense` + `ErrorBoundary`
- **Per-file processing progress**: ProcessingQueue model has `progressPercent` and `progressStep` fields
- **Auto-updates**: TanStack Query with `refetchInterval: 5000-10000ms` for polling
- **Production mode**: Running standalone server.js with `--max-old-space-size=768`
- **Background processing**: doc-processor on port 3005, polls DB every 5 seconds

### Unresolved Issues

- Gitverse push requires SSH authentication not available in sandbox
- Some uploaded documents have OCR failures (VLM URL format error) — needs VLM fix
- Mock data still used in some API functions (case-api.ts) as fallback for non-existent endpoints

### Next Steps Recommendations

- Fix VLM OCR integration for better document processing
- Remove remaining mock data fallbacks from case-api.ts
- Add WebSocket support for real-time processing updates instead of polling
- Implement proper Export CSV/PDF in case-export-center.tsx
- Add conditional rendering for empty fields in all card components
- Clear stale processing queue entries from DB
