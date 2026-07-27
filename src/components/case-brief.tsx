'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  FileBarChart, BrainCircuit, Printer, Download, RefreshCw, Sparkles,
  Users, BookOpen, FileText, AlertOctagon, Shield, Scale, Gavel, CheckCircle2,
} from 'lucide-react'
import { mockCaseBrief } from '@/lib/mock-data'
import { getCaseBrief } from '@/lib/case-api'
import type { CaseBriefData } from '@/lib/case-store'

const GUILT_BADGE: Record<string, string> = {
  high: 'bg-red-700 text-white',
  moderate: 'bg-amber-600 text-white',
  low: 'bg-emerald-700 text-white',
  none: 'bg-stone-500 text-white',
}
const GUILT_LABEL: Record<string, string> = { high: 'Высокая', moderate: 'Средняя', low: 'Низкая', none: 'Нет' }

const STRENGTH_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  strong: { label: 'Сильная', color: 'text-emerald-700', dot: 'bg-emerald-600' },
  moderate: { label: 'Умеренная', color: 'text-amber-600', dot: 'bg-amber-500' },
  weak: { label: 'Слабая', color: 'text-stone-500', dot: 'bg-stone-400' },
}

const VIOLATION_CONFIG: Record<string, { label: string; badge: string; border: string }> = {
  critical: { label: 'Критическое', badge: 'bg-red-700 text-white', border: 'border-l-red-700' },
  major: { label: 'Серьёзное', badge: 'bg-orange-600 text-white', border: 'border-l-orange-600' },
  minor: { label: 'Незначительное', badge: 'bg-stone-500 text-white', border: 'border-l-stone-400' },
}

const SCENARIO_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#059669']

function hasValue(v: unknown): boolean {
  return v != null && v !== '' && v !== undefined && v !== '—'
}

