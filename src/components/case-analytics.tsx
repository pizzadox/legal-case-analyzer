'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  XAxis, YAxis, Legend, ComposedChart,
} from 'recharts'
import {
  BarChart3, TrendingUp, Brain, Target, AlertTriangle, CheckCircle,
  Info, Sparkles, Activity, Layers, Award, Zap, Clock,
} from 'lucide-react'
import { mockAnalytics } from '@/lib/mock-data'
import { getAnalytics } from '@/lib/case-api'
import type { AnalyticsData } from '@/lib/case-store'

const SEVERITY_COLOR: Record<string, string> = {
  'особо тяжкое': '#7f1d1d',
  'тяжкое': '#dc2626',
  'средней тяжести': '#ea580c',
  'небольшой': '#ca8a04',
}

const STATUS_COLOR: Record<string, string> = {
  proven: '#059669',
  investigating: '#d97706',
  doubtful: '#dc2626',
}

const INSIGHT_STYLE: Record<string, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  positive: { bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900', icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, label: 'Положительный' },
  warning: { bg: 'bg-amber-50/50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900', icon: <AlertTriangle className="w-4 h-4 text-amber-600" />, label: 'Предупреждение' },
  critical: { bg: 'bg-red-50/50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900', icon: <AlertTriangle className="w-4 h-4 text-red-600" />, label: 'Критический' },
  info: { bg: 'bg-stone-50/50 dark:bg-stone-900/20', border: 'border-stone-200 dark:border-stone-800', icon: <Info className="w-4 h-4 text-stone-600" />, label: 'Информация' },
}

