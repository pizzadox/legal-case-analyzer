'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis } from 'recharts'
import { FileText, Users, BookOpen, AlertTriangle, Clock, CheckCircle, CheckCircle2, Circle, Zap, Shield, Scale, ArrowRight, RefreshCw, XCircle, Gavel, Activity, MapPin, UploadCloud, FileSearch, Bookmark, Swords, History, Flame, CalendarClock, TrendingUp, FileUp, MessageCircle, ShieldCheck, Download, BrainCircuit } from 'lucide-react'
import { mockDashboardStats, mockCaseHealthScore, mockEvidenceTimeline, mockCaseBrief, mockBookmarks, mockCaseTimeline } from '@/lib/mock-data'
import { getDashboardStats, getCaseHealthScore, getEvidenceTimeline, getCaseBrief, getBookmarks, getCaseTimeline } from '@/lib/case-api'
import { useCaseStore } from '@/lib/case-store'
import { toast } from '@/hooks/use-toast'
import type { CaseHealthScore, EvidenceTimelineEvent, BookmarkData, CaseTimelineEvent, SectionId } from '@/lib/case-store'

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
  defense_update: { icon: <Shield className="w-3 h-3 text-stone-500" />, dotColor: 'bg-stone-500' },
  episode_found: { icon: <BookOpen className="w-3 h-3 text-red-600" />, dotColor: 'bg-red-500' },
}