export function CaseBrief({ caseId }: { caseId: string }) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['case-brief', caseId],
    queryFn: () => getCaseBrief(caseId),
    retry: 1,
    refetchInterval: false,
  })
  const brief: CaseBriefData = data ?? mockCaseBrief

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}</div>
      </div>
    )
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print()
    toast.success('Отправлено на печать')
  }

  const handleRegenerate = () => {
    toast.info('Запущена регенерация краткого изложения с помощью ИИ...', { duration: 3000 })
    setTimeout(() => refetch(), 500)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-emerald-900/30 to-stone-900/20 border-l-4 border-emerald-700 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-700/20">
              <FileBarChart className="w-6 h-6 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Краткое изложение дела</h2>
              <p className="text-sm text-muted-foreground">Исполнительное резюме уголовного дела, сформированное ИИ</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-700 text-white gap-1"><BrainCircuit className="w-3 h-3" /> ИИ: {brief.aiConfidence}%</Badge>
              <Badge variant="outline" className="text-xs">{new Date(brief.generatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</Badge>
              <Button size="sm" className="rounded-xl gap-1 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white" onClick={handleRegenerate}>
                <Sparkles className="w-3 h-3" /> Регенерировать
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Title */}
      <Card className="rounded-xl shadow-sm border-l-4 border-emerald-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {hasValue(brief.caseNumber) && <Badge className="bg-emerald-700 text-white">Дело № {brief.caseNumber}</Badge>}
            {brief.keyDefendants.length > 0 && <Badge variant="outline" className="text-xs">{brief.keyDefendants.length} обвиняемых</Badge>}
            {brief.keyEpisodes.length > 0 && <Badge variant="outline" className="text-xs">{brief.keyEpisodes.length} эпизодов</Badge>}
          </div>
          {hasValue(brief.caseTitle) && <h3 className="text-base font-bold">{brief.caseTitle}</h3>}
          {hasValue(brief.summary) && <p className="text-sm text-muted-foreground mt-2">{brief.summary}</p>}
        </CardContent>
      </Card>

      {/* Key Defendants & Episodes */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-red-700" /> Ключевые обвиняемые</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-2">
            {brief.keyDefendants.map((d, i) => (
              <Card key={i} className="rounded-lg shadow-none border-l-4 border-red-700 transition-all duration-200 hover:scale-[1.02]">
                <CardContent className="p-3 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm flex-1 min-w-0 break-words pr-2 leading-tight">{d.name}</p>
                    <Badge className={GUILT_BADGE[d.guiltLevel] ?? 'bg-stone-500 text-white'}>Вина: {GUILT_LABEL[d.guiltLevel] ?? d.guiltLevel}</Badge>
                  </div>
                  {hasValue(d.role) && <p className="text-xs text-muted-foreground mt-0.5">Роль: {d.role}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d.articles.map((a, j) => <Badge key={j} variant="outline" className="text-xs gap-1"><Scale className="w-2.5 h-2.5" />{a}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-amber-600" /> Ключевые эпизоды</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-2">
            {brief.keyEpisodes.map((e, i) => {
              const sevBadge = e.severity === 'тяжкое' ? 'bg-red-700 text-white' : e.severity === 'средней тяжести' ? 'bg-amber-600 text-white' : 'bg-stone-500 text-white'
              const stBadge = e.status === 'доказано' ? 'bg-emerald-700 text-white' : e.status === 'расследуется' ? 'bg-amber-600 text-white' : 'bg-stone-500 text-white'
              return (
                <Card key={i} className="rounded-lg shadow-none border-l-4 border-amber-600 transition-all duration-200 hover:scale-[1.02]">
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm">{e.title}</p>
                    {hasValue(e.date) && <p className="text-xs text-muted-foreground mt-0.5">{new Date(e.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
                    <div className="flex gap-1 mt-2">
                      <Badge className={sevBadge}>{e.severity}</Badge>
                      <Badge className={stBadge}>{e.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Key Evidence & Violations */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-700" /> Ключевые доказательства</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {brief.keyEvidence.map((e, i) => {
                const cfg = STRENGTH_CONFIG[e.strength] ?? STRENGTH_CONFIG.moderate
                return (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      {hasValue(e.description) && <p className="text-xs font-medium">{e.description}</p>}
                      {hasValue(e.source) && <p className="text-xs text-muted-foreground">{e.source}</p>}
                    </div>
                    <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-red-700" /> Ключевые нарушения</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {brief.keyViolations.map((v, i) => {
                const cfg = VIOLATION_CONFIG[v.severity] ?? VIOLATION_CONFIG.minor
                return (
                  <Card key={i} className={`rounded-lg shadow-none border-l-4 ${cfg.border} transition-all duration-200 hover:scale-[1.02]`}>
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium flex-1">{v.description}</p>
                        <Badge className={cfg.badge}>{cfg.label}</Badge>
                      </div>
                      {hasValue(v.legalBasis) && <p className="text-xs text-muted-foreground mt-1 gap-1 flex items-center"><Scale className="w-2.5 h-2.5" />{v.legalBasis}</p>}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Defense + Prosecution Summaries */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm border-l-4 border-emerald-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-700" /> Резюме защиты</CardTitle></CardHeader>
          <CardContent className="p-4">
            {hasValue(brief.defenseSummary) ? <p className="text-sm text-foreground/80">{brief.defenseSummary}</p> : <p className="text-xs text-muted-foreground italic">Данные загружаются...</p>}
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm border-l-4 border-red-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gavel className="w-4 h-4 text-red-700" /> Резюме обвинения</CardTitle></CardHeader>
          <CardContent className="p-4">
            {hasValue(brief.prosecutionSummary) ? <p className="text-sm text-foreground/80">{brief.prosecutionSummary}</p> : <p className="text-xs text-muted-foreground italic">Данные загружаются...</p>}
          </CardContent>
        </Card>
      </div>

      {/* Predicted Outcomes */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600" /> Прогноз исходов дела
            {isFetching && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Stacked probability bar */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Распределение вероятностей</p>
            <div className="flex h-6 rounded-lg overflow-hidden border">
              {brief.predictedOutcome.map((o, i) => (
                <div key={i} style={{ width: `${o.probability}%`, backgroundColor: SCENARIO_COLORS[i % SCENARIO_COLORS.length] }} className="flex items-center justify-center text-xs text-white font-medium transition-all duration-300 hover:brightness-110" title={`${o.scenario}: ${o.probability}%`}>
                  {o.probability >= 10 ? `${o.probability}%` : ''}
                </div>
              ))}
            </div>
          </div>
          <Separator />
          {/* Scenario cards */}
          <div className="grid md:grid-cols-2 gap-3">
            {brief.predictedOutcome.map((o, i) => {
              const color = SCENARIO_COLORS[i % SCENARIO_COLORS.length]
              const isConviction = o.probability >= 30 && i < 2
              return (
                <Card key={i} className="rounded-lg shadow-none border transition-all duration-200 hover:scale-[1.02]" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold flex-1">{o.scenario}</p>
                      <Badge style={{ backgroundColor: color }} className="text-white">{o.probability}%</Badge>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${o.probability}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{o.description}</p>
                    <Badge variant="outline" className={`text-xs mt-1.5 ${isConviction ? 'text-red-700' : 'text-emerald-700'}`}>
                      {isConviction ? 'Неблагоприятный исход' : 'Благоприятный исход'}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={handlePrint}><Printer className="w-3 h-3" /> Печать</Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => toast.info('Экспорт PDF будет доступен в следующих версиях')}><Download className="w-3 h-3" /> Экспорт PDF</Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => { refetch(); toast.success('Анализ обновлён') }}><RefreshCw className="w-3 h-3" /> Обновить анализ</Button>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <p className="text-xs text-muted-foreground">Сформировано {new Date(brief.generatedAt).toLocaleString('ru-RU')}</p>
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">Краткое изложение дела № {brief.caseNumber} • AI-анализ с уверенностью {brief.aiConfidence}%</p>
    </div>
  )
}
