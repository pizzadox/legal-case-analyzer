'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis } from 'recharts'
import { FileText, Users, BookOpen, AlertTriangle, Clock, CheckCircle, Upload, Zap, Shield, Scale, RefreshCw, XCircle, Gavel, Activity, MapPin, UploadCloud, BrainCircuit, ScaleIcon, FileSearch, Bookmark, Swords, History, Flame } from 'lucide-react'
import { mockDashboardStats, mockCaseHealthScore, mockEvidenceTimeline, mockCaseBrief, mockBookmarks, mockCaseTimeline } from '@/lib/mock-data'
import { getDashboardStats, getCaseHealthScore, getEvidenceTimeline, getCaseBrief, getBookmarks, getCaseTimeline } from '@/lib/case-api'
import { useCaseStore } from '@/lib/case-store'
import type { CaseHealthScore, EvidenceTimelineEvent, BookmarkData, CaseTimelineEvent } from '@/lib/case-store'

const BOOKMARK_BORDER: Record<string, string> = { red: 'border-l-red-700', amber: 'border-l-amber-600', emerald: 'border-l-emerald-700', stone: 'border-l-stone-500' }
const BOOKMARK_BADGE: Record<string, string> = { red: 'bg-red-700 text-white', amber: 'bg-amber-600 text-white', emerald: 'bg-emerald-700 text-white', stone: 'bg-stone-500 text-white' }
const TIMELINE_CAT_COLOR: Record<string, string> = { crime: 'bg-red-600', investigation: 'bg-amber-500', legal: 'bg-stone-500', defense: 'bg-emerald-600', evidence: 'bg-orange-500', hearing: 'bg-red-700' }
const GUILT_COLORS: Record<string, string> = { high: '#dc2626', moderate: '#ea580c', low: '#ca8a04', none: '#525252' }
const GUILT_LABEL: Record<string, string> = { high: 'Высокая', moderate: 'Средняя', low: 'Низкая', none: 'Нет' }
const DOC_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#78716c']
const guiltChartConfig = Object.fromEntries(Object.entries(GUILT_LABEL).map(([k, v]) => [v, { label: v, color: GUILT_COLORS[k] }]))
const docTypeChartConfig = { 'Обвинение': { label: 'Обвинение', color: '#dc2626' }, 'Показание': { label: 'Показание', color: '#ea580c' }, 'Протокол': { label: 'Протокол', color: '#ca8a04' }, 'Экспертиза': { label: 'Экспертиза', color: '#78716c' } }

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

// Health score ring component (SVG-based)
function HealthScoreRing({ score }: { score: number }) {
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="flex items-center justify-center">
      <svg width="140" height="140" className="transform -rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" className="dark:stroke-stone-700" />
        <circle cx="70" cy="70" r={radius} stroke={color} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center"><span className="text-2xl font-bold" style={{ color }}>{score}</span><span className="text-xs text-muted-foreground">из 100</span></div>
    </div>
  )
}

// Factor breakdown with tooltip
function FactorRow({ factor }: { factor: { value: number; label: string; tooltip: string } }) {
  const color = factor.value >= 70 ? 'bg-emerald-700 text-white' : factor.value >= 50 ? 'bg-amber-600 text-white' : 'bg-red-700 text-white'
  const progressColor = factor.value >= 70 ? '[&>div]:bg-emerald-600' : factor.value >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-600'
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <span className="text-xs font-medium min-w-[120px]">{factor.label}</span>
            <Progress value={factor.value} className={`h-2 flex-1 ${progressColor}`} />
            <Badge className={color}>{factor.value}%</Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[280px] text-xs"><p>{factor.tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Evidence timeline event type config
const EVENT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; dotColor: string }> = {
  document_upload: { icon: <UploadCloud className="w-3 h-3 text-amber-600" />, dotColor: 'bg-amber-500' },
  analysis_complete: { icon: <CheckCircle className="w-3 h-3 text-emerald-600" />, dotColor: 'bg-emerald-500' },
  compliance_check: { icon: <Scale className="w-3 h-3 text-orange-600" />, dotColor: 'bg-orange-500' },
  defense_update: { icon: <Shield className="w-3 h-3 text-blue-500" />, dotColor: 'bg-blue-500' },
  episode_found: { icon: <BookOpen className="w-3 h-3 text-red-600" />, dotColor: 'bg-red-500' },
}

