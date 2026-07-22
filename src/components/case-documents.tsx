'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  FileText, Upload, Trash2, RefreshCw, Eye, CheckCircle, Clock, AlertTriangle,
  Loader2, Filter, SortAsc, SortDesc, X, Files, Zap, ChevronDown, ChevronUp,
  GripVertical, ArrowRight, FileIcon as DocumentIcon, GitCompare as Compare, Users, BookOpen, Scale,
  FolderOpen, ListChecks, ScanSearch
} from 'lucide-react'
import { mockDocuments } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { DocumentData } from '@/lib/case-store'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' Б'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ'
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ'
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return { icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Завершён', className: 'bg-emerald-700 text-white border-emerald-600', pulse: false }
    case 'processing':
      return { icon: <Clock className="w-3.5 h-3.5" />, label: 'Обработка', className: 'bg-orange-600 text-white border-orange-500 animate-pulse', pulse: true }
    case 'pending':
      return { icon: <Clock className="w-3.5 h-3.5" />, label: 'Ожидание', className: 'bg-stone-500 text-white border-stone-400', pulse: false }
    case 'failed':
      return { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Ошибка', className: 'bg-red-700 text-white border-red-600', pulse: false }
    default:
      return { icon: <Clock className="w-3.5 h-3.5" />, label: status, className: 'bg-stone-400 text-white border-stone-300', pulse: false }
  }
}

function getDocTypeConfig(type: string | null) {
  if (!type) return { className: 'bg-stone-500/70 text-stone-200', label: 'Не определён' }
  const map: Record<string, { className: string; label: string }> = {
    'обвинение': { className: 'bg-red-700 text-white', label: 'Обвинение' },
    'показание': { className: 'bg-orange-600 text-white', label: 'Показание' },
    'протокол': { className: 'bg-amber-600 text-white', label: 'Протокол' },
    'доказательство': { className: 'bg-emerald-700 text-white', label: 'Доказательство' },
    'заключение': { className: 'bg-stone-600 text-white', label: 'Заключение' },
  }
  return map[type] || { className: 'bg-stone-500 text-white', label: type }
}

type SortField = 'date' | 'name' | 'size' | 'status'
type SortDirection = 'asc' | 'desc'
type FilterType = 'all' | string
type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed'

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

