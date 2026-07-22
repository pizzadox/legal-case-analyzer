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
import { Users, Shield, Star, ChevronDown, ChevronUp, AlertTriangle, Gavel, Download, FileText, Link2, MessageSquare, Target } from 'lucide-react'
import { mockPersons, mockPersonRelationships, mockWitnessStatements } from '@/lib/mock-data'
import { getPersons, getPersonRelationships, getWitnessStatements } from '@/lib/case-api'
import type { PersonData, PersonRelationship, WitnessStatementData } from '@/lib/case-store'
import { toast } from 'sonner'

const GUILT: Record<string, { badge: string; color: string; pct: number; label: string }> = {
  high: { badge: 'bg-red-700 text-white', color: '#dc2626', pct: 85, label: 'Высокая' },
  moderate: { badge: 'bg-orange-600 text-white', color: '#ea580c', pct: 55, label: 'Средняя' },
  low: { badge: 'bg-amber-600 text-white', color: '#ca8a04', pct: 25, label: 'Низкая' },
  none: { badge: 'bg-stone-500 text-white', color: '#78716c', pct: 0, label: 'Нет' },
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

const STMT_TYPE_BADGE: Record<string, string> = {
  initial: 'bg-emerald-700 text-white',
  'follow-up': 'bg-amber-600 text-white',
  clarification: 'bg-stone-600 text-white',
  contradiction: 'bg-red-700 text-white',
}
const STMT_TYPE_LABEL: Record<string, string> = {
  initial: 'Первичные', 'follow-up': 'Доп.', clarification: 'Уточнение', contradiction: 'Противоречие',
}
const RELIABILITY_BADGE: Record<string, string> = {
  high: 'bg-emerald-700 text-white', moderate: 'bg-amber-600 text-white', low: 'bg-red-700 text-white',
}
const RELIABILITY_LABEL: Record<string, string> = { high: 'Высокая', moderate: 'Средняя', low: 'Низкая' }

const RADAR_DIMS = ['Доказательства', 'Процессуальная', 'Защита', 'Свидетели', 'Соответствие'] as const
const RADAR_VALUES: Record<string, number[]> = {
  high: [80, 30, 40, 50, 60],
  moderate: [60, 50, 60, 60, 70],
  low: [40, 70, 70, 70, 80],
  none: [20, 90, 90, 80, 90],
}

const guiltChartConfig = Object.fromEntries(
  Object.entries(GUILT).map(([k, v]) => [v.label, { label: v.label, color: v.color }])
)

function formatRussianDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
  } catch { return iso }
}

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

// Pentagon SVG Radar Chart - 5 dimensions per person
function RadarChart({ guiltLevel }: { guiltLevel: string }) {
  const cx = 100, cy = 100, R = 75
  const values = RADAR_VALUES[guiltLevel] ?? RADAR_VALUES.none
  const color = GUILT[guiltLevel]?.color ?? '#78716c'
  const angles = Array.from({ length: 5 }, (_, i) => (-90 + i * 72) * Math.PI / 180)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]
  const ringPoints = rings.map(r => angles.map(a => `${cx + R * r * Math.cos(a)},${cy + R * r * Math.sin(a)}`).join(' '))
  const dataPts = values.map((v, i) => ({ x: cx + R * (v / 100) * Math.cos(angles[i]), y: cy + R * (v / 100) * Math.sin(angles[i]) }))
  const dataStr = dataPts.map(p => `${p.x},${p.y}`).join(' ')
  const labels = RADAR_DIMS.map((label, i) => {
    const lx = cx + (R + 12) * Math.cos(angles[i])
    const ly = cy + (R + 12) * Math.sin(angles[i])
    const c = Math.cos(angles[i])
    return { lx, ly, label, anchor: Math.abs(c) < 0.15 ? 'middle' : c > 0 ? 'start' : 'end' }
  })
  return (
    <svg width={200} height={200} viewBox="-50 -15 300 230" className="overflow-visible">
      {ringPoints.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="#e7e5e4" strokeWidth={1} />)}
      {angles.map((a, i) => <line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)} stroke="#e7e5e4" strokeWidth={1} />)}
      <polygon points={dataStr} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={2} style={{ transition: 'all 700ms ease' }} />
      {dataPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} style={{ transition: 'all 700ms ease' }} />)}
      {labels.map((l, i) => (
        <text key={i} x={l.lx} y={l.ly} fontSize={8} textAnchor={l.anchor as 'middle' | 'start' | 'end'} dominantBaseline="middle" className="fill-stone-600 font-medium">{l.label}</text>
      ))}
    </svg>
  )
}

// Witness Statements Section
function WitnessStatementsSection({ statements }: { statements: WitnessStatementData[] }) {
  if (statements.length === 0) return null
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-600" /> Показания свидетелей
          <Badge className="bg-stone-600 text-white">{statements.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto scrollbar-thin">
          {statements.map(s => (
            <Card key={s.id} className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{s.witnessName}</p>
                  <Badge className={STMT_TYPE_BADGE[s.statementType] ?? 'bg-stone-500 text-white'}>{STMT_TYPE_LABEL[s.statementType] ?? s.statementType}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatRussianDate(s.statementDate)}</p>
                <p className="text-xs leading-relaxed">{s.summary}</p>
                {s.keyPoints.length > 0 && (
                  <div className="space-y-0.5">
                    {s.keyPoints.map((kp, i) => (
                      <p key={i} className="text-xs flex items-start gap-1"><span className="text-amber-600 font-bold">•</span><span>{kp}</span></p>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Надёжность:</span>
                  <Badge className={RELIABILITY_BADGE[s.reliability] ?? 'bg-stone-500 text-white'}>{RELIABILITY_LABEL[s.reliability] ?? s.reliability}</Badge>
                </div>
                {s.contradictions.length > 0 && (
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                    <p className="text-xs font-medium flex items-center gap-1 text-red-700 dark:text-red-400"><AlertTriangle className="w-3 h-3" /> Противоречия:</p>
                    {s.contradictions.map((c, i) => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-400 mt-0.5">{c.description}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Relationship map section
function RelationshipMap({ relationships, persons }: { relationships: PersonRelationship[]; persons: PersonData[] }) {
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
  const { data: stmtData } = useQuery({ queryKey: ['witness-statements'], queryFn: getWitnessStatements, retry: 1 })
  const persons = data ?? mockPersons
  const relationships = relData ?? mockPersonRelationships
  const statements = stmtData ?? mockWitnessStatements

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
                <div className="mt-2 space-y-2 text-xs">
                  {person.description && <p>{person.description}</p>}
                  {person.occupation && <p><span className="font-medium">Должность:</span> {person.occupation}</p>}
                  {person.alias && <p><span className="font-medium">Псевдоним:</span> {person.alias}</p>}
                  {person.guiltAssessments?.[0] && (
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="font-medium flex items-center gap-1"><Gavel className="w-3 h-3" />Оценка виновности:</p>
                      <p>Доказательства: {person.guiltAssessments[0].evidenceStrength}</p>
                      {person.guiltAssessments[0].forecast && <p>Прогноз: {person.guiltAssessments[0].forecast}</p>}
                    </div>
                  )}
                  {/* Radar Chart */}
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="font-medium flex items-center gap-1 mb-1"><Target className="w-3 h-3" />Радар виновности:</p>
                    <div className="flex justify-center">
                      <RadarChart guiltLevel={person.guiltLevel ?? 'none'} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Witness Statements */}
      <WitnessStatementsSection statements={statements} />

      <Separator />
      <p className="text-xs text-muted-foreground">Показано {filtered.length} из {persons.length} участников дела</p>
    </div>
  )
}