function EvidenceTimelineSection({ events }: { events: EvidenceTimelineEvent[] }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileSearch className="w-4 h-4 text-amber-600" /> Хронология событий</CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="relative pl-6 space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
          {events.map((event, i) => {
            const config = EVENT_TYPE_CONFIG[event.eventType] ?? { icon: <Clock className="w-3 h-3" />, dotColor: 'bg-stone-400' }
            return (
              <div key={event.id} className="relative group">
                <div className={`absolute -left-6 w-3 h-3 rounded-full ${config.dotColor} ring-2 ring-background transition-transform group-hover:scale-125`} />
                {i < events.length - 1 && <div className="absolute -left-[21px] top-3 w-0.5 h-full bg-stone-300 dark:bg-stone-600" />}
                <div className="flex items-start gap-2 text-sm">
                  <div className="flex items-center gap-1 shrink-0">{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">{event.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Case Strength Meter: prosecution vs defense opposing bars
function CaseStrengthMeter({ brief }: { brief: typeof mockCaseBrief }) {
  const prosecutionPct = brief.predictedOutcome.slice(0, 2).reduce((s, o) => s + o.probability, 0)
  const defensePct = Math.max(0, 100 - prosecutionPct)
  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-amber-600">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Swords className="w-4 h-4 text-amber-600" /> Баланс сил дела</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-red-700 flex items-center gap-1"><Gavel className="w-3 h-3" />Обвинение</span><span className="font-bold text-red-700">{prosecutionPct}%</span></div>
          <div className="h-4 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden"><div className="h-full bg-gradient-to-r from-red-800 to-red-600 transition-all duration-700" style={{ width: `${prosecutionPct}%` }} /></div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-emerald-700 flex items-center gap-1"><Shield className="w-3 h-3" />Защита</span><span className="font-bold text-emerald-700">{defensePct}%</span></div>
          <div className="h-4 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-800 to-emerald-600 transition-all duration-700" style={{ width: `${defensePct}%` }} /></div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-xs">
          {brief.predictedOutcome.map(o => (
            <div key={o.scenario} className="flex items-center justify-between gap-1"><span className="truncate text-muted-foreground">{o.scenario}</span><Badge variant="outline" className="text-xs shrink-0">{o.probability}%</Badge></div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">ИИ-прогноз исхода • Уверенность {brief.aiConfidence}%</p>
      </CardContent>
    </Card>
  )
}

// Quick Bookmarks grid with color-coded left borders
function QuickBookmarks({ bookmarks, onNavigate }: { bookmarks: BookmarkData[]; onNavigate: () => void }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bookmark className="w-4 h-4 text-amber-600" /> Быстрые закладки <Button size="sm" variant="ghost" className="ml-auto rounded-lg" onClick={onNavigate}>Все <RefreshCw className="w-3 h-3 ml-1" /></Button></CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
          {bookmarks.map(bm => (
            <div key={bm.id} className={`border-l-4 ${BOOKMARK_BORDER[bm.color]} bg-muted/40 rounded-r-lg p-2 transition-all duration-200 hover:bg-muted hover:translate-x-0.5`}>
              <div className="flex items-center gap-1.5">
                <Badge className={`${BOOKMARK_BADGE[bm.color]} text-xs capitalize`}>{bm.entityType}</Badge>
                <span className="text-xs font-medium truncate flex-1">{bm.entityName}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bm.note}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Mini Timeline Preview - compact horizontal timeline of last 5 events
function MiniTimelinePreview({ events, onNavigate }: { events: CaseTimelineEvent[]; onNavigate: () => void }) {
  const last5 = [...events].slice(-5)
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-amber-600" /> Мини-хронология дела <Button size="sm" variant="ghost" className="ml-auto rounded-lg" onClick={onNavigate}>Полная <RefreshCw className="w-3 h-3 ml-1" /></Button></CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2">
          {last5.map((ev, i) => (
            <div key={ev.id} className="flex items-center shrink-0">
              <div className="flex flex-col items-center w-28 text-center">
                <div className={`w-3 h-3 rounded-full ${TIMELINE_CAT_COLOR[ev.category] ?? 'bg-stone-400'} ring-2 ring-background`} />
                <p className="text-xs font-medium mt-1 line-clamp-2 leading-tight">{ev.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</p>
              </div>
              {i < last5.length - 1 && <div className="h-0.5 w-6 bg-stone-300 dark:bg-stone-600" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CaseDashboard() {
  const { setActiveSection } = useCaseStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    retry: 1,
  })
  const { data: healthData } = useQuery({
    queryKey: ['health-score'],
    queryFn: getCaseHealthScore,
    retry: 1,
  })
  const { data: timelineData } = useQuery({
    queryKey: ['evidence-timeline'],
    queryFn: getEvidenceTimeline,
    retry: 1,
  })
  const { data: briefData } = useQuery({ queryKey: ['case-brief'], queryFn: getCaseBrief, retry: 1 })
  const { data: bookmarksData } = useQuery({ queryKey: ['bookmarks'], queryFn: getBookmarks, retry: 1 })
  const { data: caseTimelineData } = useQuery({ queryKey: ['case-timeline'], queryFn: getCaseTimeline, retry: 1 })
  const stats = data ?? mockDashboardStats
  const healthScore = healthData ?? mockCaseHealthScore
  const timelineEvents = timelineData ?? mockEvidenceTimeline
  const brief = briefData ?? mockCaseBrief
  const bookmarks = bookmarksData ?? mockBookmarks
  const caseTimeline = caseTimelineData ?? mockCaseTimeline

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
      {/* Case Banner with ТЯЖКОЕ corner ribbon */}
      <Card className="bg-gradient-to-r from-red-900/30 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 z-10 bg-gradient-to-r from-red-800 to-red-700 text-white text-xs font-bold px-6 py-1 shadow-md transform translate-x-3"><Flame className="w-3 h-3 inline mr-1" />ТЯЖКОЕ</div>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20"><Gavel className="w-6 h-6 text-red-600" /></div>
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

      {/* Case Strength Meter + Mini Timeline Preview */}
      <div className="grid lg:grid-cols-2 gap-4">
        <CaseStrengthMeter brief={brief} />
        <MiniTimelinePreview events={caseTimeline} onNavigate={() => setActiveSection('timeline')} />
      </div>

      {/* "Дело в цифрах" summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_ITEMS.map(({ key, label, icon: Icon, gradient, border }) => (
          <Card key={key} className={`border-l-4 ${border} bg-gradient-to-r ${gradient} rounded-xl shadow-sm transition-shadow hover:shadow-md`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-background/50"><Icon className="w-5 h-5 text-muted-foreground" /></div>
                <div><p className="text-2xl font-bold">{stats.summary[key]}</p><p className="text-xs text-muted-foreground">{label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health Score Widget + Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-amber-600" /> Здоровье дела</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0"><HealthScoreRing score={healthScore.score} /></div>
              <div className="flex-1 space-y-2 pt-1">
                <FactorRow factor={healthScore.factors.documentProcessing} />
                <FactorRow factor={healthScore.factors.complianceRate} />
                <FactorRow factor={healthScore.factors.evidenceStrength} />
                <FactorRow factor={healthScore.factors.defenseCoverage} />
              </div>
            </div>
            <Separator className="mt-3" />
            <div className="flex flex-wrap gap-2 text-xs mt-2">
              <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{stats.summary.totalLocations} мест</Badge>
              <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />{stats.summary.totalCrossReferences} ссылок</Badge>
              <Badge variant="outline"><Shield className="w-3 h-3 mr-1" />{stats.defenseLines.total} стратегий</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-600" /> Быстрые действия</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-12 rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-white shadow-sm" onClick={() => setActiveSection('documents')}><Upload className="w-4 h-4 mr-2" />Загрузить документ</Button>
              <Button variant="outline" className="h-12 rounded-xl shadow-sm" onClick={() => setActiveSection('qa')}><Zap className="w-4 h-4 mr-2" />Задать вопрос ИИ</Button>
              <Button variant="outline" className="h-12 rounded-xl shadow-sm" onClick={() => setActiveSection('legal-check')}><Shield className="w-4 h-4 mr-2" />Правовая проверка</Button>
              <Button variant="outline" className="h-12 rounded-xl shadow-sm" onClick={() => setActiveSection('defense')}><Scale className="w-4 h-4 mr-2" />Линия защиты</Button>
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

      {/* Evidence Timeline */}
      <EvidenceTimelineSection events={timelineEvents} />

      {/* Processing Queue */}
      {stats.processingQueue.inProgress.length > 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />Очередь обработки<Badge className="bg-amber-600 text-white">{stats.processingQueue.byStatus.queued ?? 0} в очереди</Badge></CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {stats.processingQueue.inProgress.map((q) => (
                <div key={q.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                  <Clock className="w-3 h-3 text-amber-500 animate-spin" /><span className="truncate flex-1">{q.originalName}</span><Badge className="bg-amber-600 text-white text-xs">обработка</Badge>
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
            <Button size="sm" variant="ghost" className="ml-auto rounded-lg" onClick={() => setActiveSection('documents')}>Все документы <RefreshCw className="w-3 h-3 ml-1" /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stats.documents.recent.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                {STATUS_ICON[doc.processingStatus]}<span className="truncate flex-1">{doc.originalName}</span>
                <Badge className={doc.processingStatus === 'completed' ? 'bg-emerald-700 text-white' : doc.processingStatus === 'processing' ? 'bg-amber-600 text-white' : 'bg-stone-500 text-white'}>{doc.processingStatus}</Badge>
              </div>
            ))}
          </div>
          <Separator className="mt-3" /><p className="text-xs text-muted-foreground mt-2">Данные из {stats.documents.total} загруженных документов</p>
        </CardContent>
      </Card>

      {/* Quick Bookmarks */}
      <QuickBookmarks bookmarks={bookmarks} onNavigate={() => setActiveSection('search')} />
    </div>
  )
}
