import ZAI from 'z-ai-web-dev-sdk';
import { readFile } from 'fs/promises';
import path from 'path';

let zaiInstance: ZAI | null = null;

export async function getZAI(): Promise<ZAI> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// MIME type map based on file extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.rtf': 'application/rtf',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.webp': 'image/webp',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

// Determine if a file is an image based on extension
function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'].includes(ext);
}

// Extract text from a document file (PDF, DOCX, images, etc.) using VLM
// Uses base64 data URLs to avoid "URL格式无效" errors from local file paths
export async function extractTextFromDocument(filePath: string): Promise<string> {
  const zai = await getZAI();

  // Read file as binary and convert to base64
  const fileBuffer = await readFile(filePath);
  const base64Data = fileBuffer.toString('base64');
  const mimeType = getMimeType(filePath);

  // Construct data URL
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  // Use appropriate content type based on file type
  const fileContent: any = isImageFile(filePath)
    ? { type: 'image_url', image_url: { url: dataUrl } }
    : { type: 'file_url', file_url: { url: dataUrl } };

  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Extract all text from this document. Return the complete text content as-is, preserving the original structure and formatting. Do not summarize or modify the text. Output the text in the original language (likely Russian). If the document contains no text (e.g. a scanned image), describe its content in detail.' },
        fileContent,
      ]
    }],
    thinking: { type: 'disabled' }
  });

  const extractedText = response?.choices?.[0]?.message?.content || '';
  return extractedText;
}

// Legacy alias for backward compatibility
export async function extractTextFromPDF(filePath: string): Promise<string> {
  return extractTextFromDocument(filePath);
}

export async function analyzeWithLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const zai = await getZAI();

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    thinking: { type: 'disabled' }
  });

  return completion?.choices?.[0]?.message?.content || '';
}
