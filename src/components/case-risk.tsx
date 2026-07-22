'use client'

import { useState, useMemo, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  TrendingUp, Download, AlertTriangle, Shield, Scale, Gavel,
  Plus, Minus, FileWarning, Banknote, ListChecks,
} from 'lucide-react'
import { mockRiskAssessment, mockSentencing } from '@/lib/mock-data'
import { getRiskAssessment, getSentencing } from '@/lib/case-api'
import type { RiskAssessmentData, SentencingData } from '@/lib/case-store'

const PRIORITY_BADGE: Record<string, string> = { high: 'bg-red-700 text-white', medium: 'bg-amber-600 text-white', low: 'bg-stone-500 text-white' }
const PRIORITY_LABEL: Record<string, string> = { high: 'Высокий', medium: 'Средний', low: 'Низкий' }
const LEVEL_LABEL: Record<string, string> = { critical: 'Критический', high: 'Высокий', moderate: 'Умеренный', low: 'Низкий' }

function scoreColor(s: number): string {
  if (s >= 75) return '#991b1b'
  if (s >= 50) return '#dc2626'
  if (s >= 25) return '#f59e0b'
  return '#059669'
}
function scoreTextClass(s: number): string {
  if (s >= 75) return 'text-red-800'
  if (s >= 50) return 'text-red-600'
  if (s >= 25) return 'text-amber-500'
  return 'text-emerald-600'
}
function factorProgressClass(s: number): string {
  if (s >= 70) return '[&>div]:bg-red-700'
  if (s >= 50) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-emerald-600'
}
function factorBadgeClass(s: number): string {
  if (s >= 70) return 'bg-red-700 text-white'
  if (s >= 50) return 'bg-amber-600 text-white'
  return 'bg-emerald-700 text-white'
}
function matrixColor(likelihood: number, impact: number): string {
  const sum = Math.ceil(likelihood / 20) + Math.ceil(impact / 20)
  if (sum <= 3) return 'bg-emerald-700/60'
  if (sum <= 5) return 'bg-amber-500/60'
  if (sum <= 7) return 'bg-orange-500/70'
  return 'bg-red-700/80'
}

function RiskRing({ score, level }: { score: number; level: string }) {
  const r = 58, c = 2 * Math.PI * r, off = c - (score / 100) * c
  const color = scoreColor(score)
  return (
    <div className="flex items-center justify-center relative">
      <svg width="140" height="140" className="transform -rotate-90">
        <circle cx="70" cy="70" r={r} stroke="#e5e7eb" strokeWidth="8" fill="none" className="dark:stroke-stone-700" />
        <circle cx="70" cy="70" r={r} stroke={color} strokeWidth="8" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">{LEVEL_LABEL[level] ?? level}</span>
      </div>
    </div>
  )
}

