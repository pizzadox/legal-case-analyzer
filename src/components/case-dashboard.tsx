'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { Bar, BarChart, Pie, PieChart, Cell, Area, AreaChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Users, BookOpen, AlertTriangle, Clock, CheckCircle,
  Activity, Upload, Zap, Shield, Scale, TrendingUp, TrendingDown,
  Heart, Gauge, ArrowRight, Eye, RefreshCw, XCircle, Info,
  MapPin, ChevronRight, Sparkles, BarChart3, MessageSquare
} from 'lucide-react'
import { mockDashboardStats, mockPersons, mockEpisodes, mockCompliance } from '@/lib/mock-data'
import { getDashboardStats } from '@/lib/case-api'
import { useCaseStore } from '@/lib/case-store'
import type { DashboardStats } from '@/lib/case-store'

const guiltChartConfig = {
  'Высокая': { label: 'Высокая', color: '#dc2626' },
  'Средняя': { label: 'Средняя', color: '#ea580c' },
  'Низкая': { label: 'Низкая', color: '#ca8a04' },
  'Нет': { label: 'Нет', color: '#525252' },
} as const

const docTypeChartConfig = {
  'Обвинение': { label: 'Обвинение', color: '#dc2626' },
  'Показание': { label: 'Показание', color: '#ea580c' },
  'Протокол': { label: 'Протокол', color: '#ca8a04' },
  'Другое': { label: 'Другое', color: '#525252' },
} as const

const healthChartConfig = {
  score: { label: 'Оценка', color: '#ea580c' },
  threshold: { label: 'Порог', color: '#525252' },
} as const

const GUILT_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#525252']

const COMPLIANCE_COLORS: Record<string, string> = {
  violation: '#dc2626',
  warning: '#ea580c',
  compliant: '#16a34a',
  needs_review: '#ca8a04',
}

const SEVERITY_COLORS: Record<string, string> = {
  'особо тяжкое': '#dc2626',
  'тяжкое': '#ea580c',
  'средней тяжести': '#ca8a04',
  'небольшое': '#525252',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' Б'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ'
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ'
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-700 text-white"><CheckCircle className="w-3 h-3 mr-1" />Завершён</Badge>
    case 'processing':
      return <Badge variant="default" className="bg-orange-600 text-white"><Clock className="w-3 h-3 mr-1" />Обработка</Badge>
    case 'pending':
      return <Badge variant="secondary">Ожидание</Badge>
    case 'failed':
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Ошибка</Badge>
    case 'queued':
      return <Badge variant="outline">В очереди</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getGuiltLevelLabel(level: string): string {
  const map: Record<string, string> = {
    high: 'Высокая',
    moderate: 'Средняя',
    low: 'Низкая',
    none: 'Нет',
    unproven: 'Недоказана',
  }
  return map[level] || level
}

function getGuiltColor(level: string): string {
  const map: Record<string, string> = {
    high: '#dc2626',
    moderate: '#ea580c',
    low: '#ca8a04',
    none: '#525252',
    unproven: '#a1a1aa',
  }
  return map[level] || '#525252'
}

// Animated counter component
function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.floor(eased * value))
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span>{displayValue}</span>
}

// Case health score calculation
function calculateHealthScore(stats: DashboardStats | null): number {
  if (!stats) return 65
  const processedRatio = stats.totalDocuments > 0 ? stats.processedDocuments / stats.totalDocuments : 0
  const guiltBalance = stats.guiltDistribution.reduce((acc, item) => {
    const weight: Record<string, number> = { 'Высокая': 0.7, 'Средняя': 0.5, 'Низкая': 0.3, 'Нет': 0.9 }
    return acc + (weight[item.level] || 0.5) * item.count
  }, 0) / (stats.guiltDistribution.reduce((acc, item) => acc + item.count, 0) || 1)
  const queueHealth = stats.totalDocuments > 0 ? 1 - (stats.pendingInQueue / stats.totalDocuments) : 1
  return Math.round(processedRatio * 30 + guiltBalance * 40 + queueHealth * 30)
}

