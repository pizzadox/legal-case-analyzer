'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Shield, UserCheck, UserX, AlertTriangle, Eye, XCircle,
  Clock, Scale, TrendingUp, TrendingDown, FileText, BookOpen,
  ChevronRight, Star, Filter, MapPin, Activity, Info, Close
} from 'lucide-react'
import { mockPersons, mockEpisodes, mockDocuments } from '@/lib/mock-data'
import { getPersons } from '@/lib/case-api'
import { useCaseStore } from '@/lib/case-store'
import type { PersonData } from '@/lib/case-store'

const guiltChartConfig = {
  high: { label: 'Высокая', color: '#dc2626' },
  moderate: { label: 'Средняя', color: '#ea580c' },
  low: { label: 'Низкая', color: '#ca8a04' },
  none: { label: 'Нет', color: '#525252' },
  unproven: { label: 'Недоказана', color: '#a1a1aa' },
} as const

const GUILT_LEVELS: Record<string, { label: string; color: string; numeric: number }> = {
  high: { label: 'Высокая', color: '#dc2626', numeric: 90 },
  moderate: { label: 'Средняя', color: '#ea580c', numeric: 60 },
  low: { label: 'Низкая', color: '#ca8a04', numeric: 30 },
  none: { label: 'Нет', color: '#525252', numeric: 0 },
  unproven: { label: 'Недоказана', color: '#a1a1aa', numeric: 10 },
}

const ROLE_COLORS: Record<string, string> = {
  'обвиняемый': 'bg-red-700 text-white',
  'подозреваемый': 'bg-red-600 text-white',
  'свидетель': 'bg-amber-600 text-white',
  'потерпевший': 'bg-emerald-700 text-white',
  'эксперт': 'bg-stone-600 text-white',
  'адвокат': 'bg-stone-500 text-white',
  'следователь': 'bg-stone-700 text-white',
  'судья': 'bg-stone-800 text-white',
}

const ROLE_LABELS: Record<string, string> = {
  'обвиняемый': 'Обвиняемый',
  'подозреваемый': 'Подозреваемый',
  'свидетель': 'Свидетель',
  'потерпевший': 'Потерпевший',
  'эксперт': 'Эксперт',
  'адвокат': 'Адвокат',
  'следователь': 'Следователь',
  'судья': 'Судья',
}

const EVIDENCE_COLORS: Record<string, string> = {
  'strong': '#dc2626',
  'moderate': '#ea580c',
  'weak': '#ca8a04',
  'none': '#525252',
}

const EVIDENCE_LABELS: Record<string, string> = {
  'strong': 'Сильные',
  'moderate': 'Средние',
  'weak': 'Слабые',
  'none': 'Нет',
}

function getRoleBadge(role: string | null) {
  if (!role) return <Badge variant="outline">—</Badge>
  const color = ROLE_COLORS[role] || 'bg-stone-500 text-white'
  return <Badge className={color}>{role}</Badge>
}

function getGuiltBadge(guiltLevel: string | undefined) {
  if (!guiltLevel) return <Badge variant="outline">Не оценено</Badge>
  const info = GUILT_LEVELS[guiltLevel]
  if (!info) return <Badge variant="outline">{guiltLevel}</Badge>
  return (
    <Badge style={{ backgroundColor: info.color, color: 'white' }}>
      Виновность: {info.label}
    </Badge>
  )
}

function getGuiltProgressBar(guiltLevel: string | undefined) {
  if (!guiltLevel) return <Progress value={0} className="h-2" />
  const info = GUILT_LEVELS[guiltLevel]
  if (!info) return <Progress value={0} className="h-2" />
  return (
    <div className="relative">
      <Progress value={info.numeric} className="h-2.5" />
      <div
        className="absolute top-0 left-0 h-2.5 rounded-full transition-all"
        style={{
          width: `${info.numeric}%`,
          backgroundColor: info.color,
          opacity: 0.3,
        }}
      />
    </div>
  )
}

function getEvidenceStrengthBar(strength: string | undefined) {
  const value = strength === 'strong' ? 85 : strength === 'moderate' ? 50 : strength === 'weak' ? 20 : 0
  const color = EVIDENCE_COLORS[strength || 'none'] || '#525252'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{EVIDENCE_LABELS[strength || 'none']}</span>
    </div>
  )
}

