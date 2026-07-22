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
import { Shield, Scale, Loader2, Star, Zap, CheckCircle, AlertTriangle, Swords, Trophy, BrainCircuit, Download, FileText } from 'lucide-react'
import { mockDefenseLines, mockPersons, mockDefenseImprovements } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { DefenseLineData, DefenseImprovementData } from '@/lib/case-store'

const STRENGTH: Record<string, { badge: string; pct: number; color: string; label: string }> = {
  strong: { badge: 'bg-emerald-700 text-white', pct: 80, color: '#059669', label: 'Сильная' },
  moderate: { badge: 'bg-amber-600 text-white', pct: 50, color: '#d97706', label: 'Средняя' },
  weak: { badge: 'bg-red-700 text-white', pct: 20, color: '#dc2626', label: 'Слабая' },
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

export function CaseDefense() {
  const [showImprovements, setShowImprovements] = useState(false)
  const { data: personsData, isLoading: personsLoading } = useQuery({ queryKey: ['persons'], queryFn: caseApi.getPersons, retry: 1 })
  const { data: defenseData, isLoading: defenseLoading } = useQuery({ queryKey: ['defense'], queryFn: () => caseApi.getDefenseLines('p1'), retry: 1 })
  const { data: improvementsData } = useQuery({ queryKey: ['defense-improvements'], queryFn: () => caseApi.getDefenseImprovements('p1'), retry: 1 })

  const persons = personsData ?? mockPersons
  const defenseLines = defenseData ?? mockDefenseLines
  const improvements = improvementsData ?? mockDefenseImprovements
  const kolesnichenko = persons.find(p => p.isKolesnichenko)

  const analyzeMutation = useMutation({
    mutationFn: () => caseApi.analyzeDefense(kolesnichenko?.id ?? 'p1'),
    onSuccess: () => toast.success('Анализ защиты выполнен'),
    onError: () => toast.error('Ошибка анализа защиты'),
  })

  const aiAnalysisMutation = useMutation({
    mutationFn: () => caseApi.requestDefenseAnalysis(kolesnichenko?.id ?? 'p1'),
    onSuccess: (data) => { toast.success('ИИ-анализ выполнен'); setShowImprovements(true) },
    onError: () => toast.error('Ошибка ИИ-анализа. Попробуйте позже.'),
  })

  // Calculate defense strength score and ranking (before early return)
  const rankedLines = useMemo(() => {
    const scored = defenseLines.map(dl => ({
      ...dl,
      score: STRENGTH[dl.strength ?? 'weak'].pct + (dl.probability === 'high' ? 80 : dl.probability === 'moderate' ? 50 : 20),
    }))
    return scored.sort((a, b) => b.score - a.score)
  }, [defenseLines])

  const recommended = rankedLines[0]
  const overallStrength = rankedLines.length > 0 ? Math.round(rankedLines.reduce((sum, dl) => sum + dl.score, 0) / rankedLines.length) : 0

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
          {/* Overall Defense Strength Score */}
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
        {rankedLines.map((dl, idx) => (
          <AccordionItem key={dl.id} value={dl.id} className="border rounded-xl px-4 shadow-sm">
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                <span className="text-xs font-medium">{TYPE_LABEL[dl.strategyType] ?? dl.strategyType}</span>
                <span className="truncate">{dl.title}</span>
                <Badge className={STRENGTH[dl.strength ?? 'weak'].badge}>{STRENGTH[dl.strength ?? 'weak'].label}</Badge>
                <Badge variant="outline">{dl.probability}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{dl.description}</p>
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
        ))}
      </Accordion>

      <Separator />
      <p className="text-xs text-muted-foreground">Стратегии защиты Колесниченко Д.А. • Дело № 2024-00145</p>
    </div>
  )
}
