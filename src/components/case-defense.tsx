'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Shield, Scale, Loader2, Star, Zap, Swords, CheckCircle, AlertTriangle } from 'lucide-react'
import { mockDefenseLines, mockPersons } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { DefenseLineData } from '@/lib/case-store'

const STRENGTH: Record<string, { badge: string; pct: number; color: string; label: string }> = {
  strong: { badge: 'bg-emerald-700 text-white', pct: 80, color: '#059669', label: 'Сильная' },
  moderate: { badge: 'bg-amber-600 text-white', pct: 50, color: '#d97706', label: 'Средняя' },
  weak: { badge: 'bg-red-700 text-white', pct: 20, color: '#dc2626', label: 'Слабая' },
}

const TYPE_ICON: Record<string, string> = {
  innocence: '🛡️',
  procedural_violation: '⚖️',
  reclassification: '🔄',
  lack_of_evidence: '🔍',
  mitigating: '➖',
  statute_limitations: '⏰',
}

export function CaseDefense() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const { data: personsData, isLoading: personsLoading } = useQuery({ queryKey: ['persons'], queryFn: caseApi.getPersons, retry: 1 })
  const { data: defenseData, isLoading: defenseLoading } = useQuery({ queryKey: ['defense'], queryFn: () => caseApi.getDefenseLines('p1'), retry: 1 })

  const persons = personsData ?? mockPersons
  const defenseLines = defenseData ?? mockDefenseLines
  const kolesnichenko = persons.find(p => p.isKolesnichenko)

  const analyzeMutation = useMutation({
    mutationFn: () => caseApi.analyzeDefense(kolesnichenko?.id ?? 'p1'),
    onSuccess: () => toast.success('Анализ защиты выполнен'),
    onError: () => toast.error('Ошибка анализа защиты'),
  })

  if (personsLoading || defenseLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>

  // Find recommended strategy (highest strength + probability)
  const recommended = defenseLines.reduce((best, cur) => {
    const curScore = STRENGTH[cur.strength ?? 'weak'].pct + parseInt(cur.probability ?? '0')
    const bestScore = STRENGTH[best.strength ?? 'weak'].pct + parseInt(best.probability ?? '0')
    return curScore > bestScore ? cur : best
  }, defenseLines[0])

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-l-4 border-emerald-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-700" />
            <div>
              <p className="font-semibold">{kolesnichenko?.fullName ?? 'Колесниченко Д.А.'}</p>
              <p className="text-xs text-muted-foreground">Линия защиты — Дело № 2024-00145</p>
            </div>
            <Badge className="bg-stone-600 text-white ml-auto">{defenseLines.length} стратегий</Badge>
          </div>
          <div className="mt-3">
            <Button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}>
              {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
              Запустить анализ защиты
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Strategy */}
      {recommended && (
        <Card className="border-2 border-emerald-700 bg-emerald-700/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-emerald-700" />
              <p className="font-semibold text-sm">Рекомендуемая стратегия</p>
              <Badge className={STRENGTH[recommended.strength ?? 'weak'].badge}>{STRENGTH[recommended.strength ?? 'weak'].label}</Badge>
              <Badge variant="outline">{recommended.probability}</Badge>
            </div>
            <p className="text-sm mt-2 font-medium">{recommended.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{recommended.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Strategy Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {defenseLines.map(dl => (
          <AccordionItem key={dl.id} value={dl.id} className="border rounded-lg px-4">
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <span>{TYPE_ICON[dl.strategyType] ?? '🛡️'}</span>
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
              </div>
              {dl.evidence && (
                <div className="p-2 rounded bg-muted">
                  <p className="font-medium text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Доказательства:</p>
                  <p className="text-xs">{dl.evidence}</p>
                </div>
              )}
              {dl.articleReferences && (
                <div className="p-2 rounded bg-muted">
                  <p className="font-medium text-xs flex items-center gap-1"><Scale className="w-3 h-3" />Правовая основа:</p>
                  <p className="text-xs">{dl.articleReferences}</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
