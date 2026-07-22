'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts'
import { Users, Shield, Star, ChevronDown, ChevronUp, AlertTriangle, Gavel, Download, FileText, Link2 } from 'lucide-react'
import { mockPersons, mockPersonRelationships } from '@/lib/mock-data'
import { getPersons, getPersonRelationships } from '@/lib/case-api'
import type { PersonData, PersonRelationship } from '@/lib/case-store'
import { toast } from 'sonner'

const GUILT: Record<string, { badge: string; color: string; pct: number; label: string }> = {
  high: { badge: 'bg-red-700 text-white', color: '#dc2626', pct: 85, label: 'Высокая' },
  moderate: { badge: 'bg-orange-600 text-white', color: '#ea580c', pct: 55, label: 'Средняя' },
  low: { badge: 'bg-amber-600 text-white', color: '#ca8a04', pct: 25, label: 'Низкая' },
  none: { badge: 'bg-stone-500 text-white', color: '#525252', pct: 0, label: 'Нет' },
}

const ROLE_BADGE: Record<string, string> = {
  обвиняемый: 'bg-red-700 text-white',
  соучастник: 'bg-orange-600 text-white',
  свидетель: 'bg-amber-600 text-white',
  потерпевший: 'bg-emerald-700 text-white',
  потерпевшая: 'bg-emerald-700 text-white',
  следователь: 'bg-stone-600 text-white',
}

const ROLE_LABEL: Record<string, string> = {
  обвиняемый: 'Обвиняемый',
  соучастник: 'Соучастник',
  свидетель: 'Свидетель',
  потерпевшая: 'Потерпевшая',
  следователь: 'Следователь',
}

const REL_TYPE_BADGE: Record<string, string> = {
  'соучастники': 'bg-orange-600 text-white',
  'обвиняемый-потерпевшая': 'bg-red-700 text-white',
  'обвиняемый-свидетель': 'bg-amber-600 text-white',
  'соучастник-потерпевшая': 'bg-orange-500 text-white',
  'организатор-соучастник': 'bg-red-600 text-white',
}

const guiltChartConfig = Object.fromEntries(
  Object.entries(GUILT).map(([k, v]) => [v.label, { label: v.label, color: v.color }])
)

