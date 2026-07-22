'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  Cell, Legend,
} from 'recharts'
import {
  Shield, Scale, AlertTriangle, CheckCircle, TrendingUp, Loader2,
  X, ChevronDown, ChevronUp, Zap, Brain, Target, Swords,
  Clock, FileText, Star, ArrowRight, BarChart3, Network,
  Eye, RefreshCw, Users
} from 'lucide-react'
import { mockDefenseLines, mockPersons } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { DefenseLineData } from '@/lib/case-store'

const STRENGTH_COLORS: Record<string, { className: string; label: string; numeric: number; color: string }> = {
  'strong': { className: 'bg-emerald-700 text-white', label: 'Сильная', numeric: 85, color: '#059669' },
  'moderate': { className: 'bg-amber-600 text-white', label: 'Средняя', numeric: 50, color: '#d97706' },
  'weak': { className: 'bg-red-700 text-white', label: 'Слабая', numeric: 25, color: '#b91c1c' },
}

const STRATEGY_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  'innocence': { label: 'Непризнание вины', icon: <Shield className="w-3 h-3" />, className: 'bg-emerald-700 text-white' },
  'mitigating': { label: 'Смягчающие обстоятельства', icon: <TrendingUp className="w-3 h-3" />, className: 'bg-amber-600 text-white' },
  'procedural_violation': { label: 'Процессуальные нарушения', icon: <AlertTriangle className="w-3 h-3" />, className: 'bg-red-700 text-white' },
  'alibi': { label: 'Алиби', icon: <CheckCircle className="w-3 h-3" />, className: 'bg-emerald-700 text-white' },
  'reclassification': { label: 'Переквалификация', icon: <Scale className="w-3 h-3" />, className: 'bg-orange-600 text-white' },
  'lack_of_evidence': { label: 'Недоказанность', icon: <AlertTriangle className="w-3 h-3" />, className: 'bg-stone-600 text-white' },
  'statute_limitations': { label: 'Срок давности', icon: <Scale className="w-3 h-3" />, className: 'bg-stone-700 text-white' },
}

// Counter-arguments data for each strategy
const COUNTER_ARGUMENTS: Record<string, string[]> = {
  'innocence': [
    'Свидетельские показания подтверждают участие Колесниченко',
    'Финансовые документы указывают на хищение',
    'Отказ от дачи показаний по ст. 51 ухудшает позицию защиты',
  ],
  'procedural_violation': [
    'Нарушения могут быть устранены прокурором',
    'Ст. 237 УПК РФ не гарантирует прекращения дела',
    'Суд может не признать нарушения существенными',
  ],
  'reclassification': [
    'Размер хищения может быть подтверждён как особо крупный',
    'Использование служебного положения подтверждено свидетелями',
    'Практика судов по переквалификации ограничена',
  ],
  'lack_of_evidence': [
    'Косвенные доказательства могут быть достаточны',
    'Показания соучастников принимаются судом',
    'Бремя доказывания не на стороне обвиняемого',
  ],
  'mitigating': [
    'Смягчающие обстоятельства не исключают виновность',
    'Суд может не признать обстоятельства существенными',
    'Риск: признание смягчающих может подтвердить виновность',
  ],
  'statute_limitations': [
    'Для тяжких преступлений срок давности 10 лет',
    'Течение срока давности приостанавливается при расследовании',
    'Переквалификация на менее тяжкую статью не гарантирована',
  ],
}

// Custom Recharts tooltip - declared outside component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-stone-800 rounded-lg border border-stone-700 text-xs">
        <p className="font-medium text-stone-200 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-stone-400">
            <span className="font-medium" style={{ color: entry.color }}>{entry.name}</span>: {entry.value}%
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Risk assessment data
const RISK_DIMENSIONS = [
  { dimension: 'Доказательность', key: 'evidence' },
  { dimension: 'Процессуальность', key: 'procedure' },
  { dimension: 'Практика судов', key: 'practice' },
  { dimension: 'Общественный резонанс', key: 'public' },
  { dimension: 'Смягчающие', key: 'mitigating' },
]

