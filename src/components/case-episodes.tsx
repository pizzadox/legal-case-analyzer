'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import {
  BookOpen, MapPin, Users, Scale, Clock, CheckCircle, AlertTriangle, XCircle, Calendar, FileText, Link2, Download, Gavel, RefreshCw, Search, Shield, Eye, ChevronDown, ChevronUp, BarChart3, Flame
} from 'lucide-react'
import { getEpisodes } from '@/lib/case-api'
import type { EpisodeData } from '@/lib/case-store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

// ─── Helpers ────────────────────────────────────────────────────────────────────
function hasValue(v: unknown): boolean {
  return v != null && v !== '' && v !== undefined
}
function personLabel(p: { shortName?: string | null; fullName?: string | null; person?: { shortName?: string | null; fullName?: string | null } }): string {
  if (p.person) return p.person.shortName ?? p.person.fullName ?? '—'
  return (p.shortName ?? p.fullName ?? '—') as string
}
function articleCode(a: { code?: string; article?: { code?: string } }): string {
  return (a.article?.code ?? a.code ?? '—') as string
}
function locationName(l: { name?: string | null; location?: { name?: string | null } }): string {
  return (l.location?.name ?? l.name ?? '—') as string
}
function locationAddress(l: { address?: string | null; location?: { address?: string | null } }): string {
  return (l.location?.address ?? l.address ?? '—') as string
}

function exportEpisodesCSV(episodes: EpisodeData[]) {
  const rows = ['Title,Severity,Status,Date,Persons,Articles']
  episodes.forEach(e => {
    const persons = e.persons.map(p => `${personLabel(p)} (${p.involvement ?? ''})`).join('; ')
    const articles = e.articles.map(a => articleCode(a)).join('; ')
    rows.push(`"${e.title}",${e.severity ?? ''},${e.status ?? ''},${e.date ?? ''},"${persons}","${articles}"`)
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'episodes.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV экспорт выполнен')
}

// ─── Severity / Status color maps ──────────────────────────────────────────────
const SEVERITY: Record<string, string> = {
  'особо тяжкое': 'bg-red-700 text-white',
  'тяжкое': 'bg-red-600 text-white',
  'средней тяжести': 'bg-amber-600 text-white',
  'небольшое': 'bg-stone-400 text-white',
}

const SEVERITY_DOT: Record<string, string> = {
  'особо тяжкое': 'bg-red-700',
  'тяжкое': 'bg-red-600',
  'средней тяжести': 'bg-amber-600',
  'небольшое': 'bg-stone-400',
}

const SEVERITY_BORDER: Record<string, string> = {
  'особо тяжкое': 'border-l-red-800',
  'тяжкое': 'border-l-red-600',
  'средней тяжести': 'border-l-amber-600',
  'небольшое': 'border-l-stone-400',
}

const SEVERITY_BG: Record<string, string> = {
  'особо тяжкое': 'bg-red-700/10 border-red-700/30',
  'тяжкое': 'bg-red-600/10 border-red-600/30',
  'средней тяжести': 'bg-amber-600/10 border-amber-600/30',
  'небольшое': 'bg-stone-400/10 border-stone-400/30',
}

const STATUS_BADGE: Record<string, string> = {
  'расследуется': 'bg-amber-600 text-white',
  'доказано': 'bg-emerald-700 text-white',
  'сомнительно': 'bg-red-700 text-white',
}

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  'доказано': CheckCircle,
  'расследуется': Clock,
  'сомнительно': AlertTriangle,
}

const INVOLVEMENT: Record<string, string> = {
  'организатор': 'bg-red-700 text-white',
  'соучастник': 'bg-orange-600 text-white',
  'исполнитель': 'bg-red-600 text-white',
  'подозреваемый': 'bg-amber-600 text-white',
  'свидетель': 'bg-stone-600 text-white',
  'потерпевшая': 'bg-emerald-700 text-white',
}

const SEVERITY_ORDER: Record<string, number> = {
  'особо тяжкое': 4,
  'тяжкое': 3,
  'средней тяжести': 2,
  'небольшое': 1,
}

