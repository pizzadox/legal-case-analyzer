'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Package,
  FileText,
  Braces,
  Table as TableIcon,
  Code,
  Sparkles,
  Lock,
  Download,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Languages,
  Image as ImageIcon,
  File as FilePage,
  LayoutGrid,
  Stamp,
  Shield,
  ListChecks,
  Users,
  Files,
  Link2,
  MessageSquare,
  Scale,
  CalendarClock,
  Calculator,
  ShieldCheck,
  CheckSquare,
  Square,
  FileType,
  Calendar,
  HardDrive,
  ArrowRight,
  RefreshCw,
  Printer,
} from 'lucide-react'

// ===== Types =====
type ExportFormat = 'pdf' | 'json' | 'csv' | 'html'

type ExportStatus = 'ready' | 'processing' | 'error'

interface RecentExport {
  id: string
  date: string
  format: ExportFormat | 'PDF' | 'JSON' | 'CSV' | 'HTML'
  elementsCount: number
  size: number
  status: ExportStatus
}

interface ExportOptions {
  language: 'ru' | 'en' | 'both'
  includeAI: boolean
  includeCharts: boolean
  pageFormat: 'a4' | 'a3' | 'letter'
  orientation: 'portrait' | 'landscape'
  watermark: boolean
  encrypt: boolean
}

// ===== Constants =====
const CASE_NUMBER = '2024-00145'

const FORMAT_CONFIG: Record<
  ExportFormat,
  {
    id: ExportFormat
    label: string
    shortLabel: string
    description: string
    icon: React.ReactNode
    accent: string
    tileBg: string
    iconColor: string
    ringClass: string
    perItemBytes: number
    extension: string
    sizeLabel: string
  }
> = {
  pdf: {
    id: 'pdf',
    label: 'PDF Отчёт',
    shortLabel: 'PDF',
    description: 'Полный отчёт по делу с графиками и таблицами для печати',
    icon: <FileText className="w-7 h-7" />,
    accent: 'red-700',
    tileBg: 'bg-red-700/15 dark:bg-red-950/40',
    iconColor: 'text-red-700 dark:text-red-400',
    ringClass: 'ring-red-700',
    buttonActiveClass: 'bg-red-700 text-white hover:bg-red-800',
    perItemBytes: 150 * 1024,
    extension: 'pdf',
    sizeLabel: 'С богатой вёрсткой',
  },
  json: {
    id: 'json',
    label: 'JSON Данные',
    shortLabel: 'JSON',
    description: 'Полная выгрузка всех данных дела в структурированном формате',
    icon: <Braces className="w-7 h-7" />,
    accent: 'emerald-700',
    tileBg: 'bg-emerald-700/15 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    ringClass: 'ring-emerald-700',
    buttonActiveClass: 'bg-emerald-700 text-white hover:bg-emerald-800',
    perItemBytes: 50 * 1024,
    extension: 'json',
    sizeLabel: 'Машинно-читаемый',
  },
  csv: {
    id: 'csv',
    label: 'CSV Таблицы',
    shortLabel: 'CSV',
    description: 'Таблицы участников, эпизодов, документов для Excel/Google Sheets',
    icon: <TableIcon className="w-7 h-7" />,
    accent: 'amber-600',
    tileBg: 'bg-amber-600/15 dark:bg-amber-950/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    ringClass: 'ring-amber-600',
    buttonActiveClass: 'bg-amber-600 text-white hover:bg-amber-700',
    perItemBytes: 20 * 1024,
    extension: 'csv',
    sizeLabel: 'Совместим с Excel',
  },
  html: {
    id: 'html',
    label: 'HTML Краткая справка',
    shortLabel: 'HTML',
    description: 'Веб-страница с краткой справкой по делу для быстрого просмотра',
    icon: <Code className="w-7 h-7" />,
    accent: 'orange-600',
    tileBg: 'bg-orange-600/15 dark:bg-orange-950/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    ringClass: 'ring-orange-600',
    buttonActiveClass: 'bg-orange-600 text-white hover:bg-orange-700',
    perItemBytes: 80 * 1024,
    extension: 'html',
    sizeLabel: 'Открывается в браузере',
  },
}

