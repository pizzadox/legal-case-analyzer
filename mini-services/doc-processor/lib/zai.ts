import ZAI from 'z-ai-web-dev-sdk'

let zaiInstance: ZAI | null = null

export async function getZAI(): Promise<ZAI> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

/**
 * Extract text from a PDF or image file using VLM (Vision Language Model)
 * Uses the createVision API with file_url for PDFs and image_url for images
 */
export async function extractTextWithVLM(filePath: string, prompt: string): Promise<string> {
  const zai = await getZAI()

  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'file_url', file_url: { url: filePath } }
      ]
    }],
    thinking: { type: 'disabled' }
  })

  return response?.choices?.[0]?.message?.content || ''
}

/**
 * Extract text from an image using VLM with image_url
 * Supports base64 encoded images for local files
 */
export async function extractTextFromImage(base64Image: string, mimeType: string, prompt: string): Promise<string> {
  const zai = await getZAI()

  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
      ]
    }],
    thinking: { type: 'disabled' }
  })

  return response?.choices?.[0]?.message?.content || ''
}

/**
 * Analyze text using LLM (chat completions)
 * Returns structured JSON data about a criminal case document
 */
export async function analyzeWithLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const zai = await getZAI()

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    thinking: { type: 'disabled' }
  })

  return completion?.choices?.[0]?.message?.content || ''
}