// Export helper
function exportPersonsCSV(persons: PersonData[]) {
  const rows = ['Name,Role,Status,GuiltLevel,Occupation']
  persons.forEach(p => {
    rows.push(`"${p.fullName}",${p.role ?? ''},${p.status ?? ''},${p.guiltLevel ?? 'none'},${p.occupation ?? ''}`)
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'persons.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV экспорт выполнен')
}

// Relationship map section
function RelationshipMap({ relationships, persons }: { relationships: PersonRelationship[]; persons: PersonData[] }) {
  // Group relationships by person
  const personRelMap = useMemo(() => {
    const map: Record<string, PersonRelationship[]> = {}
    relationships.forEach(r => {
      if (!map[r.sourcePersonId]) map[r.sourcePersonId] = []
      map[r.sourcePersonId].push(r)
    })
    return map
  }, [relationships])

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-600" /> Связи между участниками
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {persons.map(person => {
            const rels = personRelMap[person.id] ?? []
            return (
              <Card key={person.id} className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium text-sm truncate">{person.shortName ?? person.fullName}</p>
                    <Badge className={ROLE_BADGE[person.role ?? ''] ?? 'bg-stone-500 text-white'}>{ROLE_LABEL[person.role ?? ''] ?? person.role}</Badge>
                  </div>
                  {rels.length > 0 ? (
                    <div className="space-y-1.5">
                      {rels.map(rel => (
                        <div key={rel.id} className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground truncate">{person.shortName ?? person.fullName}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium truncate">{rel.targetPersonName}</span>
                          <Badge className={`${REL_TYPE_BADGE[rel.relationshipType] ?? 'bg-stone-500 text-white'} text-xs shrink-0`}>{rel.relationshipType}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Нет связей</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function CasePersons() {
  const [roleFilter, setRoleFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['persons'], queryFn: getPersons, retry: 1 })
  const { data: relData } = useQuery({ queryKey: ['person-relationships'], queryFn: getPersonRelationships, retry: 1 })
  const persons = data ?? mockPersons
  const relationships = relData ?? mockPersonRelationships

  const filtered = useMemo(() =>
    roleFilter === 'all' ? persons : persons.filter(p => p.role === roleFilter),
    [persons, roleFilter]
  )

  const guiltData = useMemo(() =>
    Object.entries(GUILT).map(([key, val]) => ({
      level: val.label,
      count: persons.filter(p => p.guiltLevel === key).length,
      fill: val.color,
    })),
    [persons]
  )

  // Guilt assessment summary per person
  const guiltSummary = useMemo(() => ({
    high: persons.filter(p => p.guiltLevel === 'high').length,
    moderate: persons.filter(p => p.guiltLevel === 'moderate').length,
    low: persons.filter(p => p.guiltLevel === 'low').length,
    none: persons.filter(p => p.guiltLevel === 'none' || !p.guiltLevel).length,
  }), [persons])

  if (isLoading) return <div className="grid grid-cols-2 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}</div>

  const kolesnichenko = persons.find(p => p.isKolesnichenko)

  return (
    <div className="space-y-6">
      {/* Guilt Assessment Summary */}
      <Card className="bg-gradient-to-r from-red-900/20 to-stone-900/10 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-700/20">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="font-semibold text-sm">Оценка виновности участников</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(guiltSummary).map(([level, count]) => (
              <div key={level} className="flex items-center gap-2">
                <Badge className={GUILT[level]?.badge ?? 'bg-stone-500 text-white'}>{GUILT[level]?.label ?? level}</Badge>
                <span className="text-sm font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter + Export */}
      <div className="flex items-center gap-2">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Роль" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="обвиняемый">Обвиняемый</SelectItem>
            <SelectItem value="свидетель">Свидетель</SelectItem>
            <SelectItem value="потерпевшая">Потерпевшая</SelectItem>
            <SelectItem value="соучастник">Соучастник</SelectItem>
          </SelectContent>
        </Select>
        <Badge className="bg-stone-600 text-white">{filtered.length} участников</Badge>
        <Separator orientation="vertical" className="h-4 mx-2" />
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => exportPersonsCSV(persons)}>
          <Download className="w-3 h-3" />Export CSV
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => toast.info('PDF экспорт будет доступен в будущих версиях')}>
          <FileText className="w-3 h-3" />Export PDF
        </Button>
      </div>

      {/* Relationship Map */}
      <RelationshipMap relationships={relationships} persons={persons} />

      {/* Guilt Chart */}
      <Card className="rounded-xl shadow-sm">
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
        <Card className="border-2 border-red-700 bg-gradient-to-r from-red-900/10 to-stone-900/5 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-700/20">
                <Star className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">{kolesnichenko.fullName}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge className={ROLE_BADGE[kolesnichenko.role ?? '']}>{ROLE_LABEL[kolesnichenko.role ?? '']}</Badge>
                  <Badge className={GUILT[kolesnichenko.guiltLevel ?? 'none'].badge}>{GUILT[kolesnichenko.guiltLevel ?? 'none'].label}</Badge>
                  <Badge variant="outline" className="text-xs">{kolesnichenko.status ?? '—'}</Badge>
                </div>
              </div>
            </div>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground">{kolesnichenko.description}</p>
            <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Должность:</span> {kolesnichenko.occupation}</p>
            {kolesnichenko.defenseStrategy && (
              <div className="mt-2 p-2 rounded-lg bg-muted">
                <p className="text-xs font-medium flex items-center gap-1"><Shield className="w-3 h-3" />Стратегия защиты:</p>
                <p className="text-xs">{kolesnichenko.defenseStrategy}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Person Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.filter(p => !p.isKolesnichenko || roleFilter !== 'all').map(person => (
          <Card key={person.id} className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted/50">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm truncate">{person.fullName}</p>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Badge className={ROLE_BADGE[person.role ?? '']}>{ROLE_LABEL[person.role ?? ''] ?? person.role}</Badge>
                <Badge className={GUILT[person.guiltLevel ?? 'none'].badge}>{GUILT[person.guiltLevel ?? 'none'].label}</Badge>
                <Badge variant="outline" className="text-xs">{person.status ?? '—'}</Badge>
              </div>
              {person.guiltLevel && person.guiltLevel !== 'none' && (
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={GUILT[person.guiltLevel].pct} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{GUILT[person.guiltLevel].pct}%</span>
                </div>
              )}
              <Separator className="mt-3" />
              <Button size="sm" variant="ghost" className="mt-2 w-full rounded-lg" onClick={() => setExpandedId(expandedId === person.id ? null : person.id)}>
                {expandedId === person.id ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                {expandedId === person.id ? 'Свернуть' : 'Подробнее'}
              </Button>
              {expandedId === person.id && (
                <div className="mt-2 space-y-1 text-xs">
                  {person.description && <p>{person.description}</p>}
                  {person.occupation && <p><span className="font-medium">Должность:</span> {person.occupation}</p>}
                  {person.alias && <p><span className="font-medium">Псевдоним:</span> {person.alias}</p>}
                  {person.guiltAssessments?.[0] && (
                    <div className="p-2 rounded-lg bg-muted mt-1">
                      <p className="font-medium flex items-center gap-1"><Gavel className="w-3 h-3" />Оценка виновности:</p>
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

      <Separator />
      <p className="text-xs text-muted-foreground">Показано {filtered.length} из {persons.length} участников дела</p>
    </div>
  )
}