export function CaseDocuments() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgresses, setUploadProgresses] = useState<UploadProgress[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [processingDocIds, setProcessingDocIds] = useState<Set<string>>(new Set())
  const [showQueue, setShowQueue] = useState(false)

  // TanStack Query - fetch documents
  const {
    data: documents = [],
    isLoading: isLoadingDocs,
    error: docsError,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['documents'],
    queryFn: caseApi.getDocuments,
    refetchInterval: 5000, // Poll every 5s for processing updates
  })

  // Fallback to mock data if API not available
  const displayDocs = docsError ? mockDocuments : documents

  // TanStack Query - upload mutation
  const uploadMutation = useMutation({
    mutationFn: caseApi.uploadDocuments,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setUploadProgresses([])
      toast.success('Документы успешно загружены')
    },
    onError: (error: Error) => {
      toast.error(`Ошибка загрузки: ${error.message}`)
      setUploadProgresses([])
    },
  })

  // TanStack Query - process document mutation
  const processMutation = useMutation({
    mutationFn: caseApi.processDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Анализ документа запущен')
    },
    onError: (error: Error) => {
      toast.error(`Ошибка анализа: ${error.message}`)
    },
  })

  // TanStack Query - delete mutation
  const deleteMutation = useMutation({
    mutationFn: caseApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Документ удалён')
    },
    onError: (error: Error) => {
      toast.error(`Ошибка удаления: ${error.message}`)
    },
  })

  // TanStack Query - reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: caseApi.reprocessDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Документ отправлен на повторную обработку')
    },
    onError: (error: Error) => {
      toast.error(`Ошибка: ${error.message}`)
    },
  })

  // Drag-and-drop handlers
  const handleUploadFiles = (files: File[]) => {
    // Show progress for each file
    const progresses: UploadProgress[] = files.map(f => ({
      fileName: f.name,
      progress: 0,
      status: 'uploading',
    }))
    setUploadProgresses(progresses)

    // Simulate progress updates
    progresses.forEach((p, i) => {
      const interval = setInterval(() => {
        setUploadProgresses(prev => {
          const updated = [...prev]
          const current = updated[i]
          if (current.progress >= 100) {
            clearInterval(interval)
            updated[i] = { ...current, status: 'success', progress: 100 }
            return updated
          }
          updated[i] = { ...current, progress: Math.min(current.progress + Math.random() * 30, 100) }
          return updated
        })
      }, 300)
    })

    uploadMutation.mutate(files)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (files.length === 0) {
      toast.error('Поддерживаются только PDF-файлы')
      return
    }
    handleUploadFiles(files)
  }, [handleUploadFiles])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    handleUploadFiles(Array.from(files))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Document actions
  const handleProcessDoc = (docId: string) => {
    setProcessingDocIds(prev => new Set([...prev, docId]))
    processMutation.mutate(docId, {
      onSettled: () => {
        setProcessingDocIds(prev => {
          const next = new Set(prev)
          next.delete(docId)
          return next
        })
      },
    })
  }

  const handleDeleteDoc = (docId: string) => {
    deleteMutation.mutate(docId)
  }

  const handleReprocessDoc = (docId: string) => {
    reprocessMutation.mutate(docId)
  }

  // Bulk actions
  const handleBulkProcess = () => {
    selectedIds.forEach(id => handleProcessDoc(id))
    setSelectedIds(new Set())
  }

  const handleBulkDelete = () => {
    selectedIds.forEach(id => handleDeleteDoc(id))
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedDocs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedDocs.map(d => d.id)))
    }
  }

  // Comparison
  const startCompare = (id1: string, id2: string) => {
    setCompareIds([id1, id2])
    setShowCompare(true)
  }

  // Filtering and sorting
  const filteredAndSortedDocs = displayDocs
    .filter(doc => {
      if (filterType !== 'all' && doc.documentType !== filterType) return false
      if (filterStatus !== 'all' && doc.processingStatus !== filterStatus) return false
      return true
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortField) {
        case 'name':
          return dir * a.originalName.localeCompare(b.originalName, 'ru')
        case 'size':
          return dir * (a.fileSize - b.fileSize)
        case 'status':
          const statusOrder = { pending: 0, processing: 1, completed: 2, failed: 3 }
          return dir * ((statusOrder[a.processingStatus as keyof typeof statusOrder] ?? 0) - (statusOrder[b.processingStatus as keyof typeof statusOrder] ?? 0))
        case 'date':
          return dir * ((a.documentDate || a.uploadedAt).localeCompare((b.documentDate || b.uploadedAt)))
        default:
          return 0
      }
    })

  // Stats
  const completedCount = displayDocs.filter(d => d.processingStatus === 'completed').length
  const totalCount = displayDocs.length
  const processingCount = displayDocs.filter(d => d.processingStatus === 'processing').length
  const pendingCount = displayDocs.filter(d => d.processingStatus === 'pending').length
  const failedCount = displayDocs.filter(d => d.processingStatus === 'failed').length

  // Get unique document types for filter
  const docTypes = [...new Set(displayDocs.map(d => d.documentType).filter(Boolean))] as string[]

  // Compare documents
  const compareDoc1 = compareIds ? displayDocs.find(d => d.id === compareIds[0]) : null
  const compareDoc2 = compareIds ? displayDocs.find(d => d.id === compareIds[1]) : null

  // Animated variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <motion.div initial={{ hidden: {} }} animate={{ visible: {} }} variants={cardVariants}>
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Загрузка документов
                </CardTitle>
                <CardDescription className="mt-1">
                  Загрузите PDF-документы материалов уголовного дела для обработки ИИ
                </CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      {totalCount} документов
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Завершено: {completedCount}</p>
                    <p>В обработке: {processingCount}</p>
                    <p>Ожидание: {pendingCount}</p>
                    <p>Ошибка: {failedCount}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag-and-Drop Area */}
            <motion.div
              animate={{
                borderColor: isDragOver ? '#f97316' : '#374151',
                backgroundColor: isDragOver ? 'rgba(249,115,22,0.05)' : 'rgba(0,0,0,0)',
                scale: isDragOver ? 1.02 : 1,
              }}
              transition={{ duration: 0.2 }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-stone-400 hover:bg-stone-50/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
              <motion.div animate={{ y: isDragOver ? -5 : 0 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-sm font-medium mb-1">
                  {isDragOver ? 'Перетащите файлы сюда' : 'Перетащите PDF-файлы или нажмите для выбора'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Поддерживается многодокументная загрузка. Файлы будут добавлены в очередь обработки ИИ.
                </p>
              </motion.div>
            </motion.div>

            {/* Upload Progress per file */}
            <AnimatePresence>
              {uploadProgresses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Files className="w-3 h-3" />
                    Прогресс загрузки файлов
                  </h4>
                  {uploadProgresses.map((p, i) => (
                    <motion.div
                      key={p.fileName + i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="truncate font-medium">{p.fileName}</span>
                          <span className={p.status === 'success' ? 'text-emerald-500' : p.status === 'error' ? 'text-red-500' : 'text-muted-foreground'}>
                            {p.status === 'success' ? '✓ Загружен' : p.status === 'error' ? '✗ Ошибка' : `${Math.round(p.progress)}%`}
                          </span>
                        </div>
                        <Progress value={p.progress} className="h-1.5" />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Overall Processing Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Общий прогресс обработки</span>
                <span className="font-medium">{completedCount} из {totalCount} завершено</span>
              </div>
              <Progress value={(completedCount / totalCount) * 100} className="h-2.5" />
              <div className="flex gap-3 text-xs">
                <Badge className="bg-emerald-700 text-white text-xs"><CheckCircle className="w-2.5 h-2.5 mr-1" />{completedCount} завершено</Badge>
                <Badge className="bg-orange-600 text-white text-xs"><Clock className="w-2.5 h-2.5 mr-1" />{processingCount} обработка</Badge>
                <Badge className="bg-stone-500 text-white text-xs"><Clock className="w-2.5 h-2.5 mr-1" />{pendingCount} ожидание</Badge>
                {failedCount > 0 && <Badge className="bg-red-700 text-white text-xs"><AlertTriangle className="w-2.5 h-2.5 mr-1" />{failedCount} ошибки</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Processing Queue */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Очередь обработки
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowQueue(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {displayDocs.filter(d => d.processingStatus === 'processing' || d.processingStatus === 'pending').map((doc, i) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-700 text-white text-xs font-bold">
                        {i + 1}
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate">{doc.originalName}</span>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={doc.processingStatus}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                        >
                          <Badge className={getStatusConfig(doc.processingStatus).className}>
                            {getStatusConfig(doc.processingStatus).icon}
                            <span className="ml-1">{getStatusConfig(doc.processingStatus).label}</span>
                          </Badge>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  ))}
                  {displayDocs.filter(d => d.processingStatus === 'processing' || d.processingStatus === 'pending').length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">Нет документов в очереди</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Sorting Bar */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Quick Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 shrink-0"
              >
                <Filter className="h-4 w-4" />
                Фильтры
                <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">По дате</SelectItem>
                    <SelectItem value="name">По имени</SelectItem>
                    <SelectItem value="size">По размеру</SelectItem>
                    <SelectItem value="status">По статусу</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
                  {sortDir === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>

              {/* Queue Toggle */}
              <Button variant="outline" size="sm" onClick={() => setShowQueue(!showQueue)} className="gap-2 shrink-0">
                <ListChecks className="h-4 w-4" />
                Очередь
              </Button>

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                  <Badge variant="outline">{selectedIds.size} выбрано</Badge>
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={handleBulkProcess}>
                    <Zap className="h-3.5 w-3.5" />
                    Анализировать все
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 text-xs h-8" onClick={handleBulkDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Удалить все
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedIds(new Set())}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}

              {/* Select All */}
              <div className="flex items-center gap-2 ml-auto">
                <Checkbox
                  checked={selectedIds.size === filteredAndSortedDocs.length && filteredAndSortedDocs.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs text-muted-foreground">Выбрать все</span>
              </div>

              {/* Results count */}
              <span className="text-xs text-muted-foreground shrink-0">
                {filteredAndSortedDocs.length} из {totalCount} документов
              </span>
            </div>

            {/* Expanded Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Тип документа</label>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все типы</SelectItem>
                          {docTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Статус обработки</label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все статусы</SelectItem>
                          <SelectItem value="pending">Ожидание</SelectItem>
                          <SelectItem value="processing">В обработке</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
                          <SelectItem value="failed">Ошибка</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2 sm:col-span-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => { setFilterType('all'); setFilterStatus('all') }}>
                        <X className="h-3 w-3" />
                        Сбросить фильтры
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading skeleton */}
      {isLoadingDocs && !docsError && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px] rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Documents List */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Документы дела
            </CardTitle>
            <CardDescription>Все загруженные документы с извлечёнными данными и связями</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[600px] [&>div]:!overflow-y-auto [&>div>div]:space-y-0">
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredAndSortedDocs.map((doc, index) => {
                    const statusConfig = getStatusConfig(doc.processingStatus)
                    const typeConfig = getDocTypeConfig(doc.documentType)
                    const isSelected = selectedIds.has(doc.id)
                    const isProcessing = processingDocIds.has(doc.id)

                    return (
                      <motion.div
                        key={doc.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        transition={{ delay: index * 0.03 }}
                        className={`group flex items-start gap-3 p-4 rounded-lg transition-colors ${
                          isSelected ? 'bg-orange-600/10 border border-orange-600/30' : 'bg-muted/50 hover:bg-muted/80'
                        }`}
                      >
                        {/* Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(doc.id)}
                          className="mt-1 shrink-0"
                        />

                        {/* File icon */}
                        <motion.div whileHover={{ scale: 1.1 }} className="shrink-0 mt-0.5">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </motion.div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Title row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{doc.originalName}</p>
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={doc.processingStatus}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 500 }}
                              >
                                <Badge className={statusConfig.className}>
                                  {statusConfig.icon}
                                  <span className="ml-1">{statusConfig.label}</span>
                                </Badge>
                              </motion.div>
                            </AnimatePresence>
                            <Badge className={typeConfig.className}>{typeConfig.label}</Badge>
                          </div>

                          {/* Metadata row */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {doc.sourceReference && (
                              <span className="flex items-center gap-1">
                                <ScanSearch className="w-3 h-3" />
                                {doc.sourceReference}
                              </span>
                            )}
                            <span>{formatFileSize(doc.fileSize)}</span>
                            {doc.documentDate && <span>Дата: {doc.documentDate}</span>}
                            {doc.processedAt && <span>Обработано: {new Date(doc.processedAt).toLocaleDateString('ru-RU')}</span>}
                          </div>

                          {/* Summary */}
                          {doc.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{doc.summary}</p>
                          )}

                          {/* Linked entities */}
                          {doc.processingStatus === 'completed' && (
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <Badge variant="outline" className="text-xs gap-1">
                                <Users className="w-2.5 h-2.5" />
                                Участники
                              </Badge>
                              <Badge variant="outline" className="text-xs gap-1">
                                <BookOpen className="w-2.5 h-2.5" />
                                Эпизоды
                              </Badge>
                              <Badge variant="outline" className="text-xs gap-1">
                                <Scale className="w-2.5 h-2.5" />
                                Статьи
                              </Badge>
                            </div>
                          )}

                          {/* Error display */}
                          {doc.processingError && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-1 text-xs text-red-500 mt-1"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {doc.processingError}
                            </motion.div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          {/* Preview */}
                          {doc.processingStatus === 'completed' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => { setSelectedDoc(doc); setShowPreview(true) }}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Просмотр текста</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {/* Process/Analyze */}
                          {(doc.processingStatus === 'pending' || doc.processingStatus === 'failed') && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-orange-600 hover:text-orange-500"
                                    onClick={() => handleProcessDoc(doc.id)}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Запустить анализ ИИ</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {/* Reprocess */}
                          {doc.processingStatus === 'completed' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleReprocessDoc(doc.id)}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Повторная обработка</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {/* Compare */}
                          {doc.processingStatus === 'completed' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      if (selectedIds.size >= 2) {
                                        const ids = Array.from(selectedIds)
                                        startCompare(ids[0], ids[1])
                                      }
                                    }}
                                  >
                                    <Compare className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Сравнить (выберите 2 документа)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {/* Delete */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteDoc(doc.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Удалить документ</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {filteredAndSortedDocs.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                    <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {totalCount === 0 ? 'Нет загруженных документов' : 'Нет документов по заданным фильтрам'}
                    </p>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Document Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {selectedDoc?.originalName}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              {selectedDoc?.sourceReference && (
                <Badge variant="outline" className="text-xs gap-1">
                  <ScanSearch className="w-3 h-3" />
                  {selectedDoc.sourceReference}
                </Badge>
              )}
              {selectedDoc?.documentType && (
                <Badge className={getDocTypeConfig(selectedDoc.documentType).className + ' text-xs'}>
                  {getDocTypeConfig(selectedDoc.documentType).label}
                </Badge>
              )}
              {selectedDoc?.documentDate && <span className="text-xs">Дата: {selectedDoc.documentDate}</span>}
            </DialogDescription>
          </DialogHeader>

          {/* Metadata section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Размер</p>
              <p className="text-sm font-medium">{selectedDoc ? formatFileSize(selectedDoc.fileSize) : '-'}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Статус</p>
              <p className="text-sm font-medium">{selectedDoc ? getStatusConfig(selectedDoc.processingStatus).label : '-'}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Тип</p>
              <p className="text-sm font-medium">{selectedDoc ? getDocTypeConfig(selectedDoc.documentType).label : '-'}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Загружен</p>
              <p className="text-sm font-medium">{selectedDoc ? new Date(selectedDoc.uploadedAt).toLocaleDateString('ru-RU') : '-'}</p>
            </div>
          </div>

          {/* Linked entities */}
          {selectedDoc?.summary && (
            <div className="p-3 bg-muted/30 rounded-lg mb-3">
              <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Резюме документа
              </h4>
              <p className="text-sm text-muted-foreground">{selectedDoc.summary}</p>
            </div>
          )}

          <Separator />

          {/* Extracted text */}
          <ScrollArea className="max-h-[50vh] [&>div]:!overflow-y-auto">
            <div className="text-sm whitespace-pre-wrap py-2 leading-relaxed">
              {selectedDoc?.extractedText || 'Текст не извлечён из документа'}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Document Comparison Dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Compare className="h-4 w-4" />
              Сравнение документов
            </DialogTitle>
            <DialogDescription>Параллельное сравнение двух документов</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {/* Doc 1 */}
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">{compareDoc1?.originalName || 'Документ 1'}</h4>
                {compareDoc1?.documentType && <Badge className={getDocTypeConfig(compareDoc1.documentType).className + ' text-xs mb-2'}>{getDocTypeConfig(compareDoc1.documentType).label}</Badge>}
                {compareDoc1?.sourceReference && <p className="text-xs text-muted-foreground">{compareDoc1.sourceReference}</p>}
              </div>
              <ScrollArea className="max-h-[50vh] [&>div]:!overflow-y-auto">
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {compareDoc1?.extractedText || 'Текст не извлечён'}
                </div>
              </ScrollArea>
            </div>

            {/* Doc 2 */}
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">{compareDoc2?.originalName || 'Документ 2'}</h4>
                {compareDoc2?.documentType && <Badge className={getDocTypeConfig(compareDoc2.documentType).className + ' text-xs mb-2'}>{getDocTypeConfig(compareDoc2.documentType).label}</Badge>}
                {compareDoc2?.sourceReference && <p className="text-xs text-muted-foreground">{compareDoc2.sourceReference}</p>}
              </div>
              <ScrollArea className="max-h-[50vh] [&>div]:!overflow-y-auto">
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {compareDoc2?.extractedText || 'Текст не извлечён'}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
