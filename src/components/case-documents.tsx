'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  FileText, Upload, RefreshCw, Eye, CheckCircle, Clock, AlertTriangle, Loader2, Zap, XCircle, Trash2, Scale, BookOpen, Gavel, GitCompare, Download, Link2, ShieldCheck, ShieldAlert, ShieldX
} from 'lucide-react'
import { mockDocuments, mockEvidenceChain } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { DocumentData, EvidenceChainData } from '@/lib/case-store'

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
        {filteredDocs.map(doc => (
          <Card key={doc.id} className={`rounded-xl shadow-sm transition-shadow hover:shadow-md ${compareMode && selectedForCompare.includes(doc.id) ? 'border-2 border-amber-500 ring-1 ring-amber-500/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted/50">{TYPE_ICON[doc.documentType ?? ''] ?? <BookOpen className="w-4 h-4 text-muted-foreground" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.originalName}</p>
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
              <div className="flex gap-1 mt-3">
                {compareMode ? (
                  <Button size="sm" variant={selectedForCompare.includes(doc.id) ? 'default' : 'outline'} className="rounded-xl"
                    onClick={() => handleCompareSelect(doc.id)}>
                    {selectedForCompare.includes(doc.id) ? <CheckCircle className="w-3 h-3 mr-1" /> : <GitCompare className="w-3 h-3 mr-1" />}
                    {selectedForCompare.includes(doc.id) ? 'Выбран' : 'Выбрать'}
                  </Button>
                ) : (
                  <>
                    {doc.processingStatus === 'completed' && (
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setSelectedDoc(doc)}><Eye className="w-3 h-3 mr-1" />Просмотр</Button>
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
        ))}
      </div>

      {documents.length === 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Нет документов</p>
            <p className="text-xs text-muted-foreground">Загрузите PDF-файлы для начала работы</p>
          </CardContent>
        </Card>
      )}

      {/* Evidence Chain Section */}
      {evidenceChain.length > 0 && <EvidenceChainSection items={evidenceChain} />}

      <Separator />
      <p className="text-xs text-muted-foreground">Показано {filteredDocs.length} из {documents.length} документов из базы данных</p>

      {/* Document Preview Dialog */}
      {selectedDoc && (
        <Dialog open={true} onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl">
            <DialogHeader><DialogTitle className="text-sm">{selectedDoc.originalName}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Тип:</span> {selectedDoc.documentType ?? '—'}</div>
                <div><span className="text-muted-foreground">Дата:</span> {selectedDoc.documentDate ?? '—'}</div>
                <div><span className="text-muted-foreground">Источник:</span> {selectedDoc.sourceReference ?? '—'}</div>
                <div><span className="text-muted-foreground">Статус:</span> {selectedDoc.processingStatus}</div>
              </div>
              {selectedDoc.summary && <div className="p-3 rounded-lg bg-muted"><p className="font-medium mb-1">Краткое содержание:</p>{selectedDoc.summary}</div>}
              {selectedDoc.extractedText && (
                <div className="p-3 rounded-lg bg-muted max-h-64 overflow-y-auto"><p className="font-medium mb-1">Текст документа:</p><p className="text-xs whitespace-pre-wrap">{selectedDoc.extractedText}</p></div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Document Comparison Dialog */}
      {compareDocs && (<DocumentCompareDialog doc1={compareDocs[0]} doc2={compareDocs[1]} onClose={() => setCompareDocs(null)} />)}
    </div>
  )
}
