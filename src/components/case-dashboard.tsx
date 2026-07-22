'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis } from 'recharts'
import {
  FileText, Users, BookOpen, AlertTriangle, Clock, CheckCircle, Upload, Zap, Shield, Scale, RefreshCw, XCircle, Gavel, Activity, MapPin
} from 'lucide-react'
import { mockDashboardStats } from '@/lib/mock-data'
import { getDashboardStats } from '@/lib/case-api'
import { useCaseStore } from '@/lib/case-store'

const GUILT_COLORS: Record<string, string> = { high: '#dc2626', moderate: '#ea580c', low: '#ca8a04', none: '#525252' }
const GUILT_LABEL: Record<string, string> = { high: 'Высокая', moderate: 'Средняя', low: 'Низкая', none: 'Нет' }
const DOC_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#78716c']

const guiltChartConfig = Object.fromEntries(
  Object.entries(GUILT_LABEL).map(([k, v]) => [v, { label: v, color: GUILT_COLORS[k] }])
)
const docTypeChartConfig = {
  'Обвинение': { label: 'Обвинение', color: '#dc2626' },
  'Показание': { label: 'Показание', color: '#ea580c' },
  'Протокол': { label: 'Протокол', color: '#ca8a04' },
  'Экспертиза': { label: 'Экспертиза', color: '#78716c' },
}

const STAT_ITEMS = [
  { key: 'totalDocuments', label: 'Документы', icon: FileText, gradient: 'from-red-900/20 to-stone-900/10', border: 'border-red-700' },
  { key: 'totalPersons', label: 'Участники', icon: Users, gradient: 'from-orange-900/20 to-stone-900/10', border: 'border-orange-600' },
  { key: 'totalEpisodes', label: 'Эпизоды', icon: BookOpen, gradient: 'from-amber-900/20 to-stone-900/10', border: 'border-amber-600' },
  { key: 'totalArticles', label: 'Статьи', icon: Scale, gradient: 'from-stone-800/20 to-stone-900/10', border: 'border-stone-600' },
] as const

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-3 h-3 text-emerald-600" />,
  processing: <Clock className="w-3 h-3 text-amber-500 animate-spin" />,
  pending: <Clock className="w-3 h-3 text-stone-400" />,
  failed: <XCircle className="w-3 h-3 text-red-600" />,
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

  // Convert byGuiltLevel Record to chart data
  const guiltChartData = Object.entries(stats.guiltAssessments.byGuiltLevel).map(([level, count]) => ({
    level: GUILT_LABEL[level] ?? level,
    count,
    fill: GUILT_COLORS[level] ?? '#525252',
  }))

  // Convert documents.byType Record to chart data
  const docTypeChartData = Object.entries(stats.documents.byType).map(([type, count]) => ({
    type,
    count,
  }))

  // Calculate compliance score
  const compTotal = stats.complianceChecks.byStatus
  const compCompliant = compTotal.compliant ?? 0
  const compAll = Object.values(compTotal).reduce((a, b) => a + b, 0)
  const complianceScore = compAll > 0 ? Math.round((compCompliant / compAll) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Case Banner */}
      <Card className="bg-gradient-to-r from-red-900/30 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20">
              <Gavel className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Дело № 2024-00145</h2>
              <p className="text-sm text-muted-foreground">Уголовное дело в отношении Колесниченко Д.А. — ст. 159 ч.3, 160 ч.2 УК РФ</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-700 text-white">Тяжкое</Badge>
              <Badge variant="outline" className="text-xs">{stats.summary.totalDocuments} документов</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* "Дело в цифрах" summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_ITEMS.map(({ key, label, icon: Icon, gradient, border }) => (
          <Card key={key} className={`border-l-4 ${border} bg-gradient-to-r ${gradient} rounded-xl shadow-sm transition-shadow hover:shadow-md`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-background/50">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.summary[key]}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health indicator + Compliance */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" /> Здоровье дела
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Обработано документов:</span>
              <Progress value={Math.round(((stats.documents.byStatus.completed ?? 0) / stats.documents.total) * 100)} className="h-2 flex-1" />
              <Badge className="bg-amber-600 text-white text-xs">{Math.round(((stats.documents.byStatus.completed ?? 0) / stats.documents.total) * 100)}%</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Соответствие нормам:</span>
              <Progress value={complianceScore} className="h-2 flex-1" />
              <Badge className={complianceScore >= 70 ? 'bg-emerald-700 text-white' : complianceScore >= 40 ? 'bg-amber-600 text-white' : 'bg-red-700 text-white'}>{complianceScore}%</Badge>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{stats.summary.totalLocations} мест</Badge>
              <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />{stats.summary.totalCrossReferences} ссылок</Badge>
              <Badge variant="outline"><Shield className="w-3 h-3 mr-1" />{stats.defenseLines.total} стратегий</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" /> Быстрые действия
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-12 rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-white shadow-sm" onClick={() => setActiveSection('documents')}>
                <Upload className="w-4 h-4 mr-2" />Загрузить документ
              </Button>
              <Button variant="outline" className="h-12 rounded-xl shadow-sm" onClick={() => setActiveSection('qa')}>
                <Zap className="w-4 h-4 mr-2" />Задать вопрос ИИ
              </Button>
              <Button variant="outline" className="h-12 rounded-xl shadow-sm" onClick={() => setActiveSection('legal-check')}>
                <Shield className="w-4 h-4 mr-2" />Правовая проверка
              </Button>
              <Button variant="outline" className="h-12 rounded-xl shadow-sm" onClick={() => setActiveSection('defense')}>
                <Scale className="w-4 h-4 mr-2" />Линия защиты
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Виновность участников</CardTitle></CardHeader>
          <CardContent className="p-2">
            <ChartContainer config={guiltChartConfig} className="h-52 w-full">
              <PieChart>
                <Pie data={guiltChartData} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={80} label={({ level, count }) => `${level}: ${count}`}>
                  {guiltChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Типы документов</CardTitle></CardHeader>
          <CardContent className="p-2">
            <ChartContainer config={docTypeChartConfig} className="h-52 w-full">
              <BarChart data={docTypeChartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="type" width={80} tick={{ fontSize: 12 }} />
                <Bar dataKey="count" radius={4}>
                  {docTypeChartData.map((_, i) => <Cell key={i} fill={DOC_COLORS[i % DOC_COLORS.length]} />)}
                </Bar>
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Processing Queue */}
      {stats.processingQueue.inProgress.length > 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />Очередь обработки
              <Badge className="bg-amber-600 text-white">{stats.processingQueue.byStatus.queued ?? 0} в очереди</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {stats.processingQueue.inProgress.map((q) => (
                <div key={q.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                  <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="truncate flex-1">{q.originalName}</span>
                  <Badge className="bg-amber-600 text-white text-xs">обработка</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Documents */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />Последние документы
            <Button size="sm" variant="ghost" className="ml-auto rounded-lg" onClick={() => setActiveSection('documents')}>
              Все документы <RefreshCw className="w-3 h-3 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stats.documents.recent.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                {STATUS_ICON[doc.processingStatus]}
                <span className="truncate flex-1">{doc.originalName}</span>
                <Badge className={doc.processingStatus === 'completed' ? 'bg-emerald-700 text-white' : doc.processingStatus === 'processing' ? 'bg-amber-600 text-white' : 'bg-stone-500 text-white'}>{doc.processingStatus}</Badge>
              </div>
            ))}
          </div>
          <Separator className="mt-3" />
          <p className="text-xs text-muted-foreground mt-2">Данные из {stats.documents.total} загруженных документов</p>
        </CardContent>
      </Card>
    </div>
  )
}