export function CaseDefense() {
  const queryClient = useQueryClient()
  const [expandedStrategies, setExpandedStrategies] = useState<string[]>([])
  const [showComparisonMatrix, setShowComparisonMatrix] = useState(false)
  const [showRadarChart, setShowRadarChart] = useState(true)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showRiskAssessment, setShowRiskAssessment] = useState(false)

  // TanStack Query - persons
  const { data: persons = [], error: personsError } = useQuery({
    queryKey: ['persons'],
    queryFn: caseApi.getPersons,
  })
  const displayPersons = personsError ? mockPersons : persons

  // TanStack Query - defense lines
  const kolesnichenko = displayPersons.find(p => p.isKolesnichenko)
  const { data: defenseLines = [], error: defenseError, isLoading: isLoadingDefense } = useQuery({
    queryKey: ['defense', kolesnichenko?.id],
    queryFn: () => kolesnichenko ? caseApi.getDefenseLines(kolesnichenko.id) : Promise.resolve([]),
    enabled: !!kolesnichenko,
  })
  const displayDefense = defenseError ? mockDefenseLines : (defenseLines.length > 0 ? defenseLines : mockDefenseLines)

  // TanStack Query - analyze defense mutation
  const analyzeMutation = useMutation({
    mutationFn: caseApi.analyzeDefense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defense'] })
      toast.success('Анализ линии защиты обновлен')
    },
    onError: (error: Error) => {
      toast.error(`Ошибка анализа: ${error.message}`)
    },
  })

  const handleAnalyze = () => {
    if (kolesnichenko) {
      analyzeMutation.mutate(kolesnichenko.id)
    }
  }

  // Calculations
  const strongCount = displayDefense.filter(dl => dl.strength === 'strong').length
  const moderateCount = displayDefense.filter(dl => dl.strength === 'moderate').length
  const weakCount = displayDefense.filter(dl => dl.strength === 'weak').length
  const overallStrength = displayDefense.length > 0
    ? Math.round((strongCount * 85 + moderateCount * 50 + weakCount * 25) / displayDefense.length)
    : 0

  // Sorted by recommendation ranking (strength * probability)
  const rankedStrategies = useMemo(() => {
    return [...displayDefense].sort((a, b) => {
      const scoreA = (STRENGTH_COLORS[a.strength || 'weak']?.numeric || 25) * (parseFloat(a.probability || '0') || 0)
      const scoreB = (STRENGTH_COLORS[b.strength || 'weak']?.numeric || 25) * (parseFloat(b.probability || '0') || 0)
      return scoreB - scoreA
    })
  }, [displayDefense])

  // Radar chart data - defense strengths per dimension
  const radarData = useMemo(() => {
    const dimensions = [
      { dimension: 'Доказательность', innocence: 15, procedural: 65, reclassification: 40, lack_of_evidence: 50, mitigating: 85, statute: 10 },
      { dimension: 'Правовая основа', innocence: 30, procedural: 80, reclassification: 55, lack_of_evidence: 70, mitigating: 90, statute: 20 },
      { dimension: 'Суд. практика', innocence: 10, procedural: 45, reclassification: 35, lack_of_evidence: 40, mitigating: 85, statute: 15 },
      { dimension: 'Риск провала', innocence: 85, procedural: 55, reclassification: 65, lack_of_evidence: 70, mitigating: 15, statute: 90 },
      { dimension: 'Публичность', innocence: 60, procedural: 40, reclassification: 30, lack_of_evidence: 35, mitigating: 20, statute: 50 },
    ]
    return dimensions
  }, [])

  // Probability bar chart data
  const probabilityData = useMemo(() => {
    return displayDefense.map(dl => ({
      name: STRATEGY_TYPE_LABELS[dl.strategyType]?.label || dl.strategyType,
      probability: parseFloat(dl.probability || '0'),
      strength: STRENGTH_COLORS[dl.strength || 'weak']?.numeric || 25,
      color: STRENGTH_COLORS[dl.strength || 'weak']?.color || '#78716c',
      strategyType: dl.strategyType,
    }))
  }, [displayDefense])

  // Timeline data (strategy evolution phases)
  const timelineData = [
    { phase: 'Начало расследования', date: 'Янв 2024', strategies: ['innocence'], description: 'Первоначальная позиция — отказ от признания вины' },
    { phase: 'Предъявление обвинения', date: 'Мар 2024', strategies: ['innocence', 'lack_of_evidence'], description: 'Добавление аргумента недоказанности' },
    { phase: 'Анализ нарушений', date: 'Апр 2024', strategies: ['procedural_violation', 'reclassification'], description: 'Выявление процессуальных нарушений' },
    { phase: 'Судебное разбирательство', date: 'Май 2024', strategies: ['mitigating', 'procedural_violation', 'reclassification'], description: 'Комплексная стратегия защиты' },
  ]

  // Comparison matrix data
  const comparisonMatrix = useMemo(() => {
    return displayDefense.map(dl => ({
      strategy: STRATEGY_TYPE_LABELS[dl.strategyType]?.label || dl.strategyType,
      strength: STRENGTH_COLORS[dl.strength || 'weak']?.label || 'Слабая',
      strengthNum: STRENGTH_COLORS[dl.strength || 'weak']?.numeric || 25,
      probability: dl.probability || '0%',
      evidence: dl.evidence ? 'Да' : 'Нет',
      legal: dl.articleReferences ? 'Да' : 'Нет',
      counterArgs: COUNTER_ARGUMENTS[dl.strategyType]?.length || 0,
      recommended: dl.strength === 'strong' || (dl.strength === 'moderate' && parseFloat(dl.probability || '0') > 30),
    }))
  }, [displayDefense])

  // Animated variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10 },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className="border-2 border-red-700/50">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  Линия защиты Колесниченко Д.А.
                </CardTitle>
                <CardDescription className="mt-1">
                  Комплексный анализ стратегий защиты с оценкой силы, вероятности успеха и рисков
                </CardDescription>
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} variant="destructive" className="gap-2 shrink-0">
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {analyzeMutation.isPending ? 'Анализ...' : 'Обновить анализ ИИ'}
                </Button>
              </motion.div>
            </div>
          </CardHeader>
          <CardContent>
            {kolesnichenko && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900 mb-4"
              >
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Обвиняемый:</h4>
                <p className="text-sm text-red-600 dark:text-red-300">{kolesnichenko.fullName}</p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {kolesnichenko.defenseStrategy || 'Стратегия не определена'}
                </p>
              </motion.div>
            )}

            {/* Overall Defense Strength */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Общая сила линии защиты</span>
                <span className="text-sm font-bold text-red-600">{overallStrength}%</span>
              </div>
              <Progress value={overallStrength} className="h-3" />
              <div className="flex gap-3 text-xs">
                <Badge className="bg-emerald-700 text-white"><CheckCircle className="w-2.5 h-2.5 mr-1" />{strongCount} сильных</Badge>
                <Badge className="bg-amber-600 text-white"><TrendingUp className="w-2.5 h-2.5 mr-1" />{moderateCount} средних</Badge>
                <Badge className="bg-red-700 text-white"><AlertTriangle className="w-2.5 h-2.5 mr-1" />{weakCount} слабых</Badge>
                <Badge variant="outline">{displayDefense.length} стратегий</Badge>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => setShowRadarChart(!showRadarChart)}>
                <Radar className="w-3 h-3" />
                {showRadarChart ? 'Скрыть радар' : 'Радарная диаграмма'}
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => setShowComparisonMatrix(!showComparisonMatrix)}>
                <BarChart3 className="w-3 h-3" />
                {showComparisonMatrix ? 'Скрыть матрицу' : 'Матрица сравнения'}
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => setShowTimeline(!showTimeline)}>
                <Clock className="w-3 h-3" />
                {showTimeline ? 'Скрыть timeline' : 'Эволюция стратегии'}
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => setShowRiskAssessment(!showRiskAssessment)}>
                <AlertTriangle className="w-3 h-3" />
                {showRiskAssessment ? 'Скрыть риски' : 'Оценка рисков'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Radar Chart - Strategy Strength Visualization */}
      <AnimatePresence>
        {showRadarChart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Radar className="h-4 w-4" />
                  Радарная диаграмма — сила стратегий защиты
                </CardTitle>
                <CardDescription className="text-xs">
                  Многомерная оценка каждой стратегии по ключевым параметрам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#6b7280' }} />
                      <Radar name="Процессуальные" dataKey="procedural" stroke="#b91c1c" fill="#b91c1c" fillOpacity={0.3} />
                      <Radar name="Смягчающие" dataKey="mitigating" stroke="#059669" fill="#059669" fillOpacity={0.3} />
                      <Radar name="Переквалификация" dataKey="reclassification" stroke="#d97706" fill="#d97706" fillOpacity={0.2} />
                      <Radar name="Недоказанность" dataKey="lack_of_evidence" stroke="#78716c" fill="#78716c" fillOpacity={0.15} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <RTooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Probability Bar Chart */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Вероятность успеха стратегий защиты
            </CardTitle>
            <CardDescription className="text-xs">
              Сравнение вероятностей успеха и силы аргументов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={probabilityData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} width={80} />
                  <RTooltip content={<CustomTooltip />} />
                  <Bar dataKey="probability" name="Вероятность (%)" radius={[4, 4, 4, 4]}>
                    {probabilityData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                  <Bar dataKey="strength" name="Сила аргумента (%)" fill="#374151" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Matrix */}
      <AnimatePresence>
        {showComparisonMatrix && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Матрица сравнения стратегий
                </CardTitle>
                <CardDescription className="text-xs">
                  Параллельное сравнение всех стратегий по ключевым параметрам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96 [&>div]:!overflow-y-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-left font-medium text-muted-foreground">Стратегия</th>
                          <th className="p-2 text-center font-medium text-muted-foreground">Сила</th>
                          <th className="p-2 text-center font-medium text-muted-foreground">Вероятность</th>
                          <th className="p-2 text-center font-medium text-muted-foreground">Доказательства</th>
                          <th className="p-2 text-center font-medium text-muted-foreground">Правовая основа</th>
                          <th className="p-2 text-center font-medium text-muted-foreground">Контраргументы</th>
                          <th className="p-2 text-center font-medium text-muted-foreground">Рекомендация</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonMatrix.map((row, i) => (
                          <motion.tr
                            key={row.strategy}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`border-b ${row.recommended ? 'bg-emerald-50/5 dark:bg-emerald-950/10' : ''}`}
                          >
                            <td className="p-2 font-medium">{row.strategy}</td>
                            <td className="p-2 text-center">
                              <Badge className={
                                row.strength === 'Сильная' ? 'bg-emerald-700 text-white'
                                : row.strength === 'Средняя' ? 'bg-amber-600 text-white'
                                : 'bg-red-700 text-white'
                              }>{row.strength}</Badge>
                            </td>
                            <td className="p-2 text-center font-medium">{row.probability}</td>
                            <td className="p-2 text-center">
                              {row.evidence === 'Да' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-red-600 mx-auto" />}
                            </td>
                            <td className="p-2 text-center">
                              {row.legal === 'Да' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-red-600 mx-auto" />}
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant="outline" className="text-xs">{row.counterArgs}</Badge>
                            </td>
                            <td className="p-2 text-center">
                              {row.recommended ? <Star className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strategy Evolution Timeline */}
      <AnimatePresence>
        {showTimeline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Эволюция стратегии защиты
                </CardTitle>
                <CardDescription className="text-xs">
                  Как развивалась линия защиты на разных этапах дела
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {timelineData.map((phase, i) => (
                    <motion.div
                      key={phase.phase}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex gap-4 pb-4"
                    >
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center shrink-0">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ delay: i * 0.2, duration: 0.5 }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-700 text-white text-xs font-bold"
                        >
                          {i + 1}
                        </motion.div>
                        {i < timelineData.length - 1 && (
                          <div className="w-0.5 h-full bg-stone-500 mt-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{phase.phase}</span>
                          <Badge variant="outline" className="text-xs">{phase.date}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{phase.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {phase.strategies.map(s => {
                            const info = STRATEGY_TYPE_LABELS[s]
                            return info ? (
                              <Badge key={s} className={info.className + ' text-xs'}>
                                {info.icon} {info.label}
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Assessment */}
      <AnimatePresence>
        {showRiskAssessment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-2 border-red-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Оценка рисков по стратегиям
                </CardTitle>
                <CardDescription className="text-xs">
                  Анализ контраргументов обвинения и рисков провала каждой стратегии
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96 [&>div]:!overflow-y-auto">
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                    {displayDefense.map((dl, i) => {
                      const strategyInfo = STRATEGY_TYPE_LABELS[dl.strategyType] || { label: dl.strategyType, icon: null, className: 'bg-stone-500 text-white' }
                      const counterArgs = COUNTER_ARGUMENTS[dl.strategyType] || []
                      const strengthInfo = STRENGTH_COLORS[dl.strength || 'weak'] || STRENGTH_COLORS['weak']

                      return (
                        <motion.div
                          key={dl.id}
                          variants={cardVariants}
                          className="p-4 bg-muted/30 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={strategyInfo.className}>{strategyInfo.icon} {strategyInfo.label}</Badge>
                            <span className="font-medium text-sm">{dl.title}</span>
                            <Badge className={strengthInfo.className}>{strengthInfo.label}</Badge>
                          </div>

                          {/* Risk level */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">Уровень риска:</span>
                            {dl.strength === 'strong' ? (
                              <Badge className="bg-emerald-700 text-white text-xs">Низкий</Badge>
                            ) : dl.strength === 'moderate' ? (
                              <Badge className="bg-amber-600 text-white text-xs">Средний</Badge>
                            ) : (
                              <Badge className="bg-red-700 text-white text-xs">Высокий</Badge>
                            )}
                          </div>

                          {/* Counter-arguments from prosecution */}
                          {counterArgs.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-xs font-medium mb-1.5 flex items-center gap-1">
                                <Swords className="w-3 h-3 text-red-600" />
                                Контраргументы обвинения:
                              </h4>
                              <div className="space-y-1">
                                {counterArgs.map((arg, j) => (
                                  <motion.div
                                    key={j}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: j * 0.1 + i * 0.1 }}
                                    className="flex items-start gap-2 p-2 bg-red-50/5 dark:bg-red-950/10 rounded-lg border border-red-200/20 dark:border-red-900/20"
                                  >
                                    <Target className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />
                                    <span className="text-xs text-red-700 dark:text-red-400">{arg}</span>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {isLoadingDefense && !defenseError && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-[100px] rounded-full" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-6 w-[60px] rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Strategy Recommendation Ranking */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-emerald-600" />
              Рейтинг стратегий защиты
            </CardTitle>
            <CardDescription className="text-xs">
              Стратегии, ранжированные по совокупной оценке (сила × вероятность)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96 [&>div]:!overflow-y-auto">
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                {rankedStrategies.map((dl, i) => {
                  const strategyInfo = STRATEGY_TYPE_LABELS[dl.strategyType] || { label: dl.strategyType, icon: null, className: 'bg-stone-500 text-white' }
                  const strengthInfo = STRENGTH_COLORS[dl.strength || 'weak'] || STRENGTH_COLORS['weak']
                  const score = strengthInfo.numeric * (parseFloat(dl.probability || '0') || 0)
                  const isTop = i === 0

                  return (
                    <motion.div
                      key={dl.id}
                      variants={cardVariants}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        isTop ? 'bg-emerald-50/5 dark:bg-emerald-950/10 border-emerald-700/50' : 'bg-muted/50 border-transparent hover:border-stone-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {/* Rank */}
                        <motion.div
                          animate={{ scale: isTop ? [1, 1.2, 1] : 1 }}
                          transition={{ repeat: isTop ? Infinity : 0, duration: 2 }}
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            isTop ? 'bg-emerald-700 text-white' : 'bg-stone-700 text-stone-200'
                          }`}
                        >
                          {i + 1}
                        </motion.div>

                        {/* Strategy info */}
                        <Badge className={strategyInfo.className}>{strategyInfo.icon} {strategyInfo.label}</Badge>
                        <span className="font-medium text-sm flex-1">{dl.title}</span>
                        <Badge className={strengthInfo.className}>{strengthInfo.label}</Badge>
                        {dl.probability && <Badge variant="outline" className="text-xs shrink-0">{dl.probability}</Badge>}
                      </div>

                      {/* Score bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">Совокупная оценка:</span>
                        <div className="flex-1">
                          <Progress value={Math.min(score / 85, 100)} className="h-2" />
                        </div>
                        <span className="text-xs font-medium shrink-0">{Math.round(score)}</span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{dl.description}</p>

                      {/* Evidence & legal refs indicators */}
                      <div className="flex items-center gap-3 mt-2">
                        {dl.evidence && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <FileText className="w-3 h-3" />
                            Доказательства
                          </div>
                        )}
                        {dl.articleReferences && (
                          <div className="flex items-center gap-1 text-xs text-stone-500">
                            <Scale className="w-3 h-3" />
                            Правовая основа
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Strategy Cards with Expand/Collapse */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Детальные стратегии защиты
            </CardTitle>
            <CardDescription className="text-xs">
              Полное описание каждой стратегии с доказательствами, правовой основой и контраргументами
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px] [&>div]:!overflow-y-auto">
              <Accordion type="multiple" className="w-full">
                {displayDefense.map((dl) => {
                  const strategyInfo = STRATEGY_TYPE_LABELS[dl.strategyType] || { label: dl.strategyType, icon: null, className: 'bg-stone-500 text-white' }
                  const strengthInfo = STRENGTH_COLORS[dl.strength || 'weak'] || STRENGTH_COLORS['weak']
                  const counterArgs = COUNTER_ARGUMENTS[dl.strategyType] || []

                  return (
                    <AccordionItem key={dl.id} value={dl.id}>
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2 text-left min-w-0 flex-1">
                          <Badge className={strategyInfo.className}>
                            {strategyInfo.icon}
                            <span className="ml-1">{strategyInfo.label}</span>
                          </Badge>
                          <span className="font-medium truncate text-sm">{dl.title}</span>
                          <Badge className={strengthInfo.className}>{strengthInfo.label}</Badge>
                          {dl.probability && (
                            <Badge variant="outline" className="text-xs shrink-0">{dl.probability}</Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-4 pt-2"
                        >
                          {/* Description */}
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Описание стратегии
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{dl.description}</p>
                          </div>

                          {/* Strength Progress */}
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Сила аргумента</span>
                              <span className="font-medium">{strengthInfo.label} ({strengthInfo.numeric}%)</span>
                            </div>
                            <Progress value={strengthInfo.numeric} className="h-2.5" />
                          </div>

                          {/* Evidence Mapping */}
                          {dl.evidence && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <h4 className="text-xs font-medium mb-1.5 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Карта доказательств
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">{dl.evidence}</p>
                            </div>
                          )}

                          {/* Article References */}
                          {dl.articleReferences && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <h4 className="text-xs font-medium mb-1.5 flex items-center gap-1">
                                <Scale className="w-3.5 h-3.5" />
                                Правовая основа
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">{dl.articleReferences}</p>
                            </div>
                          )}

                          {/* Probability */}
                          {dl.probability && (
                            <div className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded-lg">
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Вероятность успеха:</span>
                              <span className="font-medium">{dl.probability}</span>
                            </div>
                          )}

                          {/* Counter-argument Analysis */}
                          {counterArgs.length > 0 && (
                            <div className="p-3 bg-red-50/5 dark:bg-red-950/10 rounded-lg border border-red-200/20 dark:border-red-900/20">
                              <h4 className="text-xs font-medium mb-1.5 flex items-center gap-1 text-red-700 dark:text-red-400">
                                <Swords className="w-3.5 h-3.5" />
                                Контраргументы обвинения
                              </h4>
                              <div className="space-y-1">
                                {counterArgs.map((arg, j) => (
                                  <div key={j} className="flex items-start gap-2 text-xs">
                                    <Target className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />
                                    <span className="text-red-700 dark:text-red-400">{arg}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Risk level */}
                          <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-muted-foreground">Уровень риска:</span>
                            {dl.strength === 'strong' ? (
                              <Badge className="bg-emerald-700 text-white text-xs">Низкий</Badge>
                            ) : dl.strength === 'moderate' ? (
                              <Badge className="bg-amber-600 text-white text-xs">Средний</Badge>
                            ) : (
                              <Badge className="bg-red-700 text-white text-xs">Высокий</Badge>
                            )}
                          </div>
                        </motion.div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommended Strategy */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className="border-2 border-emerald-700/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Рекомендуемая стратегия
            </CardTitle>
            <CardDescription className="text-xs">
              Наиболее перспективное направление защиты на основе совокупной оценки
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const bestStrategy = rankedStrategies[0] || displayDefense.find(dl => dl.strength === 'strong') || displayDefense[0]
              if (!bestStrategy) return <p className="text-sm text-muted-foreground">Стратегии не определены</p>
              const strategyInfo = STRATEGY_TYPE_LABELS[bestStrategy.strategyType] || { label: bestStrategy.strategyType, icon: null, className: 'bg-stone-500 text-white' }
              const strengthInfo = STRENGTH_COLORS[bestStrategy.strength || 'weak'] || STRENGTH_COLORS['weak']
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-white"
                    >
                      <Star className="h-4 w-4" />
                    </motion.div>
                    <Badge className={strategyInfo.className}>{strategyInfo.icon} {strategyInfo.label}</Badge>
                    <span className="font-medium">{bestStrategy.title}</span>
                    <Badge className={strengthInfo.className}>{strengthInfo.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{bestStrategy.description}</p>
                  {bestStrategy.probability && (
                    <p className="text-sm font-medium">Вероятность успеха: {bestStrategy.probability}</p>
                  )}
                  {bestStrategy.evidence && (
                    <div className="p-3 bg-emerald-50/5 dark:bg-emerald-950/10 rounded-lg border border-emerald-200/20 dark:border-emerald-900/20">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Доказательства:
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-300">{bestStrategy.evidence}</p>
                    </div>
                  )}
                  {bestStrategy.articleReferences && (
                    <div className="p-3 bg-emerald-50/5 dark:bg-emerald-950/10 rounded-lg border border-emerald-200/20 dark:border-emerald-900/20">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        Правовая основа:
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-300">{bestStrategy.articleReferences}</p>
                    </div>
                  )}

                  {/* Complementary strategies */}
                  <div className="mt-3 pt-3 border-t">
                    <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                      <Network className="w-3 h-3" />
                      Дополнительные стратегии для комбинации:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {rankedStrategies.slice(1, 4).map(dl => {
                        const info = STRATEGY_TYPE_LABELS[dl.strategyType]
                        return info ? (
                          <Badge key={dl.id} className={info.className + ' text-xs'}>
                            {info.icon} {info.label} ({dl.probability || '?'})
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
