import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: ZAI | null = null;

export async function getZAI(): Promise<ZAI> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function extractTextFromPDF(filePath: string): Promise<string> {
  const zai = await getZAI();
  
  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Extract all text from this document. Return the complete text content as-is, preserving the original structure and formatting. Do not summarize or modify the text. Output the text in the original language (likely Russian).' },
        { type: 'file_url', file_url: { url: filePath } }
      ]
    }],
    thinking: { type: 'disabled' }
  });

  const extractedText = response?.choices?.[0]?.message?.content || '';
  return extractedText;
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
