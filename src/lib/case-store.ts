import { create } from 'zustand'

// Types matching the Prisma schema and API responses
export type SectionId =
  | 'dashboard'
  | 'documents'
  | 'persons'
  | 'episodes'
  | 'search'
  | 'qa'
  | 'defense'
  | 'legal-check'
  | 'timeline'
  | 'risk'
  | 'brief'
  | 'analytics'

export interface DocumentData {
  id: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  extractedText: string | null
  summary: string | null
  documentDate: string | null
  documentType: string | null
  sourceReference: string | null
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError: string | null
  uploadedAt: string
  processedAt: string | null
}

export interface PersonData {
  id: string
  fullName: string
  shortName: string | null
  role: string | null
  status: string | null
  description: string | null
  birthDate: string | null
  occupation: string | null
  alias: string | null
  isKolesnichenko: boolean
  defenseStrategy: string | null
  guiltLevel?: string
  guiltAssessments?: GuiltAssessmentData[]
}

export interface GuiltAssessmentData {
  id: string
  personId: string
  episodeId: string | null
  guiltLevel: string
  evidenceStrength: string
  forecast: string | null
  confidence: string | null
  mitigating: string | null
  aggravating: string | null
  analysisDate: string
  notes: string | null
}

export interface EpisodeData {
  id: string
  title: string
  description: string
  date: string | null
  episodeNumber: string | null
  severity: string | null
  status: string | null
  persons: { personId: string; involvement: string | null; person: PersonData }[]
  articles: { articleId: string; article: ArticleData }[]
  locations: { locationId: string; location: LocationData; context: string | null }[]
}

export interface LocationData {
  id: string
  name: string
  address: string | null
  type: string | null
  description: string | null
  coordinates: string | null
}

export interface ArticleData {
  id: string
  code: string
  number: string
  codeType: string
  description: string
  category: string | null
  punishmentMin: string | null
  punishmentMax: string | null
  isCurrent: boolean
}

export interface DefenseLineData {
  id: string
  personId: string
  strategyType: string
  title: string
  description: string
  evidence: string | null
  strength: string | null
  probability: string | null
  articleReferences: string | null
}

export interface LegalComplianceData {
  id: string
  documentId: string
  articleId: string | null
  checkType: string
  status: string
  description: string
  recommendation: string | null
  legalBasis: string | null
  checkedAt: string
  document?: DocumentData
  article?: ArticleData
}

export interface ChatMessageData {
  id: string
  question: string
  answer: string
  contextType: string | null
  contextId: string | null
  createdAt: string
  referencedDocuments?: string[]
  referencedPersons?: string[]
  referencedArticles?: string[]
}

export interface ProcessingQueueData {
  id: string
  documentId: string
  queuePosition: number
  status: string
  startedAt: string | null
  completedAt: string | null
  error: string | null
  priority: number
  document?: DocumentData
}

// Case health score factors
export interface CaseHealthScore {
  score: number
  factors: {
    documentProcessing: { value: number; label: string; tooltip: string }
    complianceRate: { value: number; label: string; tooltip: string }
    evidenceStrength: { value: number; label: string; tooltip: string }
    defenseCoverage: { value: number; label: string; tooltip: string }
  }
}

// Evidence timeline event
export interface EvidenceTimelineEvent {
  id: string
  date: string
  eventType: 'document_upload' | 'analysis_complete' | 'compliance_check' | 'defense_update' | 'episode_found'
  description: string
  relatedEntityId?: string
  relatedEntityName?: string
}

// Person relationship
export interface PersonRelationship {
  id: string
  sourcePersonId: string
  targetPersonId: string
  relationshipType: string
  description: string
  sourcePersonName: string
  targetPersonName: string
}

// Defense improvement suggestion
export interface DefenseImprovementData {
  id: string
  defenseLineId: string
  suggestion: string
  expectedImpact: string
  probabilityChange: string
  difficulty: 'easy' | 'moderate' | 'hard'
  category: string
}

// Notification
export interface NotificationData {
  id: string
  type: 'processing' | 'compliance' | 'defense' | 'evidence' | 'system'
  title: string
  description: string
  timestamp: string
  isRead: boolean
  relatedSection?: SectionId
  relatedEntityId?: string
}

