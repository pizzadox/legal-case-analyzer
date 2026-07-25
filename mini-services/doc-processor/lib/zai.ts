import { readFile } from 'fs/promises'
import { execFile } from 'child_process'

let zaiInstance: any = null

/**
 * Extract text from an image using VLM via the z-ai CLI tool
 * This is more stable than the SDK approach for large images as it runs in a subprocess
 */
export async function extractTextFromImageBase64(base64Image: string, mimeType: string, prompt: string): Promise<string> {
  // For base64 images, we need to use the SDK approach since the CLI doesn't support base64 directly
  // But we'll use the SDK only for smaller images
  try {
    const ZAI = require('z-ai-web-dev-sdk').default
    if (!zaiInstance) {
      zaiInstance = await ZAI.create()
    }

    const dataUri = `data:${mimeType};base64,${base64Image}`
    const response = await zaiInstance.chat.completions.createVision({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUri } }
        ]
      }],
      thinking: { type: 'disabled' }
    })

    return response?.choices?.[0]?.message?.content || ''
  } catch (error) {
    console.error('[VLM] SDK base64 approach failed:', error instanceof Error ? error.message : String(error))
    throw error
  }
}

/**
 * Extract text from an image file using the z-ai CLI tool
 * This runs in a subprocess and is more stable for large files
 */
export async function ocrWithCLI(filePath: string, prompt: string): Promise<string> {
  console.log(`[VLM CLI] Processing image: ${filePath}`)
  
  return new Promise((resolve, reject) => {
    const args = [
      'vision',
      '--prompt', prompt,
      '--image', filePath,
      '--output', '/tmp/vlm-result.json',
    ]
    
    const child = execFile('z-ai', args, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[VLM CLI] Error: ${error.message}`)
        reject(new Error(`z-ai vision CLI failed: ${error.message}`))
        return
      }
      
      // Try to read the output file
      readFile('/tmp/vlm-result.json', 'utf-8')
        .then(content => {
          try {
            const json = JSON.parse(content)
            const text = json?.choices?.[0]?.message?.content || json?.content || stdout || ''
            console.log(`[VLM CLI] Extracted ${text.length} chars`)
            resolve(text)
          } catch {
            // If JSON parsing fails, use stdout directly
            const text = stdout || ''
            console.log(`[VLM CLI] Extracted ${text.length} chars (from stdout)`)
            resolve(text)
          }
        })
        .catch(() => {
          // If file read fails, use stdout
          const text = stdout || ''
          console.log(`[VLM CLI] Extracted ${text.length} chars (from stdout fallback)`)
          resolve(text)
        })
    })
  })
}

/**
 * Analyze text using LLM (chat completions)
 * Uses the SDK for chat completions (smaller payload, more reliable)
 */
export async function analyzeWithLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const ZAI = require('z-ai-web-dev-sdk').default
    if (!zaiInstance) {
      zaiInstance = await ZAI.create()
    }

    const completion = await zaiInstance.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      thinking: { type: 'disabled' }
    })

    return completion?.choices?.[0]?.message?.content || ''
  } catch (error) {
    console.error('[LLM] SDK approach failed:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
