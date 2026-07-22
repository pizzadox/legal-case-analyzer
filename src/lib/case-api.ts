import {
  DocumentData,
  PersonData,
  EpisodeData,
  SearchResultData,
  ChatMessageData,
  DefenseLineData,
  LegalComplianceData,
  DashboardStats,
  ProcessingQueueData,
} from './case-store'

const API_BASE = '/api/case'

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isGet = !options?.method || options?.method === 'GET'
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
      ...(isGet ? {} : { 'Content-Type': 'application/json' }),
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Ошибка сети' }))
    throw new Error(error.message || `Ошибка: ${response.status}`)
  }

  return response.json()
}

// Upload documents (multi-file)
export async function uploadDocuments(files: File[]): Promise<DocumentData[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Ошибка загрузки' }))
    throw new Error(error.message || 'Ошибка загрузки документов')
  }

  return response.json()
}

// Get all documents
export async function getDocuments(): Promise<DocumentData[]> {
  const result = await fetchApi<{documents: DocumentData[], total: number}>('/documents')
  return result.documents ?? []
}

// Get all persons
export async function getPersons(): Promise<PersonData[]> {
  const result = await fetchApi<{persons: PersonData[], total: number}>('/persons')
  return result.persons ?? []
}

// Get all episodes
export async function getEpisodes(): Promise<EpisodeData[]> {
  const result = await fetchApi<{episodes: EpisodeData[], total: number}>('/episodes')
  return result.episodes ?? []
}

// Search across case data
export async function search(params: {
  query: string
  filterType: string
  dateFrom?: string | null
  dateTo?: string | null
}): Promise<SearchResultData> {
  return fetchApi<SearchResultData>('/search', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// Ask a question to AI
export async function askQuestion(params: {
  question: string
  contextType?: string | null
  contextId?: string | null
}): Promise<ChatMessageData> {
  return fetchApi<ChatMessageData>('/qa', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// Analyze defense for Kolesnichenko
export async function analyzeDefense(personId: string): Promise<DefenseLineData[]> {
  return fetchApi<DefenseLineData[]>('/defense', {
    method: 'POST',
    body: JSON.stringify({ personId }),
  })
}

// Check legal compliance
export async function checkCompliance(documentId?: string, articleId?: string): Promise<LegalComplianceData[]> {
  return fetchApi<LegalComplianceData[]>('/compliance', {
    method: 'POST',
    body: JSON.stringify({ documentId, articleId }),
  })
}

// Get dashboard statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchApi<DashboardStats>('/dashboard')
}

// Get processing queue
export async function getProcessingQueue(): Promise<ProcessingQueueData[]> {
  return fetchApi<ProcessingQueueData[]>('/queue')
}

// Get a single document detail
export async function getDocument(id: string): Promise<DocumentData> {
  return fetchApi<DocumentData>(`/documents/${id}`)
}

// Re-process a document
export async function reprocessDocument(id: string): Promise<DocumentData> {
  return fetchApi<DocumentData>(`/documents/${id}/reprocess`, {
    method: 'POST',
  })
}

// Delete a document
export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/documents/${id}`, {
    method: 'DELETE',
  })
}

// Get chat history
export async function getChatHistory(): Promise<ChatMessageData[]> {
  return fetchApi<ChatMessageData[]>('/qa/history')
}

// Get defense lines for a person
export async function getDefenseLines(personId: string): Promise<DefenseLineData[]> {
  return fetchApi<DefenseLineData[]>(`/defense/${personId}`)
}

// Get compliance results
export async function getComplianceResults(): Promise<LegalComplianceData[]> {
  // GET compliance results from dashboard stats or a dedicated endpoint
  try {
    const stats = await fetchApi<DashboardStats>('/dashboard')
    return stats.complianceChecks?.details ?? []
  } catch { return [] }
}

// Get cross references
export async function getCrossReferences(documentId?: string): Promise<SearchResultData> {
  return fetchApi<SearchResultData>('/cross-references', {
    method: 'POST',
    body: JSON.stringify({ documentId }),
  })
}

// Process a single document with AI (trigger analysis)
export async function processDocument(documentId: string): Promise<DocumentData> {
  return fetchApi<DocumentData>('/process', {
    method: 'POST',
    body: JSON.stringify({ documentId }),
  })
}

// Process multiple documents with AI (bulk analysis)
export async function processDocuments(documentIds: string[]): Promise<DocumentData[]> {
  return fetchApi<DocumentData[]>('/process', {
    method: 'POST',
    body: JSON.stringify({ documentIds }),
  })
}

// Get search with advanced filters
export async function advancedSearch(params: {
  query: string
  filterType: string
  dateFrom?: string | null
  dateTo?: string | null
  person?: string | null
  article?: string | null
  location?: string | null
  documentType?: string | null
  crossReferenceMode?: boolean
}): Promise<SearchResultData> {
  return fetchApi<SearchResultData>('/search', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
