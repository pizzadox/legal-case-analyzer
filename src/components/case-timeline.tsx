'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  CalendarClock, CheckCircle, XCircle, Clock, Loader2, Download,
  AlertTriangle, Shield, Scale, FileText, Users, BookOpen, Gavel,
} from 'lucide-react'
import { mockCaseTimeline } from '@/lib/mock-data'
import { getCaseTimeline } from '@/lib/case-api'
import type { CaseTimelineEvent } from '@/lib/case-store'

type Category = 'all' | 'crime' | 'investigation' | 'legal' | 'defense' | 'evidence' | 'hearing'
type Importance = 'all' | 'critical' | 'high' | 'medium' | 'low'

const CATEGORY_CONFIG: Record<string, { label: string; dotColor: string; icon: React.ReactNode }> = {
  crime: { label: 'Преступление', dotColor: 'bg-red-600', icon: <AlertTriangle className="w-3 h-3 text-red-700" /> },
  investigation: { label: 'Расследование', dotColor: 'bg-amber-500', icon: <Shield className="w-3 h-3 text-amber-600" /> },
  legal: { label: 'Юридические', dotColor: 'bg-stone-500', icon: <Scale className="w-3 h-3 text-stone-600" /> },
  defense: { label: 'Защита', dotColor: 'bg-emerald-600', icon: <Shield className="w-3 h-3 text-emerald-700" /> },
  evidence: { label: 'Доказательства', dotColor: 'bg-orange-500', icon: <FileText className="w-3 h-3 text-orange-600" /> },
  hearing: { label: 'Заседание', dotColor: 'bg-red-700', icon: <Gavel className="w-3 h-3 text-red-700" /> },
}

const IMPORTANCE_CONFIG: Record<string, { label: string; border: string; badge: string }> = {
  critical: { label: 'Критические', border: 'border-l-red-700', badge: 'bg-red-700 text-white' },
  high: { label: 'Высокие', border: 'border-l-amber-600', badge: 'bg-amber-600 text-white' },
  medium: { label: 'Средние', border: 'border-l-stone-500', badge: 'bg-stone-600 text-white' },
  low: { label: 'Низкие', border: 'border-l-stone-300', badge: 'bg-stone-400 text-white' },
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; badge: string }> = {
  completed: { label: 'Завершено', icon: <CheckCircle className="w-3 h-3 text-emerald-600" />, badge: 'bg-emerald-700 text-white' },
  ongoing: { label: 'В процессе', icon: <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />, badge: 'bg-amber-600 text-white' },
  planned: { label: 'Запланировано', icon: <Clock className="w-3 h-3 text-stone-500" />, badge: 'bg-stone-500 text-white' },
  cancelled: { label: 'Отменено', icon: <XCircle className="w-3 h-3 text-red-600" />, badge: 'bg-red-700 text-white' },
}

const CATEGORY_FILTERS: { key: Category; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'crime', label: 'Преступление' },
  { key: 'investigation', label: 'Расследование' },
  { key: 'legal', label: 'Юридические' },
  { key: 'defense', label: 'Защита' },
  { key: 'evidence', label: 'Доказательства' },
  { key: 'hearing', label: 'Заседание' },
]

const IMPORTANCE_FILTERS: { key: Importance; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'critical', label: 'Критические' },
  { key: 'high', label: 'Высокие' },
  { key: 'medium', label: 'Средние' },
  { key: 'low', label: 'Низкие' },
]

