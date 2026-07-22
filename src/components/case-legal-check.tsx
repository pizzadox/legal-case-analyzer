'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, Cell, Pie, PieChart } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Scale, CheckCircle, AlertTriangle, Info, XCircle, FileText,
  Loader2, Clock, ChevronRight, Filter, TrendingUp, Shield,
  Activity, Eye, Zap, RefreshCw, BarChart3
} from 'lucide-react'
import { mockCompliance, mockDocuments } from '@/lib/mock-data'
import { checkCompliance } from '@/lib/case-api'
import type { LegalComplianceData } from '@/lib/case-store'

const STATUS_CONFIG: Record<string, { className: string; icon: React.ReactNode; label: string; hexColor: string }> = {
  'compliant': { className: 'bg-emerald-700 text-white', icon: <CheckCircle className="w-3 h-3" />, label: 'Соответствует', hexColor: '#16a34a' },
  'violation': { className: 'bg-red-700 text-white', icon: <XCircle className="w-3 h-3" />, label: 'Нарушение', hexColor: '#dc2626' },
  'warning': { className: 'bg-amber-600 text-white', icon: <AlertTriangle className="w-3 h-3" />, label: 'Предупреждение', hexColor: '#ea580c' },
  'needs_review': { className: 'bg-orange-600 text-white', icon: <Info className="w-3 h-3" />, label: 'Требует проверки', hexColor: '#ca8a04' },
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  'article_applicability': 'Применимость статьи',
  'procedure_compliance': 'Процессуальное соответствие',
  'evidence_admissibility': 'Допустимость доказательств',
  'statute_limitations': 'Сроки давности',
}

const CHECK_TYPE_COLORS: Record<string, string> = {
  'article_applicability': '#dc2626',
  'procedure_compliance': '#ea580c',
  'evidence_admissibility': '#ca8a04',
  'statute_limitations': '#57534e',
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'high': { label: 'Критическое', color: '#dc2626', icon: <XCircle className="w-3 h-3" /> },
  'medium': { label: 'Среднее', color: '#ea580c', icon: <AlertTriangle className="w-3 h-3" /> },
  'low': { label: 'Низкое', color: '#ca8a04', icon: <Info className="w-3 h-3" /> },
}