// Cross-reference graph node
export interface CrossRefNode {
  documentId: string
  documentName: string
  documentType: string | null
  linkedDocuments: { id: string; name: string; type: string | null; refType: string | null }[]
}

// === NEW: Case Brief / Executive Summary ===
export interface CaseBriefData {
  caseNumber: string
  caseTitle: string
  summary: string
  keyDefendants: { name: string; role: string; articles: string[]; guiltLevel: string }[]
  keyEpisodes: { title: string; date: string; severity: string; status: string }[]
  keyEvidence: { description: string; source: string; strength: 'strong' | 'moderate' | 'weak' }[]
  keyViolations: { description: string; legalBasis: string; severity: 'critical' | 'major' | 'minor' }[]
  defenseSummary: string
  prosecutionSummary: string
  predictedOutcome: {
    scenario: string
    probability: number
    description: string
  }[]
  generatedAt: string
  aiConfidence: number
}

// === NEW: Risk Assessment Matrix ===
export interface RiskAssessmentData {
  overallRisk: number // 0-100
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  factors: {
    evidenceRisk: { score: number; label: string; description: string }
    proceduralRisk: { score: number; label: string; description: string }
    defenseRisk: { score: number; label: string; description: string }
    complianceRisk: { score: number; label: string; description: string }
    timelineRisk: { score: number; label: string; description: string }
  }
  matrix: {
    likelihood: number // 0-100
    impact: number // 0-100
    category: string
  }[]
  mitigationStrategies: { strategy: string; riskReduction: number; priority: 'high' | 'medium' | 'low' }[]
}

// === NEW: Sentencing Calculator ===
export interface SentencingData {
  articleCode: string
  description: string
  punishmentMin: number // years
  punishmentMax: number // years
  baseSentence: number // years (midpoint)
  mitigatingFactors: { factor: string; reduction: number; applies: boolean }[]
  aggravatingFactors: { factor: string; increase: number; applies: boolean }[]
  estimatedSentence: number // years
  estimatedFine: number // RUB
  additionalSanctions: string[]
  precedentCases: { caseNumber: string; sentence: number; description: string }[]
}

// === NEW: Evidence Chain of Custody ===
export interface EvidenceChainData {
  evidenceId: string
  evidenceName: string
  evidenceType: string
  collectedAt: string
  collectedBy: string
  location: string
  chainSteps: {
    id: string
    timestamp: string
    action: string
    actor: string
    notes: string
    status: 'intact' | 'transferred' | 'analyzed' | 'questioned'
  }[]
  integrityScore: number // 0-100
  admissibility: 'admissible' | 'questionable' | 'inadmissible'
  challenges: { description: string; severity: 'low' | 'medium' | 'high' }[]
}

// === NEW: Audit Log Entry ===
export interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  category: 'upload' | 'analysis' | 'edit' | 'delete' | 'search' | 'export' | 'login' | 'system'
  actor: string
  details: string
  entityId?: string
  entityType?: string
  severity: 'info' | 'warning' | 'critical'
}

// === NEW: Case Timeline Event (overall chronology) ===
export interface CaseTimelineEvent {
  id: string
  date: string
  endDate?: string
  title: string
  description: string
  category: 'crime' | 'investigation' | 'legal' | 'defense' | 'evidence' | 'hearing'
  importance: 'critical' | 'high' | 'medium' | 'low'
  relatedPersons?: string[]
  relatedDocuments?: string[]
  relatedEpisodes?: string[]
  status: 'completed' | 'ongoing' | 'planned' | 'cancelled'
}

// === NEW: Bookmark / Favorite ===
export interface BookmarkData {
  id: string
  entityType: 'document' | 'person' | 'episode' | 'article' | 'search'
  entityId: string
  entityName: string
  note: string
  color: 'red' | 'amber' | 'emerald' | 'stone'
  createdAt: string
}