export function CaseDashboard() {
  const { setActiveSection } = useCaseStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // TanStack Query for real dashboard data
  const { data: apiData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    staleTime: 30000,
  })

  // Use real data or fall back to mock
  const stats = apiData || mockDashboardStats

  // Case health score
  const healthScore = calculateHealthScore(stats)

  // Timeline events from mock data
  const timelineEvents = [
    { date: '10 янв 2024', event: 'Загрузка обвинительного заключения', type: 'document', icon: <FileText className="w-4 h-4" /> },
    { date: '15 янв 2024', event: 'Допрос Колесниченко Д.А.', type: 'person', icon: <Users className="w-4 h-4" /> },
    { date: '20 янв 2024', event: 'Осмотр места происшествия', type: 'episode', icon: <MapPin className="w-4 h-4" /> },
    { date: '5 фев 2024', event: 'Загрузка показаний', type: 'document', icon: <FileText className="w-4 h-4" /> },
    { date: '15 фев 2024', event: 'Протокол осмотра', type: 'document', icon: <FileText className="w-4 h-4" /> },
    { date: '25 фев 2024', event: 'Правовая проверка материалов', type: 'compliance', icon: <Scale className="w-4 h-4" /> },
  ]

  // Relationship data for network visualization
  const relationships = [
    { from: 'Колесниченко Д.А.', to: 'Эпизод 1: Хищение', strength: 'strong', type: 'органиатор' },
    { from: 'Колесниченко Д.А.', to: 'Эпизод 2: Присвоение', strength: 'strong', type: 'подозреваемый' },
    { from: 'Колесниченко Д.А.', to: 'Эпизод 3: Подделка', strength: 'strong', type: 'органиатор' },
    { from: 'Сидоров В.П.', to: 'Эпизод 1: Хищение', strength: 'moderate', type: 'соучастник' },
    { from: 'Сидоров В.П.', to: 'Эпизод 3: Подделка', strength: 'moderate', type: 'исполнитель' },
    { from: 'Петров И.С.', to: 'Эпизод 1: Хищение', strength: 'weak', type: 'свидетель' },
    { from: 'Петров И.С.', to: 'Эпизод 2: Присвоение', strength: 'weak', type: 'свидетель' },
    { from: 'Козлова М.Д.', to: 'Эпизод 1: Хищение', strength: 'moderate', type: 'потерпевший' },
  ]

  // Guilt radar data
  const guiltRadarData = mockPersons.filter(p => p.guiltLevel).map(p => ({
    name: p.shortName || p.fullName.split(' ').slice(0, 2).join(' '),
    guilt: p.guiltLevel === 'high' ? 90 : p.guiltLevel === 'moderate' ? 60 : p.guiltLevel === 'low' ? 30 : 10,
    evidence: p.guiltAssessments?.[0]?.evidenceStrength === 'strong' ? 85 : p.guiltAssessments?.[0]?.evidenceStrength === 'moderate' ? 55 : 25,
    confidence: p.guiltAssessments?.[0]?.confidence === 'high' ? 80 : p.guiltAssessments?.[0]?.confidence === 'moderate' ? 50 : 20,
  }))

  const radarConfig = {
    guilt: { label: 'Виновность', color: '#dc2626' },
    evidence: { label: 'Доказательства', color: '#ea580c' },
    confidence: { label: 'Уверенность', color: '#ca8a04' },
  } as const

  // Compliance summary data
  const complianceSummaryData = Object.entries(
    mockCompliance.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({
    status: status === 'violation' ? 'Нарушение' : status === 'warning' ? 'Предупр.' : status === 'compliant' ? 'Соотв.' : 'Проверка',
    count,
    fill: COMPLIANCE_COLORS[status],
  }))

  // Episode severity distribution
  const episodeSeverityData = mockEpisodes.map(ep => ({
    name: ep.episodeNumber ? `Эп.${ep.episodeNumber}` : ep.title.substring(0, 15),
    severity: ep.severity === 'особо тяжкое' ? 4 : ep.severity === 'тяжкое' ? 3 : ep.severity === 'средней тяжести' ? 2 : 1,
    fill: SEVERITY_COLORS[ep.severity || ''] || '#525252',
  }))

  // Activity feed
  const activityFeed = [
    { time: '2 мин назад', action: 'Загружен документ', detail: 'Экспертное заключение №45', type: 'upload' },
    { time: '15 мин назад', action: 'Обработка завершена', detail: 'Показания свидетеля Петрова', type: 'process' },
    { time: '1 час назад', action: 'Анализ виновности', detail: 'Колесниченко Д.А. — Высокая', type: 'analysis' },
    { time: '3 часа назад', action: 'Правовая проверка', detail: 'Обвинительное заключение', type: 'compliance' },
    { time: '5 часов назад', action: 'Загружен документ', detail: 'Заключение фин. аудита', type: 'upload' },
    { time: '1 день назад', action: 'ИИ-ответ', detail: 'Статьи УК РФ по делу', type: 'qa' },
  ]

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 600)
  }, [refetch])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-stone-900 to-stone-800 border-stone-700 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium">Оценка состояния дела</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  >
                    {healthScore >= 80 ? (
                      <Heart className="w-5 h-5 text-green-500" />
                    ) : healthScore >= 60 ? (
                      <Activity className="w-5 h-5 text-orange-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg font-bold"
                    style={{ color: healthScore >= 80 ? '#16a34a' : healthScore >= 60 ? '#ea580c' : '#dc2626' }}
                  >
                    <AnimatedCounter value={healthScore} />
                  </motion.span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    healthScore >= 80
                      ? 'border-green-600 text-green-600'
                      : healthScore >= 60
                        ? 'border-orange-600 text-orange-600'
                        : 'border-red-600 text-red-600'
                  }
                >
                  {healthScore >= 80 ? 'Хорошее' : healthScore >= 60 ? 'Удовлетворительное' : 'Проблемное'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-stone-600 hover:bg-stone-700"
                  onClick={() => setActiveSection('documents')}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Загрузить документ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-stone-600 hover:bg-stone-700"
                  onClick={() => setActiveSection('qa')}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Запросить ИИ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-stone-600 hover:bg-stone-700"
                  onClick={() => setActiveSection('legal-check')}
                >
                  <Scale className="w-3.5 h-3.5" />
                  Правовая проверка
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error Display */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-red-700 bg-red-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Ошибка загрузки данных: {error?.message || 'Неизвестная ошибка'}</span>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto gap-1.5 border-red-700 text-red-400">
                  <RefreshCw className="w-3 h-3" />
                  Повторить
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Cards - Enhanced with animated counters and gradients */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: 'Документы',
            value: stats.totalDocuments,
            sub: `${stats.processedDocuments} обработано, ${stats.pendingInQueue} в очереди`,
            icon: <FileText className="h-5 w-5" />,
            gradient: 'from-orange-600/20 to-stone-900',
            iconColor: 'text-orange-500',
            borderColor: 'border-orange-700/30',
          },
          {
            title: 'Участники',
            value: stats.totalPersons,
            sub: 'обвиняемых, свидетелей, потерпевших',
            icon: <Users className="h-5 w-5" />,
            gradient: 'from-red-600/20 to-stone-900',
            iconColor: 'text-red-500',
            borderColor: 'border-red-700/30',
          },
          {
            title: 'Эпизоды',
            value: stats.totalEpisodes,
            sub: 'преступных эпизодов в деле',
            icon: <BookOpen className="h-5 w-5" />,
            gradient: 'from-amber-600/20 to-stone-900',
            iconColor: 'text-amber-500',
            borderColor: 'border-amber-700/30',
          },
          {
            title: 'Статьи УК',
            value: stats.totalArticles,
            sub: 'статей применено в деле',
            icon: <AlertTriangle className="h-5 w-5" />,
            gradient: 'from-stone-600/20 to-stone-900',
            iconColor: 'text-stone-400',
            iconBg: 'bg-stone-800',
            borderColor: 'border-stone-700/30',
          },
        ].map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className={`bg-gradient-to-br ${card.gradient} ${card.borderColor} shadow-md hover:shadow-lg transition-shadow`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, delay: index * 0.1 + 0.3 }}
                  className={card.iconColor}
                >
                  {card.icon}
                </motion.div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">
                  <AnimatedCounter value={card.value} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guilt Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-md hover:shadow-lg transition-shadow border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-500" />
                Распределение виновности
              </CardTitle>
              <CardDescription>Уровень виновности участников дела</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={guiltChartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={stats.guiltDistribution}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={30}
                    label={({ level, count }) => `${level}: ${count}`}
                  >
                    {stats.guiltDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={GUILT_COLORS[index % GUILT_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="level" />} />
                  <ChartLegend content={<ChartLegendContent nameKey="level" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Document Types */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-md hover:shadow-lg transition-shadow border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                Типы документов
              </CardTitle>
              <CardDescription>Распределение по типам в материалах дела</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={docTypeChartConfig} className="h-[250px] w-full">
                <BarChart data={stats.documentTypeDistribution} accessibilityLayer>
                  <Bar dataKey="count" nameKey="type" radius={4}>
                    {stats.documentTypeDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={GUILT_COLORS[index % GUILT_COLORS.length]} />
                    ))}
                  </Bar>
                  <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />
                  <ChartLegend content={<ChartLegendContent nameKey="type" />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Guilt Assessment Summary + Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guilt Assessment Summary with visual indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                Оценка виновности участников
              </CardTitle>
              <CardDescription>Сводные показатели виновности и доказательств</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Guilt Level Bars */}
              {stats.guiltDistribution.map((item, index) => {
                const maxCount = Math.max(...stats.guiltDistribution.map(d => d.count))
                const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                return (
                  <motion.div
                    key={item.level}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: GUILT_COLORS[index] }}
                        />
                        <span className="font-medium">{item.level}</span>
                      </div>
                      <span className="text-muted-foreground">{item.count} чел.</span>
                    </div>
                    <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: GUILT_COLORS[index] }}
                      />
                    </div>
                  </motion.div>
                )
              })}

              <Separator className="bg-stone-700" />

              {/* Guilt Radar Chart */}
              {guiltRadarData.length > 0 && (
                <ChartContainer config={radarConfig} className="h-[200px] w-full">
                  <RadarChart data={guiltRadarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="#525252" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} tick={{ fill: '#a1a1aa', fontSize: 8 }} />
                    <Radar name="Виновность" dataKey="guilt" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                    <Radar name="Доказательства" dataKey="evidence" stroke="#ea580c" fill="#ea580c" fillOpacity={0.2} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Compliance Check Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-orange-500" />
                Правовая проверка
              </CardTitle>
              <CardDescription>Сводные результаты compliance проверки</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compliance Status Bars */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Нарушения', count: mockCompliance.filter(c => c.status === 'violation').length, color: '#dc2626', icon: <XCircle className="w-4 h-4" /> },
                  { label: 'Предупреждения', count: mockCompliance.filter(c => c.status === 'warning').length, color: '#ea580c', icon: <AlertTriangle className="w-4 h-4" /> },
                  { label: 'Соответствия', count: mockCompliance.filter(c => c.status === 'compliant').length, color: '#16a34a', icon: <CheckCircle className="w-4 h-4" /> },
                  { label: 'Требует проверки', count: mockCompliance.filter(c => c.status === 'needs_review').length, color: '#ca8a04', icon: <Info className="w-4 h-4" /> },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-3 rounded-lg bg-stone-900/80 border border-stone-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm" style={{ color: item.color }}>
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <span className="text-xl font-bold" style={{ color: item.color }}>
                        <AnimatedCounter value={item.count} duration={800} />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Separator className="bg-stone-700" />

              {/* Compliance Distribution Pie */}
              <ChartContainer
                config={{
                  'Нарушение': { label: 'Нарушение', color: '#dc2626' },
                  'Предупр.': { label: 'Предупр.', color: '#ea580c' },
                  'Соотв.': { label: 'Соотв.', color: '#16a34a' },
                  'Проверка': { label: 'Проверка', color: '#ca8a04' },
                }}
                className="h-[160px] w-full"
              >
                <PieChart>
                  <Pie
                    data={complianceSummaryData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={25}
                  >
                    {complianceSummaryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>

              {/* Key Violations */}
              <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                {mockCompliance.filter(c => c.status === 'violation').map(cr => (
                  <motion.div
                    key={cr.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 p-2 rounded-lg bg-red-950/30 border border-red-900/50"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-red-400 truncate">{cr.description.substring(0, 60)}</p>
                      <p className="text-xs text-muted-foreground">Рекомендация: {cr.recommendation?.substring(0, 50)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Case Timeline + Relationship Network */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Case Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Хронология дела
              </CardTitle>
              <CardDescription>Ключевые события в порядке возникновения</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0 max-h-80 overflow-y-auto custom-scrollbar pl-6">
                {/* Timeline line */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-stone-700" />

                {timelineEvents.map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="relative pb-4"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-stone-700 bg-stone-900 flex items-center justify-center">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            event.type === 'document' ? '#ea580c'
                              : event.type === 'person' ? '#dc2626'
                              : event.type === 'episode' ? '#ca8a04'
                              : event.type === 'compliance' ? '#16a34a'
                              : '#525252'
                        }}
                      />
                    </div>
                    <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono">{event.date}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.icon}
                          {event.type === 'document' ? 'Документ'
                            : event.type === 'person' ? 'Лицо'
                            : event.type === 'episode' ? 'Эпизод'
                            : 'Проверка'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{event.event}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Relationship Network */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-red-500" />
                Сеть связей: лица — эпизоды
              </CardTitle>
              <CardDescription>Визуализация связей между участниками и эпизодами</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[320px] bg-stone-900/60 rounded-lg border border-stone-800 overflow-hidden">
                {/* SVG Network Visualization */}
                <svg viewBox="0 0 400 320" className="w-full h-full">
                  {/* Person nodes (left side) */}
                  {mockPersons.map((person, i) => {
                    const y = 40 + i * 55
                    const isKey = person.isKolesnichenko
                    return (
                      <g key={person.id}>
                        <circle
                          cx={70}
                          cy={y}
                          r={isKey ? 20 : 14}
                          fill={isKey ? '#dc2626' : '#525252'}
                          stroke={isKey ? '#dc2626' : '#a1a1aa'}
                          strokeWidth={isKey ? 3 : 1.5}
                        />
                        <text
                          x={70}
                          y={y + 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize={isKey ? 9 : 8}
                          fontWeight={isKey ? 'bold' : 'normal'}
                        >
                          {person.shortName?.split(' ')[0] || person.fullName.split(' ')[0]}
                        </text>
                      </g>
                    )
                  })}

                  {/* Episode nodes (right side) */}
                  {mockEpisodes.map((ep, i) => {
                    const y = 55 + i * 80
                    return (
                      <g key={ep.id}>
                        <rect
                          x={270}
                          y={y - 16}
                          width={120}
                          height={32}
                          rx={8}
                          fill={SEVERITY_COLORS[ep.severity || ''] || '#525252'}
                          stroke="#a1a1aa"
                          strokeWidth={1}
                        />
                        <text
                          x={330}
                          y={y + 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize={8}
                          fontWeight="bold"
                        >
                          {ep.episodeNumber ? `Эп.${ep.episodeNumber}` : ep.title.substring(0, 12)}
                        </text>
                      </g>
                    )
                  })}

                  {/* Connection lines */}
                  {relationships.map((rel, i) => {
                    const personIdx = mockPersons.findIndex(p =>
                      p.fullName.startsWith(rel.from.split(' ')[0])
                    )
                    const episodeIdx = mockEpisodes.findIndex(ep =>
                      ep.title.includes(rel.to.split(': ')[1]?.split(' ')[0] || '')
                    )
                    if (personIdx === -1 || episodeIdx === -1) return null
                    const py = 40 + personIdx * 55
                    const ey = 55 + episodeIdx * 80
                    const strengthWidth = rel.strength === 'strong' ? 2.5 : rel.strength === 'moderate' ? 1.5 : 0.8
                    const strengthColor = rel.strength === 'strong' ? '#dc2626' : rel.strength === 'moderate' ? '#ea580c' : '#ca8a04'
                    return (
                      <line
                        key={i}
                        x1={90}
                        y1={py}
                        x2={270}
                        y2={ey}
                        stroke={strengthColor}
                        strokeWidth={strengthWidth}
                        strokeDasharray={rel.strength === 'weak' ? '4,4' : 'none'}
                        opacity={0.7}
                      />
                    )
                  })}

                  {/* Labels */}
                  <text x={70} y={18} textAnchor="middle" fill="#a1a1aa" fontSize={10} fontWeight="bold">Участники</text>
                  <text x={330} y={18} textAnchor="middle" fill="#a1a1aa" fontSize={10} fontWeight="bold">Эпизоды</text>
                </svg>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-red-600" />
                  <span>Сильная связь</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-orange-600" />
                  <span>Средняя</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-amber-600" style={{ borderTop: '2px dashed #ca8a04' }} />
                  <span>Слабая</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Episode Severity Heat Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Карта тяжести эпизодов
            </CardTitle>
            <CardDescription>Визуализация степени тяжести преступных эпизодов</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                severity: { label: 'Тяжесть', color: '#ea580c' },
              }}
              className="h-[120px] w-full"
            >
              <BarChart data={episodeSeverityData} accessibilityLayer>
                <Bar dataKey="severity" radius={4}>
                  {episodeSeverityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <ChartTooltip
                  content={<ChartTooltipContent
                    formatter={(value: number) => {
                      const labels: Record<number, string> = { 4: 'Особо тяжкое', 3: 'Тяжкое', 2: 'Средней тяжести', 1: 'Небольшое' }
                      return labels[value] || String(value)
                    }}
                  />}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Processing Queue + Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Document Processing Progress Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                Очередь обработки документов
              </CardTitle>
              <CardDescription>Статус обработки загруженных документов с прогрессом</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Progress */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-stone-900 to-stone-800 border border-stone-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Общий прогресс</span>
                  <span className="text-sm font-bold text-orange-500">
                    {stats.processedDocuments}/{stats.totalDocuments} ({Math.round((stats.processedDocuments / stats.totalDocuments) * 100)}%)
                  </span>
                </div>
                <Progress
                  value={(stats.processedDocuments / stats.totalDocuments) * 100}
                  className="h-3"
                />
                <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{stats.processedDocuments} завершено</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-500" />
                    <span>1 обработка</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span>{stats.pendingInQueue} в очереди</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span>1 ошибка</span>
                  </div>
                </div>
              </div>

              {/* Queue Items */}
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {stats.processingQueue.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.document?.originalName || 'Документ #' + item.documentId}</p>
                        <p className="text-xs text-muted-foreground">
                          Позиция: {item.queuePosition} • Приоритет: {item.priority}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(item.status)}</div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                Последняя активность
              </CardTitle>
              <CardDescription>Недавние действия в системе анализа дела</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {activityFeed.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="shrink-0 mt-0.5">
                      {activity.type === 'upload' ? <Upload className="w-4 h-4 text-orange-500" />
                        : activity.type === 'process' ? <Zap className="w-4 h-4 text-green-500" />
                        : activity.type === 'analysis' ? <Eye className="w-4 h-4 text-red-500" />
                        : activity.type === 'compliance' ? <Scale className="w-4 h-4 text-amber-500" />
                        : <MessageSquare className="w-4 h-4 text-stone-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{activity.detail}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Documents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-400" />
              Последние документы
            </CardTitle>
            <CardDescription>Недавно загруженные документы по делу</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {stats.recentDocuments.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(120,113,108,0.1)' }}
                  className="flex items-start justify-between p-4 bg-muted/50 rounded-lg gap-3 hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.sourceReference && `${doc.sourceReference} • `}
                        {formatFileSize(doc.fileSize)}
                        {doc.documentType && ` • ${doc.documentType}`}
                      </p>
                      {doc.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.summary}</p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {getStatusBadge(doc.processingStatus)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => setActiveSection('documents')}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Custom scrollbar CSS */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1c1917;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #57534e;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #78716c;
        }
      `}</style>
    </div>
  )
}
