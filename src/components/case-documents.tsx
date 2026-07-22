'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { toast as shadcnToast } from '@/hooks/use-toast'
import {
  FileText, Upload, RefreshCw, Eye, CheckCircle, Clock, AlertTriangle, Loader2, Zap, XCircle, Trash2, Scale, BookOpen, Gavel, GitCompare, Download, Link2, ShieldCheck, ShieldAlert, ShieldX, BrainCircuit, Globe, TrendingDown, FileSearch, MessageSquare, Plus, Calendar, User
} from 'lucide-react'
import { mockDocuments, mockEvidenceChain } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { DocumentData, EvidenceChainData } from '@/lib/case-store'

interface Annotation {
  id: string
  text: string
  author: string
  timestamp: string
}

// Pre-populated mock annotations for the first document (doc1)
const mockAnnotationsForDoc1: Annotation[] = [
  { id: 'an1', text: 'Обратить внимание на страницу 15 — противоречие в показаниях', author: 'Адвокат Петров А.В.', timestamp: '2024-05-22T10:00:00Z' },
  { id: 'an2', text: 'Сверить даты с протоколом обыска', author: 'Адвокат Петров А.В.', timestamp: '2024-05-22T10:15:00Z' },
]

// Format ISO timestamp in Russian style: dd.MM.yyyy HH:mm
function formatRussianDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`
  } catch {
    return iso
  }
}

// localStorage helpers for per-document annotations
const ANNOTATIONS_PREFIX = 'case-doc-annotations-'

function loadAllAnnotations(): Record<string, Annotation[]> {
  if (typeof window === 'undefined') return {}
  const loaded: Record<string, Annotation[]> = {}
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith(ANNOTATIONS_PREFIX)) {
        const docId = key.replace(ANNOTATIONS_PREFIX, '')
        const stored = window.localStorage.getItem(key)
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed)) loaded[docId] = parsed
          } catch {
            /* ignore malformed entries */
          }
        }
      }
    }
  } catch {
    /* localStorage unavailable */
  }
  return loaded
}

function saveAnnotationsForDoc(docId: string, anns: Annotation[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${ANNOTATIONS_PREFIX}${docId}`, JSON.stringify(anns))
  } catch {
    /* ignore quota errors */
  }
}

function fmtSize(b: number) {
  if (b < 1024) return b + ' Б'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' КБ'
  return (b / 1048576).toFixed(1) + ' МБ'
}

const STATUS: Record<string, { icon: React.ReactNode; badge: string; label: string }> = {
  completed: { icon: <CheckCircle className="w-3 h-3 text-emerald-600" />, badge: 'bg-emerald-700 text-white', label: 'Обработан' },
  processing: { icon: <Clock className="w-3 h-3 text-amber-500 animate-spin" />, badge: 'bg-amber-600 text-white', label: 'В обработке' },
  pending: { icon: <Clock className="w-3 h-3 text-stone-400" />, badge: 'bg-stone-500 text-white', label: 'Ожидает' },
  failed: { icon: <XCircle className="w-3 h-3 text-red-600" />, badge: 'bg-red-700 text-white', label: 'Ошибка' },
}

// Document type icons for legal document style
const TYPE_ICON: Record<string, React.ReactNode> = {
  обвинение: <Gavel className="w-4 h-4 text-red-700" />,
  показание: <Eye className="w-4 h-4 text-orange-600" />,
  протокол: <FileText className="w-4 h-4 text-amber-600" />,
  экспертиза: <Scale className="w-4 h-4 text-stone-600" />,
}

const TYPE_BADGE: Record<string, string> = {
  обвинение: 'bg-red-700 text-white',
  показание: 'bg-orange-600 text-white',
  протокол: 'bg-amber-600 text-white',
  экспертиза: 'bg-stone-600 text-white',
}

const QUICK_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'обвинение', label: 'Обвинение' },
  { value: 'показание', label: 'Показание' },
  { value: 'протокол', label: 'Протокол' },
  { value: 'экспертиза', label: 'Экспертиза' },
] as const