function EvidenceTimelineSection({ events }: { events: EvidenceTimelineEvent[] }) {
  return (
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
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
    <Card className="rounded-xl shadow-sm border-l-4 border-amber-600 bg-gradient-to-br from-card via-card to-muted/20 transition-shadow hover:shadow-md">
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
        {/* Scenario rows - one per line to avoid truncation */}
        <div className="space-y-1.5">
          {brief.predictedOutcome.map(o => (
            <div key={o.scenario} className="flex items-center justify-between gap-2 text-xs p-1.5 rounded-md bg-muted/40">
              <span className="flex-1 min-w-0 leading-tight">{o.scenario}</span>
              <Badge variant="outline" className="text-xs shrink-0 font-semibold">{o.probability}%</Badge>
            </div>
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
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
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

// Quick Actions Card - compact 2x2 grid of common actions with toast notifications
function QuickActionsCard({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  const actions = [
    {
      label: 'Загрузить документ',
      icon: FileUp,
      square: 'bg-red-700/15 text-red-700 dark:text-red-400',
      hover: 'hover:bg-red-700/20',
      onClick: () => {
        onNavigate('documents')
        toast({ title: 'Загрузка документа', description: 'Открыт раздел "Документы". Перетащите PDF для загрузки.' })
      },
    },
    {
      label: 'Спросить ИИ',
      icon: MessageCircle,
      square: 'bg-amber-600/15 text-amber-700 dark:text-amber-400',
      hover: 'hover:bg-amber-600/20',
      onClick: () => {
        onNavigate('qa')
        toast({ title: 'Вопрос ИИ', description: 'Открыт раздел "Вопросы ИИ-аналитику".' })
      },
    },
    {
      label: 'Проверить нормы',
      icon: ShieldCheck,
      square: 'bg-emerald-700/15 text-emerald-700 dark:text-emerald-400',
      hover: 'hover:bg-emerald-700/20',
      onClick: () => {
        onNavigate('legal-check')
        toast({ title: 'Правовая проверка', description: 'Открыт раздел правовой проверки.' })
      },
    },
    {
      label: 'Экспорт отчёта',
      icon: Download,
      square: 'bg-stone-600/15 text-stone-700 dark:text-stone-300',
      hover: 'hover:bg-stone-600/20',
      onClick: () => {
        toast({ title: 'Экспорт отчёта', description: 'Подготовка отчёта по делу № 2024-00145...' })
      },
    },
  ]
  return (
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600" /> Быстрые действия
          <Badge variant="outline" className="text-xs ml-auto">4 действия</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ label, icon: Icon, square, hover, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`group flex items-center gap-3 p-3 rounded-xl border border-stone-200/60 dark:border-stone-800 bg-background/60 text-left transition-all duration-200 ${hover} hover:shadow-sm hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus-visible:ring-2 focus-visible:ring-amber-500/40`}
            >
              <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110 ${square}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-xs font-medium leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Case procedure stages (стадии уголовного процесса)
const PROCEDURE_STAGES = [
  { id: 1, short: 'Возбуждение дела', full: 'Возбуждение уголовного дела' },
  { id: 2, short: 'Предварительное расследование', full: 'Предварительное расследование' },
  { id: 3, short: 'Предъявление обвинения', full: 'Предъявление обвинения' },
  { id: 4, short: 'Ознакомление с материалами', full: 'Ознакомление с материалами дела' },
  { id: 5, short: 'Передача дела в суд', full: 'Передача дела в суд' },
  { id: 6, short: 'Предварительное слушание', full: 'Предварительное слушание' },
  { id: 7, short: 'Судебное разбирательство', full: 'Судебное разбирательство' },
  { id: 8, short: 'Вынесение приговора', full: 'Вынесение приговора' },
  { id: 9, short: 'Апелляция', full: 'Апелляция' },
  { id: 10, short: 'Вступление приговора в силу', full: 'Вступление приговора в силу' },
] as const

const PROCEDURE_CURRENT_INDEX = 3 // 0-based -> stage #4 is current

// Small donut chart (80x80px) for procedure progress
function ProcedureProgressDonut({ percent }: { percent: number }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  return (
    <div className="relative shrink-0" aria-label={`Прогресс производства ${percent}%`}>
      <svg width="80" height="80" className="transform -rotate-90">
        <circle cx="40" cy="40" r={radius} stroke="#e7e5e4" strokeWidth="8" fill="none" className="dark:stroke-stone-700" />
        <circle cx="40" cy="40" r={radius} stroke="#9333ea" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-purple-600">{percent}%</span>
      </div>
    </div>
  )
}

// Case Procedure Stage widget - horizontal stepper with 10 standard criminal procedure stages
function CaseProcedureStage() {
  const currentIndex = PROCEDURE_CURRENT_INDEX
  const completedCount = currentIndex
  const percent = Math.round((completedCount / PROCEDURE_STAGES.length) * 100)
  const currentStage = PROCEDURE_STAGES[currentIndex]
  const nextStage = PROCEDURE_STAGES[currentIndex + 1] ?? PROCEDURE_STAGES[currentIndex]

  return (
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-purple-500 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2 relative">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="w-4 h-4 text-purple-600" /> Этапы производства по делу
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1 pr-24">
          {currentStage.full} · {percent}% выполнено
        </p>
        <div className="absolute top-3 right-4">
          <ProcedureProgressDonut percent={percent} />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Horizontal scrollable stepper */}
        <div
          className="flex items-start gap-0 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.400)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-400/60"
          aria-label="Этапы производства по делу (горизонтальная прокрутка)"
        >
          {PROCEDURE_STAGES.map((stage, i) => {
            const isCompleted = i < currentIndex
            const isCurrent = i === currentIndex
            const isUpcoming = i > currentIndex
            const isLast = i === PROCEDURE_STAGES.length - 1
            return (
              <div key={stage.id} className="flex items-start shrink-0">
                <div className="flex flex-col items-center text-center min-w-[110px] max-w-[120px]">
                  <div
                    className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all
                      ${isCompleted ? 'bg-emerald-600 text-white' : ''}
                      ${isCurrent ? 'bg-amber-500 text-white ring-4 ring-amber-500/30 animate-pulse' : ''}
                      ${isUpcoming ? 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400' : ''}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{stage.id}</span>
                    )}
                    {isCurrent && <Circle className="w-9 h-9 absolute text-amber-500/30" />}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 leading-tight font-medium line-clamp-2
                      ${isCompleted ? 'text-emerald-700 dark:text-emerald-500' : ''}
                      ${isCurrent ? 'text-amber-700 dark:text-amber-500 font-bold' : ''}
                      ${isUpcoming ? 'text-muted-foreground' : ''}`}
                  >
                    {stage.short}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className="self-start mt-4 h-0.5 w-6 shrink-0"
                    style={{ background: i < currentIndex ? '#059669' : '#d6d3d1' }}
                    aria-hidden
                  />
                )}
              </div>
            )
          })}
        </div>
        <Separator className="mt-3" />
        {/* Stats below stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-3">
          <div className="p-2 rounded-md bg-muted/40 flex items-start gap-1.5">
            <Clock className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-muted-foreground">Текущая стадия</p>
              <p className="text-sm font-bold mt-0.5 truncate">{currentStage.short}</p>
            </div>
          </div>
          <div className="p-2 rounded-md bg-muted/40 flex items-start gap-1.5">
            <CalendarClock className="w-3 h-3 text-purple-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-muted-foreground">Прогноз срока</p>
              <p className="text-sm font-bold mt-0.5">~4 месяца</p>
            </div>
          </div>
          <div className="p-2 rounded-md bg-muted/40 flex items-start gap-1.5">
            <ArrowRight className="w-3 h-3 text-emerald-700 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-muted-foreground">Следующий этап</p>
              <p className="text-xs sm:text-sm font-bold mt-0.5 leading-tight">
                {nextStage.short}
              </p>
              <p className="text-[10px] font-normal text-muted-foreground mt-0.5">через ~30 дней</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Mini Timeline Preview - compact horizontal timeline of last 5 events
function MiniTimelinePreview({ events, onNavigate }: { events: CaseTimelineEvent[]; onNavigate: () => void }) {
  const last5 = [...events].slice(-5)
  return (
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-amber-600" /> Мини-хронология дела <Button size="sm" variant="ghost" className="ml-auto rounded-lg" onClick={onNavigate}>Полная <RefreshCw className="w-3 h-3 ml-1" /></Button></CardTitle></CardHeader>
      <CardContent className="p-4">
        <div
          className="flex items-stretch gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.400)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-400/60"
          aria-label="Мини-хронология дела (горизонтальная прокрутка)"
        >
          {last5.map((ev, i) => (
            <div key={ev.id} className="flex items-stretch shrink-0">
              <div className="flex flex-col items-center text-center min-w-[200px] max-w-[220px] p-2 rounded-lg bg-muted/30 transition-colors hover:bg-muted/60">
                <div className={`w-3 h-3 rounded-full ${TIMELINE_CAT_COLOR[ev.category] ?? 'bg-stone-400'} ring-2 ring-background shrink-0`} />
                <p className="text-xs font-medium mt-1.5 leading-tight line-clamp-3">{ev.title}</p>
                <p className="text-xs text-muted-foreground mt-1 shrink-0">{new Date(ev.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</p>
              </div>
              {i < last5.length - 1 && <div className="self-center mx-0.5 h-0.5 w-5 shrink-0 bg-stone-300 dark:bg-stone-600" />}
            </div>
          ))}
        </div>
        {last5.length >= 4 && (
          <p className="text-[10px] text-muted-foreground mt-1 text-right flex items-center justify-end gap-1">
            <RefreshCw className="w-2.5 h-2.5" /> Прокрутите для просмотра всех событий
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Animated counter hook — smoothly increments from 0 to target value over ~700ms
function useAnimatedCounter(target: number, durationMs: number = 700) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    const startValue = value
    const delta = target - startValue
    if (delta === 0) return
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(startValue + delta * eased))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, durationMs])
  return value
}

function AnimatedStatCard({
  label,
  value,
  delta,
  deltaType,
  icon: Icon,
  iconBg,
  iconColor,
  border,
  gradient,
  onClick,
}: {
  label: string
  value: number
  delta?: string
  deltaType?: 'up' | 'down' | 'flat'
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  border: string
  gradient: string
  onClick?: () => void
}) {
  const animated = useAnimatedCounter(value)
  const deltaColor = deltaType === 'up' ? 'text-emerald-600' : deltaType === 'down' ? 'text-red-600' : 'text-muted-foreground'
  const DeltaIcon = deltaType === 'up' ? TrendingUp : deltaType === 'down' ? AlertTriangle : Activity
  return (
    <Card
      className={`min-w-0 rounded-xl shadow-sm border-t-2 ${border} bg-gradient-to-br ${gradient} transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight mt-1 tabular-nums">{animated}</p>
            {delta && (
              <div className={`flex items-center gap-1 text-[10px] mt-1 font-medium ${deltaColor} truncate`}>
                <DeltaIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{delta}</span>
              </div>
            )}
          </div>
          <div className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${iconBg} shrink-0`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickStatsBar({ stats, onNavigate }: {
  stats: typeof mockDashboardStats
  onNavigate: (section: SectionId) => void
}) {
  const s = stats.summary
  const complianceRate = stats.complianceChecks.total > 0
    ? Math.round(((stats.complianceChecks.byStatus.compliant ?? 0) / stats.complianceChecks.total) * 100)
    : 0
  const processedRate = stats.documents.total > 0
    ? Math.round(((stats.documents.byStatus.completed ?? 0) / stats.documents.total) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-1">
      <AnimatedStatCard
        label="Документы"
        value={s.totalDocuments}
        delta={`${processedRate}% обработано`}
        deltaType={processedRate >= 70 ? 'up' : 'flat'}
        icon={FileText}
        iconBg="bg-red-700/15"
        iconColor="text-red-700"
        border="border-t-red-500"
        gradient="from-card via-card to-red-500/5"
        onClick={() => onNavigate('documents')}
      />
      <AnimatedStatCard
        label="Участники"
        value={s.totalPersons}
        delta={`${stats.persons.kolesnichenko ? '1 обвиняемый' : '—'}`}
        deltaType="flat"
        icon={Users}
        iconBg="bg-orange-600/15"
        iconColor="text-orange-600"
        border="border-t-orange-500"
        gradient="from-card via-card to-orange-500/5"
        onClick={() => onNavigate('persons')}
      />
      <AnimatedStatCard
        label="Эпизоды"
        value={s.totalEpisodes}
        delta={`${stats.episodes.byStatus['доказано'] ?? 0} доказано`}
        deltaType="up"
        icon={BookOpen}
        iconBg="bg-amber-600/15"
        iconColor="text-amber-600"
        border="border-t-amber-500"
        gradient="from-card via-card to-amber-500/5"
        onClick={() => onNavigate('episodes')}
      />
      <AnimatedStatCard
        label="Статьи УК"
        value={s.totalArticles}
        delta="активные статьи"
        deltaType="flat"
        icon={Scale}
        iconBg="bg-stone-600/15"
        iconColor="text-stone-600"
        border="border-t-stone-500"
        gradient="from-card via-card to-stone-500/5"
        onClick={() => onNavigate('legal-check')}
      />
      <AnimatedStatCard
        label="Соответствие"
        value={complianceRate}
        delta={`${stats.complianceChecks.total} проверок`}
        deltaType={complianceRate >= 70 ? 'up' : 'down'}
        icon={ShieldCheck}
        iconBg="bg-emerald-700/15"
        iconColor="text-emerald-700"
        border="border-t-emerald-500"
        gradient="from-card via-card to-emerald-500/5"
        onClick={() => onNavigate('legal-check')}
      />
      <AnimatedStatCard
        label="Линия защиты"
        value={s.totalDefenseLines}
        delta="стратегий"
        deltaType="flat"
        icon={Swords}
        iconBg="bg-purple-700/15"
        iconColor="text-purple-700"
        border="border-t-purple-500"
        gradient="from-card via-card to-purple-500/5"
        onClick={() => onNavigate('defense')}
      />
    </div>
  )
}

// === Procedural Deadlines Tracker ===
// Tracks key procedural deadlines under Russian CPC (УПК РФ) —-article 162 (investigation term),
// article 109 (detention term), article 234 (preliminary hearing), article 321 (appeal term).
const PROCEDURAL_DEADLINES = [
  {
    id: 'd1',
    title: 'Ознакомление обвиняемого с материалами дела',
    article: 'ст. 217 УПК РФ',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    importance: 'high' as const,
    status: 'upcoming' as const,
    description: 'Колесниченко должен быть ознакомлен со всеми материалами дела до направления в суд',
  },
  {
    id: 'd2',
    title: 'Предварительное слушание',
    article: 'ст. 234 УПК РФ',
    deadline: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
    importance: 'critical' as const,
    status: 'upcoming' as const,
    description: 'Решение вопросов о допустимости доказательств, возврате дела прокурору',
  },
  {
    id: 'd3',
    title: 'Срок следствия по тяжкому преступлению',
    article: 'ст. 162 ч.1 УПК РФ',
    deadline: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    importance: 'critical' as const,
    status: 'warning' as const,
    description: 'Предельный срок следствия — 12 месяцев с возможностью продления руководителем СК',
  },
  {
    id: 'd4',
    title: 'Подача ходатайства об исключении доказательств',
    article: 'ст. 235 УПК РФ',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    importance: 'high' as const,
    status: 'urgent' as const,
    description: 'Ходатайство о признании недопустимым доказательства — протокол обыска без адвоката',
  },
  {
    id: 'd5',
    title: 'Срок содержания под стражей',
    article: 'ст. 109 УПК РФ',
    deadline: new Date(Date.now() + 47 * 24 * 60 * 60 * 1000).toISOString(),
    importance: 'critical' as const,
    status: 'upcoming' as const,
    description: 'Максимальный срок содержания под стражей по тяжким преступлениям — 18 месяцев',
  },
  {
    id: 'd6',
    title: 'Срок обжалования действий следователя',
    article: 'ст. 124 УПК РФ',
    deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    importance: 'medium' as const,
    status: 'overdue' as const,
    description: 'Жалоба в прокуратуру на действия/бездействие следователя — 3 суток',
  },
] as const

const DEADLINE_IMPORTANCE: Record<string, { color: string; badge: string; label: string }> = {
  critical: { color: 'border-l-red-700 bg-red-700/5', badge: 'bg-red-700 text-white', label: 'Критический' },
  high: { color: 'border-l-orange-600 bg-orange-600/5', badge: 'bg-orange-600 text-white', label: 'Высокий' },
  medium: { color: 'border-l-amber-600 bg-amber-600/5', badge: 'bg-amber-600 text-white', label: 'Средний' },
  low: { color: 'border-l-stone-500 bg-stone-500/5', badge: 'bg-stone-500 text-white', label: 'Низкий' },
}

const DEADLINE_STATUS: Record<string, { badge: string; label: string; icon: 'clock' | 'urgent' | 'overdue' | 'warning' }> = {
  upcoming: { badge: 'bg-stone-600 text-white', label: 'Запланировано', icon: 'clock' },
  urgent: { badge: 'bg-amber-600 text-white', label: 'Срочно', icon: 'urgent' },
  warning: { badge: 'bg-orange-600 text-white', label: 'Предупреждение', icon: 'warning' },
  overdue: { badge: 'bg-red-800 text-white', label: 'Просрочено', icon: 'overdue' },
}

function ProceduralDeadlinesTracker() {
  const now = new Date()
  const sorted = [...PROCEDURAL_DEADLINES].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  const upcoming = sorted.filter(d => new Date(d.deadline).getTime() > now.getTime())
  const overdue = sorted.filter(d => new Date(d.deadline).getTime() <= now.getTime())
  const nextDeadline = upcoming[0]
  const daysToNext = nextDeadline
    ? Math.ceil((new Date(nextDeadline.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  const daysTo = (iso: string) => {
    const diff = Math.ceil((new Date(iso).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `просрочено на ${Math.abs(diff)} дн.`
    if (diff === 0) return 'сегодня'
    if (diff === 1) return 'завтра'
    return `через ${diff} дн.`
  }

  return (
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-red-500/5 border-t-2 border-t-red-500 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-700/15">
            <CalendarClock className="w-3.5 h-3.5 text-red-700" />
          </div>
          Процессуальные сроки
          <Badge variant="outline" className="text-xs ml-1">{sorted.length} событий</Badge>
          {overdue.length > 0 && (
            <Badge className="bg-red-800 text-white text-xs ml-auto gap-1">
              <AlertTriangle className="w-3 h-3" />{overdue.length} просрочено
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Next deadline highlight */}
        {nextDeadline && (
          <div className={`p-3 rounded-xl border-l-4 ${DEADLINE_IMPORTANCE[nextDeadline.importance].color} flex items-center gap-3 transition-transform hover:scale-[1.01]`}>
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-background/70 shrink-0">
              <span className={`text-2xl font-black leading-none ${daysToNext <= 3 ? 'text-red-700' : daysToNext <= 14 ? 'text-orange-600' : 'text-stone-700 dark:text-stone-200'}`}>
                {daysToNext === 0 ? '!' : daysToNext}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">дн.</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold leading-tight">{nextDeadline.title}</p>
                <Badge className={`text-[10px] ${DEADLINE_IMPORTANCE[nextDeadline.importance].badge}`}>{DEADLINE_IMPORTANCE[nextDeadline.importance].label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{nextDeadline.article} • {fmtDate(nextDeadline.deadline)} • {daysTo(nextDeadline.deadline)}</p>
              <p className="text-xs mt-1 text-foreground/80 line-clamp-2">{nextDeadline.description}</p>
            </div>
          </div>
        )}

        {/* Compact deadline list */}
        <div className="grid sm:grid-cols-2 gap-2">
          {sorted.slice(0, 6).map(d => {
            const days = Math.ceil((new Date(d.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            const isOverdue = days < 0
            const isUrgent = days >= 0 && days <= 3
            return (
              <TooltipProvider key={d.id} delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`p-2.5 rounded-lg border-l-4 ${DEADLINE_IMPORTANCE[d.importance].color} cursor-help transition-all hover:shadow-sm hover:-translate-y-0.5`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge className={`text-[9px] px-1.5 py-0 ${DEADLINE_STATUS[d.status].badge}`}>{DEADLINE_STATUS[d.status].label}</Badge>
                        <span className={`text-[11px] font-bold tabular-nums ${isOverdue ? 'text-red-700' : isUrgent ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {daysTo(d.deadline)}
                        </span>
                      </div>
                      <p className="text-xs font-medium leading-tight line-clamp-2">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{d.article}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[260px]">
                    <p className="font-semibold">{d.title}</p>
                    <p className="text-muted-foreground mt-0.5">{d.article}</p>
                    <p className="mt-1">{fmtDate(d.deadline)}</p>
                    <Separator className="my-1" />
                    <p className="italic">{d.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>

        <Separator />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><History className="w-3 h-3" /> Обновлено {now.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-700" /> критич.
            <span className="w-2 h-2 rounded-full bg-orange-600 ml-1" /> высок.
            <span className="w-2 h-2 rounded-full bg-amber-600 ml-1" /> сред.
          </span>
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
      <Card className="bg-gradient-to-r from-red-900/30 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
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

      {/* Quick Stats Bar - 6 animated clickable stat tiles */}
      <QuickStatsBar stats={stats} onNavigate={(section) => setActiveSection(section)} />

      {/* Quick Actions - compact 2x2 grid of common actions */}
      <QuickActionsCard onNavigate={(section) => setActiveSection(section)} />

      {/* Case Procedure Stages - horizontal stepper with progress donut */}
      <CaseProcedureStage />

      {/* Procedural Deadlines Tracker — upcoming deadlines with countdown */}
      <ProceduralDeadlinesTracker />

      {/* Case Strength Meter + Mini Timeline Preview */}
      <div className="grid lg:grid-cols-2 gap-4">
        <CaseStrengthMeter brief={brief} />
        <MiniTimelinePreview events={caseTimeline} onNavigate={() => setActiveSection('timeline')} />
      </div>

      {/* Case velocity / Next hearing card - new feature */}
      <Card className="rounded-xl shadow-sm border-l-4 border-emerald-700 bg-gradient-to-r from-emerald-900/10 to-transparent transition-shadow hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-700/15">
              <CalendarClock className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Следующее заседание</p>
              <p className="text-sm font-bold mt-0.5">15 августа 2024, 10:00 — Предварительное слушание</p>
              <p className="text-xs text-muted-foreground mt-0.5">Председатель: судья Петров А.В. • Зал №305</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-emerald-700">23</p>
              <p className="text-xs text-muted-foreground">дня до заседания</p>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-md bg-muted/40">
              <p className="font-medium text-muted-foreground">Прошло с возбуждения</p>
              <p className="text-sm font-bold mt-0.5">156 дней</p>
            </div>
            <div className="p-2 rounded-md bg-muted/40">
              <p className="font-medium text-muted-foreground">Осталось по сроку (ст.162)</p>
              <p className="text-sm font-bold mt-0.5">~29 дней</p>
            </div>
            <div className="p-2 rounded-md bg-muted/40">
              <p className="font-medium text-muted-foreground">Темп дела</p>
              <p className="text-sm font-bold mt-0.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-amber-600" />
                Средний
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* "Дело в цифрах" summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_ITEMS.map(({ key, label, icon: Icon, gradient, border }) => {
          const topBorder = key === 'totalDocuments' ? 'border-t-2 border-t-stone-500' : key === 'totalPersons' ? 'border-t-2 border-t-emerald-500' : key === 'totalEpisodes' ? 'border-t-2 border-t-amber-500' : 'border-t-2 border-t-stone-400'
          return (
          <Card key={key} className={`border-l-4 ${border} ${topBorder} bg-gradient-to-br ${gradient} rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-background/50"><Icon className="w-5 h-5 text-muted-foreground" /></div>
                <div><p className="text-2xl font-bold">{stats.summary[key]}</p><p className="text-xs text-muted-foreground">{label}</p></div>
              </div>
            </CardContent>
          </Card>
          )
        })}
      </div>

      {/* Health Score Widget - now full width */}
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-amber-600" /> Здоровье дела <Badge variant="outline" className="text-xs ml-auto">{healthScore.score}/100</Badge></CardTitle></CardHeader>
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
            <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />Соответствие {complianceScore}%</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-emerald-500 transition-shadow hover:shadow-md">
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
        <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-stone-500 transition-shadow hover:shadow-md">
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

      {/* AI Case Digest — concise auto-generated case overview */}
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-purple-900/10 via-card to-card border-t-2 border-t-purple-500 transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-700/15">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-700" />
            </div>
            ИИ-дайджест дела
            <Badge className="bg-purple-700 text-white text-xs ml-auto">Авто-сводка</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            <span className="font-semibold">Краткое содержание:</span> Уголовное дело № 2024-00145 возбуждено в отношении Колесниченко Д.А. по признакам преступлений, предусмотренных ч.3 ст.159 и ч.2 ст.160 УК РФ. В материалах дела <span className="font-semibold text-purple-700 dark:text-purple-400">{stats.summary.totalDocuments} документа</span>, <span className="font-semibold text-purple-700 dark:text-purple-400">{stats.summary.totalEpisodes} преступных эпизода</span>, обвинение опирается на показания свидетелей и заключение финансово-экономической экспертизы.
          </p>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/40 border-l-2 border-l-red-700">
              <p className="text-xs font-semibold flex items-center gap-1 text-red-700 dark:text-red-400">
                <AlertTriangle className="w-3 h-3" />Ключевые риски
              </p>
              <ul className="text-xs mt-1.5 space-y-0.5 text-muted-foreground">
                <li>• Обыск без адвоката (нарушение ст.51 УПК)</li>
                <li>• Противоречия в показаниях свидетелей</li>
                <li>• Возможна переквалификация ст.159 ч.3 → ч.2</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border-l-2 border-l-emerald-700">
              <p className="text-xs font-semibold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-3 h-3" />Сильные стороны защиты
              </p>
              <ul className="text-xs mt-1.5 space-y-0.5 text-muted-foreground">
                <li>• Алиби на период эпизода 1 (свидетель Козлова)</li>
                <li>• Процессуальные нарушения при изъятии</li>
                <li>• Отсутствие судимостей (ст.61 УК РФ)</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border-l-2 border-l-amber-600">
              <p className="text-xs font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <TrendingUp className="w-3 h-3" />Рекомендации
              </p>
              <ul className="text-xs mt-1.5 space-y-0.5 text-muted-foreground">
                <li>• Подать ходатайство об исключении доказательств</li>
                <li>• Запросить повторную экспертизу</li>
                <li>• Подготовить смягчающие обстоятельства</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20"
              onClick={() => setActiveSection('qa')}
            >
              <MessageCircle className="w-3 h-3" />Задать вопрос ИИ
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg text-xs gap-1"
              onClick={() => setActiveSection('brief')}
            >
              <FileText className="w-3 h-3" />Полное изложение
            </Button>
            <span className="text-[10px] text-muted-foreground ml-auto italic">Сгенерировано ИИ • обновлено {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Timeline */}
      <EvidenceTimelineSection events={timelineEvents} />

      {/* Processing Queue */}
      {stats.processingQueue.inProgress.length > 0 && (
        <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
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
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-stone-500 transition-shadow hover:shadow-md">
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