function RiskMatrix({ items }: { items: RiskAssessmentData['matrix'] }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground"><span>↑ Влияние</span><span>Вероятность →</span></div>
      <div className="grid grid-cols-6 gap-1">
        <div />
        {[1, 2, 3, 4, 5].map(n => <div key={n} className="text-xs text-center text-muted-foreground">{n}</div>)}
        {[5, 4, 3, 2, 1].map(imRow => (
          <Fragment key={`row-${imRow}`}>
            <div className="text-xs text-muted-foreground flex items-center">{imRow}</div>
            {[1, 2, 3, 4, 5].map(lCol => {
              const lik = lCol * 20 - 10, imp = imRow * 20 - 10
              const matched = items.find(it => Math.ceil(it.likelihood / 20) === lCol && Math.ceil(it.impact / 20) === imRow)
              return (
                <div key={`${imRow}-${lCol}`} className={`relative aspect-square rounded ${matrixColor(lik, imp)} flex items-center justify-center transition-all duration-200 hover:scale-[1.05]`}>
                  {matched && (
                    <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><div className="w-2 h-2 rounded-full bg-white ring-2 ring-black" /></TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[200px]"><p className="font-semibold">{matched.category}</p><p>Вероятность: {matched.likelihood}%</p><p>Влияние: {matched.impact}%</p></TooltipContent>
                    </Tooltip></TooltipProvider>
                  )}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export function CaseRisk() {
  const [selectedArticle, setSelectedArticle] = useState<string>(mockSentencing[0]?.articleCode ?? '')
  const [mitState, setMitState] = useState<Record<string, boolean>>({})
  const [aggState, setAggState] = useState<Record<string, boolean>>({})
  const { data: riskData, isLoading: riskLoading } = useQuery({ queryKey: ['risk-assessment'], queryFn: getRiskAssessment, retry: 1 })
  const { data: sentencingData } = useQuery({ queryKey: ['sentencing'], queryFn: () => getSentencing(), retry: 1 })

  const risk = riskData ?? mockRiskAssessment
  const sentencing = sentencingData ?? mockSentencing
  const currentArticle: SentencingData | undefined = sentencing.find(s => s.articleCode === selectedArticle) ?? sentencing[0]

  const calcSentence = useMemo(() => {
    if (!currentArticle) return { sentence: 0, fine: 0 }
    const base = currentArticle.baseSentence
    const mitRed = currentArticle.mitigatingFactors.reduce((sum, f) => sum + (mitState[f.factor] ?? f.applies ? f.reduction : 0), 0)
    const aggInc = currentArticle.aggravatingFactors.reduce((sum, f) => sum + (aggState[f.factor] ?? f.applies ? f.increase : 0), 0)
    const sentence = Math.max(currentArticle.punishmentMin, Math.min(currentArticle.punishmentMax, base - mitRed + aggInc))
    return { sentence: Math.round(sentence * 10) / 10, fine: currentArticle.estimatedFine }
  }, [currentArticle, mitState, aggState])

  if (riskLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}</div>
      </div>
    )
  }

  const factors = [
    { key: 'evidenceRisk', ...risk.factors.evidenceRisk },
    { key: 'proceduralRisk', ...risk.factors.proceduralRisk },
    { key: 'defenseRisk', ...risk.factors.defenseRisk },
    { key: 'complianceRisk', ...risk.factors.complianceRisk },
    { key: 'timelineRisk', ...risk.factors.timelineRisk },
  ]

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-orange-900/30 to-stone-900/20 border-l-4 border-orange-700 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-700/20">
              <TrendingUp className="w-6 h-6 text-orange-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Оценка рисков и калькулятор наказания</h2>
              <p className="text-sm text-muted-foreground">Анализ рисков дела, матрица вероятностей и прогноз наказания</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => toast.success('Экспорт отчёта рисков выполнен')}><Download className="w-3 h-3" /> Экспорт</Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Score + Factors */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600" /> Общий уровень риска</CardTitle></CardHeader>
          <CardContent className="p-4 flex items-center gap-4">
            <RiskRing score={risk.overallRisk} level={risk.riskLevel} />
            <div className="flex-1 space-y-1.5 text-xs">
              <p className={`font-bold ${scoreTextClass(risk.overallRisk)}`}>Уровень: {LEVEL_LABEL[risk.riskLevel] ?? risk.riskLevel}</p>
              <p className="text-muted-foreground">Прогноз риска осуждения и негативных последствий для защиты</p>
              <Separator className="my-2" />
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{risk.mitigationStrategies.length} стратегий снижения</Badge>
                <Badge variant="outline" className="text-xs">{risk.matrix.length} категорий рисков</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-amber-600" /> Факторы риска</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-2">
            {factors.map(f => (
              <TooltipProvider key={f.key} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <span className="text-xs font-medium min-w-[140px]">{f.label}</span>
                      <Progress value={f.score} className={`h-2 flex-1 ${factorProgressClass(f.score)}`} />
                      <Badge className={`${factorBadgeClass(f.score)} text-xs`}>{f.score}</Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-xs"><p>{f.description}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Risk Matrix + Mitigation */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="w-4 h-4 text-orange-600" /> Матрица рисков 5×5</CardTitle></CardHeader>
          <CardContent className="p-4">
            <RiskMatrix items={risk.matrix} />
            <Separator className="my-3" />
            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {risk.matrix.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                  <span className="flex-1 truncate">{m.category}</span>
                  <Badge variant="outline" className="text-xs">В: {m.likelihood}%</Badge>
                  <Badge variant="outline" className="text-xs">П: {m.impact}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-700" /> Стратегии снижения риска</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {risk.mitigationStrategies.map((s, i) => (
                <Card key={i} className="rounded-lg shadow-none border-l-4 border-emerald-700 transition-all duration-200 hover:scale-[1.02]">
                  <CardContent className="p-2.5">
                    <div className="flex items-start gap-2">
                      <p className="text-xs flex-1">{s.strategy}</p>
                      <Badge className={PRIORITY_BADGE[s.priority]}>{PRIORITY_LABEL[s.priority]}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">Снижение риска:</span>
                      <Progress value={s.riskReduction * 2} className="h-1.5 flex-1 [&>div]:bg-emerald-700" />
                      <Badge variant="outline" className="text-xs text-emerald-700">-{s.riskReduction}%</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sentencing Calculator */}
      <Card className="rounded-xl shadow-sm border-l-4 border-red-700">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gavel className="w-4 h-4 text-red-700" /> Калькулятор наказания</CardTitle></CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium">Статья:</span>
            <Select value={selectedArticle} onValueChange={(v) => { setSelectedArticle(v); setMitState({}); setAggState({}) }}>
              <SelectTrigger className="w-72 rounded-xl"><SelectValue placeholder="Выберите статью" /></SelectTrigger>
              <SelectContent>
                {sentencing.map(s => <SelectItem key={s.articleCode} value={s.articleCode}>{s.articleCode}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">{currentArticle?.description}</Badge>
          </div>

          {currentArticle && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Диапазон: <strong>{currentArticle.punishmentMin}–{currentArticle.punishmentMax} лет</strong></span>
                  <span className="text-muted-foreground">Базовое: {currentArticle.baseSentence} лет</span>
                </div>
                <Slider value={[currentArticle.punishmentMin, currentArticle.punishmentMax]} min={0} max={10} step={0.5} disabled className="[&_[data-slot=slider-range]]:bg-red-700" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1 text-emerald-700"><Minus className="w-3 h-3" /> Смягчающие обстоятельства</p>
                  {currentArticle.mitigatingFactors.map(f => {
                    const checked = mitState[f.factor] ?? f.applies
                    return (
                      <div key={f.factor} className="flex items-center gap-2 p-1.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20">
                        <Checkbox id={`mit-${f.factor}`} checked={checked} onCheckedChange={(v) => setMitState(s => ({ ...s, [f.factor]: !!v }))} />
                        <label htmlFor={`mit-${f.factor}`} className="text-xs flex-1 cursor-pointer">{f.factor}</label>
                        <Badge variant="outline" className="text-xs text-emerald-700">-{f.reduction} г.</Badge>
                      </div>
                    )
                  })}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1 text-red-700"><Plus className="w-3 h-3" /> Отягчающие обстоятельства</p>
                  {currentArticle.aggravatingFactors.map(f => {
                    const checked = aggState[f.factor] ?? f.applies
                    return (
                      <div key={f.factor} className="flex items-center gap-2 p-1.5 rounded bg-red-50/50 dark:bg-red-950/20">
                        <Checkbox id={`agg-${f.factor}`} checked={checked} onCheckedChange={(v) => setAggState(s => ({ ...s, [f.factor]: !!v }))} />
                        <label htmlFor={`agg-${f.factor}`} className="text-xs flex-1 cursor-pointer">{f.factor}</label>
                        <Badge variant="outline" className="text-xs text-red-700">+{f.increase} г.</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Card className="rounded-xl bg-gradient-to-r from-red-900/20 to-stone-900/10 border-l-4 border-red-700">
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Gavel className="w-3 h-3" /> Прогноз наказания</p>
                      <p className="text-2xl font-bold text-red-700">{calcSentence.sentence} лет</p>
                      <Progress value={(calcSentence.sentence / currentArticle.punishmentMax) * 100} className="h-2 mt-1.5 [&>div]:bg-red-700" />
                      <p className="text-xs text-muted-foreground mt-1">из макс. {currentArticle.punishmentMax} лет</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="w-3 h-3" /> Прогноз штрафа</p>
                      <p className="text-2xl font-bold text-amber-700">{calcSentence.fine.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><ListChecks className="w-3 h-3" /> Доп. санкции</p>
                      <ul className="text-xs space-y-0.5 mt-1">{currentArticle.additionalSanctions.map((s, i) => <li key={i} className="truncate">• {s}</li>)}</ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <p className="text-xs font-semibold flex items-center gap-1 mb-2"><FileWarning className="w-3 h-3 text-amber-600" /> Судебные прецеденты</p>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">№ дела</TableHead>
                        <TableHead className="text-xs">Приговор</TableHead>
                        <TableHead className="text-xs">Описание</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentArticle.precedentCases.map((p, i) => (
                        <TableRow key={i} className="transition-colors hover:bg-muted/30">
                          <TableCell className="text-xs font-medium">{p.caseNumber}</TableCell>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-xs">{p.sentence} лет</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">Оценка рисков и прогноз наказания • Дело № 2024-00145 • Не является юридической консультацией</p>
    </div>
  )
}