export function CasePersons() {
  const [selectedPerson, setSelectedPerson] = useState<PersonData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [guiltFilter, setGuiltFilter] = useState<string>('all')

  // TanStack Query for real persons data
  const { data: apiPersons, isLoading, isError } = useQuery({
    queryKey: ['persons'],
    queryFn: getPersons,
    staleTime: 30000,
  })

  // Use real data or fall back to mock
  const persons = apiPersons || mockPersons

  // Filtering logic
  const filteredPersons = useMemo(() => {
    return persons.filter(p => {
      const roleMatch = roleFilter === 'all' || p.role === roleFilter
      const guiltMatch = guiltFilter === 'all' || p.guiltLevel === guiltFilter
      return roleMatch && guiltMatch
    })
  }, [persons, roleFilter, guiltFilter])

  const barData = filteredPersons.map(p => ({
    name: p.shortName || p.fullName.split(' ').slice(0, 2).join(' '),
    guilt: GUILT_LEVELS[p.guiltLevel || 'none']?.numeric || 0,
    fill: GUILT_LEVELS[p.guiltLevel || 'none']?.color || '#525252',
  }))

  // Guilt forecast data per person
  const forecastData = filteredPersons.map(p => {
    const ga = p.guiltAssessments?.[0]
    const forecastNum = ga?.forecast
      ? (ga.forecast.includes('85') ? 85
        : ga.forecast.includes('60') ? 60
        : ga.forecast.includes('30') ? 30
        : ga.forecast.includes('10') ? 10 : 50)
      : (p.guiltLevel === 'high' ? 85 : p.guiltLevel === 'moderate' ? 60 : p.guiltLevel === 'low' ? 30 : 10)
    return {
      name: p.shortName || p.fullName.split(' ').slice(0, 2).join(' '),
      probability: forecastNum,
      fill: p.guiltLevel === 'high' ? '#dc2626' : p.guiltLevel === 'moderate' ? '#ea580c' : p.guiltLevel === 'low' ? '#ca8a04' : '#525252',
    }
  })

  // Person relationship data
  const personRelationships = filteredPersons.flatMap(p =>
    mockEpisodes
      .filter(ep => ep.persons.some(pe => pe.personId === p.id))
      .map(ep => ({
        from: p.shortName || p.fullName.split(' ').slice(0, 2).join(' '),
        to: `Эп.${ep.episodeNumber || '?'}`,
        role: ep.persons.find(pe => pe.personId === p.id)?.involvement || 'участник',
      }))
  )

  // Person timeline data (mock document appearances)
  const personTimelines: Record<string, Array<{ date: string; event: string }>> = {}
  for (const p of filteredPersons) {
    personTimelines[p.id] = mockDocuments
      .filter(d => d.processingStatus === 'completed')
      .map(d => ({
        date: d.uploadedAt.split('T')[0],
        event: `Документ: ${d.originalName}`,
      }))
      .slice(0, 3)
    if (p.isKolesnichenko) {
      personTimelines[p.id].push({ date: '2024-01-15', event: 'Допрос обвиняемого' })
    }
  }

  const handleOpenDetail = (person: PersonData) => {
    setSelectedPerson(person)
    setDetailOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[250px] w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-md border-stone-700/50 bg-gradient-to-r from-stone-900 to-stone-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Фильтрация:</span>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все роли</SelectItem>
                  <SelectItem value="обвиняемый">Обвиняемый</SelectItem>
                  <SelectItem value="подозреваемый">Подозреваемый</SelectItem>
                  <SelectItem value="свидетель">Свидетель</SelectItem>
                  <SelectItem value="потерпевший">Потерпевший</SelectItem>
                  <SelectItem value="следователь">Следователь</SelectItem>
                </SelectContent>
              </Select>
              <Select value={guiltFilter} onValueChange={setGuiltFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Виновность" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="high">Высокая</SelectItem>
                  <SelectItem value="moderate">Средняя</SelectItem>
                  <SelectItem value="low">Низкая</SelectItem>
                  <SelectItem value="none">Нет</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">
                {filteredPersons.length} из {persons.length} участников
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Guilt Visualization + Forecast Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guilt Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Оценка виновности участников
              </CardTitle>
              <CardDescription>Уровень виновности каждого участника дела (по данным ИИ)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={guiltChartConfig} className="h-[250px] w-full">
                <BarChart data={barData} accessibilityLayer>
                  <Bar dataKey="guilt" nameKey="name" radius={4}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Guilt Forecast Chart */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Прогноз вероятности осуждения
              </CardTitle>
              <CardDescription>Предсказанная вероятность осуждения по данным ИИ-анализа</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={guiltChartConfig} className="h-[250px] w-full">
                <BarChart data={forecastData} accessibilityLayer>
                  <Bar dataKey="probability" nameKey="name" radius={4}>
                    {forecastData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ChartTooltip
                    content={<ChartTooltipContent
                      formatter={(value: number) => `${value}% вероятности`}
                    />}
                  />
                </BarChart>
              </ChartContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                * Прогноз основан на ИИ-анализе доказательств и не является юридическим заключением
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Kolesnichenko Highlight Card */}
      {(() => {
        const kPerson = filteredPersons.find(p => p.isKolesnichenko)
        if (!kPerson) return null
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-lg border-2 border-red-700/50 bg-gradient-to-r from-red-950/30 to-stone-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-red-700"
                    >
                      <Shield className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {kPerson.fullName}
                        <Badge className="bg-red-700 text-white">
                          <Star className="w-3 h-3 mr-1" />
                          Ключевой обвиняемый
                        </Badge>
                      </CardTitle>
                      <CardDescription>{kPerson.shortName} • {kPerson.occupation}</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDetail(kPerson)} className="gap-1.5 border-red-700 text-red-400">
                    <Eye className="w-3.5 h-3.5" />
                    Подробнее
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50">
                    <p className="text-xs text-red-400 font-medium mb-1">Виновность</p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GUILT_LEVELS[kPerson.guiltLevel || 'none']?.color }} />
                      <span className="text-sm font-bold" style={{ color: GUILT_LEVELS[kPerson.guiltLevel || 'none']?.color }}>
                        {GUILT_LEVELS[kPerson.guiltLevel || 'none']?.label}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Роль</p>
                    {getRoleBadge(kPerson.role)}
                  </div>
                  <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Статус</p>
                    <Badge variant="outline">{kPerson.status}</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Доказательства</p>
                    {getEvidenceStrengthBar(kPerson.guiltAssessments?.[0]?.evidenceStrength)}
                  </div>
                </div>

                {/* Guilt Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Уровень виновности</span>
                    <span className="font-bold" style={{ color: GUILT_LEVELS[kPerson.guiltLevel || 'none']?.color }}>
                      {GUILT_LEVELS[kPerson.guiltLevel || 'none']?.label} ({GUILT_LEVELS[kPerson.guiltLevel || 'none']?.numeric}%)
                    </span>
                  </div>
                  {getGuiltProgressBar(kPerson.guiltLevel)}
                </div>

                {/* Defense Strategy */}
                {kPerson.defenseStrategy && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                    <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Стратегия защиты:
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-300">{kPerson.defenseStrategy}</p>
                  </div>
                )}

                {/* Guilt Assessment Details */}
                {kPerson.guiltAssessments && kPerson.guiltAssessments.length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg border border-stone-700">
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-500" />
                      Анализ виновности:
                    </p>
                    {kPerson.guiltAssessments.map((ga) => (
                      <div key={ga.id} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Доказательства:</span>
                            <Badge variant="outline" style={{ borderColor: EVIDENCE_COLORS[ga.evidenceStrength], color: EVIDENCE_COLORS[ga.evidenceStrength] }}>
                              {EVIDENCE_LABELS[ga.evidenceStrength]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Уверенность:</span>
                            <Badge variant="outline">{ga.confidence}</Badge>
                          </div>
                        </div>
                        {ga.forecast && (
                          <div className="p-2 bg-orange-950/20 rounded border border-orange-900/30">
                            <p className="text-xs text-orange-400 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Прогноз: {ga.forecast}
                            </p>
                          </div>
                        )}
                        {ga.mitigating && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Смягчающие: {ga.mitigating}
                          </p>
                        )}
                        {ga.aggravating && (
                          <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Отягчающие: {ga.aggravating}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Related Episodes */}
                <div className="p-3 bg-muted/50 rounded-lg border border-stone-700">
                  <p className="text-xs font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    Связанные эпизоды:
                  </p>
                  <div className="space-y-1.5">
                    {mockEpisodes.filter(ep => ep.persons.some(pe => pe.personId === kPerson.id)).map(ep => (
                      <div key={ep.id} className="flex items-center gap-2 text-xs">
                        <Badge className="text-xs bg-stone-700 text-white">{ep.episodeNumber ? `Эп.${ep.episodeNumber}` : ep.title.substring(0, 10)}</Badge>
                        <span className="truncate">{ep.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {ep.persons.find(pe => pe.personId === kPerson.id)?.involvement}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })()}

      {/* Person Relationship Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              Связи участников: роли в эпизодах
            </CardTitle>
            <CardDescription>Какие лица участвуют в каких эпизодах и в каком качестве</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Matrix Header */}
                <div className="flex gap-0 mb-2">
                  <div className="w-[120px] text-xs font-medium text-muted-foreground text-right pr-2">Участник</div>
                  {mockEpisodes.map(ep => (
                    <div key={ep.id} className="w-[100px] text-xs font-medium text-muted-foreground text-center">
                      {ep.episodeNumber ? `Эп.${ep.episodeNumber}` : ep.title.substring(0, 10)}
                    </div>
                  ))}
                </div>
                {/* Matrix Rows */}
                {filteredPersons.map(person => (
                  <div key={person.id} className="flex gap-0 mb-1">
                    <div className="w-[120px] text-xs font-medium pr-2 text-right truncate flex items-center justify-end gap-1">
                      {person.isKolesnichenko && <Star className="w-3 h-3 text-red-500" />}
                      {person.shortName || person.fullName.split(' ').slice(0, 2).join(' ')}
                    </div>
                    {mockEpisodes.map(ep => {
                      const involvement = ep.persons.find(pe => pe.personId === person.id)?.involvement
                      if (!involvement) {
                        return (
                          <div key={ep.id} className="w-[100px] flex items-center justify-center">
                            <div className="w-6 h-6 rounded bg-stone-800/50 flex items-center justify-center text-xs text-stone-600">—</div>
                          </div>
                        )
                      }
                      const involvementColors: Record<string, string> = {
                        'органиатор': 'bg-red-700 text-white',
                        'подозреваемый': 'bg-red-600 text-white',
                        'соучастник': 'bg-orange-600 text-white',
                        'исполнитель': 'bg-red-500 text-white',
                        'свидетель': 'bg-amber-600 text-white',
                        'потерпевший': 'bg-emerald-700 text-white',
                      }
                      return (
                        <div key={ep.id} className="w-[100px] flex items-center justify-center">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className={`w-auto min-w-[60px] px-1.5 py-0.5 rounded text-xs ${involvementColors[involvement] || 'bg-stone-500 text-white'}`}
                          >
                            {involvement}
                          </motion.div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Person Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredPersons.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              layout
            >
              <Card
                className={`shadow-md hover:shadow-lg transition-all cursor-pointer border-stone-700/50 ${
                  person.isKolesnichenko ? 'border-2 border-red-700/50 bg-gradient-to-r from-red-950/20 to-stone-900' : 'bg-gradient-to-r from-stone-900/80 to-stone-900'
                }`}
                onClick={() => handleOpenDetail(person)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base truncate">{person.fullName}</CardTitle>
                        {person.isKolesnichenko && (
                          <Badge className="bg-red-700 text-white shrink-0">
                            <Shield className="w-3 h-3 mr-1" />Ключевой
                          </Badge>
                        )}
                        {getRoleBadge(person.role)}
                      </div>
                      {person.shortName && person.shortName !== person.fullName && (
                        <CardDescription className="mt-1">{person.shortName}</CardDescription>
                      )}
                    </div>
                    {getGuiltBadge(person.guiltLevel)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {person.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{person.description}</p>
                  )}

                  {/* Person Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {person.occupation && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Должность:</span>
                        <span className="truncate">{person.occupation}</span>
                      </div>
                    )}
                    {person.birthDate && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Дата рождения:</span>
                        <span>{person.birthDate}</span>
                      </div>
                    )}
                    {person.alias && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Псевдоним:</span>
                        <span>{person.alias}</span>
                      </div>
                    )}
                    {person.status && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Статус:</span>
                        <Badge variant="outline" className="text-xs">{person.status}</Badge>
                      </div>
                    )}
                  </div>

                  {/* Guilt Progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Уровень виновности</span>
                      <span className="font-medium" style={{ color: GUILT_LEVELS[person.guiltLevel || 'none']?.color }}>
                        {GUILT_LEVELS[person.guiltLevel || 'none']?.label || 'Не оценено'}
                      </span>
                    </div>
                    {getGuiltProgressBar(person.guiltLevel)}
                  </div>

                  {/* Evidence Strength */}
                  {person.guiltAssessments?.[0] && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Сила доказательств</span>
                      </div>
                      {getEvidenceStrengthBar(person.guiltAssessments[0].evidenceStrength)}
                    </div>
                  )}

                  {/* Article Charges */}
                  {person.guiltAssessments?.[0]?.notes && (
                    <div className="p-2 bg-muted/50 rounded-lg border border-stone-800 text-xs">
                      <p className="text-muted-foreground">{person.guiltAssessments[0].notes}</p>
                    </div>
                  )}

                  {/* Click hint */}
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    <span>Нажмите для деталей</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Person Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          {selectedPerson && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedPerson.isKolesnichenko && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-700">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {selectedPerson.fullName}
                  {selectedPerson.isKolesnichenko && (
                    <Badge className="bg-red-700 text-white">Ключевой обвиняемый</Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedPerson.shortName} • {selectedPerson.occupation || 'Не указано'} • {ROLE_LABELS[selectedPerson.role || ''] || selectedPerson.role}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile">Профиль</TabsTrigger>
                  <TabsTrigger value="guilt">Виновность</TabsTrigger>
                  <TabsTrigger value="episodes">Эпизоды</TabsTrigger>
                  <TabsTrigger value="timeline">Хронология</TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-4 mt-4">
                  {selectedPerson.description && (
                    <div className="p-4 bg-muted/50 rounded-lg border border-stone-700">
                      <p className="text-sm">{selectedPerson.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Роль', value: selectedPerson.role ? <Badge className={ROLE_COLORS[selectedPerson.role] || 'bg-stone-500'}>{selectedPerson.role}</Badge> : '—' },
                      { label: 'Статус', value: <Badge variant="outline">{selectedPerson.status || '—'}</Badge> },
                      { label: 'Дата рождения', value: selectedPerson.birthDate || '—' },
                      { label: 'Должность', value: selectedPerson.occupation || '—' },
                      { label: 'Псевдоним', value: selectedPerson.alias || '—' },
                      { label: 'Виновность', value: <Badge style={{ backgroundColor: GUILT_LEVELS[selectedPerson.guiltLevel || 'none']?.color, color: 'white' }}>{GUILT_LEVELS[selectedPerson.guiltLevel || 'none']?.label}</Badge> },
                    ].map(field => (
                      <div key={field.label} className="p-3 bg-muted/50 rounded-lg border border-stone-800">
                        <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                        <div className="text-sm font-medium">{field.value}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Guilt Tab */}
                <TabsContent value="guilt" className="space-y-4 mt-4">
                  {/* Guilt Level Bar */}
                  <div className="p-4 bg-muted/50 rounded-lg border border-stone-700">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Общая виновность</span>
                      <span className="text-sm font-bold" style={{ color: GUILT_LEVELS[selectedPerson.guiltLevel || 'none']?.color }}>
                        {GUILT_LEVELS[selectedPerson.guiltLevel || 'none']?.label} ({GUILT_LEVELS[selectedPerson.guiltLevel || 'none']?.numeric}%)
                      </span>
                    </div>
                    {getGuiltProgressBar(selectedPerson.guiltLevel)}
                  </div>

                  {/* Guilt Radar Chart */}
                  {selectedPerson.guiltAssessments?.length > 0 && (() => {
                    const ga = selectedPerson.guiltAssessments[0]
                    const radarData = [
                      { axis: 'Виновность', value: GUILT_LEVELS[selectedPerson.guiltLevel || 'none']?.numeric || 0 },
                      { axis: 'Доказательства', value: ga.evidenceStrength === 'strong' ? 85 : ga.evidenceStrength === 'moderate' ? 55 : 25 },
                      { axis: 'Уверенность', value: ga.confidence === 'high' ? 80 : ga.confidence === 'moderate' ? 50 : 20 },
                      { axis: 'Смягчающие', value: ga.mitigating ? 40 : 0 },
                      { axis: 'Отягчающие', value: ga.aggravating ? 70 : 0 },
                    ]
                    const radarConfig = {
                      value: { label: 'Значение', color: '#ea580c' },
                    } as const
                    return (
                      <ChartContainer config={radarConfig} className="h-[250px] w-full">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                          <PolarGrid stroke="#57534e" />
                          <PolarAngleAxis dataKey="axis" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} tick={{ fill: '#a1a1aa', fontSize: 9 }} domain={[0, 100]} />
                          <Radar name="Оценка" dataKey="value" stroke="#ea580c" fill="#ea580c" fillOpacity={0.3} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RadarChart>
                      </ChartContainer>
                    )
                  })()}

                  {/* Guilt Assessment Details */}
                  {selectedPerson.guiltAssessments?.map(ga => (
                    <div key={ga.id} className="p-4 bg-muted/50 rounded-lg border border-stone-700 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded border border-stone-800 bg-stone-900 text-center">
                          <p className="text-xs text-muted-foreground">Доказательства</p>
                          <Badge style={{ borderColor: EVIDENCE_COLORS[ga.evidenceStrength], color: EVIDENCE_COLORS[ga.evidenceStrength] }} variant="outline">
                            {EVIDENCE_LABELS[ga.evidenceStrength]}
                          </Badge>
                        </div>
                        <div className="p-2 rounded border border-stone-800 bg-stone-900 text-center">
                          <p className="text-xs text-muted-foreground">Уверенность</p>
                          <Badge variant="outline">{ga.confidence || '—'}</Badge>
                        </div>
                        <div className="p-2 rounded border border-stone-800 bg-stone-900 text-center">
                          <p className="text-xs text-muted-foreground">Дата</p>
                          <span className="text-xs">{ga.analysisDate?.split('T')[0] || '—'}</span>
                        </div>
                      </div>
                      {ga.forecast && (
                        <div className="p-3 bg-orange-950/20 rounded border border-orange-900/30">
                          <p className="text-xs font-medium text-orange-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Прогноз:
                          </p>
                          <p className="text-sm text-orange-300 mt-1">{ga.forecast}</p>
                        </div>
                      )}
                      {ga.mitigating && (
                        <div className="p-3 bg-emerald-950/20 rounded border border-emerald-900/30">
                          <p className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> Смягчающие обстоятельства:
                          </p>
                          <p className="text-sm text-emerald-300 mt-1">{ga.mitigating}</p>
                        </div>
                      )}
                      {ga.aggravating && (
                        <div className="p-3 bg-red-950/20 rounded border border-red-900/30">
                          <p className="text-xs font-medium text-red-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Отягчающие обстоятельства:
                          </p>
                          <p className="text-sm text-red-300 mt-1">{ga.aggravating}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Defense Strategy */}
                  {selectedPerson.defenseStrategy && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Стратегия защиты:
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-300">{selectedPerson.defenseStrategy}</p>
                    </div>
                  )}
                </TabsContent>

                {/* Episodes Tab */}
                <TabsContent value="episodes" className="space-y-3 mt-4">
                  {mockEpisodes
                    .filter(ep => ep.persons.some(pe => pe.personId === selectedPerson.id))
                    .map(ep => {
                      const involvement = ep.persons.find(pe => pe.personId === selectedPerson.id)?.involvement
                      return (
                        <Card key={ep.id} className="border-stone-700">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                              <CardTitle className="text-sm">{ep.title}</CardTitle>
                              {involvement && (
                                <Badge className="text-xs bg-stone-700 text-white">{involvement}</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-xs text-muted-foreground line-clamp-3">{ep.description}</p>
                            <div className="flex items-center gap-2 text-xs">
                              {ep.date && <span className="text-muted-foreground">Дата: {ep.date}</span>}
                              {ep.severity && <Badge className="text-xs bg-red-700 text-white">{ep.severity}</Badge>}
                              {ep.status && <Badge variant="outline" className="text-xs">{ep.status}</Badge>}
                            </div>
                            {/* Articles */}
                            {ep.articles.map(ea => (
                              <div key={ea.articleId} className="p-2 bg-muted/30 rounded text-xs">
                                <Badge className="bg-stone-700 text-white text-xs">{ea.article.code}</Badge>
                                <span className="text-muted-foreground ml-1">{ea.article.description.substring(0, 50)}</span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )
                    })}
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="space-y-3 mt-4">
                  <div className="relative space-y-0 pl-6">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-stone-700" />
                    {personTimelines[selectedPerson.id]?.map((event, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative pb-3"
                      >
                        <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-stone-700 bg-stone-900">
                          <div className="w-2 h-2 rounded-full bg-orange-600 m-auto mt-[3px]" />
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 border border-stone-800">
                          <span className="text-xs text-muted-foreground font-mono">{event.date}</span>
                          <p className="text-sm">{event.event}</p>
                        </div>
                      </motion.div>
                    )) || (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Хронология отсутствует
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom scrollbar CSS */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1c1917;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #57534e;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #78716c;
        }
      `}</style>
    </div>
  )
}