export function CaseLegalCheck() {
  const [isChecking, setIsChecking] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailItem, setDetailItem] = useState<LegalComplianceData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const queryClient = useQueryClient()

  // Mutation for triggering compliance check
  const complianceMutation = useMutation({
    mutationFn: (documentId: string) => checkCompliance(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] })
      setIsChecking(false)
    },
    onError: () => {
      setIsChecking(false)
    },
  })

  // Use mock data (API doesn't have GET endpoint for compliance list in this setup)
  const complianceResults = mockCompliance

  // Filtering logic
  const filteredResults = useMemo(() => {
    return complianceResults.filter(cr => {
      const typeMatch = typeFilter === 'all' || cr.checkType === typeFilter
      const statusMatch = statusFilter === 'all' || cr.status === statusFilter
      return typeMatch && statusMatch
    })
  }, [complianceResults, typeFilter, statusFilter])

  // Count by status
  const violationsCount = complianceResults.filter(c => c.status === 'violation').length
  const warningsCount = complianceResults.filter(c => c.status === 'warning').length
  const compliantCount = complianceResults.filter(c => c.status === 'compliant').length
  const needsReviewCount = complianceResults.filter(c => c.status === 'needs_review').length

  // Compliance score calculation
  const complianceScore = Math.round(
    (compliantCount * 100 + warningsCount * 60 + needsReviewCount * 40 + violationsCount * 0) /
    (complianceResults.length * 100) * 100
  )

  // Data for status distribution pie chart
  const statusPieData = [
    { status: 'Нарушение', count: violationsCount, fill: '#dc2626' },
    { status: 'Предупреждение', count: warningsCount, fill: '#ea580c' },
    { status: 'Соответствие', count: compliantCount, fill: '#16a34a' },
    { status: 'Проверка', count: needsReviewCount, fill: '#ca8a04' },
  ].filter(d => d.count > 0)

  // Data for check type distribution bar chart
  const checkTypeData = Object.entries(
    complianceResults.reduce((acc, cr) => {
      acc[cr.checkType] = (acc[cr.checkType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({
    type: CHECK_TYPE_LABELS[type] || type,
    count,
    fill: CHECK_TYPE_COLORS[type] || '#525252',
  }))

  // Timeline data for checks
  const checkTimeline = complianceResults
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
    .map(cr => ({
      date: new Date(cr.checkedAt).toLocaleString('ru-RU'),
      type: CHECK_TYPE_LABELS[cr.checkType] || cr.checkType,
      status: cr.status,
      description: cr.description.substring(0, 60),
    }))

  // Recommendation cards
  const recommendations = complianceResults
    .filter(cr => cr.recommendation)
    .map(cr => ({
      id: cr.id,
      recommendation: cr.recommendation!,
      severity: cr.status,
      type: CHECK_TYPE_LABELS[cr.checkType] || cr.checkType,
    }))

  const handleCheck = async () => {
    if (!selectedDocumentId) return
    setIsChecking(true)
    complianceMutation.mutate(selectedDocumentId)
  }

  const handleViewDetail = (item: LegalComplianceData) => {
    setDetailItem(item)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Compliance Score Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-lg border-stone-700/50 bg-gradient-to-r from-stone-900 to-stone-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Compliance Score Gauge */}
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="flex items-center justify-center w-16 h-16 rounded-full border-4"
                  style={{
                    borderColor: complianceScore >= 80 ? '#16a34a' : complianceScore >= 50 ? '#ea580c' : '#dc2626',
                  }}
                >
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-2xl font-bold"
                    style={{
                      color: complianceScore >= 80 ? '#16a34a' : complianceScore >= 50 ? '#ea580c' : '#dc2626',
                    }}
                  >
                    {complianceScore}
                  </motion.span>
                </motion.div>
                <div>
                  <p className="text-sm font-medium">Оценка соответствия</p>
                  <p className="text-xs text-muted-foreground">
                    {complianceScore >= 80 ? 'Хорошее соответствие нормам' : complianceScore >= 50 ? 'Требует внимания' : 'Критические нарушения'}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      complianceScore >= 80
                        ? 'border-green-600 text-green-600'
                        : complianceScore >= 50
                          ? 'border-orange-600 text-orange-600'
                          : 'border-red-600 text-red-600'
                    }
                  >
                    {complianceScore >= 80 ? '✓ Соответствует' : complianceScore >= 50 ? '⚠ Требует внимания' : '✗ Нарушения'}
                  </Badge>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3 flex-1">
                {[
                  { label: 'Нарушения', count: violationsCount, color: '#dc2626', icon: <XCircle className="w-4 h-4" /> },
                  { label: 'Предупреждения', count: warningsCount, color: '#ea580c', icon: <AlertTriangle className="w-4 h-4" /> },
                  { label: 'Соответствия', count: compliantCount, color: '#16a34a', icon: <CheckCircle className="w-4 h-4" /> },
                  { label: 'Требует проверки', count: needsReviewCount, color: '#ca8a04', icon: <Info className="w-4 h-4" /> },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg bg-stone-950 border border-stone-800"
                  >
                    <div className="flex items-center gap-2 text-sm" style={{ color: item.color }}>
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <p className="text-xl font-bold mt-1" style={{ color: item.color }}>{item.count}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Check Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-orange-500" />
                  Запуск правовой проверки
                </CardTitle>
                <CardDescription className="mt-1">
                  Автоматическая ИИ-проверка соответствия материалов дела нормам УК РФ и УПК РФ
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Document Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Выберите документ для проверки" />
                </SelectTrigger>
                <SelectContent>
                  {mockDocuments.map(doc => (
                    <SelectItem key={doc.id} value={doc.id} disabled={doc.processingStatus !== 'completed'}>
                      <div className="flex items-center gap-2">
                        {doc.processingStatus === 'completed' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <Clock className="w-3 h-3 text-muted-foreground" />
                        )}
                        {doc.originalName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleCheck} disabled={isChecking || !selectedDocumentId} className="gap-2 shrink-0">
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scale className="h-4 w-4" />
                )}
                {isChecking ? 'Проверка...' : 'Запустить проверку'}
              </Button>
            </div>

            {/* Check Types Description */}
            <div className="p-4 bg-gradient-to-r from-stone-900/80 to-stone-800/50 rounded-lg border border-stone-700">
              <p className="text-sm text-muted-foreground mb-3">
                Автоматическая проверка включает анализ по следующим направлениям:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(CHECK_TYPE_LABELS).map(([type, label]) => (
                  <div className="flex items-center gap-2 p-2 rounded bg-stone-900/60 border border-stone-800" key={type}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHECK_TYPE_COLORS[type] }} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mutation Status */}
            {complianceMutation.isError && (
              <div className="p-3 bg-red-950/30 rounded-lg border border-red-900/50 flex items-center gap-2 text-red-400">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Ошибка при проверке: {complianceMutation.error?.message || 'Неизвестная ошибка'}</span>
              </div>
            )}
            {complianceMutation.isSuccess && (
              <div className="p-3 bg-green-950/30 rounded-lg border border-green-900/50 flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Проверка завершена успешно</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="shadow-sm border-stone-700/50 bg-stone-900/80">
          <CardContent className="p-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Фильтрация:</span>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Тип проверки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="article_applicability">Применимость статьи</SelectItem>
                  <SelectItem value="procedure_compliance">Процессуальное соответствие</SelectItem>
                  <SelectItem value="evidence_admissibility">Допустимость доказательств</SelectItem>
                  <SelectItem value="statute_limitations">Сроки давности</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="violation">Нарушение</SelectItem>
                  <SelectItem value="warning">Предупреждение</SelectItem>
                  <SelectItem value="compliant">Соответствие</SelectItem>
                  <SelectItem value="needs_review">Требует проверки</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">
                {filteredResults.length} из {complianceResults.length} проверок
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-500" />
                Распределение по статусу
              </CardTitle>
              <CardDescription>Количество проверок по каждому статусу соответствия</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  'Нарушение': { label: 'Нарушение', color: '#dc2626' },
                  'Предупреждение': { label: 'Предупреждение', color: '#ea580c' },
                  'Соответствие': { label: 'Соответствие', color: '#16a34a' },
                  'Проверка': { label: 'Проверка', color: '#ca8a04' },
                }}
                className="h-[200px] w-full"
              >
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={30}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Check Type Distribution Bar */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                Распределение по типу проверки
              </CardTitle>
              <CardDescription>Количество проверок каждого типа compliance проверки</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  'Применимость статьи': { label: 'Применимость статьи', color: '#dc2626' },
                  'Процессуальное соответствие': { label: 'Процессуальное соответствие', color: '#ea580c' },
                  'Допустимость доказательств': { label: 'Допустимость доказательств', color: '#ca8a04' },
                  'Сроки давности': { label: 'Сроки давности', color: '#57534e' },
                }}
                className="h-[200px] w-full"
              >
                <BarChart data={checkTypeData} accessibilityLayer>
                  <Bar dataKey="count" radius={4}>
                    {checkTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Check Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Хронология проверок
            </CardTitle>
            <CardDescription>Когда были проведены compliance проверки</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0 pl-8 max-h-64 overflow-y-auto custom-scrollbar">
              {/* Timeline line */}
              <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-red-600 via-orange-600 to-green-600" />

              {checkTimeline.map((event, index) => {
                const statusInfo = STATUS_CONFIG[event.status] || STATUS_CONFIG['needs_review']
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pb-3"
                  >
                    <div className="absolute -left-[22px] top-2 w-5 h-5 rounded-full border-2 border-stone-700 bg-stone-900 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusInfo.hexColor }} />
                    </div>
                    <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono">{event.date}</span>
                        <Badge className={statusInfo.className}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs" style={{ borderColor: CHECK_TYPE_COLORS[event.type] || '#525252' }}>
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{event.description}...</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendation Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              Рекомендации
            </CardTitle>
            <CardDescription>Действия для устранения выявленных проблем и улучшения соответствия</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {recommendations.map((rec, index) => {
                const statusInfo = STATUS_CONFIG[rec.severity] || STATUS_CONFIG['needs_review']
                return (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusInfo.className}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{rec.type}</Badge>
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">{rec.recommendation}</p>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Severity Indicators Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Индикаторы серьёзности нарушений
            </CardTitle>
            <CardDescription>Визуальная шкала серьёзности выявленных нарушений и предупреждений</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredResults
                .filter(cr => cr.status === 'violation' || cr.status === 'warning')
                .map((cr, index) => {
                  const statusInfo = STATUS_CONFIG[cr.status] || STATUS_CONFIG['needs_review']
                  const severityValue = cr.status === 'violation' ? 100 : cr.status === 'warning' ? 60 : 30
                  return (
                    <motion.div
                      key={cr.id}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={statusInfo.className}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{CHECK_TYPE_LABELS[cr.checkType] || cr.checkType}</Badge>
                          <span className="text-sm truncate">{cr.description.substring(0, 50)}...</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 gap-1" onClick={() => handleViewDetail(cr)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${severityValue}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: statusInfo.hexColor }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Compliance Results Detailed */}
      <Card className="shadow-md border-stone-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-stone-400" />
            Результаты проверки
          </CardTitle>
          <CardDescription>Детальный анализ правового соответствия материалов дела</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {filteredResults.map((cr, index) => {
              const statusInfo = STATUS_CONFIG[cr.status] || STATUS_CONFIG['needs_review']
              const checkTypeLabel = CHECK_TYPE_LABELS[cr.checkType] || cr.checkType

              return (
                <motion.div
                  key={cr.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AccordionItem value={cr.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                        <Badge className={statusInfo.className}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: CHECK_TYPE_COLORS[cr.checkType] || '#525252' }}>
                          {checkTypeLabel}
                        </Badge>
                        <span className="text-sm font-medium truncate min-w-0">{cr.description.substring(0, 60)}...</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Status and Type */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusInfo.className}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                          <Badge variant="outline">{checkTypeLabel}</Badge>
                          <Badge variant="outline" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            Документ: {cr.documentId}
                          </Badge>
                        </div>

                        {/* Severity Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Степень серьёзности</span>
                            <span className="font-medium" style={{ color: statusInfo.hexColor }}>
                              {cr.status === 'violation' ? 'Критическое' : cr.status === 'warning' ? 'Среднее' : 'Низкое'}
                            </span>
                          </div>
                          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${cr.status === 'violation' ? 100 : cr.status === 'warning' ? 60 : 30}%`,
                                backgroundColor: statusInfo.hexColor,
                              }}
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <h4 className="text-sm font-medium mb-1">Описание проблемы</h4>
                          <div className="p-3 bg-muted/50 rounded-lg border border-stone-800">
                            <p className="text-sm text-muted-foreground">{cr.description}</p>
                          </div>
                        </div>

                        {/* Recommendation */}
                        {cr.recommendation && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900">
                            <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Рекомендация
                            </h4>
                            <p className="text-sm text-emerald-600 dark:text-emerald-300">{cr.recommendation}</p>
                          </div>
                        )}

                        {/* Legal Basis */}
                        {cr.legalBasis && (
                          <div>
                            <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                              <Scale className="h-4 w-4" />
                              Правовая основа
                            </h4>
                            <div className="p-3 bg-muted/50 rounded-lg border border-stone-800">
                              <p className="text-sm text-muted-foreground">{cr.legalBasis}</p>
                            </div>
                          </div>
                        )}

                        {/* Date */}
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Проверка проведена: {new Date(cr.checkedAt).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-orange-500" />
                  Детали проверки
                </DialogTitle>
                <DialogDescription>
                  {CHECK_TYPE_LABELS[detailItem.checkType] || detailItem.checkType}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_CONFIG[detailItem.status]?.className || 'bg-stone-500'}>
                    {STATUS_CONFIG[detailItem.status]?.icon}
                    {STATUS_CONFIG[detailItem.status]?.label}
                  </Badge>
                  <Badge variant="outline">{CHECK_TYPE_LABELS[detailItem.checkType] || detailItem.checkType}</Badge>
                </div>

                {/* Severity Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Степень серьёзности</span>
                    <span className="font-bold" style={{ color: STATUS_CONFIG[detailItem.status]?.hexColor || '#525252' }}>
                      {detailItem.status === 'violation' ? 'Критическое' : detailItem.status === 'warning' ? 'Среднее' : 'Низкое'}
                    </span>
                  </div>
                  <div className="h-3 bg-stone-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${detailItem.status === 'violation' ? 100 : detailItem.status === 'warning' ? 60 : 30}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: STATUS_CONFIG[detailItem.status]?.hexColor || '#525252' }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">{detailItem.description}</p>
                </div>

                {/* Recommendation */}
                {detailItem.recommendation && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Рекомендация:
                    </p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-300">{detailItem.recommendation}</p>
                  </div>
                )}

                {/* Legal Basis */}
                {detailItem.legalBasis && (
                  <div className="p-4 bg-muted/50 rounded-lg border border-stone-800">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      Правовая основа:
                    </p>
                    <p className="text-sm text-muted-foreground">{detailItem.legalBasis}</p>
                  </div>
                )}

                {/* Date */}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Проверка проведена: {new Date(detailItem.checkedAt).toLocaleString('ru-RU')}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
