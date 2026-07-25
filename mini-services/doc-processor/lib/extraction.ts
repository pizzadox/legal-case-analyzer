import { readFile, unlink, mkdir } from 'fs/promises'
import { execFile } from 'child_process'
import path from 'path'
import { ocrWithCLI } from './zai'

// Supported file type categories
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif']
const PDF_EXTENSIONS = ['.pdf']
const TEXT_EXTENSIONS = ['.txt', '.csv', '.log', '.md']
const DOC_EXTENSIONS = ['.docx', '.doc']

/**
 * Determine file type category from file path/mimeType
 */
export function getFileCategory(filePath: string, mimeType: string): 'pdf' | 'image' | 'text' | 'doc' | 'unknown' {
  const ext = path.extname(filePath).toLowerCase()

  if (PDF_EXTENSIONS.includes(ext) || mimeType === 'application/pdf') {
    return 'pdf'
  }
  if (IMAGE_EXTENSIONS.includes(ext) || mimeType.startsWith('image/')) {
    return 'image'
  }
  if (TEXT_EXTENSIONS.includes(ext) || mimeType.startsWith('text/')) {
    return 'text'
  }
  if (DOC_EXTENSIONS.includes(ext) || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'doc'
  }
  return 'unknown'
}

/**
 * Execute a command and return stdout
 */
