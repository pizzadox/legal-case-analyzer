'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Shield, Scale, Loader2, Star, Zap, CheckCircle, AlertTriangle, Swords, Trophy, BrainCircuit, Download, FileText, UserCheck, Target, PieChart } from 'lucide-react'
import { mockDefenseLines, mockPersons, mockDefenseImprovements, mockEpisodes, mockRiskAssessment } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { DefenseLineData, DefenseImprovementData } from '@/lib/case-store'

const STRENGTH: Record<string, { badge: string; pct: number; color: string; label: string }> = {
  strong: { badge: 'bg-emerald-700 text-white', pct: 80, color: '#059669', label: 'Сильная' },
  moderate: { badge: 'bg-amber-600 text-white', pct: 50, color: '#d97706', label: 'Средняя' },
  weak: { badge: 'bg-red-700 text-white', pct: 20, color: '#dc2626', label: 'Слабая' },
}

const PROB: Record<string, { pct: number; label: string }> = {
  high: { pct: 80, label: 'Высокая' },
  moderate: { pct: 50, label: 'Средняя' },
  low: { pct: 20, label: 'Низкая' },
}

const TYPE_LABEL: Record<string, string> = {
  alibi: 'Алиби',
  reclassification: 'Переквалификация',
  procedural_violation: 'Процессуальные нарушения',
  lack_of_evidence: 'Недостаточность доказательств',
  mitigating: 'Смягчающие обстоятельства',
  statute_limitations: 'Сроки давности',
  innocence: 'Невиновность',
}

const DIFFICULTY: Record<string, { badge: string; label: string }> = {
  easy: { badge: 'bg-emerald-700 text-white', label: 'Легко' },
  moderate: { badge: 'bg-amber-600 text-white', label: 'Средне' },
  hard: { badge: 'bg-red-700 text-white', label: 'Трудно' },
}

// Witness support: lines with these strategy types have witness corroboration
const WITNESS_SUPPORTED = new Set(['alibi', 'lack_of_evidence'])

