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
  CaseHealthScore,
  EvidenceTimelineEvent,
  PersonRelationship,
  DefenseImprovementData,
  NotificationData,
  CrossRefNode,
  CaseBriefData,
  RiskAssessmentData,
  SentencingData,
  EvidenceChainData,
  AuditLogEntry,
  CaseTimelineEvent,
  BookmarkData,
  WitnessStatementData,
  AnalyticsData,
  CriminalCaseData,
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

// Upload documents (multi-file) for a specific case
export async function uploadDocuments(files: File[], caseId?: string): Promise<DocumentData[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  if (caseId) formData.append('caseId', caseId)

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

// Get all documents for a specific case (no mock-data fallback)
export async function getDocuments(caseId?: string): Promise<DocumentData[]> {
  const query = caseId ? `?caseId=${caseId}` : ''
  try {
    const result = await fetchApi<{documents: DocumentData[], total: number}>(`/documents${query}`)
    return result.documents ?? []
  } catch {
    return []
  }
}

// Get all persons for a specific case (no mock-data fallback)
export async function getPersons(caseId?: string): Promise<PersonData[]> {
  const query = caseId ? `?caseId=${caseId}` : ''
  try {
    const result = await fetchApi<{persons: PersonData[], total: number}>(`/persons${query}`)
    return result.persons ?? []
  } catch {
    return []
  }
}

// Get all episodes for a specific case (no mock-data fallback)
export async function getEpisodes(caseId?: string): Promise<EpisodeData[]> {
  const query = caseId ? `?caseId=${caseId}` : ''
  try {
    const result = await fetchApi<{episodes: EpisodeData[], total: number}>(`/episodes${query}`)
    return result.episodes ?? []
  } catch {
    return []
  }
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

// Get dashboard statistics for a specific case
export async function getDashboardStats(caseId?: string): Promise<DashboardStats> {
  const query = caseId ? `?caseId=${caseId}` : ''
  return fetchApi<DashboardStats>(`/dashboard${query}`)
}



// Get processing status from the doc-processor microservice
export interface ProcessingStatusItem {
  id: string
  documentId: string
  documentName: string
  queuePosition: number
  status: string
  startedAt: string | null
  completedAt: string | null
  error: string | null
  processingStatus: string
  isCurrentlyProcessing: boolean
  progressPercent: number
  progressStep: string | null
}

export interface ProcessingStatusResponse {
  caseId: string
  total: number
  completed: number
  failed: number
  processing: number
  queued: number
  progressPercent: number
  items: ProcessingStatusItem[]
}

export async function getProcessingStatus(caseId: string): Promise<ProcessingStatusResponse> {
  try {
    return await fetchApi<ProcessingStatusResponse>(`/processing-status?caseId=${encodeURIComponent(caseId)}`)
  } catch {
    // Return empty status on error
    return {
      caseId,
      total: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      queued: 0,
      progressPercent: 0,
      items: [],
    }
  }
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

// Delete a document (works for real DB documents only)
export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/documents/${id}`, {
    method: 'DELETE',
  })
}

// Get chat history
export async function getChatHistory(): Promise<ChatMessageData[]> {
  return fetchApi<ChatMessageData[]>('/qa/history')
}

// Get defense lines for a person.
// Accepts a real Prisma id or the legacy "p1" sentinel — the server resolves it.
// Returns the canonical { defenseLines: [...] } shape used across the app.
export async function getDefenseLines(personId: string): Promise<DefenseLineData[]> {
  try {
    const res = await fetchApi<{ defenseLines?: DefenseLineData[] } | DefenseLineData[]>(`/defense/${personId}`);
    // Server may return either a bare array (legacy) or a wrapped object.
    if (Array.isArray(res)) return res;
    return res.defenseLines ?? [];
  } catch {
    return [];
  }
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

// Get case health score for a specific case
export async function getCaseHealthScore(caseId?: string): Promise<CaseHealthScore> {
  const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : ''
  try {
    return await fetchApi<CaseHealthScore>(`/health-score${query}`)
  } catch {
    return {
      score: 0,
      factors: {
        documentProcessing: { value: 0, label: '', tooltip: '' },
        complianceRate: { value: 0, label: '', tooltip: '' },
        evidenceStrength: { value: 0, label: '', tooltip: '' },
        defenseCoverage: { value: 0, label: '', tooltip: '' },
      },
    }
  }
}

// Get evidence timeline for a specific case
export async function getEvidenceTimeline(caseId?: string): Promise<EvidenceTimelineEvent[]> {
  const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : ''
  try {
    return await fetchApi<EvidenceTimelineEvent[]>(`/timeline${query}`)
  } catch {
    return []
  }
}

// Get person relationships
export async function getPersonRelationships(): Promise<PersonRelationship[]> {
  try {
    return await fetchApi<PersonRelationship[]>('/relationships')
  } catch {
    return []
  }
}

// Get defense improvement suggestions
export async function getDefenseImprovements(personId?: string): Promise<DefenseImprovementData[]> {
  try {
    return await fetchApi<DefenseImprovementData[]>('/defense-improvements', {
      method: 'POST',
      body: JSON.stringify({ personId }),
    })
  } catch {
    return []
  }
}

// Get notifications
export async function getNotifications(): Promise<NotificationData[]> {
  try {
    return await fetchApi<NotificationData[]>('/notifications')
  } catch {
    return []
  }
}

// Get cross-reference graph
export async function getCrossRefGraph(): Promise<CrossRefNode[]> {
  try {
    return await fetchApi<CrossRefNode[]>('/cross-ref-graph')
  } catch {
    return []
  }
}

// Request AI analysis for defense improvements
export async function requestDefenseAnalysis(personId: string): Promise<DefenseImprovementData[]> {
  return fetchApi<DefenseImprovementData[]>('/defense-improvements', {
    method: 'POST',
    body: JSON.stringify({ personId, requestAnalysis: true }),
  })
}

// === NEW: Get Case Brief (Executive Summary) for a specific case ===
export async function getCaseBrief(caseId?: string): Promise<CaseBriefData> {
  const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : ''
  try {
    return await fetchApi<CaseBriefData>(`/brief${query}`)
  } catch {
    return {
      caseNumber: '',
      caseTitle: '',
      summary: '',
      keyDefendants: [],
      keyEpisodes: [],
      keyEvidence: [],
      keyViolations: [],
      defenseSummary: '',
      prosecutionSummary: '',
      predictedOutcome: [],
      generatedAt: '',
      aiConfidence: 0,
    }
  }
}

// === NEW: Get Risk Assessment ===
export async function getRiskAssessment(): Promise<RiskAssessmentData> {
  try {
    return await fetchApi<RiskAssessmentData>('/risk-assessment')
  } catch {
    return {
      overallRisk: 0,
      riskLevel: 'low',
      factors: {
        evidenceRisk: { score: 0, label: '', description: '' },
        proceduralRisk: { score: 0, label: '', description: '' },
        defenseRisk: { score: 0, label: '', description: '' },
        complianceRisk: { score: 0, label: '', description: '' },
        timelineRisk: { score: 0, label: '', description: '' },
      },
      matrix: [],
      mitigationStrategies: [],
    }
  }
}

// === NEW: Get Sentencing Calculator ===
export async function getSentencing(articleCode?: string): Promise<SentencingData[]> {
  try {
    return await fetchApi<SentencingData[]>('/sentencing', {
      method: 'POST',
      body: JSON.stringify({ articleCode }),
    })
  } catch {
    return []
  }
}

// === NEW: Get Evidence Chain of Custody ===
export async function getEvidenceChain(caseId?: string): Promise<EvidenceChainData[]> {
  const query = caseId ? `?caseId=${caseId}` : ''
  try {
    return await fetchApi<EvidenceChainData[]>(`/evidence-chain${query}`)
  } catch {
    return []
  }
}

// === NEW: Get Audit Log for a specific case ===
export async function getAuditLog(caseId?: string, limit: number = 50): Promise<AuditLogEntry[]> {
  const query = caseId ? `?caseId=${encodeURIComponent(caseId)}&limit=${limit}` : `?limit=${limit}`
  try {
    return await fetchApi<AuditLogEntry[]>(`/audit-log${query}`)
  } catch {
    return []
  }
}

// === NEW: Get Case Timeline (overall chronology) for a specific case ===
export async function getCaseTimeline(caseId?: string): Promise<CaseTimelineEvent[]> {
  const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : ''
  try {
    return await fetchApi<CaseTimelineEvent[]>(`/case-timeline${query}`)
  } catch {
    return []
  }
}

// === NEW: Get Bookmarks for a specific case ===
export async function getBookmarks(caseId?: string): Promise<BookmarkData[]> {
  const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : ''
  try {
    return await fetchApi<BookmarkData[]>(`/bookmarks${query}`)
  } catch {
    return []
  }
}

// === NEW: Get Witness Statements ===
export async function getWitnessStatements(): Promise<WitnessStatementData[]> {
  try {
    return await fetchApi<WitnessStatementData[]>('/witness-statements')
  } catch {
    return []
  }
}

// === NEW: Get Analytics Data ===
export async function getAnalytics(): Promise<AnalyticsData> {
  try {
    return await fetchApi<AnalyticsData>('/analytics')
  } catch {
    return {
      processingTrend: [],
      episodeMatrix: [],
      personInvolvement: [],
      articleCharges: [],
      complexity: { overallScore: 0, factors: [], rating: 'low' },
      documentTypes: [],
      insights: [],
      outcomePrediction: [],
      workloadByMonth: [],
    }
  }
}

// === Criminal Case Management ===

// Get all criminal cases
export async function getCases(): Promise<CriminalCaseData[]> {
  try {
    const result = await fetchApi<{ cases: CriminalCaseData[] }>('/cases')
    return result.cases
  } catch {
    return []
  }
}

// Create a new criminal case
export async function createCase(params: {
  caseNumber: string
  caseTitle: string
  defendantName?: string | null
  articles?: string | null
}): Promise<CriminalCaseData> {
  return fetchApi<CriminalCaseData>('/cases', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// Delete a criminal case
export async function deleteCase(caseId: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/cases/${caseId}`, {
    method: 'DELETE',
  })
}

// Update a criminal case
export async function updateCase(caseId: string, params: {
  caseNumber?: string
  caseTitle?: string
  defendantName?: string | null
  articles?: string | null
  status?: string
}): Promise<CriminalCaseData> {
  return fetchApi<CriminalCaseData>(`/cases/${caseId}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })
}
