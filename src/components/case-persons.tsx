'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts'
import { Users, Shield, AlertTriangle, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { mockPersons } from '@/lib/mock-data'
import { getPersons } from '@/lib/case-api'
import type { PersonData } from '@/lib/case-store'

const GUILT: Record<string, { badge: string; color: string; pct: number }> = {
  high: { badge: 'bg-red-700 text-white', color: '#dc2626', pct: 85 },
  moderate: { badge: 'bg-orange-600 text-white', color: '#ea580c', pct: 55 },
  low: { badge: 'bg-amber-600 text-white', color: '#ca8a04', pct: 25 },
  none: { badge: 'bg-stone-500 text-white', color: '#525252', pct: 0 },
}
const GUILT_LABEL: Record<string, string> = { high: 'Высокая', moderate: 'Средняя', low: 'Низкая', none: 'Нет' }

const ROLE_BADGE: Record<string, string> = {
  обвиняемый: 'bg-red-700 text-white',
  свидетель: 'bg-amber-600 text-white',
  потерпевший: 'bg-emerald-700 text-white',
  следователь: 'bg-stone-600 text-white',
}

const guiltChartConfig = {
  high: { label: 'Высокая', color: '#dc2626' },
  moderate: { label: 'Средняя', color: '#ea580c' },
  low: { label: 'Низкая', color: '#ca8a04' },
  none: { label: 'Нет', color: '#525252' },
}

export function CasePersons() {
  const [roleFilter, setRoleFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['persons'], queryFn: getPersons, retry: 1 })
  const persons = data ?? mockPersons

  const filtered = useMemo(() =>
    roleFilter === 'all' ? persons : persons.filter(p => p.role === roleFilter),
    [persons, roleFilter]
  )

  const guiltData = useMemo(() =>
    Object.entries(GUILT).map(([key, val]) => ({
      level: GUILT_LABEL[key],
      count: persons.filter(p => p.guiltLevel === key).length,
      fill: val.color,
    })),
    [persons]
  )

  if (isLoading) return <div className="grid grid-cols-2 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}</div>

  const kolesnichenko = persons.find(p => p.isKolesnichenko)

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Роль" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="обвиняемый">Обвиняемый</SelectItem>
            <SelectItem value="свидетель">Свидетель</SelectItem>
            <SelectItem value="потерпевший">Потерпевший</SelectItem>
            <SelectItem value="следователь">Следователь</SelectItem>
          </SelectContent>
        </Select>
        <Badge className="bg-stone-600 text-white">{filtered.length} участников</Badge>
      </div>

      {/* Guilt Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Распределение виновности</CardTitle></CardHeader>
        <CardContent className="p-2">
          <ChartContainer config={guiltChartConfig} className="h-40 w-full">
            <BarChart data={guiltData}>
              <XAxis dataKey="level" tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Bar dataKey="count" radius={4}>
                {guiltData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
              <ChartTooltip content={<ChartTooltipContent />} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Kolesnichenko Highlight */}
      {kolesnichenko && roleFilter === 'all' && (
        <Card className="border-2 border-red-700 bg-red-700/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-red-600" />
              <p className="font-semibold text-sm">{kolesnichenko.fullName}</p>
              <Badge className={ROLE_BADGE[kolesnichenko.role ?? '']}>{kolesnichenko.role}</Badge>
              <Badge className={GUILT[kolesnichenko.guiltLevel ?? 'none'].badge}>
                {GUILT_LABEL[kolesnichenko.guiltLevel ?? 'none']}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{kolesnichenko.description}</p>
            {kolesnichenko.defenseStrategy && (
              <div className="mt-2 p-2 rounded bg-muted">
                <p className="text-xs font-medium flex items-center gap-1"><Shield className="w-3 h-3" />Стратегия защиты:</p>
                <p className="text-xs">{kolesnichenko.defenseStrategy}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Person Cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.filter(p => !p.isKolesnichenko || roleFilter !== 'all').map(person => (
          <Card key={person.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium text-sm truncate">{person.fullName}</p>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Badge className={ROLE_BADGE[person.role ?? '']}>{person.role ?? '—'}</Badge>
                <Badge className={GUILT[person.guiltLevel ?? 'none'].badge}>{GUILT_LABEL[person.guiltLevel ?? 'none']}</Badge>
                <Badge variant="outline" className="text-xs">{person.status ?? '—'}</Badge>
              </div>
              {person.guiltLevel && person.guiltLevel !== 'none' && (
                <div className="mt-2">
                  <Progress value={GUILT[person.guiltLevel].pct} className="h-1.5" />
                </div>
              )}
              <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => setExpandedId(expandedId === person.id ? null : person.id)}>
                {expandedId === person.id ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                {expandedId === person.id ? 'Свернуть' : 'Подробнее'}
              </Button>
              {expandedId === person.id && (
                <div className="mt-2 space-y-1 text-xs">
                  {person.description && <p>{person.description}</p>}
                  {person.occupation && <p><span className="text-muted-foreground">Должность:</span> {person.occupation}</p>}
                  {person.alias && <p><span className="text-muted-foreground">Псевдоним:</span> {person.alias}</p>}
                  {person.guiltAssessments?.[0] && (
                    <div className="p-2 rounded bg-muted mt-1">
                      <p className="font-medium">Оценка виновности:</p>
                      <p>Доказательства: {person.guiltAssessments[0].evidenceStrength}</p>
                      {person.guiltAssessments[0].forecast && <p>Прогноз: {person.guiltAssessments[0].forecast}</p>}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