const CONTENT_GROUPS: {
  id: string
  title: string
  icon: React.ReactNode
  accent: string
  items: { id: string; label: string; description: string; meta: string }[]
}[] = [
  {
    id: 'core',
    title: 'Основная информация',
    icon: <FileText className="w-4 h-4 text-purple-700 dark:text-purple-400" />,
    accent: 'purple',
    items: [
      {
        id: 'brief',
        label: 'Краткое изложение дела',
        description: 'Итоговое резюме по делу от ИИ',
        meta: '~12 КБ',
      },
      {
        id: 'dashboard',
        label: 'Статистика dashboard',
        description: 'Сводные показатели и счётчики',
        meta: '~8 КБ',
      },
      {
        id: 'timeline',
        label: 'Хронология событий',
        description: 'Лента всех ключевых событий дела',
        meta: '~24 КБ',
      },
      {
        id: 'risk',
        label: 'Оценка рисков',
        description: 'Матрица рисков 5×5 и факторы',
        meta: '~18 КБ',
      },
    ],
  },
  {
    id: 'persons',
    title: 'Участники и эпизоды',
    icon: <Users className="w-4 h-4 text-red-700 dark:text-red-400" />,
    accent: 'red',
    items: [
      {
        id: 'persons-list',
        label: 'Список участников (5)',
        description: 'Все участники дела с ролями и статусами',
        meta: '~22 КБ',
      },
      {
        id: 'episodes',
        label: 'Эпизоды преступления (3)',
        description: 'Полное описание всех эпизодов',
        meta: '~30 КБ',
      },
      {
        id: 'guilt',
        label: 'Оценка виновности',
        description: 'Распределение вины и силы доказательств',
        meta: '~14 КБ',
      },
      {
        id: 'defense',
        label: 'Линии защиты',
        description: 'Стратегии защиты и их оценка',
        meta: '~16 КБ',
      },
    ],
  },
  {
    id: 'documents',
    title: 'Документы и доказательства',
    icon: <Files className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    accent: 'amber',
    items: [
      {
        id: 'documents-registry',
        label: 'Реестр документов',
        description: 'Полный перечень всех документов дела',
        meta: '~28 КБ',
      },
      {
        id: 'evidence-chain',
        label: 'Цепочка доказательств',
        description: 'Граф связей между доказательствами',
        meta: '~32 КБ',
      },
      {
        id: 'witness-matrix',
        label: 'Матрица показаний',
        description: 'Согласованность показаний свидетелей',
        meta: '~26 КБ',
      },
      {
        id: 'cross-refs',
        label: 'Перекрёстные ссылки',
        description: 'Ссылки между документами дела',
        meta: '~12 КБ',
      },
    ],
  },
  {
    id: 'legal',
    title: 'Правовой анализ',
    icon: <Scale className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
    accent: 'emerald',
    items: [
      {
        id: 'compliance',
        label: 'Проверки соответствия',
        description: 'Результаты правовых проверок',
        meta: '~18 КБ',
      },
      {
        id: 'deadlines',
        label: 'Процессуальные сроки',
        description: 'Все сроки по УПК РФ',
        meta: '~10 КБ',
      },
      {
        id: 'sentence-calc',
        label: 'Калькулятор наказания',
        description: 'Расчёт наказания и сделок',
        meta: '~20 КБ',
      },
      {
        id: 'recommendations',
        label: 'Рекомендации защиты',
        description: 'ИИ-рекомендации по стратегии',
        meta: '~15 КБ',
      },
    ],
  },
]

const ALL_ITEM_IDS = CONTENT_GROUPS.flatMap((g) => g.items.map((i) => i.id))

const STATUS_CONFIG: Record<
  ExportStatus,
  { label: string; badgeClass: string; dotClass: string; icon: React.ReactNode }