function execCommand(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${cmd} failed: ${error.message}\nstderr: ${stderr}`))
      } else {
        resolve(stdout)
      }
    })
  })
}

/**
 * Extract text from a PDF file using a multi-strategy approach:
 * 1. First try pdftotext (poppler) - fast and handles embedded text
 * 2. If text is insufficient (scanned PDF), convert pages to PNG and OCR each via VLM
 * 3. Fallback to pdf-parse if poppler is unavailable
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  console.log(`[Extraction] Extracting text from PDF: ${filePath}`)

  // Strategy 1: pdftotext (fast, handles text-based PDFs well)
  try {
    const text = await execCommand('pdftotext', ['-layout', '-enc', 'UTF-8', filePath, '-'])
    if (text && text.trim().length > 200) {
      console.log(`[Extraction] pdftotext extracted ${text.length} chars from PDF`)
      return text.trim()
    }
    console.log(`[Extraction] pdftotext extracted only ${text?.trim().length ?? 0} chars - likely scanned PDF, switching to OCR`)
  } catch (error) {
    console.log('[Extraction] pdftotext not available or failed:', error instanceof Error ? error.message : String(error))
  }

  // Strategy 2: Convert PDF pages to PNG images and OCR each via VLM
  try {
    const ocrText = await ocrPdfPages(filePath)
    if (ocrText && ocrText.trim().length > 0) {
      console.log(`[Extraction] OCR extracted ${ocrText.length} chars from scanned PDF`)
      return ocrText.trim()
    }
  } catch (error) {
    console.error('[Extraction] OCR of PDF pages failed:', error instanceof Error ? error.message : String(error))
  }

  // Strategy 3: Fallback to pdf-parse for local extraction
  try {
    const pdfParse = require('pdf-parse')
    const dataBuffer = await readFile(filePath)

    // For very large files, limit
    if (dataBuffer.length > 50 * 1024 * 1024) {
      throw new Error('File exceeds pdf-parse size limit')
    }

    const data = await pdfParse(dataBuffer)
    if (data.text && data.text.trim().length > 50) {
      console.log(`[Extraction] pdf-parse extracted ${data.text.length} chars from PDF`)
      return data.text.trim()
    }
  } catch (fallbackError) {
    console.error('[Extraction] pdf-parse fallback failed:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError))
  }

  throw new Error('Failed to extract text from PDF - all strategies failed')
}

/**
 * OCR PDF pages by converting them to PNG images and sending each to VLM
 * Processes pages in batches to avoid overwhelming the VLM service
 */
async function ocrPdfPages(filePath: string): Promise<string> {
  // Create a temporary directory for page images
  const tmpDir = path.join(path.dirname(filePath), '_ocr_tmp')
  await mkdir(tmpDir, { recursive: true })

  const baseName = path.basename(filePath, '.pdf').replace(/[^\w]/g, '_')

  // Convert PDF pages to PNG images using pdftoppm
  // -png: output PNG format
  // -r 150: 150 DPI resolution (good balance of quality and size)
  // -l N: last page to convert (we limit to max 50 pages)
  console.log('[Extraction] Converting PDF pages to PNG for OCR...')

  // Limit to first 10 pages for initial processing (to avoid overwhelming VLM)
  await execCommand('pdftoppm', ['-png', '-r', '100', '-l', '10', filePath, path.join(tmpDir, baseName)])

  // Find all generated PNG files
  const { readdir } = require('fs/promises')
  const files = await readdir(tmpDir)
  const pngFiles = files
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(tmpDir, f))

  if (pngFiles.length === 0) {
    throw new Error('pdftoppm produced no page images')
  }

  console.log(`[Extraction] Generated ${pngFiles.length} page images for OCR`)

  // OCR each page via VLM (one at a time to avoid overwhelming the API)
  const extractedPages: string[] = []
  const BATCH_SIZE = 1

  for (let i = 0; i < pngFiles.length; i += BATCH_SIZE) {
    const batch = pngFiles.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (pngPath, idx) => {
        const pageNum = i + idx + 1
        console.log(`[Extraction] OCR page ${pageNum}/${pngFiles.length}...`)

        try {
          // Use CLI approach for VLM (more stable, runs in subprocess)
          const extractedText = await ocrWithCLI(pngPath,
            `Extract ALL text from this scanned document page (page ${pageNum}). Preserve the original structure and formatting. Output the text in the original language (Russian). Include all visible text, headings, paragraphs, signatures, stamps, and handwritten notes. Do NOT summarize - return the exact text content.`)

          console.log(`[Extraction] Page ${pageNum}: extracted ${extractedText.length} chars`)
          return `\n--- Страница ${pageNum} ---\n${extractedText}`
        } catch (pageError) {
          console.error(`[Extraction] Page ${pageNum} OCR failed:`, pageError instanceof Error ? pageError.message : String(pageError))
          return `\n--- Страница ${pageNum} ---\n[OCR не удалось]`
        }
      })
    )
    extractedPages.push(...batchResults)
  }

  // Clean up temporary files
  try {
    for (const pngFile of pngFiles) {
      await unlink(pngFile).catch(() => {})
    }
    // Also remove any other files in tmpDir
    const remainingFiles = await readdir(tmpDir).catch(() => [])
    for (const f of remainingFiles) {
      await unlink(path.join(tmpDir, f)).catch(() => {})
    }
    await unlink(tmpDir).catch(() => {})
  } catch {
    // Ignore cleanup errors
  }

  return extractedPages.join('\n\n')
}

/**
 * Extract text from an image file using VLM OCR via base64 encoding
 */
export async function extractTextFromImageFile(filePath: string, mimeType: string): Promise<string> {
  console.log(`[Extraction] Extracting text from image: ${filePath}`)

  try {
    // Use CLI approach for VLM (more stable, runs in subprocess)
    const text = await ocrWithCLI(filePath,
      `Extract all text from this image. Describe what you see in the image in detail, including any text, labels, signatures, or written content. Preserve the original language (likely Russian). If this is a scanned document, extract all readable text preserving the structure.`)

    console.log(`[Extraction] Successfully extracted ${text.length} chars from image via VLM CLI`)
    return text
  } catch (error) {
    console.error('[Extraction] Image extraction failed:', error instanceof Error ? error.message : String(error))
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text from a text file
 * Simply reads the file content directly
 */
export async function extractTextFromTextFile(filePath: string): Promise<string> {
  console.log(`[Extraction] Reading text file: ${filePath}`)

  try {
    const content = await readFile(filePath, 'utf-8')
    console.log(`[Extraction] Successfully read ${content.length} chars from text file`)
    return content
  } catch (error) {
    console.error('[Extraction] Text file reading failed:', error instanceof Error ? error.message : String(error))
    throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text from a DOCX file
 * Uses LibreOffice or pdftotext after conversion, or VLM base64 approach
 */
export async function extractTextFromDoc(filePath: string): Promise<string> {
  console.log(`[Extraction] Extracting text from DOCX: ${filePath}`)

  // Try converting to PDF first using LibreOffice, then use pdftotext
  try {
    const tmpDir = path.join(path.dirname(filePath), '_doc_tmp')
    await mkdir(tmpDir, { recursive: true })
    
    await execCommand('libreoffice', ['--headless', '--convert-to', 'pdf', '--outdir', tmpDir, filePath])
    
    // Find the converted PDF
    const { readdir } = require('fs/promises')
    const pdfName = path.basename(filePath, path.extname(filePath)) + '.pdf'
    const pdfPath = path.join(tmpDir, pdfName)
    
    // Check if file exists
    try {
      await readFile(pdfPath)
      const text = await extractTextFromPDF(pdfPath)
      
      // Cleanup
      await unlink(pdfPath).catch(() => {})
      await unlink(tmpDir).catch(() => {})
      
      if (text && text.trim().length > 0) {
        return text
      }
    } catch {
      // Converted PDF not found
    }
  } catch {
    // LibreOffice conversion failed
  }

  throw new Error('Failed to extract text from DOCX file')
}

/**
 * Main extraction function - routes to appropriate handler based on file type
 */
export async function extractText(filePath: string, mimeType: string): Promise<string> {
  const category = getFileCategory(filePath, mimeType)

  console.log(`[Extraction] Processing file: ${filePath}, category: ${category}, mimeType: ${mimeType}`)

  switch (category) {
    case 'pdf':
      return await extractTextFromPDF(filePath)
    case 'image':
      return await extractTextFromImageFile(filePath, mimeType)
    case 'text':
      return await extractTextFromTextFile(filePath)
    case 'doc':
      return await extractTextFromDoc(filePath)
    default:
      throw new Error(`Unsupported file type: ${path.extname(filePath)} (${mimeType})`)
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return mimeMap[ext] || 'application/octet-stream'
}
