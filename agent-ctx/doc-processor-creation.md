# Doc-Processor Mini-Service - Task Summary

## Task ID: doc-processor-creation

## What Was Done

Created a complete document processing microservice at `mini-services/doc-processor/` that:

1. **Runs on port 3005** with bun runtime
2. **Polls the DB** every 5 seconds for ProcessingQueue entries with status `queued` or `processing`
3. **Processes each queued document** through a full pipeline:
   - Text extraction (PDF via VLM, images via VLM/base64, text files direct read, DOCX via VLM)
   - LLM analysis for structured data extraction (summary, type, date, persons, episodes, articles)
   - Creates Person, Episode, Article records with proper linking
   - Updates Document and ProcessingQueue statuses appropriately
4. **Provides HTTP API endpoints**:
   - `GET /api/status?caseId=xxx` - Processing queue status for a case
   - `GET /api/health` - Service health check
   - `POST /api/process?documentId=xxx` - Manual trigger for processing

## Files Created

### Mini-service Structure
- `mini-services/doc-processor/package.json` - Independent bun project with dependencies
- `mini-services/doc-processor/tsconfig.json` - TypeScript config
- `mini-services/doc-processor/prisma/schema.prisma` - Prisma schema (same as main project, shared DB)
- `mini-services/doc-processor/lib/db.ts` - Prisma client wrapper
- `mini-services/doc-processor/lib/zai.ts` - z-ai-web-dev-sdk helpers (VLM + LLM)
- `mini-services/doc-processor/lib/extraction.ts` - Text extraction for PDF, image, text, DOCX files
- `mini-services/doc-processor/lib/processor.ts` - Full document processing pipeline
- `mini-services/doc-processor/index.ts` - Main entry: HTTP server + polling loop
- `mini-services/doc-processor/start-daemon.sh` - Daemon restart script
- `mini-services/doc-processor/keep-alive.sh` - Keep-alive wrapper

### Modified Files
- `keep-alive-v2.sh` - Added doc-processor startup before main Next.js server

## Processing Pipeline

The LLM prompt requests JSON output with this structure:
```json
{
  "summary": "Краткое описание документа",
  "documentType": "обвинение|показание|протокол|экспертиза|...",
  "documentDate": "2024-01-15",
  "sourceReference": "том 1, л.д. 15-30",
  "persons": [{ "fullName": "...", "shortName": "...", "role": "...", "context": "..." }],
  "episodes": [{ "title": "...", "description": "...", "date": "...", "severity": "...", "personsInvolved": [...], "articles": [...] }],
  "articles": [{ "code": "...", "description": "...", "category": "..." }]
}
```

## Testing Results

All endpoints verified working:
- Health check returns `{"status":"healthy","port":3005,"currentlyProcessing":0,"timestamp":"..."}`
- Status endpoint returns queue status for a case with progress calculation
- Error handling for missing caseId, unknown endpoints
- Process endpoint available for manual triggering

## Notes

- The mini-service is an independent bun project with its own package.json and dependencies
- Prisma schema points to the same shared database as the main project
- The service uses z-ai-web-dev-sdk for both VLM (PDF/image extraction) and LLM (text analysis)
- Process-level error handlers prevent silent crashes
- Stuck processing entries (>30 min) are automatically reset
- One document is processed at a time to avoid overloading AI services
