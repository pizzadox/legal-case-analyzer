'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis } from 'recharts'
import {
  FileText, Users, BookOpen, AlertTriangle, Clock, CheckCircle, Upload, Zap, Shield, Scale, RefreshCw, XCircle
} from 'lucide-react'
import { mockDashboardStats } from '@/lib/mock-data'
import { getDashboardStats } from '@/lib/case-api'
import { useCaseStore } from '@/lib/case-store'

const GUILT_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#525252']
const DOC_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#78716c']

const guiltChartConfig = {
  'Высокая': { label: 'Высокая', color: '#dc2626' },
  'Средняя': { label: 'Средняя', color: '#ea580c' },
  'Низкая': { label: 'Низкая', color: '#ca8a04' },
  'Нет': { label: 'Нет', color: '#525252' },
}
const docTypeChartConfig = {
  'Обвинение': { label: 'Обвинение', color: '#dc2626' },
  'Показание': { label: 'Показание', color: '#ea580c' },
  'Протокол': { label: 'Протокол', color: '#ca8a04' },
  'Другое': { label: 'Другое', color: '#78716c' },
}

const STAT_ITEMS = [
  { key: 'totalDocuments', label: 'Документы', icon: FileText, color: 'border-red-700' },
  { key: 'totalPersons', label: 'Участники', icon: Users, color: 'border-orange-600' },
  { key: 'totalEpisodes', label: 'Эпизоды', icon: BookOpen, color: 'border-amber-600' },
  { key: 'totalArticles', label: 'Статьи', icon: Scale, color: 'border-stone-600' },
] as const

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-3 h-3 text-emerald-600" />,
  processing: <Clock className="w-3 h-3 text-amber-500 animate-spin" />,
  pending: <Clock className="w-3 h-3 text-stone-400" />,
  failed: <XCircle className="w-3 h-3 text-red-600" />,
}
const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-700 text-white',
  processing: 'bg-amber-600 text-white',
  pending: 'bg-stone-500 text-white',
  failed: 'bg-red-700 text-white',
}

export function CaseDashboard() {
  const { setActiveSection } = useCaseStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    retry: 1,
  })
  const stats = data ?? mockDashboardStats

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STAT_ITEMS.map((_, i) => <Skeleton key={i} className="h-24" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_ITEMS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className={`border-l-4 ${color} transition-shadow hover:shadow-md`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats[key]}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setActiveSection('documents')}><Upload className="w-4 h-4 mr-1" />Загрузить</Button>
        <Button size="sm" variant="outline" onClick={() => setActiveSection('qa')}><Zap className="w-4 h-4 mr-1" />Задать вопрос ИИ</Button>
        <Button size="sm" variant="outline" onClick={() => setActiveSection('legal-check')}><Shield className="w-4 h-4 mr-1" />Правовая проверка</Button>
        <Button size="sm" variant="outline" onClick={() => setActiveSection('defense')}><Scale className="w-4 h-4 mr-1" />Линия защиты</Button>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Виновность участников</CardTitle></CardHeader>
          <CardContent className="p-2">
            <ChartContainer config={guiltChartConfig} className="h-52 w-full">
              <PieChart>
                <Pie data={stats.guiltDistribution} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={80} label={({ level, count }) => `${level}: ${count}`}>
                  {stats.guiltDistribution.map((_, i) => <Cell key={i} fill={GUILT_COLORS[i]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Типы документов</CardTitle></CardHeader>
          <CardContent className="p-2">
            <ChartContainer config={docTypeChartConfig} className="h-52 w-full">
              <BarChart data={stats.documentTypeDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="type" width={80} tick={{ fontSize: 12 }} />
                <Bar dataKey="count" radius={4}>
                  {stats.documentTypeDistribution.map((_, i) => <Cell key={i} fill={DOC_COLORS[i]} />)}
                </Bar>
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Processing Queue */}
      {stats.processingQueue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />Очередь обработки
              <Badge className="bg-amber-600 text-white">{stats.pendingInQueue}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {stats.processingQueue.map((q) => (
                <div key={q.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                  {STATUS_ICON[q.status]}
                  <span className="truncate flex-1">{q.document?.originalName ?? q.documentId}</span>
                  <Badge className={STATUS_BADGE[q.status]}>{q.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Documents */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />Последние документы
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setActiveSection('documents')}>
              Все документы <RefreshCw className="w-3 h-3 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stats.recentDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50 transition-colors hover:bg-muted">
                {STATUS_ICON[doc.processingStatus]}
                <span className="truncate flex-1">{doc.originalName}</span>
                <Badge className={STATUS_BADGE[doc.processingStatus]}>{doc.processingStatus}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