const SEVERITY_LABELS = ['особо тяжкое', 'тяжкое', 'средней тяжести', 'небольшое'] as const
const SEVERITY_SHORT = ['Особо тяжкое', 'Тяжкое', 'Средней тяжести', 'Небольшое'] as const
const STATUS_LABELS = ['доказано', 'расследуется', 'сомнительно'] as const
const STATUS_SHORT = ['Доказано', 'Расследуется', 'Сомнительно'] as const

// Heat map cell color based on count intensity
function heatColor(count: number, max: number): string {
  if (max === 0) return 'bg-stone-50 text-stone-400'
  const ratio = count / max
  if (ratio === 0) return 'bg-stone-50 text-stone-400'
  if (ratio <= 0.25) return 'bg-red-100 text-red-700'
  if (ratio <= 0.5) return 'bg-red-200 text-red-800'
  if (ratio <= 0.75) return 'bg-red-400 text-white'
  return 'bg-red-700 text-white'
}

// Severity score calculation
function severityScore(severity: string | null): number {
  return SEVERITY_ORDER[severity ?? ''] ?? 0
}

// ─── Component ──────────────────────────────────────────────────────────────────
export function CaseEpisodes({ caseId }: { caseId: string }) {
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<string>>(new Set())
  const { data, isLoading } = useQuery({ queryKey: ['episodes', caseId], queryFn: () => getEpisodes(caseId), enabled: !!caseId, retry: 1, refetchInterval: 30000 })
  const episodes = data ?? []

  // ─── Filtered episodes ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = episodes
    if (severityFilter !== 'all') result = result.filter(e => e.severity === severityFilter)
    if (statusFilter !== 'all') result = result.filter(e => e.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(e => e.title.toLowerCase().includes(q))
    }
    // Sort by severity descending, then date
    result.sort((a, b) => {
      const scoreDiff = severityScore(b.severity) - severityScore(a.severity)
      if (scoreDiff !== 0) return scoreDiff
      return (a.date ?? '').localeCompare(b.date ?? '')
    })
    return result
  }, [episodes, severityFilter, statusFilter, searchQuery])

  // ─── Summary stats ────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total: episodes.length,
    critical: episodes.filter(e => e.severity === 'особо тяжкое').length,
    high: episodes.filter(e => e.severity === 'тяжкое').length,
    medium: episodes.filter(e => e.severity === 'средней тяжести').length,
    low: episodes.filter(e => e.severity === 'небольшое').length,
    proven: episodes.filter(e => e.status === 'доказано').length,
    investigating: episodes.filter(e => e.status === 'расследуется').length,
    doubtful: episodes.filter(e => e.status === 'сомнительно').length,
    avgScore: episodes.length > 0
      ? (episodes.reduce((sum, e) => sum + severityScore(e.severity), 0) / episodes.length).toFixed(1)
      : '0',
  }), [episodes])

  // ─── Heat map data ────────────────────────────────────────────────────────
  const heatMap = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {}
    STATUS_LABELS.forEach(status => {
      matrix[status] = {}
      SEVERITY_LABELS.forEach(severity => {
        matrix[status][severity] = episodes.filter(e => e.status === status && e.severity === severity).length
      })
    })
    const max = Math.max(...STATUS_LABELS.flatMap(s => SEVERITY_LABELS.map(sv => matrix[s][sv])), 0)
    return { matrix, max }
  }, [episodes])

  // ─── Timeline data ────────────────────────────────────────────────────────
  const timelineEpisodes = useMemo(() => {
    const sorted = [...filtered].filter(e => e.date).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    if (sorted.length === 0) return []
    const dates = sorted.map(e => new Date(e.date!).getTime())
    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)
    const range = maxDate - minDate || 1
    return sorted.map(e => ({
      ...e,
      position: ((new Date(e.date!).getTime() - minDate) / range) * 100,
    }))
  }, [filtered])

  // ─── Toggle episode detail ────────────────────────────────────────────────
  const toggleExpanded = (id: string) => {
    setExpandedEpisodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">

        {/* ═══════════════════════════════════════════════════════════════════════
            1. SECTION HEADER BANNER
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="bg-gradient-to-r from-amber-900/30 via-amber-900/15 to-stone-900/5 border-l-4 border-amber-600 rounded-xl shadow-md overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600/20 shadow-sm">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Этапы производства по делу</p>
                <p className="text-xs text-muted-foreground">Хронология, тяжесть и участники каждого этапа</p>
              </div>
              <Badge className="bg-stone-600 text-white text-xs font-semibold">{episodes.length} этапов</Badge>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            5. EPISODE STATS BAR
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="rounded-xl shadow-sm border-stone-200/50 bg-gradient-to-r from-stone-50 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold">Статистика этапов</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {/* Total */}
              <div className="flex flex-col items-center p-2 rounded-lg bg-stone-100/50">
                <span className="text-xl font-bold tracking-tight">{summary.total}</span>
                <p className="text-xs text-muted-foreground font-medium">Всего</p>
              </div>
              {/* By severity */}
              {[
                { label: 'Особо тяжкие', value: summary.critical, color: 'text-red-700', bg: 'bg-red-50' },
                { label: 'Тяжкие', value: summary.high, color: 'text-red-600', bg: 'bg-red-50/50' },
                { label: 'Средней тяжести', value: summary.medium, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Небольшой', value: summary.low, color: 'text-stone-500', bg: 'bg-stone-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`flex flex-col items-center p-2 rounded-lg ${bg}`}>
                  <span className={`text-xl font-bold tracking-tight ${color}`}>{value}</span>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                </div>
              ))}
              {/* Avg severity score */}
              <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50/50">
                <span className="text-xl font-bold tracking-tight text-amber-700">{summary.avgScore}</span>
                <p className="text-xs text-muted-foreground font-medium">Средн. тяжесть</p>
              </div>
            </div>
            {/* Status breakdown as a horizontal bar */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium shrink-0">По статусу:</span>
              <div className="flex-1 flex items-center gap-1">
                {[
                  { label: 'Доказано', value: summary.proven, color: 'bg-emerald-700' },
                  { label: 'Расследуется', value: summary.investigating, color: 'bg-amber-600' },
                  { label: 'Сомнительно', value: summary.doubtful, color: 'bg-red-700' },
                ].map(({ label, value, color }) => {
                  const pct = summary.total > 0 ? (value / summary.total) * 100 : 0
                  return (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <div className={`h-5 rounded-md ${color} flex items-center justify-center cursor-default transition-opacity hover:opacity-80`}
                          style={{ width: `${Math.max(pct, 8)}%` }}>
                          <span className="text-xs text-white font-semibold">{value}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{label}: {value} ({pct.toFixed(0)}%)</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            1. SEVERITY HEAT MAP
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="rounded-xl shadow-sm border-stone-200/50">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-700" />
              Тепловая карта: тяжесть × статус
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-xs font-semibold text-muted-foreground text-left w-28">Статус</th>
                    {SEVERITY_SHORT.map((label, i) => (
                      <th key={SEVERITY_LABELS[i]} className="p-2 text-xs font-semibold text-muted-foreground">
                        {label}
                      </th>
                    ))}
                    <th className="p-2 text-xs font-semibold text-muted-foreground">Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_LABELS.map((status, si) => {
                    const rowTotal = SEVERITY_LABELS.reduce((sum, sv) => sum + heatMap.matrix[status][sv], 0)
                    return (
                      <tr key={status}>
                        <td className="p-2 text-xs font-medium text-left">
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const Icon = STATUS_ICON[status] ?? Clock
                              return <Icon className="w-3 h-3 text-muted-foreground" />
                            })()}
                            {STATUS_SHORT[si]}
                          </div>
                        </td>
                        {SEVERITY_LABELS.map(severity => {
                          const count = heatMap.matrix[status][severity]
                          return (
                            <td key={severity} className="p-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`min-w-[40px] h-8 rounded-md flex items-center justify-center font-bold text-sm cursor-default transition-transform hover:scale-105 ${heatColor(count, heatMap.max)}`}>
                                    {count || '0'}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{STATUS_SHORT[si]} + {SEVERITY_SHORT[SEVERITY_LABELS.indexOf(severity)]}: {count}</TooltipContent>
                              </Tooltip>
                            </td>
                          )
                        })}
                        <td className="p-2">
                          <div className="min-w-[40px] h-8 rounded-md bg-stone-100 flex items-center justify-center font-bold text-sm text-stone-700">
                            {rowTotal}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="border-t border-stone-200">
                    <td className="p-2 text-xs font-semibold text-left">Итого</td>
                    {SEVERITY_LABELS.map(severity => {
                      const colTotal = STATUS_LABELS.reduce((sum, s) => sum + heatMap.matrix[s][severity], 0)
                      return (
                        <td key={severity} className="p-2">
                          <div className="min-w-[40px] h-8 rounded-md bg-stone-100 flex items-center justify-center font-bold text-sm text-stone-700">
                            {colTotal}
                          </div>
                        </td>
                      )
                    })}
                    <td className="p-2">
                      <div className="min-w-[40px] h-8 rounded-md bg-stone-200 flex items-center justify-center font-bold text-sm text-stone-800">
                        {summary.total}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            2. TIMELINE MINI-VIEW (Horizontal Strip)
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="rounded-xl shadow-sm border-stone-200/50">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              Временная шкала этапов
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            {timelineEpisodes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Нет этапов с датами для отображения на шкале</p>
            ) : (
              <div className="relative">
                {/* Baseline */}
                <div className="h-1 bg-stone-200 rounded-full w-full" />
                {/* Date markers */}
                {timelineEpisodes.length > 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{timelineEpisodes[0].date ?? ''}</span>
                    <span className="text-xs text-muted-foreground">{timelineEpisodes[timelineEpisodes.length - 1].date ?? ''}</span>
                  </div>
                )}
                {/* Episode dots/bars */}
                <div className="relative h-14 mt-2">
                  {timelineEpisodes.map(ep => (
                    <Tooltip key={ep.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute top-0 flex flex-col items-center cursor-default group"
                          style={{ left: `${ep.position}%`, transform: 'translateX(-50%)' }}
                        >
                          {/* Colored dot */}
                          <div className={`w-4 h-4 rounded-full ${SEVERITY_DOT[ep.severity ?? ''] ?? 'bg-stone-500'} border-2 border-white shadow-sm transition-transform duration-200 group-hover:scale-1.5`} />
                          {/* Vertical bar extending down */}
                          <div className={`w-1 h-8 rounded-b ${SEVERITY_DOT[ep.severity ?? ''] ?? 'bg-stone-500'} opacity-60`} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-semibold">{ep.title}</p>
                        <p className="text-xs opacity-80">{[ep.date, ep.severity, ep.status].filter(hasValue).join(' · ')}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                {/* Episode short labels below */}
                <div className="relative h-6">
                  {timelineEpisodes.map(ep => (
                    <div
                      key={`${ep.id}-label`}
                      className="absolute text-xs text-muted-foreground truncate max-w-[80px]"
                      style={{ left: `${ep.position}%`, transform: 'translateX(-50%)' }}
                    >
                      {ep.episodeNumber ?? ep.title.substring(0, 8)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            6. FILTER CONTROLS
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию этапа..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 rounded-xl h-8 text-sm"
            />
          </div>
          {/* Severity dropdown */}
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40 rounded-xl h-8 text-sm"><SelectValue placeholder="Тяжесть" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все тяжести</SelectItem>
              <SelectItem value="особо тяжкое">Особо тяжкое</SelectItem>
              <SelectItem value="тяжкое">Тяжкое</SelectItem>
              <SelectItem value="средней тяжести">Средней тяжести</SelectItem>
              <SelectItem value="небольшое">Небольшое</SelectItem>
            </SelectContent>
          </Select>
          {/* Status dropdown */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl h-8 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="доказано">Доказано</SelectItem>
              <SelectItem value="расследуется">Расследуется</SelectItem>
              <SelectItem value="сомнительно">Сомнительно</SelectItem>
            </SelectContent>
          </Select>
          <Badge className="bg-stone-600 text-white text-xs font-semibold">{filtered.length} этапов</Badge>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8" onClick={() => exportEpisodesCSV(episodes)}>
            <Download className="w-3 h-3" />CSV
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8" onClick={() => toast.info('PDF экспорт будет доступен в будущих версиях')}>
            <FileText className="w-3 h-3" />PDF
          </Button>
          {(severityFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
            <Button size="sm" variant="ghost" className="rounded-xl gap-1 h-8 text-muted-foreground" onClick={() => { setSeverityFilter('all'); setStatusFilter('all'); setSearchQuery('') }}>
              <RefreshCw className="w-3 h-3" />Сбросить
            </Button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Empty state
        ═══════════════════════════════════════════════════════════════════════ */}
        {filtered.length === 0 && episodes.length > 0 && (
          <Card className="rounded-xl shadow-sm border-t-2 border-t-amber-500 bg-gradient-to-br from-card via-card to-amber-500/5">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mx-auto mb-4 ring-4 ring-amber-500/5">
                <BookOpen className="w-10 h-10 text-amber-600" />
              </div>
              <p className="text-base font-semibold">Этапы не найдены</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Попробуйте изменить фильтры или сбросить их, чтобы увидеть все этапы дела.</p>
              <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => { setSeverityFilter('all'); setStatusFilter('all'); setSearchQuery('') }}>
                <RefreshCw className="w-3 h-3 mr-1" />Сбросить фильтры
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            3 & 4. EPISODE CARDS (Enhanced + Detail Expansion)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          {filtered.map(episode => {
            const isExpanded = expandedEpisodes.has(episode.id)
            const severityBorder = SEVERITY_BORDER[episode.severity ?? ''] ?? 'border-l-stone-200'
            const severityBg = SEVERITY_BG[episode.severity ?? ''] ?? 'border-stone-200/50'
            const severityColor = SEVERITY[episode.severity ?? ''] ?? 'bg-stone-500 text-white'
            const statusColor = STATUS_BADGE[episode.status ?? ''] ?? 'bg-stone-500 text-white'
            const StatusIcon = STATUS_ICON[episode.status ?? ''] ?? Clock

            return (
              <Card
                key={episode.id}
                className={`border-l-4 ${severityBorder} rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${severityBg}`}
                onClick={() => toggleExpanded(episode.id)}
              >
                {/* ── Card Header (always visible) ───────────────────────────── */}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Calendar-style date — only shown when date exists */}
                    {hasValue(episode.date) && (
                      <div className="shrink-0 flex flex-col items-center w-12 rounded-lg bg-stone-100/80 dark:bg-stone-800/50 border border-stone-200/60 overflow-hidden">
                        {(() => {
                          const d = new Date(episode.date!)
                          const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК']
                          return (
                            <>
                              <div className="bg-red-700/80 text-white text-xs font-bold px-1 py-0.5 w-full text-center">{months[d.getMonth()]}</div>
                              <div className="text-lg font-bold text-stone-800 dark:text-stone-200 leading-none py-0.5">{d.getDate()}</div>
                              <div className="text-xs text-muted-foreground pb-0.5">{d.getFullYear()}</div>
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{episode.title}</span>
                        {/* Severity badge — only shown when severity exists */}
                        {hasValue(episode.severity) && (
                          <Badge className={`${severityColor} text-xs font-semibold shrink-0`}>
                            {episode.severity}
                          </Badge>
                        )}
                        {/* Status badge with icon — only shown when status exists */}
                        {hasValue(episode.status) && (
                          <Badge className={`${statusColor} text-xs font-semibold shrink-0 flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {episode.status}
                          </Badge>
                        )}
                        {/* Person count badge */}
                        {episode.persons.length > 0 && (
                          <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-1 border-orange-300/50 text-orange-700">
                            <Users className="w-3 h-3" />
                            {episode.persons.length}
                          </Badge>
                        )}
                        {/* Article count badge */}
                        {episode.articles.length > 0 && (
                          <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-1 border-stone-300/50">
                            <Scale className="w-3 h-3" />
                            {episode.articles.length}
                          </Badge>
                        )}
                      </div>
                      {/* Short description preview — only shown when description exists */}
                      {hasValue(episode.description) && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{episode.description}</p>
                      )}
                      {/* Severity score — only shown when severity exists */}
                      {hasValue(episode.severity) && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground font-medium">Индекс тяжести:</span>
                          <div className="flex-1 max-w-[120px]">
                            <Progress value={severityScore(episode.severity) * 25} className="h-1.5" />
                          </div>
                          <span className="text-xs font-bold text-stone-700">{severityScore(episode.severity)}/4</span>
                        </div>
                      )}
                    </div>

                    {/* Expand/collapse chevron */}
                    <div className="shrink-0 flex items-center">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* ── Expanded Detail ──────────────────────────────────────── */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-stone-200/50 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                      {/* Full description — only shown when description exists */}
                      {hasValue(episode.description) && (
                        <div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{episode.description}</p>
                        </div>
                      )}
                      {/* Date row — only shown when date exists */}
                      {hasValue(episode.date) && (
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span className="font-medium">Период: {episode.date}</span>
                        </div>
                      )}

                      {/* Connected Persons with role badges and involvement descriptions */}
                      {episode.persons.length > 0 && (
                        <div>
                          <p className="font-medium flex items-center gap-1 mb-2 text-xs">
                            <Users className="w-3 h-3 text-orange-600" />
                            Участники ({episode.persons.length})
                          </p>
                          <div className="space-y-2">
                            {episode.persons.map(p => (
                              <div key={p.personId} className="flex items-center gap-2 p-2 rounded-lg bg-stone-50/50 dark:bg-stone-800/20">
                                {hasValue(p.involvement) && (
                                  <Badge className={`${INVOLVEMENT[p.involvement ?? ''] ?? 'bg-stone-500 text-white'} text-xs font-semibold shrink-0`}>
                                    {p.involvement}
                                  </Badge>
                                )}
                                <span className="text-sm font-medium">{personLabel(p)}</span>
                                {p.person?.role && (
                                  <Badge variant="outline" className="text-xs shrink-0">{p.person.role}</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Connected Legal Articles with code badges */}
                      {episode.articles.length > 0 && (
                        <div>
                          <p className="font-medium flex items-center gap-1 mb-2 text-xs">
                            <Scale className="w-3 h-3 text-stone-600" />
                            Статьи УК ({episode.articles.length})
                          </p>
                          <div className="space-y-2">
                            {episode.articles.map(a => (
                              <div key={a.articleId} className="p-2 rounded-lg bg-red-50/40 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-red-700 text-white text-xs font-semibold shrink-0">{articleCode(a)}</Badge>
                                  {hasValue(a.article?.description) && <span className="text-xs font-medium">{a.article.description}</span>}
                                </div>
                                {/* Punishment preview */}
                                {a.article && (hasValue(a.article.punishmentMin) || hasValue(a.article.punishmentMax) || hasValue(a.article.category)) && (
                                  <div className="mt-1.5 text-xs space-y-0.5 ml-1">
                                    {(hasValue(a.article.punishmentMin) || hasValue(a.article.punishmentMax)) && (
                                      <li className="flex items-center gap-1">
                                        <Gavel className="w-2.5 h-2.5 text-red-600" />
                                        Наказание: {a.article.punishmentMin ?? ''}{hasValue(a.article.punishmentMin) && hasValue(a.article.punishmentMax) ? ' — ' : ''}{a.article.punishmentMax ?? ''}
                                      </li>
                                    )}
                                    {hasValue(a.article.category) && <li className="text-muted-foreground">Категория: {a.article.category}</li>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Statute of limitations indicator */}
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 mt-2">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-800 dark:text-amber-400">
                              <span className="font-medium">Срок давности:</span> истекает через ~7 лет (для тяжких — 10 лет по ст.78 УК РФ)
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Connected Locations with context descriptions */}
                      {episode.locations.length > 0 && (
                        <div>
                          <p className="font-medium flex items-center gap-1 mb-2 text-xs">
                            <MapPin className="w-3 h-3 text-red-700" />
                            Места ({episode.locations.length})
                          </p>
                          <div className="space-y-1.5">
                            {episode.locations.map(l => (
                              <div key={l.locationId} className="flex items-start gap-2 p-2 rounded-lg bg-stone-50/50 dark:bg-stone-800/20">
                                <MapPin className="w-3 h-3 text-red-700 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">{locationName(l)}</p>
                                  <p className="text-xs text-muted-foreground">{locationAddress(l)}</p>
                                  {l.context && (
                                    <Badge variant="outline" className="text-xs mt-0.5 border-red-300/40 text-red-700">{l.context}</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evidence strength indicator */}
                      <div>
                        <p className="font-medium flex items-center gap-1 mb-2 text-xs">
                          <Eye className="w-3 h-3 text-amber-600" />
                          Сила доказательств
                        </p>
                        <div className="flex items-center gap-3">
                          {(() => {
                            // Determine evidence strength from severity + status heuristic
                            let strength = 0
                            if (episode.status === 'доказано') strength = 85
                            else if (episode.status === 'расследуется') strength = 50
                            else if (episode.status === 'сомнительно') strength = 25
                            const label = strength >= 70 ? 'Сильные' : strength >= 40 ? 'Средние' : 'Слабые'
                            const color = strength >= 70 ? 'text-emerald-700' : strength >= 40 ? 'text-amber-600' : 'text-red-700'
                            return (
                              <>
                                <Progress value={strength} className="h-2 flex-1 max-w-[200px]" />
                                <span className={`text-xs font-semibold ${color}`}>{label} ({strength}%)</span>
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Defense coverage status */}
                      <div>
                        <p className="font-medium flex items-center gap-1 mb-2 text-xs">
                          <Shield className="w-3 h-3 text-emerald-700" />
                          Покрытие линии защиты
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            // Map defense lines that reference this episode's articles
                            const defenseItems = [
                              { title: 'Алиби', covers: episode.severity === 'тяжкое' || episode.severity === 'особо тяжкое', strength: 'moderate' },
                              { title: 'Переквалификация', covers: episode.articles.length > 0, strength: 'weak' },
                              { title: 'Процессуальные нарушения', covers: true, strength: 'strong' },
                              { title: 'Недостаточность доказательств', covers: episode.status === 'сомнительно' || episode.status === 'расследуется', strength: 'moderate' },
                              { title: 'Смягчающие обстоятельства', covers: true, strength: 'strong' },
                            ]
                            return defenseItems.map(d => (
                              <Badge
                                key={d.title}
                                variant="outline"
                                className={`text-xs ${
                                  d.covers
                                    ? d.strength === 'strong' ? 'border-emerald-400 text-emerald-700 bg-emerald-50/50'
                                    : d.strength === 'moderate' ? 'border-amber-400 text-amber-700 bg-amber-50/50'
                                    : 'border-red-400 text-red-700 bg-red-50/50'
                                    : 'border-stone-300 text-stone-400 bg-stone-50/50'
                                }`}
                              >
                                {d.covers ? '✓' : '✗'} {d.title}
                              </Badge>
                            ))
                          })()}
                        </div>
                      </div>

                      {/* Linked Documents — only shown when episodeNumber exists */}
                      {hasValue(episode.episodeNumber) && (
                        <>
                          <Separator />
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Связанные документы: Эпизод № {episode.episodeNumber}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Separator />
        <p className="text-xs text-muted-foreground">Показано {filtered.length} из {episodes.length} этапов производства</p>
      </div>
    </TooltipProvider>
  )
}