const COMPLEXITY_RATING: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Низкая', color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
  moderate: { label: 'Умеренная', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/40' },
  high: { label: 'Высокая', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-950/40' },
  extreme: { label: 'Экстремальная', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-950/40' },
}

const DOC_TYPE_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#78716c', '#7f1d1d', '#a16207']

const trendChartConfig = {
  processed: { label: 'Обработано', color: '#059669' },
  pending: { label: 'В очереди', color: '#d97706' },
  failed: { label: 'Ошибки', color: '#dc2626' },
}

const docTypeChartConfig = Object.fromEntries(
  mockAnalytics.documentTypes.map((d, i) => [d.type, { label: d.type, color: DOC_TYPE_COLORS[i % DOC_TYPE_COLORS.length] }])
)

export function CaseAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
    retry: 1,
  })

  const analytics = data ?? mockAnalytics

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
      </div>
    )
  }

  const complexityRating = COMPLEXITY_RATING[analytics.complexity.rating] ?? COMPLEXITY_RATING.moderate

  // Convert person involvement to radar data - use surname only for axis labels
  const radarData = analytics.personInvolvement.map(p => {
    // Extract just the last name (Russian names: "Фамилия И.О." -> "Фамилия")
    const parts = p.name.split(' ')
    return {
      name: parts[0],
      Эпизоды: p.episodes,
      Документы: p.documents,
      Связи: p.relationships,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-900/20 via-red-900/15 to-stone-900/10 rounded-xl shadow-sm border-l-4 border-purple-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-600/20">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Аналитика дела</p>
              <p className="text-xs text-muted-foreground">Глубокий анализ данных, прогнозы и AI-инсайты</p>
            </div>
            <Badge className="bg-purple-600 text-white text-xs">12 метрик</Badge>
            <Badge className="bg-emerald-700 text-white text-xs">Реальное время</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Top row: Complexity + Outcome Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Case Complexity Card */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" /> Сложность дела
              <Badge className={`${complexityRating.bg} ${complexityRating.color} text-xs`}>
                {complexityRating.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg width="100" height="100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="42" stroke="#e5e7eb" strokeWidth="6" fill="none" className="dark:stroke-stone-700" />
                  <circle
                    cx="50" cy="50" r="42"
                    stroke={analytics.complexity.overallScore >= 80 ? '#dc2626' : analytics.complexity.overallScore >= 60 ? '#ea580c' : analytics.complexity.overallScore >= 40 ? '#ca8a04' : '#059669'}
                    strokeWidth="6" fill="none"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 - (analytics.complexity.overallScore / 100) * 2 * Math.PI * 42}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{analytics.complexity.overallScore}</span>
                  <span className="text-[10px] text-muted-foreground">из 100</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {analytics.complexity.factors.slice(0, 4).map(factor => (
                  <div key={factor.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate flex-1 min-w-0">{factor.name}</span>
                      <span className="font-semibold ml-2">{factor.score}</span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`absolute h-full rounded-full transition-all duration-700 ${
                          factor.score >= 70 ? 'bg-red-600' : factor.score >= 50 ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${factor.score}%` }}
                      />
                      {/* Benchmark line */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-stone-900 dark:bg-white opacity-40"
                        style={{ left: `${factor.benchmark}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Вертикальная линия — средний показатель по категории дел
            </p>
          </CardContent>
        </Card>

        {/* Outcome Prediction Card */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-red-700" /> Прогноз исхода дела
              <Badge variant="outline" className="text-xs">AI-прогноз</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {analytics.outcomePrediction.map((outcome, i) => {
              const color = outcome.probability >= 40 ? 'bg-red-700' : outcome.probability >= 20 ? 'bg-amber-600' : 'bg-stone-500'
              return (
                <div key={i} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold flex-1 min-w-0 truncate">{outcome.scenario}</p>
                    <Badge className={`${color} text-white text-xs ml-2`}>{outcome.probability}%</Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${color}`}
                      style={{ width: `${outcome.probability}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{outcome.rationale}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Processing Trend - Area Chart */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" /> Тренд обработки документов
            <Badge variant="outline" className="text-xs">{analytics.processingTrend.length} месяцев</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer config={trendChartConfig} className="h-48 w-full">
            <AreaChart data={analytics.processingTrend}>
              <defs>
                <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="processed" stroke="#059669" fill="url(#colorProcessed)" strokeWidth={2} />
              <Area type="monotone" dataKey="pending" stroke="#d97706" fill="url(#colorPending)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Mid row: Episode Matrix + Article Charges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Episode Severity × Status Matrix */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" /> Матрица: тяжесть × статус
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ChartContainer config={{ proven: { label: 'Доказано', color: '#059669' }, investigating: { label: 'Расследуется', color: '#d97706' }, doubtful: { label: 'Сомнительно', color: '#dc2626' } }} className="h-48 w-full">
              <BarChart data={analytics.episodeMatrix}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="severity" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="proven" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="investigating" stackId="a" fill="#d97706" radius={[0, 0, 0, 0]} />
                <Bar dataKey="doubtful" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-600" />Доказано</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" />Расследуется</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-600" />Сомнительно</span>
            </div>
          </CardContent>
        </Card>

        {/* Article Charges Donut */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-red-700" /> Распределение обвинений
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ChartContainer config={docTypeChartConfig} className="h-48 w-full">
              <PieChart>
                <Pie
                  data={analytics.articleCharges}
                  dataKey="count"
                  nameKey="code"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {analytics.articleCharges.map((entry, i) => (
                    <Cell key={i} fill={DOC_TYPE_COLORS[i % DOC_TYPE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="space-y-1 mt-2">
              {analytics.articleCharges.map((article, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded shrink-0" style={{ backgroundColor: DOC_TYPE_COLORS[i % DOC_TYPE_COLORS.length] }} />
                  <span className="font-mono text-xs flex-1 min-w-0 truncate">{article.code}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{article.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Person Involvement Radar */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" /> Вовлечённость участников
            <Badge variant="outline" className="text-xs">{analytics.personInvolvement.length} участников</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer config={{
            Эпизоды: { label: 'Эпизоды', color: '#dc2626' },
            Документы: { label: 'Документы', color: '#ea580c' },
            Связи: { label: 'Связи', color: '#ca8a04' },
          }} className="h-64 w-full">
            <RadarChart data={radarData}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar name="Эпизоды" dataKey="Эпизоды" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
              <Radar name="Документы" dataKey="Документы" stroke="#ea580c" fill="#ea580c" fillOpacity={0.3} />
              <Radar name="Связи" dataKey="Связи" stroke="#ca8a04" fill="#ca8a04" fillOpacity={0.3} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Workload by Month - Composed Chart */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" /> Рабочая нагрузка по месяцам
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer config={{
            documents: { label: 'Документы', color: '#dc2626' },
            actions: { label: 'Действия', color: '#ea580c' },
            hearings: { label: 'Заседания', color: '#7f1d1d' },
          }} className="h-48 w-full">
            <ComposedChart data={analytics.workloadByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar name="Документы" dataKey="documents" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar name="Действия" dataKey="actions" fill="#ea580c" radius={[4, 4, 0, 0]} />
              <Line name="Заседания" type="monotone" dataKey="hearings" stroke="#7f1d1d" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* AI Insights - the showcase card */}
      <Card className="rounded-xl shadow-sm border-l-4 border-purple-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" /> AI-инсайты по делу
            <Badge className="bg-purple-600 text-white text-xs">{analytics.insights.length} инсайтов</Badge>
            <Badge variant="outline" className="text-xs">Авто-генерация</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {analytics.insights.map((insight, i) => {
            const style = INSIGHT_STYLE[insight.type] ?? INSIGHT_STYLE.info
            return (
              <div key={i} className={`p-3 rounded-lg border ${style.bg} ${style.border}`}>
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">{style.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" className={`text-xs ${style.label.includes('Предупреждение') ? 'text-amber-700' : style.label.includes('Критический') ? 'text-red-700' : style.label.includes('Положительный') ? 'text-emerald-700' : 'text-stone-600'}`}>
                          {style.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {insight.confidence}% уверенность
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          insight.confidence >= 80 ? 'bg-emerald-600' : insight.confidence >= 60 ? 'bg-amber-500' : 'bg-stone-500'
                        }`}
                        style={{ width: `${insight.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