const ADMISS_CONFIG: Record<string, { icon: React.ReactNode; badge: string; label: string }> = {
  admissible: { icon: <ShieldCheck className="w-3 h-3 text-emerald-700" />, badge: 'bg-emerald-700 text-white', label: 'Допустимо' },
  questionable: { icon: <ShieldAlert className="w-3 h-3 text-amber-600" />, badge: 'bg-amber-600 text-white', label: 'Сомнительно' },
  inadmissible: { icon: <ShieldX className="w-3 h-3 text-red-700" />, badge: 'bg-red-700 text-white', label: 'Недопустимо' },
}

const CHALLENGE_SEV: Record<string, string> = { low: 'bg-stone-500 text-white', medium: 'bg-amber-600 text-white', high: 'bg-red-700 text-white' }

// Integrity score ring (small SVG)
function IntegrityRing({ score }: { score: number }) {
  const radius = 18, circ = 2 * Math.PI * radius, offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg width="48" height="48" className="transform -rotate-90"><circle cx="24" cy="24" r={radius} stroke="#e5e7eb" strokeWidth="4" fill="none" className="dark:stroke-stone-700" /><circle cx="24" cy="24" r={radius} stroke={color} strokeWidth="4" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" /></svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{score}</div>
    </div>
  )
}

