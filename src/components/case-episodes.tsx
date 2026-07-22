'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BookOpen, MapPin, Users, Scale, Clock, CheckCircle, AlertTriangle, XCircle, Calendar, FileText, Link2, Download, Gavel, RefreshCw
} from 'lucide-react'
import { mockEpisodes } from '@/lib/mock-data'
import { getEpisodes } from '@/lib/case-api'
import type { EpisodeData } from '@/lib/case-store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function exportEpisodesCSV(episodes: EpisodeData[]) {
  const rows = ['Title,Severity,Status,Date,Persons,Articles']
  episodes.forEach(e => {
    const persons = e.persons.map(p => `${p.person.shortName ?? p.person.fullName} (${p.involvement ?? ''})`).join('; ')
    const articles = e.articles.map(a => a.article.code).join('; ')
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

const SEVERITY: Record<string, string> = {
  'особо тяжкое': 'bg-red-700 text-white',
  'тяжкое': 'bg-red-600 text-white',
  'средней тяжести': 'bg-orange-600 text-white',
  'небольшое': 'bg-amber-600 text-white',
}

const SEVERITY_DOT: Record<string, string> = {
  'особо тяжкое': 'bg-red-700',
  'тяжкое': 'bg-red-600',
  'средней тяжести': 'bg-orange-600',
  'небольшое': 'bg-amber-600',
}

const SEVERITY_BG: Record<string, string> = {
  'особо тяжкое': 'bg-red-700/10 border-red-700/30',
  'тяжкое': 'bg-red-600/10 border-red-600/30',
  'средней тяжести': 'bg-orange-600/10 border-orange-600/30',
  'небольшое': 'bg-amber-600/10 border-amber-600/30',
}

const STATUS_BADGE: Record<string, string> = {
  'расследуется': 'bg-amber-600 text-white',
  'доказано': 'bg-emerald-700 text-white',
  'сомнительно': 'bg-red-700 text-white',
}

const INVOLVEMENT: Record<string, string> = {
  'организатор': 'bg-red-700 text-white',
  'соучастник': 'bg-orange-600 text-white',
  'исполнитель': 'bg-red-600 text-white',
  'подозреваемый': 'bg-amber-600 text-white',
  'свидетель': 'bg-stone-600 text-white',
  'потерпевшая': 'bg-emerald-700 text-white',
}

export function CaseEpisodes() {
  const [severityFilter, setSeverityFilter] = useState('all')
  const { data, isLoading } = useQuery({ queryKey: ['episodes'], queryFn: getEpisodes, retry: 1 })
  const episodes = data ?? mockEpisodes

  const filtered = useMemo(() =>
    severityFilter === 'all' ? episodes : episodes.filter(e => e.severity === severityFilter),
    [episodes, severityFilter]
  )

  const summary = useMemo(() => ({
    total: episodes.length,
    severe: episodes.filter(e => e.severity === 'особо тяжкое' || e.severity === 'тяжкое').length,
    moderate: episodes.filter(e => e.severity === 'средней тяжести').length,
    minor: episodes.filter(e => e.severity === 'небольшое').length,
    proven: episodes.filter(e => e.status === 'доказано').length,
    investigating: episodes.filter(e => e.status === 'расследуется').length,
    doubtful: episodes.filter(e => e.status === 'сомнительно').length,
  }), [episodes])

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>

  return (
    <div className="space-y-6">
      {/* Section Header Banner */}
      <Card className="bg-gradient-to-r from-amber-900/30 via-amber-900/15 to-stone-900/5 border-l-4 border-amber-600 rounded-xl shadow-md overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600/20 shadow-sm">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Преступные эпизоды</p>
              <p className="text-xs text-muted-foreground">Хронология, тяжесть и участники каждого эпизода</p>
            </div>
            <Badge className="bg-stone-600 text-white text-xs font-semibold">{episodes.length} эпизодов</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary - Grouped by dimension with explicit labels */}
      <div className="space-y-3">
        {/* По тяжести dimension */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <AlertTriangle className="w-3 h-3 text-red-700" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">По тяжести</p>
            <Badge variant="outline" className="text-xs">{summary.total} всего</Badge>
            <span className="text-xs text-muted-foreground ml-auto">сумма = {summary.severe + summary.moderate + summary.minor}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Особо тяжкие', value: episodes.filter(e => e.severity === 'особо тяжкое').length, icon: AlertTriangle, gradient: 'from-red-900/40 via-red-900/15 to-transparent', border: 'border-red-800', iconBg: 'bg-red-800/15', iconColor: 'text-red-800' },
              { label: 'Тяжкие', value: episodes.filter(e => e.severity === 'тяжкое').length, icon: AlertTriangle, gradient: 'from-red-900/30 via-red-900/10 to-transparent', border: 'border-red-700', iconBg: 'bg-red-700/15', iconColor: 'text-red-700' },
              { label: 'Средней тяжести', value: summary.moderate, icon: BookOpen, gradient: 'from-orange-900/30 via-orange-900/10 to-transparent', border: 'border-orange-600', iconBg: 'bg-orange-600/15', iconColor: 'text-orange-600' },
              { label: 'Небольшой', value: summary.minor, icon: BookOpen, gradient: 'from-amber-900/30 via-amber-900/10 to-transparent', border: 'border-amber-600', iconBg: 'bg-amber-600/15', iconColor: 'text-amber-600' },
            ].map(({ label, value, icon: Icon, gradient, border, iconBg, iconColor }) => (
              <Card key={label} className={`border-l-4 ${border} bg-gradient-to-r ${gradient} rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${iconBg}`}>
                      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    <span className="text-xl font-bold tracking-tight">{value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* По статусу dimension */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <CheckCircle className="w-3 h-3 text-emerald-700" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">По статусу доказывания</p>
            <Badge variant="outline" className="text-xs">{summary.total} всего</Badge>
            <span className="text-xs text-muted-foreground ml-auto">сумма = {summary.proven + summary.investigating + summary.doubtful}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Доказано', value: summary.proven, icon: CheckCircle, gradient: 'from-emerald-900/30 via-emerald-900/10 to-transparent', border: 'border-emerald-700', iconBg: 'bg-emerald-700/15', iconColor: 'text-emerald-700' },
              { label: 'Расследуется', value: summary.investigating, icon: Clock, gradient: 'from-amber-900/30 via-amber-900/10 to-transparent', border: 'border-amber-600', iconBg: 'bg-amber-600/15', iconColor: 'text-amber-600' },
              { label: 'Сомнительно', value: summary.doubtful, icon: XCircle, gradient: 'from-red-900/30 via-red-900/10 to-transparent', border: 'border-red-700', iconBg: 'bg-red-700/15', iconColor: 'text-red-700' },
            ].map(({ label, value, icon: Icon, gradient, border, iconBg, iconColor }) => (
              <Card key={label} className={`border-l-4 ${border} bg-gradient-to-r ${gradient} rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${iconBg}`}>
                      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    <span className="text-xl font-bold tracking-tight">{value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Тяжесть" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="особо тяжкое">Особо тяжкое</SelectItem>
            <SelectItem value="тяжкое">Тяжкое</SelectItem>
            <SelectItem value="средней тяжести">Средней тяжести</SelectItem>
            <SelectItem value="небольшое">Небольшое</SelectItem>
          </SelectContent>
        </Select>
        <Badge className="bg-stone-600 text-white text-xs font-semibold">{filtered.length} эпизодов</Badge>
        <Separator orientation="vertical" className="h-4 mx-2" />
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => exportEpisodesCSV(episodes)}>
          <Download className="w-3 h-3" />Export CSV
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => toast.info('PDF экспорт будет доступен в будущих версиях')}>
          <FileText className="w-3 h-3" />Export PDF
        </Button>
      </div>

      {/* Empty state for filtered episodes */}
      {filtered.length === 0 && episodes.length > 0 && (
        <Card className="rounded-xl shadow-sm border-t-2 border-t-amber-500 bg-gradient-to-br from-card via-card to-amber-500/5">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mx-auto mb-4 ring-4 ring-amber-500/5">
              <BookOpen className="w-10 h-10 text-amber-600" />
            </div>
            <p className="text-base font-semibold">Эпизоды не найдены</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Попробуйте изменить фильтр по тяжести или сбросить его, чтобы увидеть все эпизоды дела.</p>
            <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => setSeverityFilter('all')}>
              <RefreshCw className="w-3 h-3 mr-1" />Сбросить фильтр
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="rounded-xl shadow-sm border-stone-200/50">
        <CardHeader className="pb-2 px-4 pt-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-600" />Хронология эпизодов</CardTitle></CardHeader>
        <CardContent className="p-4">
          <div className="relative pl-8 space-y-4 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
            {filtered.map((ep, i) => (
              <div key={ep.id} className="relative group">
                {/* Timeline dot */}
                <div className={`absolute -left-8 top-1 w-4 h-4 rounded-full ${SEVERITY_DOT[ep.severity ?? ''] ?? 'bg-stone-500'} border-2 border-white shadow-sm transition-transform duration-200 group-hover:scale-1.2`} />
                {/* Timeline line */}
                {i < filtered.length - 1 && <div className="absolute -left-[29px] top-5 w-0.5 h-[calc(100%+8px)] bg-gradient-to-b from-stone-300 to-stone-200" />}
                {/* Episode entry */}
                <div className="flex items-center gap-2 transition-all duration-200">
                  <p className="text-sm font-semibold">{ep.title}</p>
                  <Badge className={`${SEVERITY[ep.severity ?? ''] ?? 'bg-stone-500 text-white'} text-xs font-semibold`}>{ep.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" />{ep.date ?? '—'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Episode Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {filtered.map(episode => (
          <AccordionItem key={episode.id} value={episode.id} className={`border rounded-xl px-4 shadow-sm transition-all duration-200 hover:shadow-md ${SEVERITY_BG[episode.severity ?? ''] ?? 'border-stone-200/50'}`}>
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[episode.severity ?? ''] ?? 'bg-stone-500'}`} />
                <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">{episode.title}</span>
                <Badge className={`${SEVERITY[episode.severity ?? ''] ?? 'bg-stone-500 text-white'} text-xs font-semibold shrink-0`}>{episode.severity ?? '—'}</Badge>
                <Badge className={`${STATUS_BADGE[episode.status ?? ''] ?? 'bg-stone-500 text-white'} text-xs font-semibold shrink-0`}>{episode.status ?? '—'}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p className="text-muted-foreground leading-relaxed">{episode.description}</p>
              <div className="flex items-center gap-1 text-xs"><Calendar className="w-3 h-3 text-amber-600" /><span className="font-medium">Период: {episode.date ?? '—'}</span></div>
              {episode.persons.length > 0 && (
                <div>
                  <p className="font-medium flex items-center gap-1 mb-1 text-xs"><Users className="w-3 h-3 text-orange-600" />Участники:</p>
                  <div className="flex flex-wrap gap-1">
                    {episode.persons.map(p => (
                      <Badge key={p.personId} className={`${INVOLVEMENT[p.involvement ?? ''] ?? 'bg-stone-500 text-white'} text-xs font-semibold`}>
                        {p.person.shortName ?? p.person.fullName} ({p.involvement ?? '—'})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {episode.articles.length > 0 && (
                <div>
                  <p className="font-medium flex items-center gap-1 mb-1 text-xs"><Scale className="w-3 h-3 text-stone-600" />Статьи:</p>
                  <div className="flex flex-wrap gap-1">
                    {episode.articles.map(a => (
                      <Badge key={a.articleId} variant="outline" className="text-xs border-stone-300/50 font-medium">{a.article.code}</Badge>
                    ))}
                  </div>
                  {/* Punishment preview per article */}
                  <div className="mt-2 p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
                    <p className="text-xs font-semibold flex items-center gap-1 text-red-700 dark:text-red-400 mb-1"><Gavel className="w-3 h-3" />Возможное наказание:</p>
                    <ul className="text-xs space-y-0.5 ml-1">
                      <li>• Лишение свободы: 3–6 лет (тяжкое)</li>
                      <li>• Штраф: до 500 000 руб.</li>
                      <li>• Давность: 10 лет (ч.1 ст.78 УК РФ)</li>
                    </ul>
                  </div>
                </div>
              )}
              {episode.locations.length > 0 && (
                <div>
                  <p className="font-medium flex items-center gap-1 mb-1 text-xs"><MapPin className="w-3 h-3 text-red-700" />Места:</p>
                  {episode.locations.map(l => (
                    <p key={l.locationId} className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-2 h-2 text-red-700" />{l.location.name} — {l.location.address ?? '—'}</p>
                  ))}
                </div>
              )}
              {/* Statute of limitations indicator */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30">
                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  <span className="font-medium">Срок давности:</span> истекает через ~7 лет (для тяжких — 10 лет по ст.78 УК РФ)
                </p>
              </div>
              {/* Linked Documents section */}
              <Separator />
              <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />Связанные документы: Эпизод № {episode.episodeNumber ?? '—'}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Separator />
      <p className="text-xs text-muted-foreground">Показано {filtered.length} из {episodes.length} преступных эпизодов</p>
    </div>
  )
}
