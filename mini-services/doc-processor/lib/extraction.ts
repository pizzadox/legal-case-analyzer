import { readFile } from 'fs/promises'
import path from 'path'
import { extractTextWithVLM, extractTextFromImage } from './zai'

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
 * Extract text from a PDF file
 * Uses VLM (Vision Language Model) to extract text from PDF pages
 * Handles large files by passing the file path directly to VLM
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  console.log(`[Extraction] Extracting text from PDF: ${filePath}`)

  try {
    const prompt = `Extract all text from this document. Return the complete text content as-is, preserving the original structure and formatting. Do not summarize or modify the text. Output the text in the original language (likely Russian). If the document contains multiple pages, extract text from all pages.`
    const text = await extractTextWithVLM(filePath, prompt)

    if (text && text.trim().length > 0) {
      console.log(`[Extraction] Successfully extracted ${text.length} chars from PDF via VLM`)
      return text
    }
  } catch (error) {
    console.error('[Extraction] VLM extraction failed, trying pdf-parse fallback:', error)
  }

  // Fallback: try pdf-parse for local extraction
  try {
    const pdfParse = require('pdf-parse')
    const dataBuffer = await readFile(filePath)

    // For large files, limit the buffer size
    const maxSize = 50 * 1024 * 1024 // 50MB limit for pdf-parse
    if (dataBuffer.length > maxSize) {
      console.log('[Extraction] File too large for pdf-parse, using VLM-only approach')
      throw new Error('File exceeds pdf-parse size limit')
    }

    const data = await pdfParse(dataBuffer)
    console.log(`[Extraction] Successfully extracted ${data.text.length} chars from PDF via pdf-parse`)
    return data.text
  } catch (fallbackError) {
    console.error('[Extraction] pdf-parse fallback also failed:', fallbackError)
    throw new Error(`Failed to extract text from PDF: ${String(fallbackError)}`)
  }
}

/**
 * Extract text from an image file
 * Uses VLM to perform OCR and describe image content
 */
export async function extractTextFromImageFile(filePath: string, mimeType: string): Promise<string> {
  console.log(`[Extraction] Extracting text from image: ${filePath}`)

  try {
    // For images, we need to convert to base64
    const imageBuffer = await readFile(filePath)

    // Check file size - for very large images, we might need to limit
    if (imageBuffer.length > 20 * 1024 * 1024) { // 20MB limit for base64
      console.log('[Extraction] Image too large for base64 conversion, attempting VLM with file_url')
      // Try using file_url approach for large images
      const prompt = `Extract all text from this image. Describe what you see in the image in detail, including any text, labels, signatures, or written content. Preserve the original language (likely Russian).`
      const text = await extractTextWithVLM(filePath, prompt)
      return text
    }

    const base64Image = imageBuffer.toString('base64')
    const detectedMimeType = mimeType || getMimeTypeFromPath(filePath)

    const prompt = `Extract all text from this image. Describe what you see in the image in detail, including any text, labels, signatures, or written content. Preserve the original language (likely Russian). If this is a scanned document, extract all readable text preserving the structure.`
    const text = await extractTextFromImage(base64Image, detectedMimeType, prompt)

    console.log(`[Extraction] Successfully extracted ${text.length} chars from image via VLM`)
    return text
  } catch (error) {
    console.error('[Extraction] Image extraction failed:', error)
    throw new Error(`Failed to extract text from image: ${String(error)}`)
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
    console.error('[Extraction] Text file reading failed:', error)
    throw new Error(`Failed to read text file: ${String(error)}`)
  }
}

/**
 * Extract text from a DOCX file
 * Uses VLM to process the document (since docx parsing is complex)
 */
export async function extractTextFromDoc(filePath: string): Promise<string> {
  console.log(`[Extraction] Extracting text from DOCX: ${filePath}`)

  try {
    const prompt = `Extract all text from this document. Return the complete text content as-is, preserving the original structure and formatting. Do not summarize or modify the text. Output the text in the original language (likely Russian).`
    const text = await extractTextWithVLM(filePath, prompt)

    if (text && text.trim().length > 0) {
      console.log(`[Extraction] Successfully extracted ${text.length} chars from DOCX via VLM`)
      return text
    }
  } catch (error) {
    console.error('[Extraction] VLM extraction for DOCX failed:', error)
  }

  // Fallback: try reading as text (unlikely to work well for DOCX but worth trying)
  try {
    const content = await readFile(filePath, 'utf-8')
    // DOCX files are actually ZIP archives, so raw reading won't work well
    // But if the file happens to be a plain text doc, this might work
    if (content.length > 0 && !content.includes('\x00')) {
      return content
    }
  } catch {
    // Ignore, we already tried VLM
  }

  throw new Error('Failed to extract text from DOCX file - VLM extraction failed and no fallback available')
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
      // For unknown file types, try VLM as a last resort
      console.log(`[Extraction] Unknown file type, attempting VLM extraction`)
      try {
        const prompt = `Extract all readable text content from this file. Describe what you see in detail.`
        const text = await extractTextWithVLM(filePath, prompt)
        if (text && text.trim().length > 0) {
          return text
        }
      } catch (error) {
        console.error('[Extraction] VLM fallback for unknown type failed:', error)
      }
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