function exportTimelineCSV(events: CaseTimelineEvent[]) {
  const rows = ['Date,Title,Category,Importance,Status,Description,RelatedPersons,RelatedDocuments,RelatedEpisodes']
  events.forEach(e => {
    rows.push([
      e.date, `"${e.title}"`, e.category, e.importance, e.status,
      `"${e.description}"`,
      (e.relatedPersons ?? []).join(';'),
      (e.relatedDocuments ?? []).join(';'),
      (e.relatedEpisodes ?? []).join(';'),
    ].join(','))
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'case-timeline.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Хронология экспортирована в CSV')
}

const monthFmt = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

export function CaseTimeline({ caseId }: { caseId: string }) {
  const [categoryFilter, setCategoryFilter] = useState<Category>('all')
  const [importanceFilter, setImportanceFilter] = useState<Importance>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: () => getCaseTimeline(caseId),
    retry: 1,
    refetchInterval: false,
  })
  const events = data ?? mockCaseTimeline

  const filtered = useMemo(() => {
    return events
      .filter(e => categoryFilter === 'all' || e.category === categoryFilter)
      .filter(e => importanceFilter === 'all' || e.importance === importanceFilter)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [events, categoryFilter, importanceFilter])

  const stats = useMemo(() => ({
    total: events.length,
    completed: events.filter(e => e.status === 'completed').length,
    ongoing: events.filter(e => e.status === 'ongoing').length,
    planned: events.filter(e => e.status === 'planned').length,
  }), [events])

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, CaseTimelineEvent[]>()
    filtered.forEach(e => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    })
    return Array.from(map.entries())
  }, [filtered])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-amber-900/30 to-stone-900/20 border-l-4 border-amber-700 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-700/20">
              <CalendarClock className="w-6 h-6 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Хронология уголовного дела</h2>
              <p className="text-sm text-muted-foreground">Полная история событий: от преступления до судебного разбирательства</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => exportTimelineCSV(filtered)}>
              <Download className="w-3 h-3" /> Экспорт CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего событий', value: stats.total, icon: CalendarClock, gradient: 'from-stone-800/20 to-stone-900/10', border: 'border-stone-600' },
          { label: 'Завершено', value: stats.completed, icon: CheckCircle, gradient: 'from-emerald-900/20 to-stone-900/10', border: 'border-emerald-700' },
          { label: 'В процессе', value: stats.ongoing, icon: Loader2, gradient: 'from-amber-900/20 to-stone-900/10', border: 'border-amber-600' },
          { label: 'Запланировано', value: stats.planned, icon: Clock, gradient: 'from-red-900/20 to-stone-900/10', border: 'border-red-700' },
        ].map(({ label, value, icon: Icon, gradient, border }) => (
          <Card key={label} className={`border-l-4 ${border} bg-gradient-to-r ${gradient} rounded-xl shadow-sm transition-all duration-200 hover:scale-[1.02]`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><span className="text-2xl font-bold">{value}</span></div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Категория</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map(f => (
                <Button key={f.key} size="sm" variant={categoryFilter === f.key ? 'default' : 'outline'}
                  className={`rounded-xl text-xs ${categoryFilter === f.key ? 'bg-amber-700 text-white' : ''}`}
                  onClick={() => setCategoryFilter(f.key)}>{f.label}</Button>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Важность</p>
            <div className="flex flex-wrap gap-2">
              {IMPORTANCE_FILTERS.map(f => (
                <Button key={f.key} size="sm" variant={importanceFilter === f.key ? 'default' : 'outline'}
                  className={`rounded-xl text-xs ${importanceFilter === f.key ? 'bg-stone-700 text-white' : ''}`}
                  onClick={() => setImportanceFilter(f.key)}>{f.label}</Button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Badge className="bg-stone-600 text-white">{filtered.length} событий</Badge>
            <p className="text-xs text-muted-foreground">Сортировка: по дате (хронологическая)</p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-600" /> Лента событий
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {grouped.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Нет событий по выбранным фильтрам</p>
              <p className="text-xs text-muted-foreground">Измените критерии фильтрации</p>
            </div>
          ) : (
            <div className="space-y-6 pr-2">
              {grouped.map(([monthKey, items]) => (
                <div key={monthKey}>
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-1 mb-3">
                    <Badge className="bg-amber-700/20 text-amber-800 dark:text-amber-400 border border-amber-700/30">
                      {monthFmt.format(new Date(items[0].date))}
                    </Badge>
                  </div>
                  <div className="relative pl-6 space-y-3">
                    {items.map((e, i) => {
                      const cat = CATEGORY_CONFIG[e.category] ?? CATEGORY_CONFIG.legal
                      const imp = IMPORTANCE_CONFIG[e.importance] ?? IMPORTANCE_CONFIG.medium
                      const st = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.planned
                      return (
                        <div key={e.id} className="relative group">
                          <div className={`absolute -left-6 w-3 h-3 rounded-full ${cat.dotColor} ring-2 ring-background transition-transform group-hover:scale-125 ${e.status === 'planned' ? 'border-2 border-dashed border-stone-400 bg-transparent' : ''}`} />
                          {i < items.length - 1 && <div className="absolute -left-[21px] top-3 w-0.5 h-full bg-stone-300 dark:bg-stone-600" />}
                          <Card className={`rounded-xl shadow-sm border-l-4 ${imp.border} transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}>
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <div className="flex items-center gap-1 shrink-0 mt-0.5">{cat.icon}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-sm">{e.title}</p>
                                    <Badge className={st.badge}>{st.icon}{st.label}</Badge>
                                    <Badge variant="outline" className="text-xs">{cat.label}</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{new Date(e.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}{e.endDate ? ` — ${new Date(e.endDate).toLocaleDateString('ru-RU')}` : ''}</p>
                                  <p className="text-xs mt-2 text-foreground/80">{e.description}</p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {(e.relatedPersons ?? []).map((p, idx) => (
                                      <Badge key={`p${idx}`} variant="outline" className="text-xs gap-1"><Users className="w-2.5 h-2.5" />{p}</Badge>
                                    ))}
                                    {(e.relatedDocuments ?? []).map((d, idx) => (
                                      <Badge key={`d${idx}`} variant="outline" className="text-xs gap-1"><FileText className="w-2.5 h-2.5" />{d}</Badge>
                                    ))}
                                    {(e.relatedEpisodes ?? []).map((ep, idx) => (
                                      <Badge key={`e${idx}`} variant="outline" className="text-xs gap-1"><BookOpen className="w-2.5 h-2.5" />{ep}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className={`${imp.badge} text-xs cursor-help`}>{e.importance}</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-xs">
                                      <p>Важность: {IMPORTANCE_CONFIG[e.importance]?.label ?? e.importance}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">Хронология дела № 2024-00145 • Сформировано {new Date().toLocaleDateString('ru-RU')}</p>
    </div>
  )
}