// === NEW: Witness Statement Tracker ===
export interface WitnessStatementData {
  id: string
  witnessId: string
  witnessName: string
  statementDate: string
  statementType: 'initial' | 'follow-up' | 'clarification' | 'contradiction'
  summary: string
  keyPoints: string[]
  contradictions: { withStatementId: string; description: string }[]
  reliability: 'high' | 'moderate' | 'low'
  verifiedBy: string[]
}

// === NEW: Analytics Data ===
export interface AnalyticsData {
  // Processing trends over time
  processingTrend: { date: string; processed: number; pending: number; failed: number }[]
  // Episode severity vs. status matrix
  episodeMatrix: { severity: string; proven: number; investigating: number; doubtful: number; total: number }[]
  // Person involvement distribution (radial)
  personInvolvement: { name: string; episodes: number; documents: number; relationships: number }[]
  // Article charge distribution
  articleCharges: { code: string; description: string; count: number; severity: string }[]
  // Case complexity metrics
  complexity: {
    overallScore: number // 0-100
    factors: { name: string; score: number; benchmark: number }[]
    rating: 'low' | 'moderate' | 'high' | 'extreme'
  }
  // Document type distribution
  documentTypes: { type: string; count: number; percentage: number }[]
  // AI-generated insights
  insights: {
    type: 'positive' | 'warning' | 'critical' | 'info'
    title: string
    description: string
    confidence: number
  }[]
  // Predicted case outcome probabilities
  outcomePrediction: { scenario: string; probability: number; rationale: string }[]
  // Workload by month (for resource planning)
  workloadByMonth: { month: string; documents: number; actions: number; hearings: number }[]
}

// Structured search results matching the API response
export interface SearchResultData {
  documents: DocumentData[]
  persons: PersonData[]
  episodes: EpisodeData[]
  crossReferences: {
    id: string
    referenceText: string
    referenceType: string | null
    sourceDocument: DocumentData
    targetDocument: DocumentData
  }[]
}

// DashboardStats matching the actual API response at /api/case/dashboard
export interface DashboardStats {
  summary: {
    totalDocuments: number
    totalPersons: number
    totalEpisodes: number
    totalArticles: number
    totalLocations: number
    totalCrossReferences: number
    totalChatMessages: number
    totalComplianceChecks: number
    totalDefenseLines: number
    totalGuiltAssessments: number
  }
  documents: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    recent: DocumentData[]
  }
  persons: {
    total: number
    byRole: Record<string, number>
    kolesnichenko: {
      id: string
      fullName: string
      role: string | null
      status: string | null
      defenseStrategy: string | null
    } | null
  }
  episodes: {
    total: number
    bySeverity: Record<string, number>
    byStatus: Record<string, number>
  }
  processingQueue: {
    byStatus: Record<string, number>
    inProgress: Array<{
      id: string
      documentId: string
      originalName: string
      queuePosition: number
      startedAt: string | null
    }>
  }
  guiltAssessments: {
    total: number
    byGuiltLevel: Record<string, number>
    byEvidenceStrength: Record<string, number>
    details: Array<{
      id: string
      personFullName: string
      personRole: string | null
      isKolesnichenko: boolean
      episodeTitle: string | null
      guiltLevel: string
      evidenceStrength: string
      forecast: string | null
      confidence: string | null
    }>
  }
  defenseLines: {
    total: number
    byType: Record<string, number>
    byStrength: Record<string, number>
    details: Array<{
      id: string
      strategyType: string
      title: string
      description: string
      strength: string | null
      probability: string | null
    }>
  }
  complianceChecks: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    details: Array<{
      id: string
      documentOriginalName: string
      checkType: string
      status: string
      description: string
      recommendation: string | null
      articleCode: string | null
    }>
  }
}

interface CaseStoreState {
  activeSection: SectionId
  documents: DocumentData[]
  persons: PersonData[]
  episodes: EpisodeData[]
  searchResults: SearchResultData | null
  chatMessages: ChatMessageData[]
  defenseLines: DefenseLineData[]
  complianceResults: LegalComplianceData[]
  dashboardStats: DashboardStats | null
  processingQueue: ProcessingQueueData[]
  isLoadingDocuments: boolean
  isLoadingPersons: boolean
  isLoadingEpisodes: boolean
  isLoadingSearch: boolean
  isLoadingChat: boolean
  isLoadingDefense: boolean
  isLoadingCompliance: boolean
  isLoadingDashboard: boolean
  isUploadingDocuments: boolean
  searchQuery: string
  searchFilterType: 'all' | 'documents' | 'persons' | 'episodes' | 'articles' | 'cross-references'
  searchDateFrom: string | null
  searchDateTo: string | null
  currentQuestion: string
  sidebarCollapsed: boolean
}