// Defense Coverage Donut (SVG)
function CoverageDonut({ covered, total }: { covered: number; total: number }) {
  const R = 38, C = 2 * Math.PI * R
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0
  const dash = (pct / 100) * C
  return (
    <svg width={120} height={120} viewBox="0 0 120 120" className="shrink-0">
      <circle cx={60} cy={60} r={R} fill="none" stroke="#e7e5e4" strokeWidth={14} />
      <circle cx={60} cy={60} r={R} fill="none" stroke="#78716c" strokeWidth={14}
        strokeDasharray={`${C - dash} ${dash}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 700ms ease' }} />
      <circle cx={60} cy={60} r={R} fill="none" stroke="#059669" strokeWidth={14}
        strokeDasharray={`${dash} ${C}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 700ms ease' }} />
      <text x={60} y={56} textAnchor="middle" fontSize={20} fontWeight="bold" className="fill-stone-800 dark:fill-stone-100">{pct}%</text>
      <text x={60} y={72} textAnchor="middle" fontSize={8} className="fill-stone-500">покрыто</text>
    </svg>
  )
}

export function CaseDefense() {
  const [showImprovements, setShowImprovements] = useState(false)
  const { data: personsData, isLoading: personsLoading } = useQuery({ queryKey: ['persons'], queryFn: caseApi.getPersons, retry: 1, refetchInterval: 10000 })
  const { data: defenseData, isLoading: defenseLoading } = useQuery({ queryKey: ['defense'], queryFn: () => caseApi.getDefenseLines('p1'), retry: 1, refetchInterval: 10000 })
  const { data: improvementsData } = useQuery({ queryKey: ['defense-improvements'], queryFn: () => caseApi.getDefenseImprovements('p1'), retry: 1, refetchInterval: 10000 })
  const { data: riskData } = useQuery({ queryKey: ['risk-assessment'], queryFn: caseApi.getRiskAssessment, retry: 1, refetchInterval: 10000 })

  const persons = personsData ?? mockPersons
  const defenseLines = defenseData ?? mockDefenseLines
  const improvements = improvementsData ?? mockDefenseImprovements
  const riskAssessment = riskData ?? mockRiskAssessment
  const episodes = mockEpisodes
  const kolesnichenko = persons.find(p => p.isKolesnichenko)

  const analyzeMutation = useMutation({
    mutationFn: () => caseApi.analyzeDefense(kolesnichenko?.id ?? 'p1'),
    onSuccess: () => toast.success('Анализ защиты выполнен'),
    onError: () => toast.error('Ошибка анализа защиты'),
  })

  const aiAnalysisMutation = useMutation({
    mutationFn: () => caseApi.requestDefenseAnalysis(kolesnichenko?.id ?? 'p1'),
    onSuccess: () => { toast.success('ИИ-анализ выполнен'); setShowImprovements(true) },
    onError: () => toast.error('Ошибка ИИ-анализа. Попробуйте позже.'),
  })

  // Calculate defense strength score and ranking
  const rankedLines = useMemo(() => {
    // Normalised score in 0..100: 60% strength + 40% probability bonus (capped)
    const probPct = (p?: string | null) => p === 'high' ? 80 : p === 'moderate' ? 50 : 20
    const scored = defenseLines.map(dl => {
      const raw = STRENGTH[dl.strength ?? 'weak'].pct * 0.6 + probPct(dl.probability) * 0.4
      return { ...dl, score: Math.min(100, Math.round(raw)) }
    })
    return scored.sort((a, b) => b.score - a.score)
  }, [defenseLines])

  const recommended = rankedLines[0]
  // Weighted overall strength (capped to 100%): average of strategy scores adjusted by count
  const overallStrength = rankedLines.length > 0
    ? Math.min(100, Math.round(rankedLines.reduce((sum, dl) => sum + dl.score, 0) / rankedLines.length))
    : 0

  // Risk-adjusted priority: strength_value × riskReduction / 100
  const riskAdjusted = useMemo(() => {
    const mitigations = riskAssessment?.mitigationStrategies ?? []
    return defenseLines.map((dl, i) => {
      const sVal = STRENGTH[dl.strength ?? 'weak'].pct
      const riskReduction = mitigations[i % mitigations.length]?.riskReduction ?? 10
      const priorityScore = Math.round((sVal * riskReduction) / 100 * 10) / 10
      return { ...dl, sVal, riskReduction, priorityScore }
    }).sort((a, b) => b.priorityScore - a.priorityScore)
  }, [defenseLines, riskAssessment])

  // Defense coverage: count episodes covered by any defense line
  const coverage = useMemo(() => {
    const covered = episodes.filter(ep =>
      defenseLines.some(dl =>
        dl.description.includes(`эпизод${ep.episodeNumber}`) ||
        dl.description.includes(`эпизода ${ep.episodeNumber}`) ||
        dl.description.includes(`эпизоду ${ep.episodeNumber}`) ||
        dl.title.includes(`эпизода ${ep.episodeNumber}`)
      )
    ).length
    return { covered, total: episodes.length, uncovered: episodes.length - covered }
  }, [episodes, defenseLines])

  // Witness corroboration count
  const witnessSupportedCount = defenseLines.filter(dl => WITNESS_SUPPORTED.has(dl.strategyType)).length

  if (personsLoading || defenseLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>

  return (
    <div className="space-y-6">
      {/* Header with Overall Defense Strength */}
      <Card className="bg-gradient-to-r from-emerald-900/20 to-stone-900/10 border-l-4 border-emerald-700 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-700/20">
              <Shield className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{kolesnichenko?.fullName ?? 'Колесниченко Д.А.'}</p>
              <p className="text-xs text-muted-foreground">Линия защиты — Дело № 2024-00145</p>
            </div>
            <Badge className="bg-stone-600 text-white">{defenseLines.length} стратегий</Badge>
          </div>
          <Separator className="mt-3" />
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-medium">Общая сила защиты:</span>
            </div>
            <Progress value={overallStrength} className="h-2 flex-1" />
            <Badge className={overallStrength >= 60 ? 'bg-emerald-700 text-white' : overallStrength >= 40 ? 'bg-amber-600 text-white' : 'bg-red-700 text-white'}>
              {overallStrength}%
            </Badge>
          </div>
          <div className="mt-2 flex gap-2">
            <Button className="rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-sm" onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}>
              {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
              Запустить анализ защиты
            </Button>
            <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => aiAnalysisMutation.mutate()} disabled={aiAnalysisMutation.isPending}>
              {aiAnalysisMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-1" />}
              Запросить ИИ-анализ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Strategy */}
      {recommended && (
        <Card className="border-2 border-emerald-700 bg-gradient-to-r from-emerald-900/10 to-stone-900/5 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-emerald-700" />
              <p className="font-semibold text-sm">Рекомендуемая стратегия (Рейтинг №1)</p>
              <Badge className={STRENGTH[recommended.strength ?? 'weak'].badge}>{STRENGTH[recommended.strength ?? 'weak'].label}</Badge>
              <Badge variant="outline">{recommended.probability}</Badge>
            </div>
            <p className="text-sm mt-2 font-medium">{recommended.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{recommended.description}</p>
            <Separator className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Рейтинг силы: {recommended.score} баллов из 100</p>
          </CardContent>
        </Card>
      )}

      {/* Defense Strength Visualization + Coverage Donut */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Swords className="w-4 h-4 text-emerald-700" /> Сила и вероятность стратегий
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {defenseLines.map(dl => {
              const sPct = STRENGTH[dl.strength ?? 'weak'].pct
              const pPct = PROB[dl.probability ?? 'low'].pct
              const hasWitness = WITNESS_SUPPORTED.has(dl.strategyType)
              return (
                <div key={dl.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate flex items-center gap-1">
                      {hasWitness && <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                      <span className="truncate">{dl.title}</span>
                    </span>
                    <Badge className={STRENGTH[dl.strength ?? 'weak'].badge}>{STRENGTH[dl.strength ?? 'weak'].label}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">Сила:</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${sPct}%` }} />
                    </div>
                    <span className="text-xs w-8 text-right">{sPct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">Вероятн.:</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pPct}%` }} />
                    </div>
                    <span className="text-xs w-8 text-right">{pPct}%</span>
                  </div>
                </div>
              )
            })}
            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-3 h-2.5 bg-emerald-600 rounded-sm" /> Сила стратегии
              <span className="inline-block w-3 h-2.5 bg-amber-500 rounded-sm ml-2" /> Вероятность успеха
              <span className="ml-2 flex items-center gap-1"><UserCheck className="w-3 h-3 text-emerald-700" /> Свидетельская поддержка ({witnessSupportedCount})</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" /> Покрытие эпизодов
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center gap-3">
            <CoverageDonut covered={coverage.covered} total={coverage.total} />
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 bg-emerald-600 rounded-sm" />Покрыто</span>
                <Badge className="bg-emerald-700 text-white">{coverage.covered} эп.</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 bg-stone-500 rounded-sm" />Не покрыто</span>
                <Badge className="bg-stone-600 text-white">{coverage.uncovered} эп.</Badge>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground text-center">Всего эпизодов: {coverage.total}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk-Adjusted Priority */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-red-700" /> Приоритет с учётом снижения риска
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {riskAdjusted.map((dl, idx) => {
              const priorityBadge = dl.priorityScore >= 10 ? 'bg-red-700 text-white' : dl.priorityScore >= 5 ? 'bg-amber-600 text-white' : 'bg-stone-500 text-white'
              const priorityLabel = dl.priorityScore >= 10 ? 'Высокий' : dl.priorityScore >= 5 ? 'Средний' : 'Низкий'
              return (
                <div key={dl.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 transition-colors hover:bg-muted/70">
                  <Badge variant="outline" className="text-xs shrink-0">#{idx + 1}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{dl.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>Сила: {dl.sVal}%</span>
                      <span>•</span>
                      <span>Снижение риска: {dl.riskReduction}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={priorityBadge}>{priorityLabel}</Badge>
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-200">{dl.priorityScore}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground">Формула: сила стратегии × снижение риска / 100</p>
        </CardContent>
      </Card>

      {/* AI Suggested Defense Improvements */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-amber-600" /> ИИ-предложения по улучшению защиты
            <Badge variant="outline" className="text-xs">{improvements.length} предложений</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {improvements.map(imp => {
              const defenseLine = defenseLines.find(dl => dl.id === imp.defenseLineId)
              return (
                <div key={imp.id} className="p-3 rounded-xl border bg-muted/30 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs shrink-0">{defenseLine?.title ?? imp.category}</Badge>
                    <Badge className={DIFFICULTY[imp.difficulty]?.badge ?? 'bg-stone-500 text-white'}>{DIFFICULTY[imp.difficulty]?.label ?? imp.difficulty}</Badge>
                    <Badge variant="outline" className="text-xs shrink-0">{imp.probabilityChange}</Badge>
                  </div>
                  <p className="text-sm font-medium">{imp.suggestion}</p>
                  <Separator className="mt-2" />
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Ожидаемый эффект:</span>
                    <span className="font-medium">{imp.expectedImpact}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Strategy Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {rankedLines.map((dl, idx) => {
          const hasWitness = WITNESS_SUPPORTED.has(dl.strategyType)
          return (
            <AccordionItem key={dl.id} value={dl.id} className="border rounded-xl px-4 shadow-sm">
              <AccordionTrigger className="py-3 text-sm hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                  {hasWitness && <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                  <span className="text-xs font-medium">{TYPE_LABEL[dl.strategyType] ?? dl.strategyType}</span>
                  <span className="truncate">{dl.title}</span>
                  <Badge className={STRENGTH[dl.strength ?? 'weak'].badge}>{STRENGTH[dl.strength ?? 'weak'].label}</Badge>
                  <Badge variant="outline">{dl.probability}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{dl.description}</p>
                {hasWitness && (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                    <p className="text-xs font-medium flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <UserCheck className="w-3 h-3" /> Поддерживается свидетельскими показаниями
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Сила:</span>
                  <Progress value={STRENGTH[dl.strength ?? 'weak'].pct} className="h-1.5 flex-1" />
                  <span className="text-xs">{STRENGTH[dl.strength ?? 'weak'].pct}%</span>
                </div>
                {dl.evidence && (
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="font-medium text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Доказательства:</p>
                    <p className="text-xs">{dl.evidence}</p>
                  </div>
                )}
                {dl.articleReferences && (
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="font-medium text-xs flex items-center gap-1"><Scale className="w-3 h-3" />Правовая основа:</p>
                    <p className="text-xs">{dl.articleReferences}</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      <Separator />
      <p className="text-xs text-muted-foreground">Стратегии защиты Колесниченко Д.А. • Дело № 2024-00145</p>
    </div>
  )
}
