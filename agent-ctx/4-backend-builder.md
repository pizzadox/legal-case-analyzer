# Task 4 - Backend Builder Agent

## Task: Create backend API routes for case management

## Work Completed

### Created Shared Utility
- `src/lib/zai.ts` - ZAI SDK wrapper with:
  - `getZAI()` - Singleton ZAI instance factory
  - `extractTextFromPDF(filePath)` - VLM with file_url content type for PDF extraction
  - `analyzeWithLLM(systemPrompt, userPrompt)` - LLM chat completions for text analysis

### Created 10 API Routes

1. **`/api/case/upload`** (POST)
   - Accepts multiple PDF files via FormData
   - Saves files to `/home/z/my-project/download/`
   - Creates Document records with status "pending"
   - Creates ProcessingQueue entries with queue positions
   - Returns document IDs, queue positions, success/error counts

2. **`/api/case/documents`** (GET)
   - Lists all documents with related persons, episodes, articles
   - Supports filtering: status, type, dateFrom, dateTo
   - Pagination: page, limit
   - Returns compliance checks summary per document

3. **`/api/case/process`** (POST)
   - Reads PDF file path from Document record
   - Step 1: VLM extracts text from PDF using file_url content type
   - Step 2: LLM analyzes text with structured JSON prompt extracting persons, locations, articles, episodes, cross-references, document type/date/summary
   - Step 3: Creates/updates all database records (Person, Location, Article, Episode) + junction tables (PersonDocument, DocumentLocation, DocumentArticle, EpisodeDocument, PersonEpisode, EpisodeLocation, EpisodeArticle, PersonArticle, CrossReference)
   - Updates Document status to "completed", ProcessingQueue to "completed"
   - Handles JSON parsing errors with graceful failure updates

4. **`/api/case/persons`** (GET)
   - Lists persons with documents, episodes, articles, defense lines, guilt assessments
   - Filters: role, isKolesnichenko
   - Full relationship data included

5. **`/api/case/episodes`** (GET)
   - Lists episodes with persons, locations, articles, documents, guilt assessments
   - Filters: severity, status
   - Full relationship data included

6. **`/api/case/search`** (POST)
   - Cross-reference search across documents, persons, episodes, articles, cross-references
   - Filters: query (text), dateFrom/To, personId, articleCode, documentId, locationId
   - searchType: documents, persons, episodes, articles, crossReferences, all
   - Full-text search in extractedText, originalName, summary, etc.

7. **`/api/case/qa`** (POST)
   - Accepts question + optional contextType/contextId (person_specific, episode_specific, article_specific, general)
   - Gathers context from DB: documents (with text fragments), persons, episodes, articles, cross-refs
   - Uses LLM with Russian legal analyst system prompt for answer
   - Creates ChatMessage record + ChatMessageDocument/ChatMessagePerson links

8. **`/api/case/defense`** (POST)
   - Finds Person marked as isKolesnichenko
   - Gathers all related data: documents mentioning Kolesnichenko, episodes, articles (charges), guilt assessments, compliance checks
   - LLM generates defense strategy analysis with: primary strategy, variant strategies, strengths/weaknesses, recommendations, procedural violations, risk assessment
   - Creates DefenseLine records for each strategy variant
   - Updates Person.defenseStrategy with overall assessment

9. **`/api/case/compliance`** (POST)
   - Accepts documentId + optional checkTypes
   - 4 check types: article_applicability, procedure_compliance, evidence_admissibility, statute_limitations
   - Builds context from document data + related entities
   - LLM performs compliance analysis against RF legal norms
   - Creates LegalCompliance records for each check result
   - Returns: overall compliance, checks with severity, critical issues, recommendations

10. **`/api/case/dashboard`** (GET)
    - Aggregated stats: totalDocuments, totalPersons, totalEpisodes, totalArticles, totalLocations, totalCrossReferences, totalChatMessages
    - Groupings: documents by status/type, persons by role, episodes by severity/status
    - Processing queue status with in-progress items
    - Kolesnichenko person info
    - Guilt assessment summary (by guiltLevel, evidenceStrength)
    - Defense lines summary (by type, strength)
    - Compliance checks summary (by status, type)
    - Recent 5 documents

## Key Decisions
- Used `z-ai-web-dev-sdk` exclusively on server side per project rules
- VLM uses `file_url` content type for PDF extraction (not base64)
- LLM prompts return structured JSON with regex fallback parsing
- All junction tables populated during document processing
- Person.isKolesnichenko auto-detected from fullName containing "колесниченко"
- CrossReferences use self-reference placeholder when target document not yet uploaded

## Testing Results
- All GET endpoints tested and return correct JSON (dashboard, documents, persons, episodes)
- ESLint passes with no errors
- Dev server compiles successfully with all routes