interface CaseStoreActions {
  setActiveSection: (section: SectionId) => void
  setDocuments: (documents: DocumentData[]) => void
  setPersons: (persons: PersonData[]) => void
  setEpisodes: (episodes: EpisodeData[]) => void
  setSearchResults: (results: SearchResultData | null) => void
  addChatMessage: (message: ChatMessageData) => void
  setChatMessages: (messages: ChatMessageData[]) => void
  setDefenseLines: (lines: DefenseLineData[]) => void
  setComplianceResults: (results: LegalComplianceData[]) => void
  setDashboardStats: (stats: DashboardStats) => void
  setProcessingQueue: (queue: ProcessingQueueData[]) => void
  setLoadingDocuments: (loading: boolean) => void
  setLoadingPersons: (loading: boolean) => void
  setLoadingEpisodes: (loading: boolean) => void
  setLoadingSearch: (loading: boolean) => void
  setLoadingChat: (loading: boolean) => void
  setLoadingDefense: (loading: boolean) => void
  setLoadingCompliance: (loading: boolean) => void
  setLoadingDashboard: (loading: boolean) => void
  setUploadingDocuments: (uploading: boolean) => void
  setSearchQuery: (query: string) => void
  setSearchFilterType: (type: CaseStoreState['searchFilterType']) => void
  setSearchDateFrom: (date: string | null) => void
  setSearchDateTo: (date: string | null) => void
  setCurrentQuestion: (question: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
}

export const useCaseStore = create<CaseStoreState & CaseStoreActions>((set) => ({
  activeSection: 'dashboard',
  documents: [],
  persons: [],
  episodes: [],
  searchResults: null,
  chatMessages: [],
  defenseLines: [],
  complianceResults: [],
  dashboardStats: null,
  processingQueue: [],
  isLoadingDocuments: false,
  isLoadingPersons: false,
  isLoadingEpisodes: false,
  isLoadingSearch: false,
  isLoadingChat: false,
  isLoadingDefense: false,
  isLoadingCompliance: false,
  isLoadingDashboard: false,
  isUploadingDocuments: false,
  searchQuery: '',
  searchFilterType: 'all',
  searchDateFrom: null,
  searchDateTo: null,
  currentQuestion: '',
  sidebarCollapsed: false,
  setActiveSection: (section) => set({ activeSection: section }),
  setDocuments: (documents) => set({ documents }),
  setPersons: (persons) => set({ persons }),
  setEpisodes: (episodes) => set({ episodes }),
  setSearchResults: (results) => set({ searchResults: results }),
  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  setDefenseLines: (lines) => set({ defenseLines: lines }),
  setComplianceResults: (results) => set({ complianceResults: results }),
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  setProcessingQueue: (queue) => set({ processingQueue: queue }),
  setLoadingDocuments: (loading) => set({ isLoadingDocuments: loading }),
  setLoadingPersons: (loading) => set({ isLoadingPersons: loading }),
  setLoadingEpisodes: (loading) => set({ isLoadingEpisodes: loading }),
  setLoadingSearch: (loading) => set({ isLoadingSearch: loading }),
  setLoadingChat: (loading) => set({ isLoadingChat: loading }),
  setLoadingDefense: (loading) => set({ isLoadingDefense: loading }),
  setLoadingCompliance: (loading) => set({ isLoadingCompliance: loading }),
  setLoadingDashboard: (loading) => set({ isLoadingDashboard: loading }),
  setUploadingDocuments: (uploading) => set({ isUploadingDocuments: uploading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchFilterType: (type) => set({ searchFilterType: type }),
  setSearchDateFrom: (date) => set({ searchDateFrom: date }),
  setSearchDateTo: (date) => set({ searchDateTo: date }),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
