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
  BookOpen, MapPin, Users, Scale, Clock, CheckCircle, AlertTriangle, XCircle, Calendar, FileText, Link2
} from 'lucide-react'
import { mockEpisodes } from '@/lib/mock-data'
import { getEpisodes } from '@/lib/case-api'
import type { EpisodeData } from '@/lib/case-store'

const SEVERITY: Record<string, string> = {
  'особо тяжкое': 'bg-red-700 text-white',
  'тяжкое': 'bg-red-600 text-white',
  'средней тяжести': 'bg-orange-600 text-white',
  'небольшое': 'bg-amber-600 text-white',
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
    proven: episodes.filter(e => e.status === 'доказано').length,
    investigating: episodes.filter(e => e.status === 'расследуется').length,
  }), [episodes])

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего', value: summary.total, icon: BookOpen, gradient: 'from-stone-800/20 to-stone-900/10', border: 'border-stone-600' },
          { label: 'Тяжкие', value: summary.severe, icon: AlertTriangle, gradient: 'from-red-900/20 to-stone-900/10', border: 'border-red-700' },
          { label: 'Доказано', value: summary.proven, icon: CheckCircle, gradient: 'from-emerald-900/20 to-stone-900/10', border: 'border-emerald-700' },
          { label: 'Расследуется', value: summary.investigating, icon: Clock, gradient: 'from-amber-900/20 to-stone-900/10', border: 'border-amber-600' },
        ].map(({ label, value, icon: Icon, gradient, border }) => (
          <Card key={label} className={`border-l-4 ${border} bg-gradient-to-r ${gradient} rounded-xl shadow-sm`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><span className="text-xl font-bold">{value}</span></div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
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
        <Badge className="bg-stone-600 text-white">{filtered.length} эпизодов</Badge>
      </div>

      {/* Timeline */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Хронология эпизодов</CardTitle></CardHeader>
        <CardContent className="p-4">
          <div className="relative pl-6 space-y-3 max-h-64 overflow-y-auto">
            {filtered.map((ep, i) => (
              <div key={ep.id} className="relative">
                <div className={`absolute -left-6 w-3 h-3 rounded-full ${SEVERITY[ep.severity ?? ''] ?? 'bg-stone-500'}`} />
                {i < filtered.length - 1 && <div className="absolute -left-[21px] top-3 w-0.5 h-full bg-stone-300" />}
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{ep.title}</p>
                  <Badge className={SEVERITY[ep.severity ?? ''] ?? 'bg-stone-500 text-white'}>{ep.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{ep.date ?? '—'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Episode Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {filtered.map(episode => (
          <AccordionItem key={episode.id} value={episode.id} className="border rounded-xl px-4 shadow-sm">
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{episode.title}</span>
                <Badge className={SEVERITY[episode.severity ?? '']}>{episode.severity ?? '—'}</Badge>
                <Badge className={STATUS_BADGE[episode.status ?? ''] ?? 'bg-stone-500 text-white'}>{episode.status ?? '—'}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{episode.description}</p>
              <div className="flex items-center gap-1 text-xs"><Calendar className="w-3 h-3" /><span>Период: {episode.date ?? '—'}</span></div>
              {episode.persons.length > 0 && (
                <div>
                  <p className="font-medium flex items-center gap-1 mb-1"><Users className="w-3 h-3" />Участники:</p>
                  <div className="flex flex-wrap gap-1">
                    {episode.persons.map(p => (
                      <Badge key={p.personId} className={INVOLVEMENT[p.involvement ?? ''] ?? 'bg-stone-500 text-white'}>
                        {p.person.shortName ?? p.person.fullName} ({p.involvement ?? '—'})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {episode.articles.length > 0 && (
                <div>
                  <p className="font-medium flex items-center gap-1 mb-1"><Scale className="w-3 h-3" />Статьи:</p>
                  <div className="flex flex-wrap gap-1">
                    {episode.articles.map(a => (
                      <Badge key={a.articleId} variant="outline" className="text-xs">{a.article.code}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {episode.locations.length > 0 && (
                <div>
                  <p className="font-medium flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />Места:</p>
                  {episode.locations.map(l => (
                    <p key={l.locationId} className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-2 h-2" />{l.location.name} — {l.location.address ?? '—'}</p>
                  ))}
                </div>
              )}
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
