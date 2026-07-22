'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  FileText, Upload, RefreshCw, Eye, CheckCircle, Clock, AlertTriangle, Loader2, Zap, XCircle, Trash2
} from 'lucide-react'
import { mockDocuments } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { DocumentData } from '@/lib/case-store'

function fmtSize(b: number) {
  if (b < 1024) return b + ' Б'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' КБ'
  return (b / 1048576).toFixed(1) + ' МБ'
}

const STATUS: Record<string, { icon: React.ReactNode; badge: string }> = {
  completed: { icon: <CheckCircle className="w-3 h-3 text-emerald-600" />, badge: 'bg-emerald-700 text-white' },
  processing: { icon: <Clock className="w-3 h-3 text-amber-500 animate-spin" />, badge: 'bg-amber-600 text-white' },
  pending: { icon: <Clock className="w-3 h-3 text-stone-400" />, badge: 'bg-stone-500 text-white' },
  failed: { icon: <XCircle className="w-3 h-3 text-red-600" />, badge: 'bg-red-700 text-white' },
}

const TYPE_BADGE: Record<string, string> = {
  обвинение: 'bg-red-700 text-white',
  показание: 'bg-orange-600 text-white',
  протокол: 'bg-amber-600 text-white',
  экспертиза: 'bg-stone-600 text-white',
}

export function CaseDocuments() {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: caseApi.getDocuments,
    retry: 1,
  })
  const documents = data ?? mockDocuments

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

  if (isLoading) return <div className="grid grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}</div>

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className={`border-2 transition-colors ${isDragOver ? 'border-amber-500 bg-amber-500/5' : 'border-dashed border-stone-600'}`}
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
              <Button size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />Выбрать файлы
              </Button>
              <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Document List */}
      <div className="grid sm:grid-cols-2 gap-3">
        {documents.map(doc => (
          <Card key={doc.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.originalName}</p>
                  <p className="text-xs text-muted-foreground">{fmtSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString('ru')}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {STATUS[doc.processingStatus]?.icon}
                    <Badge className={STATUS[doc.processingStatus]?.badge}>{doc.processingStatus}</Badge>
                    {doc.documentType && <Badge className={TYPE_BADGE[doc.documentType] ?? 'bg-stone-500 text-white'}>{doc.documentType}</Badge>}
                  </div>
                  {doc.summary && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doc.summary}</p>}
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                {doc.processingStatus === 'completed' && (
                  <Button size="sm" variant="outline" onClick={() => setSelectedDoc(doc)}><Eye className="w-3 h-3 mr-1" />Просмотр</Button>
                )}
                {doc.processingStatus === 'pending' && (
                  <Button size="sm" onClick={() => handleAnalyze(doc.id)} disabled={analyzingId === doc.id}>
                    {analyzingId === doc.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}Анализ
                  </Button>
                )}
                {doc.processingStatus === 'failed' && (
                  <Button size="sm" variant="outline" onClick={() => handleAnalyze(doc.id)}><RefreshCw className="w-3 h-3 mr-1" />Повторить</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document Preview Dialog */}
      {selectedDoc && (
        <Dialog open={true} onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">{selectedDoc.originalName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Тип:</span> {selectedDoc.documentType ?? '—'}</div>
                <div><span className="text-muted-foreground">Дата:</span> {selectedDoc.documentDate ?? '—'}</div>
                <div><span className="text-muted-foreground">Источник:</span> {selectedDoc.sourceReference ?? '—'}</div>
                <div><span className="text-muted-foreground">Статус:</span> {selectedDoc.processingStatus}</div>
              </div>
              {selectedDoc.summary && <div className="p-3 rounded bg-muted"><p className="font-medium mb-1">Краткое содержание:</p>{selectedDoc.summary}</div>}
              {selectedDoc.extractedText && (
                <div className="p-3 rounded bg-muted max-h-64 overflow-y-auto">
                  <p className="font-medium mb-1">Текст документа:</p>
                  <p className="text-xs whitespace-pre-wrap">{selectedDoc.extractedText}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