// Evidence Chain Section
function EvidenceChainSection({ items }: { items: EvidenceChainData[] }) {
  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-stone-500">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-amber-600" /> Цепочка сохранности доказательств <Badge variant="outline" className="text-xs">{items.length} объектов</Badge></CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin">
        {items.map(ev => {
          const adm = ADMISS_CONFIG[ev.admissibility] ?? ADMISS_CONFIG.questionable
          return (
            <div key={ev.evidenceId} className="border rounded-xl p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <IntegrityRing score={ev.integrityScore} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{ev.evidenceName}</p>
                    <Badge variant="outline" className="text-xs">{ev.evidenceType}</Badge>
                    <Badge className={adm.badge}>{adm.icon}{adm.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Изъят: {new Date(ev.collectedAt).toLocaleDateString('ru-RU')} • {ev.collectedBy}</p>
                  <p className="text-xs text-muted-foreground">{ev.location}</p>
                </div>
              </div>
              {/* Chain steps as vertical mini-timeline */}
              <div className="mt-2 relative pl-4 space-y-1.5">
                {ev.chainSteps.map((step, i) => (
                  <div key={step.id} className="relative">
                    <div className={`absolute -left-4 top-1 w-2 h-2 rounded-full ${step.status === 'intact' ? 'bg-emerald-500' : step.status === 'transferred' ? 'bg-amber-500' : step.status === 'analyzed' ? 'bg-blue-500' : 'bg-red-500'}`} />
                    {i < ev.chainSteps.length - 1 && <div className="absolute -left-[13px] top-2 w-0.5 h-3 bg-stone-300 dark:bg-stone-600" />}
                    <p className="text-xs"><span className="font-medium">{step.action}</span> — {step.actor} <span className="text-muted-foreground">({new Date(step.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })})</span></p>
                  </div>
                ))}
              </div>
              {/* Challenges */}
              {ev.challenges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ev.challenges.map((c, i) => (
                    <Badge key={i} className={`${CHALLENGE_SEV[c.severity]} text-xs`}><AlertTriangle className="w-2 h-2 mr-1" />{c.description}</Badge>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// Export CSV helper
function exportDocumentsCSV(docs: DocumentData[]) {
  const rows = ['Name,Type,Date,Status,Size,Summary']
  docs.forEach(d => {
    rows.push(`"${d.originalName}",${d.documentType ?? ''},${d.documentDate ?? ''},${d.processingStatus},${fmtSize(d.fileSize)},${d.summary ?? ''}`)
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'documents.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV экспорт выполнен')
}

// Document comparison dialog
function DocumentCompareDialog({ doc1, doc2, onClose }: { doc1: DocumentData; doc2: DocumentData; onClose: () => void }) {
  const fields = [
    { label: 'Название', key1: doc1.originalName, key2: doc2.originalName },
    { label: 'Тип', key1: doc1.documentType ?? '—', key2: doc2.documentType ?? '—' },
    { label: 'Дата документа', key1: doc1.documentDate ?? '—', key2: doc2.documentDate ?? '—' },
    { label: 'Статус', key1: doc1.processingStatus, key2: doc2.processingStatus },
    { label: 'Размер', key1: fmtSize(doc1.fileSize), key2: fmtSize(doc2.fileSize) },
    { label: 'Источник', key1: doc1.sourceReference ?? '—', key2: doc2.sourceReference ?? '—' },
  ]
  const renderSide = (doc: DocumentData, label: string, getValue: (f: typeof fields[number]) => string) => (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-muted"><p className="font-medium text-xs mb-1">{label}</p>{doc.documentType && <Badge className={TYPE_BADGE[doc.documentType] ?? 'bg-stone-500 text-white'}>{doc.documentType}</Badge>}</div>
      {fields.map(f => (
        <div key={f.label} className={`p-2 rounded-lg ${f.key1 !== f.key2 ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700' : 'bg-muted/50'}`}>
          <p className="text-xs font-medium text-muted-foreground">{f.label}</p><p className="text-xs font-semibold">{getValue(f)}</p>
        </div>
      ))}
      {doc.summary && <div className="p-2 rounded-lg bg-muted"><p className="text-xs font-medium text-muted-foreground">Краткое содержание</p><p className="text-xs">{doc.summary}</p></div>}
    </div>
  )
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl">
        <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><GitCompare className="w-4 h-4" /> Сравнение документов</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {renderSide(doc1, 'Документ A', f => f.key1)}
          {renderSide(doc2, 'Документ B', f => f.key2)}
        </div>
        <Separator className="mt-3" />
        <p className="text-xs text-muted-foreground">Отличия выделены красным фоном</p>
      </DialogContent>
    </Dialog>
  )
}

export function CaseDocuments() {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareDocs, setCompareDocs] = useState<[DocumentData, DocumentData] | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [quickFilter, setQuickFilter] = useState<string>('all')
  // Annotations state: keyed by document id. Pre-seeded with mock data for the
  // first document once documents have loaded; persisted to localStorage per doc.
  const [annotations, setAnnotations] = useState<Record<string, Annotation[]>>({})
  const [newAnnotation, setNewAnnotation] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: caseApi.getDocuments,
    retry: 1,
  })
  const { data: evidenceChainData } = useQuery({ queryKey: ['evidence-chain'], queryFn: caseApi.getEvidenceChain, retry: 1 })
  const documents = data ?? mockDocuments
  const evidenceChain = evidenceChainData ?? mockEvidenceChain
  const filteredDocs = quickFilter === 'all' ? documents : documents.filter(d => d.documentType === quickFilter)

  // Load persisted annotations from localStorage on mount.
  // (setState here is intentional: hydrating client state from an external store.
  //  Cascading renders are bounded — one extra render then quiescent.)
  useEffect(() => {
    const loaded = loadAllAnnotations()
    if (Object.keys(loaded).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnnotations(prev => ({ ...prev, ...loaded }))
    }
  }, [])

  // Seed mock annotations for the first document once documents have loaded,
  // but only if there is no persisted entry for that document already.
  useEffect(() => {
    if (documents.length === 0) return
    const firstDoc = documents[0]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnnotations(prev => {
      if (prev[firstDoc.id]) return prev
      return { ...prev, [firstDoc.id]: mockAnnotationsForDoc1 }
    })
  }, [documents])

  // Persist per-document annotations to localStorage whenever they change
  useEffect(() => {
    for (const [docId, anns] of Object.entries(annotations)) {
      saveAnnotationsForDoc(docId, anns)
    }
  }, [annotations])

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setIsUploading(true)
    try {
      await caseApi.uploadDocuments(Array.from(files))
      toast.success(`Загружено ${files.length} документ(ов)`)
      refetch()
    } catch { toast.error('Ошибка загрузки') }
    setIsUploading(false)
  }

  const handleAnalyze = async (docId: string) => {
    setAnalyzingId(docId)
    try {
      await caseApi.processDocument(docId)
      toast.success('Анализ запущен')
      refetch()
    } catch { toast.error('Ошибка анализа') }
    setAnalyzingId(null)
  }

  const handleDelete = async (docId: string) => {
    try {
      await caseApi.deleteDocument(docId)
      toast.success('Документ удалён')
      refetch()
    } catch { toast.error('Ошибка удаления') }
  }

  const handleCompareSelect = (docId: string) => {
    if (selectedForCompare.includes(docId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== docId))
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, docId])
    }
  }

  const handleCompare = () => {
    if (selectedForCompare.length === 2) {
      const d1 = documents.find(d => d.id === selectedForCompare[0])
      const d2 = documents.find(d => d.id === selectedForCompare[1])
      if (d1 && d2) {
        setCompareDocs([d1, d2])
        setCompareMode(false)
        setSelectedForCompare([])
      }
    } else {
      toast.error('Выберите 2 документа для сравнения')
    }
  }

  const handleAddAnnotation = (docId: string) => {
    const text = newAnnotation.trim()
    if (!text) return
    const ann: Annotation = {
      id: `an-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      author: 'Адвокат Петров А.В.',
      timestamp: new Date().toISOString(),
    }
    setAnnotations(prev => ({
      ...prev,
      [docId]: [...(prev[docId] ?? []), ann],
    }))
    setNewAnnotation('')
    shadcnToast({ title: 'Комментарий добавлен', description: 'Заметка сохранена и будет доступна после перезагрузки.' })
  }

  const handleDeleteAnnotation = (docId: string, annotationId: string) => {
    setAnnotations(prev => ({
      ...prev,
      [docId]: (prev[docId] ?? []).filter(a => a.id !== annotationId),
    }))
    shadcnToast({ title: 'Комментарий удалён' })
  }

  const handleOpenDoc = (doc: DocumentData) => {
    setSelectedDoc(doc)
    setNewAnnotation('')
  }

  if (isLoading) return <div className="grid grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}</div>

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className={`border-2 rounded-xl transition-colors shadow-sm ${isDragOver ? 'border-amber-500 bg-amber-500/5' : 'border-dashed border-stone-600'}`}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => { e.preventDefault(); setIsDragOver(false); handleUpload(e.dataTransfer.files) }}
      >
        <CardContent className="p-6 text-center">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /><p className="text-sm">Загрузка...</p><Progress value={50} className="w-48" /></div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Перетащите PDF-файлы сюда</p>
              <p className="text-xs text-muted-foreground">или нажмите кнопку ниже</p>
              <Button size="sm" className="mt-3 rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-white shadow-sm" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />Выбрать файлы
              </Button>
              <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Compare / Export controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={compareMode ? 'default' : 'outline'} className="rounded-xl" onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]) }}>
          <GitCompare className="w-3 h-3 mr-1" />{compareMode ? 'Отмена сравнения' : 'Сравнить'}
        </Button>
        {compareMode && selectedForCompare.length === 2 && (
          <Button size="sm" className="rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-white" onClick={handleCompare}><GitCompare className="w-3 h-3 mr-1" />Сравнить выбранные</Button>
        )}
        {compareMode && <Badge variant="outline" className="text-xs">Выбрано: {selectedForCompare.length} / 2</Badge>}
        <Separator orientation="vertical" className="h-4 mx-2" />
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => exportDocumentsCSV(documents)}><Download className="w-3 h-3" />Export CSV</Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => toast.info('PDF экспорт будет доступен в будущих версиях')}><FileText className="w-3 h-3" />Export PDF</Button>
      </div>

      {/* Quick Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground">Быстрый фильтр:</span>
        {QUICK_FILTERS.map(f => (
          <Button key={f.value} size="sm" variant={quickFilter === f.value ? 'default' : 'outline'} className={`rounded-xl text-xs h-7 ${quickFilter === f.value ? 'bg-gradient-to-r from-red-700 to-red-800 text-white' : ''}`} onClick={() => setQuickFilter(f.value)}>
            {f.label}
          </Button>
        ))}
        <Badge variant="outline" className="text-xs ml-1">{filteredDocs.length} из {documents.length}</Badge>
      </div>

      {/* Document List */}
      <div className="grid sm:grid-cols-2 gap-4">
        {filteredDocs.length === 0 && documents.length > 0 && (
          <Card className="sm:col-span-2 rounded-xl shadow-sm border-t-2 border-t-amber-500 bg-gradient-to-br from-card via-card to-amber-500/5">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mx-auto mb-3 ring-4 ring-amber-500/5">
                <FileSearch className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm font-semibold">Документы не найдены</p>
              <p className="text-xs text-muted-foreground mt-1">Попробуйте сбросить фильтр или изменить запрос</p>
              <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => setQuickFilter('all')}>
                <RefreshCw className="w-3 h-3 mr-1" />Сбросить фильтр
              </Button>
            </CardContent>
          </Card>
        )}
        {filteredDocs.map(doc => {
          const docAnnotationCount = annotations[doc.id]?.length ?? 0
          return (
          <Card
            key={doc.id}
            onClick={() => compareMode ? handleCompareSelect(doc.id) : handleOpenDoc(doc)}
            className={`rounded-xl shadow-sm transition-colors cursor-pointer hover:bg-muted/50 hover:shadow-md ${compareMode && selectedForCompare.includes(doc.id) ? 'border-2 border-amber-500 ring-1 ring-amber-500/30' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted/50">{TYPE_ICON[doc.documentType ?? ''] ?? <BookOpen className="w-4 h-4 text-muted-foreground" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate">{doc.originalName}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${docAnnotationCount > 0 ? 'border-amber-500/40 text-amber-700 bg-amber-500/10' : 'text-muted-foreground'}`}
                      title={docAnnotationCount > 0 ? `${docAnnotationCount} комментарий(ев)` : 'Нет комментариев'}
                    >
                      <MessageSquare className="w-2.5 h-2.5 mr-1" />
                      {docAnnotationCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{fmtSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString('ru')}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {STATUS[doc.processingStatus]?.icon}
                    <Badge className={STATUS[doc.processingStatus]?.badge ?? 'bg-stone-500 text-white'}>{STATUS[doc.processingStatus]?.label ?? doc.processingStatus}</Badge>
                    {doc.documentType && <Badge className={TYPE_BADGE[doc.documentType] ?? 'bg-stone-500 text-white'}>{doc.documentType}</Badge>}
                  </div>
                  {doc.summary && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doc.summary}</p>}
                </div>
              </div>
              <Separator className="mt-3" />
              <div className="flex gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                {compareMode ? (
                  <Button size="sm" variant={selectedForCompare.includes(doc.id) ? 'default' : 'outline'} className="rounded-xl"
                    onClick={() => handleCompareSelect(doc.id)}>
                    {selectedForCompare.includes(doc.id) ? <CheckCircle className="w-3 h-3 mr-1" /> : <GitCompare className="w-3 h-3 mr-1" />}
                    {selectedForCompare.includes(doc.id) ? 'Выбран' : 'Выбрать'}
                  </Button>
                ) : (
                  <>
                    {doc.processingStatus === 'completed' && (
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleOpenDoc(doc)}><Eye className="w-3 h-3 mr-1" />Просмотр</Button>
                    )}
                    {doc.processingStatus === 'pending' && (
                      <Button size="sm" className="rounded-lg bg-gradient-to-r from-red-700 to-red-800 text-white" onClick={() => handleAnalyze(doc.id)} disabled={analyzingId === doc.id}>
                        {analyzingId === doc.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}Анализ
                      </Button>
                    )}
                    {doc.processingStatus === 'failed' && (
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleAnalyze(doc.id)}><RefreshCw className="w-3 h-3 mr-1" />Повторить</Button>
                    )}
                    <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => handleDelete(doc.id)}><Trash2 className="w-3 h-3" /></Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          )
        })}
      </div>

      {documents.length === 0 && (
        <Card className="rounded-xl shadow-sm border-t-2 border-t-blue-500 bg-gradient-to-br from-card via-card to-blue-500/5">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 mx-auto mb-4 ring-4 ring-blue-500/5">
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
            <p className="mt-2 text-base font-semibold">Пока нет документов</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Загрузите PDF-файлы уголовного дела — обвинительное заключение, протоколы, показания — для запуска AI-анализа и проверки.</p>
            <Button size="sm" className="mt-4 rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-white shadow-sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" />Загрузить документ
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Evidence Chain Section */}
      {evidenceChain.length > 0 && <EvidenceChainSection items={evidenceChain} />}

      {/* AI Document Insights - new feature: smart metadata summary */}
      <Card className="rounded-xl shadow-sm border-l-4 border-purple-700/50 bg-gradient-to-r from-purple-900/10 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-700" /> ИИ-инсайты по документам
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            {/* Languages detected */}
            <div className="p-2 rounded-lg bg-muted/40">
              <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><Globe className="w-3 h-3 text-amber-600" />Языки</p>
              <div className="flex flex-wrap gap-1">
                <Badge className="bg-emerald-700 text-white text-xs">Русский — 8</Badge>
                <Badge variant="outline" className="text-xs">Английский — 1</Badge>
              </div>
            </div>
            {/* Average processing time */}
            <div className="p-2 rounded-lg bg-muted/40">
              <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3 text-amber-600" />Среднее время</p>
              <p className="text-lg font-bold">2.4 <span className="text-xs text-muted-foreground font-normal">сек/док</span></p>
              <p className="text-xs text-emerald-700 flex items-center gap-1"><TrendingDown className="w-2 h-2" />-15% к прошлой неделе</p>
            </div>
            {/* Total pages processed */}
            <div className="p-2 rounded-lg bg-muted/40">
              <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3 text-amber-600" />Страниц обработано</p>
              <p className="text-lg font-bold">{documents.reduce((s, d) => s + Math.ceil(d.fileSize / 50000), 0)} <span className="text-xs text-muted-foreground font-normal">стр.</span></p>
              <p className="text-xs text-muted-foreground">в {documents.length} документах</p>
            </div>
          </div>
          <Separator />
          {/* Top entities extracted */}
          <div>
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><BrainCircuit className="w-3 h-3 text-purple-700" />Топ извлечённых сущностей</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { ent: 'Колесниченко Д.А.', type: 'человек', color: 'bg-red-100 text-red-800 border-red-200' },
                { ent: 'ООО "ФинансГрупп"', type: 'организация', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                { ent: 'ст. 159 ч.3 УК РФ', type: 'статья', color: 'bg-stone-100 text-stone-800 border-stone-300' },
                { ent: 'г. Москва', type: 'место', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                { ent: '15.03.2024', type: 'дата', color: 'bg-purple-100 text-purple-800 border-purple-200' },
                { ent: 'бухгалтер', type: 'должность', color: 'bg-orange-100 text-orange-800 border-orange-200' },
              ].map((e, i) => (
                <Badge key={i} variant="outline" className={`text-xs border ${e.color} font-medium`}>
                  {e.ent} <span className="opacity-60 ml-1">({e.type})</span>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">Показано {filteredDocs.length} из {documents.length} документов из базы данных</p>

      {/* Document Annotations Side Panel */}
      <Sheet
        open={!!selectedDoc}
        onOpenChange={(open) => { if (!open) { setSelectedDoc(null); setNewAnnotation('') } }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 gap-0 flex flex-col">
          <SheetHeader className="p-4 border-b shrink-0 space-y-1">
            <SheetTitle className="text-base flex items-start gap-2 pr-8">
              <FileText className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <span className="break-words leading-tight">{selectedDoc?.originalName}</span>
            </SheetTitle>
            <SheetDescription className="text-xs flex items-center gap-2 flex-wrap">
              <span>{selectedDoc?.fileName}</span>
              {selectedDoc && <span>• {fmtSize(selectedDoc.fileSize)}</span>}
              {selectedDoc && (
                <Badge className={STATUS[selectedDoc.processingStatus]?.badge ?? 'bg-stone-500 text-white'}>
                  {STATUS[selectedDoc.processingStatus]?.label ?? selectedDoc.processingStatus}
                </Badge>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Metadata section */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Метаданные документа</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                {selectedDoc?.documentType && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-24">Тип:</span>
                    <Badge className={TYPE_BADGE[selectedDoc.documentType] ?? 'bg-stone-500 text-white'}>{selectedDoc.documentType}</Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-24">Дата документа:</span>
                  <span className="font-medium">{selectedDoc?.documentDate ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-24">Источник:</span>
                  <span className="font-medium">{selectedDoc?.sourceReference ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-24">Размер файла:</span>
                  <span className="font-medium">{selectedDoc && fmtSize(selectedDoc.fileSize)}</span>
                </div>
                {selectedDoc?.uploadedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-24">Загружен:</span>
                    <span className="font-medium">{formatRussianDateTime(selectedDoc.uploadedAt)}</span>
                  </div>
                )}
                {selectedDoc?.summary && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-muted-foreground mb-1">Краткое содержание:</p>
                    <p>{selectedDoc.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extracted text */}
            {selectedDoc?.extractedText && (
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" /> Извлечённый текст
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-48 w-full rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{selectedDoc.extractedText}</p>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Annotations / Comments */}
            <Card className="rounded-xl shadow-sm border-t-2 border-t-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" /> Комментарии и заметки
                  <Badge variant="outline" className="text-xs ml-auto">
                    {selectedDoc ? (annotations[selectedDoc.id]?.length ?? 0) : 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDoc && (annotations[selectedDoc.id]?.length ?? 0) === 0 ? (
                  <div className="text-center py-6 px-2">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mx-auto mb-2 ring-4 ring-amber-500/5">
                      <MessageSquare className="w-6 h-6 text-amber-600/70" />
                    </div>
                    <p className="text-xs text-muted-foreground">Пока нет комментариев. Добавьте первый.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDoc && (annotations[selectedDoc.id] ?? []).map(an => (
                      <div key={an.id} className="border-l-4 border-l-amber-500 bg-muted/30 rounded-r-lg p-2.5">
                        <div className="flex items-start gap-2">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="text-[10px] font-bold bg-amber-100 text-amber-800">АП</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold flex items-center gap-1 truncate">
                                <User className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                                {an.author}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDeleteAnnotation(selectedDoc.id, an.id)}
                                className="text-muted-foreground hover:text-red-700 transition-colors p-1 -m-1 rounded hover:bg-red-500/10"
                                aria-label="Удалить комментарий"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-xs mt-1 break-words">{an.text}</p>
                            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {formatRussianDateTime(an.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add annotation form */}
                <div className="space-y-2 pt-3 border-t">
                  <Textarea
                    value={newAnnotation}
                    onChange={(e) => setNewAnnotation(e.target.value)}
                    placeholder="Введите ваш комментарий или заметку..."
                    className="min-h-[80px] text-sm resize-none"
                    maxLength={1000}
                  />
                  <Button
                    size="sm"
                    className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800"
                    disabled={!newAnnotation.trim()}
                    onClick={() => selectedDoc && handleAddAnnotation(selectedDoc.id)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Добавить комментарий
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Действия</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => shadcnToast({ title: 'Экспорт', description: 'Подготовка экспорта документа...' })}
                >
                  <Download className="w-3 h-3 mr-1" /> Экспорт
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    shadcnToast({ title: 'Переобработка', description: 'Запущена повторная обработка документа.' })
                    if (selectedDoc) handleAnalyze(selectedDoc.id)
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Переобработать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-red-700 hover:bg-red-500/10 hover:text-red-800 border-red-300"
                  onClick={() => {
                    if (selectedDoc) {
                      handleDelete(selectedDoc.id)
                      setSelectedDoc(null)
                      setNewAnnotation('')
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Удалить
                </Button>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {/* Document Comparison Dialog */}
      {compareDocs && (<DocumentCompareDialog doc1={compareDocs[0]} doc2={compareDocs[1]} onClose={() => setCompareDocs(null)} />)}
    </div>
  )
}
