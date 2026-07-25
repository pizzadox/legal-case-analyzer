# Task 2-a: Fix Document Upload, Export Buttons, and File Format Support

## Agent: fullstack-developer

## Work Summary

### Task 1: Fix uploaded file not appearing in list after upload
- Added `useQueryClient` from `@tanstack/react-query` to `CaseDocuments` component
- Replaced `refetch()` with `await queryClient.invalidateQueries({ queryKey: ['documents', caseId] })` in `handleUpload`
- Added file input value reset (`fileRef.current.value = ''`) after upload so same file can be re-uploaded

### Task 2: Increase upload limit to 500MB and support more file formats
- Added `export const config` with `bodyParser.sizeLimit: '500mb'` in upload route
- Added `SUPPORTED_MIME_TYPES` mapping for 17 formats in upload API
- Added file type validation (MIME check → extension fallback)
- Changed file input `accept` attribute to support all formats
- Updated UI text: "Перетащите PDF-файлы сюда" → "Перетащите файлы сюда"
- Added supported formats hint text in upload area

### Task 3: Fix Export CSV and Export PDF buttons
- Rewrote `exportDocumentsCSV`: Russian headers, semicolon-separated, BOM prefix, dynamic filename
- Implemented `exportDocumentsPDF`: generates printable HTML, opens new window, auto-print
- Changed button labels to Russian: "Экспорт CSV", "Экспорт PDF"

## Files Modified
- `/home/z/my-project/src/components/case-documents.tsx`
- `/home/z/my-project/src/app/api/case/upload/route.ts`
- `/home/z/my-project/worklog.md`

## Verification
- Lint passes cleanly (0 errors)
- Dev server running without errors