> = {
  ready: {
    label: 'Готово',
    badgeClass: 'bg-emerald-700 text-white',
    dotClass: 'bg-emerald-600',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  processing: {
    label: 'В процессе',
    badgeClass: 'bg-amber-600 text-white',
    dotClass: 'bg-amber-500',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  error: {
    label: 'Ошибка',
    badgeClass: 'bg-red-700 text-white',
    dotClass: 'bg-red-600',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
}

const INITIAL_RECENT_EXPORTS: RecentExport[] = [
  {
    id: 'exp1',
    date: '2024-03-20T14:30:00',
    format: 'PDF',
    elementsCount: 16,
    size: 2_458_000,
    status: 'ready',
  },
  {
    id: 'exp2',
    date: '2024-03-19T10:15:00',
    format: 'JSON',
    elementsCount: 12,
    size: 850_000,
    status: 'ready',
  },
  {
    id: 'exp3',
    date: '2024-03-18T16:45:00',
    format: 'CSV',
    elementsCount: 4,
    size: 124_000,
    status: 'ready',
  },
  {
    id: 'exp4',
    date: '2024-03-17T09:20:00',
    format: 'PDF',
    elementsCount: 8,
    size: 1_180_000,
    status: 'error',
  },
  {
    id: 'exp5',
    date: '2024-03-16T11:00:00',
    format: 'HTML',
    elementsCount: 16,
    size: 540_000,
    status: 'ready',
  },
]

// ===== Helpers =====
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function estimateSize(
  selectedItems: Set<string>,
  format: ExportFormat,
  options: ExportOptions,
): number {
  const perItem = FORMAT_CONFIG[format].perItemBytes
  let bytes = selectedItems.size * perItem
  // AI analysis adds ~20% overhead per item
  if (options.includeAI) bytes = Math.round(bytes * 1.2)
  // Charts as images adds ~15% overhead (only PDF/HTML)
  if (options.includeCharts && (format === 'pdf' || format === 'html')) {
    bytes = Math.round(bytes * 1.15)
  }
  // Both languages double the size
  if (options.language === 'both') bytes *= 2
  // Encryption adds small constant overhead
  if (options.encrypt) bytes += 4096
  return bytes
}

function buildFileName(format: ExportFormat, options: ExportOptions): string {
  const date = new Date()
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const langSuffix = options.language === 'both' ? '-ru-en' : options.language === 'en' ? '-en' : '-ru'
  return `delo-${CASE_NUMBER}-${ymd}${langSuffix}.${FORMAT_CONFIG[format].extension}`
}

function formatDateRu(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ===== Main Component =====
export function CaseExportCenter() {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    () => new Set(ALL_ITEM_IDS.slice(0, 12)),
  )
  const [options, setOptions] = useState<ExportOptions>({
    language: 'ru',
    includeAI: true,
    includeCharts: true,
    pageFormat: 'a4',
    orientation: 'portrait',
    watermark: true,
    encrypt: false,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [recentExports, setRecentExports] = useState<RecentExport[]>(INITIAL_RECENT_EXPORTS)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [resultSheetOpen, setResultSheetOpen] = useState(false)
  const [generatedFileName, setGeneratedFileName] = useState<string>('')
  const [generatedFileSize, setGeneratedFileSize] = useState<number>(0)

  const totalItems = ALL_ITEM_IDS.length
  const selectedCount = selectedItems.size

  const estimatedBytes = useMemo(
    () => estimateSize(selectedItems, selectedFormat, options),
    [selectedItems, selectedFormat, options],
  )

  // ===== Item toggle helpers =====
  const toggleItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(ALL_ITEM_IDS))
    toast.success(`Выбрано всех элементов: ${ALL_ITEM_IDS.length}`)
  }, [])

  const clearAll = useCallback(() => {
    setSelectedItems(new Set())
    toast.info('Снимок выбора очищен')
  }, [])

  const updateOption = useCallback(
    <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
      setOptions((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  // ===== Generate export =====
  const generateExport = useCallback(async () => {
    if (selectedItems.size === 0) {
      toast.error('Выберите хотя бы один элемент для экспорта')
      return
    }
    setIsGenerating(true)
    setProgress(0)
    const fileName = buildFileName(selectedFormat, options)
    const fileSize = estimateSize(selectedItems, selectedFormat, options)
    setGeneratedFileName(fileName)
    setGeneratedFileSize(fileSize)

    // Simulate progress
    const steps = [
      { pct: 15, label: 'Сбор данных из базы...' },
      { pct: 35, label: 'Формирование разделов...' },
      { pct: 55, label: 'Генерация графиков...' },
      { pct: 75, label: options.includeAI ? 'Анализ ИИ...' : 'Применение опций...' },
      { pct: 90, label: 'Сборка файла...' },
      { pct: 100, label: 'Готово' },
    ]
    for (const step of steps) {
      setProgress(step.pct)
      await new Promise((r) => setTimeout(r, 250))
    }

    setIsGenerating(false)
    setProgress(0)

    // Add to recent exports
    const newEntry: RecentExport = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString(),
      format: FORMAT_CONFIG[selectedFormat].shortLabel,
      elementsCount: selectedItems.size,
      size: fileSize,
      status: 'ready',
    }
    setRecentExports((prev) => [newEntry, ...prev].slice(0, 8))

    toast.success('Экспорт дела сформирован', {
      description: `${FORMAT_CONFIG[selectedFormat].shortLabel} · ${selectedItems.size} элем. · ${formatFileSize(fileSize)}`,
      duration: 4000,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    })

    setTimeout(() => setResultSheetOpen(true), 900)
  }, [selectedItems, selectedFormat, options])

  // ===== Download handler (browser blob) =====
  const handleDownload = useCallback(() => {
    if (typeof window === 'undefined') return
    // Generate a small placeholder blob with a stub header
    const header = `% Дело № ${CASE_NUMBER}\n% Формат: ${FORMAT_CONFIG[selectedFormat].shortLabel}\n% Элементов: ${selectedItems.size}\n% Дата: ${new Date().toISOString()}\n% Сгенерировано Системой Управления Уголовным Делом\n\n`
    const body = Array.from(selectedItems)
      .map((id) => `## ${id}\n[содержимое раздела — заглушка для демо]\n`)
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = generatedFileName || `delo-${CASE_NUMBER}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Файл сохранён в загрузки', {
      description: generatedFileName,
    })
  }, [selectedFormat, selectedItems, generatedFileName])

  // ===== Re-download from history =====
  const handleReDownload = useCallback((entry: RecentExport) => {
    if (entry.status === 'error') {
      toast.error('Этот экспорт завершился ошибкой — повторите генерацию')
      return
    }
    if (entry.status === 'processing') {
      toast.info('Экспорт ещё формируется, подождите...')
      return
    }
    const blob = new Blob(
      [`Дело № ${CASE_NUMBER} · ${entry.format} · ${entry.elementsCount} элем.\nЗаглушка исторического файла.`],
      { type: 'text/plain;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `delo-${CASE_NUMBER}-${entry.id}.${String(entry.format).toLowerCase()}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Повторное скачивание запущено', { description: `Формат ${entry.format}` })
  }, [])

  const selectedFormatConfig = FORMAT_CONFIG[selectedFormat]

  // ===== Render =====
  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 pb-28">
        {/* ===== Section 1: Header Banner ===== */}
        <Card className="rounded-xl shadow-sm border-l-4 border-purple-700 bg-gradient-to-r from-purple-900/30 via-stone-900/20 to-stone-900/20 overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-purple-700/20 dark:bg-purple-950/40 shrink-0">
                <Package className="w-6 h-6 sm:w-7 sm:h-7 text-purple-700 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Центр экспорта материалов дела
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Дело № {CASE_NUMBER} · Подготовка материалов для печати, передачи и архивирования
                </p>
              </div>
              <Badge className="bg-purple-700 text-white gap-1 shrink-0">
                <Sparkles className="w-3 h-3" /> ИИ-помощник
              </Badge>
            </div>

            {/* Quick info strip */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-lg bg-background/60 dark:bg-background/30 backdrop-blur p-2.5 sm:p-3 border border-purple-700/20">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Форматов</div>
                <div className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-400">4</div>
              </div>
              <div className="rounded-lg bg-background/60 dark:bg-background/30 backdrop-blur p-2.5 sm:p-3 border border-purple-700/20">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Элементов</div>
                <div className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-400">{totalItems}</div>
              </div>
              <div className="rounded-lg bg-background/60 dark:bg-background/30 backdrop-blur p-2.5 sm:p-3 border border-purple-700/20">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Выбрано</div>
                <div className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-400">{selectedCount}</div>
              </div>
              <div className="rounded-lg bg-background/60 dark:bg-background/30 backdrop-blur p-2.5 sm:p-3 border border-purple-700/20">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Размер</div>
                <div className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-400">
                  {formatFileSize(estimatedBytes)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== Section 2: Format Selection ===== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileType className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              Шаг 1. Выберите формат экспорта
            </h3>
            <Badge variant="outline" className="text-xs">
              Текущий: {selectedFormatConfig.shortLabel}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((fmtKey) => {
              const cfg = FORMAT_CONFIG[fmtKey]
              const isActive = selectedFormat === fmtKey
              return (
                <Card
                  key={fmtKey}
                  className={`rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                    isActive
                      ? `ring-2 ${cfg.ringClass} border-transparent`
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                  onClick={() => {
                    setSelectedFormat(fmtKey)
                    toast.info(`Выбран формат: ${cfg.label}`, {
                      description: cfg.sizeLabel,
                    })
                  }}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-xl ${cfg.tileBg}`}
                      >
                        {cfg.icon && (
                          <span className={cfg.iconColor}>{cfg.icon}</span>
                        )}
                      </div>
                      {isActive ? (
                        <Badge className={`${cfg.tileBg} ${cfg.iconColor} border-0`}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Выбран
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {cfg.shortLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm sm:text-base leading-tight">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                        {cfg.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <HardDrive className="w-3 h-3" /> ~{formatFileSize(cfg.perItemBytes)}/элем.
                      </span>
                      <Button
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        className={`h-7 text-xs gap-1 ${
                          isActive ? cfg.buttonActiveClass : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFormat(fmtKey)
                        }}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Выбран
                          </>
                        ) : (
                          <>Выбрать</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* ===== Section 3: Content Selection ===== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              Шаг 2. Выберите содержание
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className="bg-purple-700 text-white gap-1"
                variant="secondary"
              >
                <CheckSquare className="w-3 h-3" />
                Выбрано: {selectedCount} из {totalItems}
              </Badge>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={selectAll}>
                <CheckSquare className="w-3 h-3" /> Выбрать все
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={clearAll}>
                <Square className="w-3 h-3" /> Очистить
              </Button>
            </div>
          </div>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4 sm:p-5">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Заполнение экспорта</span>
                  <span className="font-medium tabular-nums text-purple-700 dark:text-purple-400">
                    {Math.round((selectedCount / totalItems) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(selectedCount / totalItems) * 100}
                  className="h-1.5 bg-purple-700/15"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {CONTENT_GROUPS.map((group) => {
                  const groupSelectedCount = group.items.filter((i) =>
                    selectedItems.has(i.id),
                  ).length
                  const allGroupSelected = groupSelectedCount === group.items.length
                  return (
                    <div
                      key={group.id}
                      className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background border border-border shrink-0">
                            {group.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm leading-tight truncate">
                              {group.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {groupSelectedCount}/{group.items.length} выбрано
                            </p>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 shrink-0"
                              onClick={() => {
                                const next = new Set(selectedItems)
                                if (allGroupSelected) {
                                  group.items.forEach((i) => next.delete(i.id))
                                } else {
                                  group.items.forEach((i) => next.add(i.id))
                                }
                                setSelectedItems(next)
                              }}
                            >
                              {allGroupSelected ? 'Снять' : 'Все'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {allGroupSelected
                              ? 'Снять выделение со всей категории'
                              : 'Выбрать все элементы категории'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Separator />
                      <div className="space-y-2.5">
                        {group.items.map((item) => {
                          const checked = selectedItems.has(item.id)
                          return (
                            <label
                              key={item.id}
                              className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-purple-700/10 dark:bg-purple-950/30'
                                  : 'hover:bg-muted/60'
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="mt-0.5 data-[state=checked]:bg-purple-700 data-[state=checked]:border-purple-700"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium leading-tight">
                                    {item.label}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-muted-foreground shrink-0"
                                  >
                                    {item.meta}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                  {item.description}
                                </p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Section 4: Export Options ===== */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-purple-700 dark:text-purple-400" />
            Шаг 3. Параметры экспорта
          </h3>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
                {/* Language */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-700/15 dark:bg-purple-950/40 shrink-0">
                      <Languages className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-sm font-medium cursor-pointer">Язык</Label>
                      <p className="text-xs text-muted-foreground">Язык выгружаемых материалов</p>
                    </div>
                  </div>
                  <Select
                    value={options.language}
                    onValueChange={(v) => updateOption('language', v as ExportOptions['language'])}
                  >
                    <SelectTrigger className="w-32 sm:w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="both">Оба</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Include AI analysis */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-700/15 dark:bg-purple-950/40 shrink-0">
                      <Sparkles className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-sm font-medium cursor-pointer">
                        Включить ИИ-анализ
                      </Label>
                      <p className="text-xs text-muted-foreground">Аналитические блоки и прогнозы</p>
                    </div>
                  </div>
                  <Switch
                    checked={options.includeAI}
                    onCheckedChange={(v) => updateOption('includeAI', v)}
                    className="data-[state=checked]:bg-purple-700"
                  />
                </div>

                {/* Include charts as images */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-700/15 dark:bg-purple-950/40 shrink-0">
                      <ImageIcon className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-sm font-medium cursor-pointer">
                        Графики как изображения
                      </Label>
                      <p className="text-xs text-muted-foreground">Встраивать графики в PNG</p>
                    </div>
                  </div>
                  <Switch
                    checked={options.includeCharts}
                    onCheckedChange={(v) => updateOption('includeCharts', v)}
                    className="data-[state=checked]:bg-purple-700"
                  />
                </div>

                {/* Page format */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-700/15 dark:bg-purple-950/40 shrink-0">
                      <FilePage className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-sm font-medium cursor-pointer">
                        Формат страницы
                      </Label>
                      <p className="text-xs text-muted-foreground">Только для PDF и HTML</p>
                    </div>
                  </div>
                  <Select
                    value={options.pageFormat}
                    onValueChange={(v) => updateOption('pageFormat', v as ExportOptions['pageFormat'])}
                  >
                    <SelectTrigger className="w-32 sm:w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="a3">A3</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Orientation */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-700/15 dark:bg-purple-950/40 shrink-0">
                      <LayoutGrid className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-sm font-medium cursor-pointer">
                        Ориентация
                      </Label>
                      <p className="text-xs text-muted-foreground">Расположение страниц</p>
                    </div>
                  </div>
                  <Select
                    value={options.orientation}
                    onValueChange={(v) => updateOption('orientation', v as ExportOptions['orientation'])}
                  >
                    <SelectTrigger className="w-32 sm:w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Книжная</SelectItem>
                      <SelectItem value="landscape">Альбомная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Watermark */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-700/15 dark:bg-purple-950/40 shrink-0">
                      <Stamp className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-sm font-medium cursor-pointer">
                        Водяной знак с номером дела
                      </Label>
                      <p className="text-xs text-muted-foreground">«Дело № {CASE_NUMBER}» на каждой странице</p>
                    </div>
                  </div>
                  <Switch
                    checked={options.watermark}
                    onCheckedChange={(v) => updateOption('watermark', v)}
                    className="data-[state=checked]:bg-purple-700"
                  />
                </div>

                {/* Encrypt PDF */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 lg:col-span-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-700/15 dark:bg-purple-950/40 shrink-0">
                      <Lock className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-sm font-medium cursor-pointer">
                        Зашифровать PDF
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Защита паролем и ограничение печати (только PDF)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={options.encrypt}
                    onCheckedChange={(v) => updateOption('encrypt', v)}
                    className="data-[state=checked]:bg-purple-700"
                  />
                </div>
              </div>

              {options.encrypt && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-snug">
                    Зашифрованный PDF будет защищён паролем. Запомните пароль — без него открыть файл будет невозможно.
                    Защита действует только для формата PDF.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== Section 5: Action Bar (sticky) ===== */}
        <div className="sticky bottom-3 z-30">
          <Card className="rounded-xl shadow-lg border-purple-700/30 bg-background/95 backdrop-blur">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Summary left */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${selectedFormatConfig.tileBg}`}
                  >
                    {isGenerating ? (
                      <Loader2 className={`w-5 h-5 animate-spin ${selectedFormatConfig.iconColor}`} />
                    ) : (
                      <span className={selectedFormatConfig.iconColor}>
                        {selectedFormatConfig.icon}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      {isGenerating ? 'Идёт формирование экспорта...' : 'Готово к экспорту'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Формат: {selectedFormatConfig.shortLabel} · {selectedCount} элемент. · ~
                      {formatFileSize(estimatedBytes)}
                      {options.language === 'both' ? ' · RU+EN' : ''}
                      {options.encrypt ? ' · 🔒 шифр.' : ''}
                    </p>
                  </div>
                  {isGenerating && (
                    <div className="hidden sm:flex items-center gap-2 ml-2 min-w-[160px]">
                      <Progress
                        value={progress}
                        className="h-1.5 bg-purple-700/15"
                      />
                      <span className="text-xs tabular-nums text-purple-700 dark:text-purple-400 shrink-0">
                        {progress}%
                      </span>
                    </div>
                  )}
                </div>
                {/* Buttons right */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => setPreviewOpen(true)}
                    disabled={isGenerating || selectedItems.size === 0}
                  >
                    <Eye className="w-4 h-4" /> Предпросмотр
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-purple-700 text-white hover:bg-purple-800"
                    onClick={generateExport}
                    disabled={isGenerating || selectedItems.size === 0}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Формируется...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Сгенерировать экспорт
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Section 6: Recent Exports History ===== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              История экспортов
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <HardDrive className="w-3 h-3" />
                Всего: {recentExports.length}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setRecentExports(INITIAL_RECENT_EXPORTS)
                  toast.info('История обновлена')
                }}
              >
                <RefreshCw className="w-3 h-3" /> Обновить
              </Button>
            </div>
          </div>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[140px]">Дата</TableHead>
                      <TableHead className="min-w-[90px]">Формат</TableHead>
                      <TableHead className="text-center min-w-[80px]">Элементов</TableHead>
                      <TableHead className="text-right min-w-[90px]">Размер</TableHead>
                      <TableHead className="text-center min-w-[110px]">Статус</TableHead>
                      <TableHead className="text-right min-w-[80px]">Действие</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentExports.map((entry) => {
                      const cfg = FORMAT_CONFIG[
                        String(entry.format).toLowerCase() as ExportFormat
                      ]
                      const status = STATUS_CONFIG[entry.status]
                      return (
                        <TableRow key={entry.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-purple-700 dark:text-purple-400" />
                              {formatDateRu(entry.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex items-center justify-center w-7 h-7 rounded-md ${cfg?.tileBg ?? 'bg-stone-500/15'}`}
                              >
                                <span className={cfg?.iconColor ?? 'text-stone-500'}>
                                  {cfg?.icon ?? <FileText className="w-4 h-4" />}
                                </span>
                              </div>
                              <span className="text-sm font-medium">{entry.format}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm tabular-nums">
                            {entry.elementsCount}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatFileSize(entry.size)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`gap-1 ${status.badgeClass}`}>
                              {status.icon}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleReDownload(entry)}
                                  disabled={entry.status !== 'ready'}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {entry.status === 'ready'
                                  ? 'Скачать повторно'
                                  : entry.status === 'processing'
                                    ? 'Файл ещё формируется'
                                    : 'Экспорт завершился с ошибкой'}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Footer info */}
              <div className="border-t p-3 flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Готово
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> В процессе
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600" /> Ошибка
                  </span>
                </div>
                <span>
                  Всего: {recentExports.length} · Объём:{' '}
                  {formatFileSize(
                    recentExports.reduce((acc, e) => acc + (e.status === 'ready' ? e.size : 0), 0),
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Preview Dialog ===== */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                Предпросмотр экспорта
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedFormatConfig.label} · {selectedCount} элементов · ~
                {formatFileSize(estimatedBytes)}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
              {/* Mock document preview */}
              <div className="rounded-lg border bg-muted/20 p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Система Управления Уголовным Делом
                    </p>
                    <h4 className="text-base font-bold">
                      Дело № {CASE_NUMBER}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Колесниченко Д.А. и другие
                    </p>
                  </div>
                  <Badge className="bg-purple-700 text-white gap-1">
                    {selectedFormatConfig.shortLabel}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Содержание
                  </p>
                  <ul className="text-xs space-y-1">
                    {CONTENT_GROUPS.map((g) =>
                      g.items
                        .filter((i) => selectedItems.has(i.id))
                        .map((i) => (
                          <li key={i.id} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-purple-700" />
                            <span className="font-medium">{i.label}</span>
                            <span className="text-muted-foreground">— {i.description}</span>
                          </li>
                        )),
                    )}
                    {selectedItems.size === 0 && (
                      <li className="text-xs text-muted-foreground italic">
                        Нет выбранных элементов
                      </li>
                    )}
                  </ul>
                </div>
                <Separator />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-background/60 p-2">
                    <p className="text-muted-foreground text-[10px]">Язык</p>
                    <p className="font-medium">
                      {options.language === 'ru'
                        ? 'Русский'
                        : options.language === 'en'
                          ? 'English'
                          : 'Русский + English'}
                    </p>
                  </div>
                  <div className="rounded-md bg-background/60 p-2">
                    <p className="text-muted-foreground text-[10px]">Формат страницы</p>
                    <p className="font-medium uppercase">
                      {options.pageFormat} ·{' '}
                      {options.orientation === 'portrait' ? 'книжн.' : 'альбомн.'}
                    </p>
                  </div>
                  <div className="rounded-md bg-background/60 p-2">
                    <p className="text-muted-foreground text-[10px]">Опции</p>
                    <p className="font-medium">
                      {options.includeAI ? 'ИИ ' : ''}
                      {options.includeCharts ? '📊 ' : ''}
                      {options.watermark ? 'watermark ' : ''}
                      {options.encrypt ? '🔒' : ''}
                      {!options.includeAI &&
                      !options.includeCharts &&
                      !options.watermark &&
                      !options.encrypt
                        ? '—'
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic text-center">
                Это упрощённый макет предпросмотра. Полный файл будет сформирован при генерации.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
                Закрыть
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-purple-700 text-white hover:bg-purple-800"
                onClick={() => {
                  setPreviewOpen(false)
                  generateExport()
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Сгенерировать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== Result Sheet ===== */}
        <Sheet open={resultSheetOpen} onOpenChange={setResultSheetOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-md flex flex-col gap-0 p-0"
          >
            <SheetHeader className="p-4 border-b bg-purple-700/5">
              <SheetTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Экспорт сформирован
              </SheetTitle>
              <SheetDescription className="text-xs">
                Файл готов к скачиванию и передаче.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* File icon + name */}
              <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/20">
                <div
                  className={`flex items-center justify-center w-14 h-14 rounded-xl shrink-0 ${selectedFormatConfig.tileBg}`}
                >
                  <span className={selectedFormatConfig.iconColor}>
                    {selectedFormatConfig.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Имя файла
                  </p>
                  <p className="text-sm font-medium break-all leading-tight">
                    {generatedFileName}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {selectedFormatConfig.shortLabel}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {formatFileSize(generatedFileSize)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedCount} элем.
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Details list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Параметры экспорта
                </p>
                <div className="rounded-lg border divide-y">
                  {[
                    {
                      label: 'Формат',
                      value: selectedFormatConfig.label,
                      icon: <FileType className="w-3.5 h-3.5" />,
                    },
                    {
                      label: 'Язык',
                      value:
                        options.language === 'ru'
                          ? 'Русский'
                          : options.language === 'en'
                            ? 'English'
                            : 'Русский + English',
                      icon: <Languages className="w-3.5 h-3.5" />,
                    },
                    {
                      label: 'Элементов',
                      value: `${selectedCount} из ${totalItems}`,
                      icon: <ListChecks className="w-3.5 h-3.5" />,
                    },
                    {
                      label: 'ИИ-анализ',
                      value: options.includeAI ? 'Включён' : 'Выключен',
                      icon: <Sparkles className="w-3.5 h-3.5" />,
                    },
                    {
                      label: 'Графики',
                      value: options.includeCharts ? 'Как PNG' : 'Не включать',
                      icon: <ImageIcon className="w-3.5 h-3.5" />,
                    },
                    {
                      label: 'Страница',
                      value: `${options.pageFormat.toUpperCase()} · ${
                        options.orientation === 'portrait' ? 'Книжная' : 'Альбомная'
                      }`,
                      icon: <FilePage className="w-3.5 h-3.5" />,
                    },
                    {
                      label: 'Водяной знак',
                      value: options.watermark ? `Дело № ${CASE_NUMBER}` : 'Нет',
                      icon: <Stamp className="w-3.5 h-3.5" />,
                    },
                    {
                      label: 'Шифрование',
                      value: options.encrypt ? 'Включено (пароль)' : 'Выключено',
                      icon: <Shield className="w-3.5 h-3.5" />,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-2 p-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0 text-xs text-muted-foreground">
                        {row.icon}
                        <span>{row.label}</span>
                      </div>
                      <span className="text-xs font-medium text-right truncate">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action suggestions */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Что дальше?
                </p>
                <div className="space-y-1.5">
                  {[
                    { icon: <Download className="w-3.5 h-3.5" />, text: 'Сохранить в загрузки' },
                    { icon: <Files className="w-3.5 h-3.5" />, text: 'Передать в архив дела' },
                    { icon: <Printer className="w-3.5 h-3.5" />, text: 'Отправить на печать' },
                    { icon: <Shield className="w-3.5 h-3.5" />, text: 'Подписать ЭЦП адвоката' },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs"
                    >
                      <span className="text-purple-700 dark:text-purple-400">{s.icon}</span>
                      <span className="flex-1">{s.text}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter className="p-4 border-t flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setResultSheetOpen(false)}
              >
                Закрыть
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-purple-700 text-white hover:bg-purple-800"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                Скачать
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
