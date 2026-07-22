'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, Cell, Pie, PieChart } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen, MapPin, Users, Scale, Clock, CheckCircle, AlertTriangle,
  HelpCircle, Eye, TrendingUp, Filter, FileText, ChevronRight,
  Activity, XCircle, Info, Zap, ArrowRight, Network, BarChart3
} from 'lucide-react'
import { mockEpisodes, mockPersons } from '@/lib/mock-data'
import { getEpisodes } from '@/lib/case-api'
import { useCaseStore } from '@/lib/case-store'
import type { EpisodeData } from '@/lib/case-store'

const SEVERITY_COLORS: Record<string, string> = {
  'особо тяжкое': 'bg-red-700 text-white',
  'тяжкое': 'bg-red-600 text-white',
  'средней тяжести': 'bg-orange-600 text-white',
  'небольшое': 'bg-amber-600 text-white',
}

const SEVERITY_HEX: Record<string, string> = {
  'особо тяжкое': '#dc2626',
  'тяжкое': '#ea580c',
  'средней тяжести': '#ca8a04',
  'небольшое': '#525252',
}

const SEVERITY_NUMERIC: Record<string, number> = {
  'особо тяжкое': 4,
  'тяжкое': 3,
  'средней тяжести': 2,
  'небольшое': 1,
}

const STATUS_COLORS: Record<string, { className: string; icon: React.ReactNode }> = {
  'расследуется': { className: 'bg-stone-600 text-white', icon: <Clock className="w-3 h-3 mr-1" /> },
  'доказано': { className: 'bg-red-700 text-white', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
  'не доказано': { className: 'bg-emerald-700 text-white', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
  'сомнительно': { className: 'bg-amber-600 text-white', icon: <HelpCircle className="w-3 h-3 mr-1" /> },
}

const STATUS_NUMERIC: Record<string, number> = {
  'расследуется': 50,
  'доказано': 100,
  'не доказано': 0,
  'сомнительно': 25,
}

const INVOLVEMENT_COLORS: Record<string, string> = {
  'органиатор': 'bg-red-700 text-white',
  'подозреваемый': 'bg-red-600 text-white',
  'соучастник': 'bg-orange-600 text-white',
  'исполнитель': 'bg-red-500 text-white',
  'свидетель': 'bg-amber-600 text-white',
  'потерпевший': 'bg-emerald-700 text-white',
}

export function CaseEpisodes() {
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { setActiveSection } = useCaseStore()

  // TanStack Query for real episodes data
  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['episodes'],
    queryFn: getEpisodes,
    staleTime: 30000,
  })

  // Use real data or fall back to mock
  const episodes = apiData || mockEpisodes

  // Filtering logic
  const filteredEpisodes = useMemo(() => {
    return episodes.filter(ep => {
      const severityMatch = severityFilter === 'all' || ep.severity === severityFilter
      const statusMatch = statusFilter === 'all' || ep.status === statusFilter
      return severityMatch && statusMatch
    })
  }, [episodes, severityFilter, statusFilter])

  // Severity distribution data for heat map
  const severityDistribution = [
    { severity: 'Особо тяжкое', count: episodes.filter(ep => ep.severity === 'особо тяжкое').length, fill: '#dc2626' },
    { severity: 'Тяжкое', count: episodes.filter(ep => ep.severity === 'тяжкое').length, fill: '#ea580c' },
    { severity: 'Средней тяжести', count: episodes.filter(ep => ep.severity === 'средней тяжести').length, fill: '#ca8a04' },
    { severity: 'Небольшое', count: episodes.filter(ep => ep.severity === 'небольшое').length, fill: '#525252' },
  ]

  // Status distribution for pie chart
  const statusDistribution = Object.entries(
    episodes.reduce((acc, ep) => {
      if (ep.status) acc[ep.status] = (acc[ep.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({
    status,
    count,
    fill: status === 'расследуется' ? '#57534e' : status === 'доказано' ? '#dc2626' : status === 'не доказано' ? '#16a34a' : '#ca8a04',
  }))

  // Timeline data from episodes
  const timelineData = filteredEpisodes
    .filter(ep => ep.date)
    .sort((a, b) => {
      const dateA = a.date?.split('/')[0] || a.date || ''
      const dateB = b.date?.split('/')[0] || b.date || ''
      return dateA.localeCompare(dateB)
    })

  const handleOpenDetail = (episode: EpisodeData) => {
    setSelectedEpisode(episode)
    setDetailOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[150px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
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
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Тяжесть" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="особо тяжкое">Особо тяжкое</SelectItem>
                  <SelectItem value="тяжкое">Тяжкое</SelectItem>
                  <SelectItem value="средней тяжести">Средней тяжести</SelectItem>
                  <SelectItem value="небольшое">Небольшое</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="расследуется">Расследуется</SelectItem>
                  <SelectItem value="доказано">Доказано</SelectItem>
                  <SelectItem value="не доказано">Не доказано</SelectItem>
                  <SelectItem value="сомнительно">Сомнительно</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">
                {filteredEpisodes.length} из {episodes.length} эпизодов
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Episode Summary Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Всего эпизодов', value: episodes.length, icon: <BookOpen className="w-5 h-5 text-orange-500" />, gradient: 'from-orange-600/20 to-stone-900' },
            { title: 'Особо тяжких', value: episodes.filter(ep => ep.severity === 'особо тяжкое').length, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, gradient: 'from-red-600/20 to-stone-900' },
            { title: 'Доказанных', value: episodes.filter(ep => ep.status === 'доказано').length, icon: <CheckCircle className="w-5 h-5 text-green-500" />, gradient: 'from-green-600/20 to-stone-900' },
            { title: 'Расследуемых', value: episodes.filter(ep => ep.status === 'расследуется').length, icon: <Clock className="w-5 h-5 text-stone-400" />, gradient: 'from-stone-600/20 to-stone-900' },
          ].map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`bg-gradient-to-br ${card.gradient} border-stone-700/30 shadow-md hover:shadow-lg transition-shadow`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  {card.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Severity Heat Map + Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Severity Heat Map */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-500" />
                Карта тяжести эпизодов
              </CardTitle>
              <CardDescription>Распределение эпизодов по степени тяжести</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  'Особо тяжкое': { label: 'Особо тяжкое', color: '#dc2626' },
                  'Тяжкое': { label: 'Тяжкое', color: '#ea580c' },
                  'Средней тяжести': { label: 'Средней тяжести', color: '#ca8a04' },
                  'Небольшое': { label: 'Небольшое', color: '#525252' },
                }}
                className="h-[200px] w-full"
              >
                <BarChart data={severityDistribution} accessibilityLayer>
                  <Bar dataKey="count" radius={6}>
                    {severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>

              {/* Heat Map Visual */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {severityDistribution.map(sd => (
                  <div
                    key={sd.severity}
                    className="p-2 rounded-lg text-center border border-stone-800"
                    style={{
                      backgroundColor: sd.fill + '30',
                      borderColor: sd.fill + '50',
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: sd.fill }}>{sd.count}</p>
                    <p className="text-xs text-muted-foreground">{sd.severity}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-md border-stone-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                Статус расследования
              </CardTitle>
              <CardDescription>Распределение эпизодов по статусу расследования</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  'расследуется': { label: 'Расследуется', color: '#57534e' },
                  'доказано': { label: 'Доказано', color: '#dc2626' },
                  'не доказано': { label: 'Не доказано', color: '#16a34a' },
                  'сомнительно': { label: 'Сомнительно', color: '#ca8a04' },
                }}
                className="h-[180px] w-full"
              >
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={30}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>

              {/* Investigation Progress Bars */}
              <div className="space-y-3 mt-3">
                {filteredEpisodes.map(ep => (
                  <div key={ep.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{ep.episodeNumber ? `Эп.${ep.episodeNumber}` : ep.title.substring(0, 20)}</span>
                      <Badge className={STATUS_COLORS[ep.status || '']?.className || 'bg-stone-500 text-white'}>
                        {STATUS_COLORS[ep.status || '']?.icon}
                        {ep.status}
                      </Badge>
                    </div>
                    <Progress
                      value={STATUS_NUMERIC[ep.status || ''] || 50}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Episode Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Хронологическая Timeline эпизодов
            </CardTitle>
            <CardDescription>Временная последовательность преступных эпизодов</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0 pl-8 max-h-80 overflow-y-auto custom-scrollbar">
              {/* Timeline line */}
              <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-red-600 via-orange-600 to-amber-600" />

              {timelineData.map((episode, index) => (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="relative pb-5"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[22px] top-2 w-5 h-5 rounded-full border-2 border-stone-700 bg-stone-900 flex items-center justify-center">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SEVERITY_HEX[episode.severity || ''] || '#525252' }}
                    />
                  </div>

                  <div className="p-4 rounded-lg bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(episode)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{episode.date}</span>
                        {episode.severity && (
                          <Badge className={`${SEVERITY_COLORS[episode.severity] || 'bg-stone-500 text-white'} text-xs`}>
                            {episode.severity}
                          </Badge>
                        )}
                        {episode.status && (
                          <Badge className={STATUS_COLORS[episode.status]?.className || 'bg-stone-500 text-white'}>
                            {STATUS_COLORS[episode.status]?.icon}
                            {episode.status}
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 gap-1">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-medium">{episode.episodeNumber ? `Эпизод ${episode.episodeNumber}: ` : ''}{episode.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{episode.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{episode.persons.length} участников</span>
                      <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{episode.articles.length} статей</span>
                      {episode.locations.length > 0 && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{episode.locations.length} мест</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Episode Connection Graph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="shadow-md border-stone-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-4 h-4 text-orange-500" />
              Граф связей: эпизоды ↔ участники ↔ статьи
            </CardTitle>
            <CardDescription>Визуализация связей между эпизодами, участниками и статьями УК РФ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[350px] bg-stone-900/60 rounded-lg border border-stone-800 overflow-hidden">
              <svg viewBox="0 0 500 350" className="w-full h-full">
                {/* Episode nodes (center) */}
                {filteredEpisodes.map((ep, i) => {
                  const x = 250
                  const y = 70 + i * 85
                  return (
                    <g key={ep.id}>
                      <rect
                        x={x - 55}
                        y={y - 18}
                        width={110}
                        height={36}
                        rx={10}
                        fill={SEVERITY_HEX[ep.severity || ''] || '#525252'}
                        stroke="#a1a1aa"
                        strokeWidth={1}
                      />
                      <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">
                        {ep.episodeNumber ? `Эп.${ep.episodeNumber}` : ep.title.substring(0, 14)}
                      </text>
                    </g>
                  )
                })}

                {/* Person nodes (left side) */}
                {mockPersons.slice(0, 4).map((person, i) => {
                  const y = 40 + i * 75
                  const isKey = person.isKolesnichenko
                  // Find episodes this person is connected to
                  const connectedEps = filteredEpisodes.filter(ep =>
                    ep.persons.some(pe => pe.personId === person.id)
                  )
                  return (
                    <g key={person.id}>
                      <circle
                        cx={60}
                        cy={y}
                        r={isKey ? 22 : 16}
                        fill={isKey ? '#dc2626' : '#575252'}
                        stroke={isKey ? '#f87171' : '#a1a1aa'}
                        strokeWidth={isKey ? 2.5 : 1}
                      />
                      <text x={60} y={y + 4} textAnchor="middle" fill="white" fontSize={isKey ? 8 : 7} fontWeight={isKey ? 'bold' : 'normal'}>
                        {person.shortName?.split(' ')[0] || person.fullName.split(' ')[0]}
                      </text>
                      {/* Connection lines */}
                      {connectedEps.map((ep) => {
                        const epIdx = filteredEpisodes.findIndex(e => e.id === ep.id)
                        if (epIdx === -1) return null
                        const epY = 70 + epIdx * 85
                        const involvement = ep.persons.find(pe => pe.personId === person.id)?.involvement
                        const lineWidth = involvement === 'органиатор' ? 2.5 : involvement === 'соучастник' ? 1.5 : 0.8
                        const lineColor = involvement === 'органиатор' ? '#dc2626' : involvement === 'соучастник' ? '#ea580c' : involvement === 'исполнитель' ? '#ea580c' : '#ca8a04'
                        return (
                          <line
                            key={`${person.id}-${ep.id}`}
                            x1={82}
                            y1={y}
                            x2={195}
                            y2={epY}
                            stroke={lineColor}
                            strokeWidth={lineWidth}
                            opacity={0.7}
                            strokeDasharray={involvement === 'свидетель' ? '4,4' : 'none'}
                          />
                        )
                      })}
                    </g>
                  )
                })}

                {/* Article nodes (right side) */}
                {(() => {
                  const articles = filteredEpisodes.flatMap(ep => ep.articles.map(ea => ea.article))
                  const uniqueArticles = [...new Map(articles.map(a => [a.id, a])).values()]
                  return uniqueArticles.map((article, i) => {
                    const x = 440
                    const y = 50 + i * 70
                    // Find episodes this article is connected to
                    const connectedEps = filteredEpisodes.filter(ep =>
                      ep.articles.some(ea => ea.articleId === article.id)
                    )
                    return (
                      <g key={article.id}>
                        <rect
                          x={x - 35}
                          y={y - 14}
                          width={70}
                          height={28}
                          rx={6}
                          fill="#57534e"
                          stroke="#a1a1aa"
                          strokeWidth={1}
                        />
                        <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">
                          {article.code}
                        </text>
                        {/* Connection lines */}
                        {connectedEps.map(ep => {
                          const epIdx = filteredEpisodes.findIndex(e => e.id === ep.id)
                          if (epIdx === -1) return null
                          const epY = 70 + epIdx * 85
                          return (
                            <line
                              key={`${article.id}-${ep.id}`}
                              x1={305}
                              y1={epY}
                              x2={x - 35}
                              y2={y}
                              stroke="#78716c"
                              strokeWidth={1}
                              opacity={0.5}
                            />
                          )
                        })}
                      </g>
                    )
                  })
                })()}

                {/* Labels */}
                <text x={60} y={16} textAnchor="middle" fill="#a1a1aa" fontSize={10} fontWeight="bold">Участники</text>
                <text x={250} y={16} textAnchor="middle" fill="#a1a1aa" fontSize={10} fontWeight="bold">Эпизоды</text>
                <text x={440} y={16} textAnchor="middle" fill="#a1a1aa" fontSize={10} fontWeight="bold">Статьи УК</text>
              </svg>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-8 h-0.5 bg-red-600" /><span>Органиатор</span></div>
              <div className="flex items-center gap-1"><div className="w-8 h-0.5 bg-orange-600" /><span>Соучастник</span></div>
              <div className="flex items-center gap-1"><div className="w-8 h-0.5 bg-amber-600" style={{ borderTop: '2px dashed #ca8a04' }} /><span>Свидетель</span></div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Episode Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredEpisodes.map((episode, index) => (
            <motion.div
              key={episode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.03 }}
              layout
            >
              <Card
                className="shadow-md hover:shadow-lg transition-all cursor-pointer border-stone-700/50 bg-gradient-to-br from-stone-900/80 to-stone-900"
                onClick={() => handleOpenDetail(episode)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm leading-tight">{episode.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {episode.severity && (
                      <Badge className={SEVERITY_COLORS[episode.severity] || 'bg-stone-500 text-white'}>
                        {episode.severity}
                      </Badge>
                    )}
                    {episode.status && (
                      <Badge className={STATUS_COLORS[episode.status]?.className || 'bg-stone-500 text-white'}>
                        {STATUS_COLORS[episode.status]?.icon}
                        {episode.status}
                      </Badge>
                    )}
                  </div>

                  {/* Investigation Progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Прогресс расследования</span>
                      <span className="font-medium">{STATUS_NUMERIC[episode.status || ''] || 50}%</span>
                    </div>
                    <Progress value={STATUS_NUMERIC[episode.status || ''] || 50} className="h-1.5" />
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    {episode.date && <p>📅 Дата: {episode.date}</p>}
                    <p className="flex items-center gap-1"><Users className="w-3 h-3" /> Участников: {episode.persons.length}</p>
                    <p className="flex items-center gap-1"><Scale className="w-3 h-3" /> Статей УК: {episode.articles.length}</p>
                    {episode.locations.length > 0 && (
                      <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Мест: {episode.locations.length}</p>
                    )}
                  </div>

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

      {/* Detailed Episodes Accordion */}
      <Card className="shadow-md border-stone-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-stone-400" />
            Детали эпизодов
          </CardTitle>
          <CardDescription>Полная информация о каждом преступном эпизоде</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {filteredEpisodes.map((episode) => (
              <AccordionItem key={episode.id} value={episode.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{episode.episodeNumber && `Эпизод ${episode.episodeNumber}: `}{episode.title}</span>
                        {episode.severity && (
                          <Badge className={`${SEVERITY_COLORS[episode.severity] || 'bg-stone-500 text-white'} text-xs`}>
                            {episode.severity}
                          </Badge>
                        )}
                        {episode.status && (
                          <Badge className={STATUS_COLORS[episode.status]?.className || 'bg-stone-500 text-white'}>
                            {episode.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Description */}
                    <div>
                      <p className="text-sm text-muted-foreground">{episode.description}</p>
                    </div>

                    <Separator className="bg-stone-700" />

                    {/* Investigation Progress */}
                    <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Прогресс расследования</span>
                        <Badge className={STATUS_COLORS[episode.status || '']?.className || 'bg-stone-500 text-white'}>
                          {STATUS_COLORS[episode.status]?.icon}
                          {episode.status}
                        </Badge>
                      </div>
                      <Progress value={STATUS_NUMERIC[episode.status || ''] || 50} className="h-2" />
                    </div>

                    {/* Participants */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Участники эпизода
                      </h4>
                      <div className="space-y-2">
                        {episode.persons.map((pe) => (
                          <div key={pe.personId} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-sm font-medium truncate">{pe.person.fullName}</span>
                              <Badge className={`${INVOLVEMENT_COLORS[pe.involvement || ''] || 'bg-stone-500 text-white'} text-xs`}>
                                {pe.involvement || 'не указано'}
                              </Badge>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">{pe.person.role}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Articles */}
                    {episode.articles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Статьи УК РФ
                        </h4>
                        <div className="space-y-2">
                          {episode.articles.map((ea) => (
                            <div key={ea.articleId} className="p-3 bg-muted/50 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-stone-700 text-white">{ea.article.code}</Badge>
                                {ea.article.category && (
                                  <Badge variant="outline" className="text-xs">{ea.article.category}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{ea.article.description}</p>
                              <div className="text-xs text-muted-foreground mt-1">
                                <span>Наказание: от {ea.article.punishmentMin || '—'} до {ea.article.punishmentMax || '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Locations */}
                    {episode.locations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Места
                        </h4>
                        <div className="space-y-2">
                          {episode.locations.map((el) => (
                            <div key={el.locationId} className="p-3 bg-muted/50 rounded border border-stone-800">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-600/20">
                                  <MapPin className="h-3 w-3 text-orange-500" />
                                </div>
                                <span className="text-sm font-medium">{el.location.name}</span>
                                <Badge variant="outline" className="text-xs">{el.location.type || '—'}</Badge>
                              </div>
                              {el.location.address && (
                                <p className="text-xs text-muted-foreground mt-1">📍 {el.location.address}</p>
                              )}
                              {el.context && (
                                <p className="text-xs text-muted-foreground mt-1 italic">{el.context}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Date */}
                    {episode.date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Clock className="h-3 h-3" />
                        <span>Дата эпизода: {episode.date}</span>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Episode Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          {selectedEpisode && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-500" />
                  {selectedEpisode.episodeNumber ? `Эпизод ${selectedEpisode.episodeNumber}: ` : ''}{selectedEpisode.title}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {selectedEpisode.severity && (
                      <Badge className={SEVERITY_COLORS[selectedEpisode.severity] || 'bg-stone-500'}>
                        {selectedEpisode.severity}
                      </Badge>
                    )}
                    {selectedEpisode.status && (
                      <Badge className={STATUS_COLORS[selectedEpisode.status]?.className || 'bg-stone-500'}>
                        {STATUS_COLORS[selectedEpisode.status]?.icon}
                        {selectedEpisode.status}
                      </Badge>
                    )}
                    {selectedEpisode.date && (
                      <Badge variant="outline">📅 {selectedEpisode.date}</Badge>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Детали</TabsTrigger>
                  <TabsTrigger value="connections">Связи</TabsTrigger>
                  <TabsTrigger value="articles">Статьи</TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-stone-700">
                    <p className="text-sm">{selectedEpisode.description}</p>
                  </div>

                  {/* Investigation Progress */}
                  <div className="p-4 bg-gradient-to-r from-stone-900 to-stone-800 rounded-lg border border-stone-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Прогресс расследования</span>
                      <span className="text-sm font-bold">{STATUS_NUMERIC[selectedEpisode.status || ''] || 50}%</span>
                    </div>
                    <Progress value={STATUS_NUMERIC[selectedEpisode.status || ''] || 50} className="h-3" />
                  </div>

                  {/* Participants */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 h-4" /> Участники эпизода ({selectedEpisode.persons.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedEpisode.persons.map(pe => (
                        <div key={pe.personId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-stone-800">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-700 text-white text-xs font-bold">
                            {pe.person.isKolesnichenko ? '★' : pe.person.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{pe.person.fullName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${INVOLVEMENT_COLORS[pe.involvement || ''] || 'bg-stone-500 text-white'} text-xs`}>
                                {pe.involvement || 'не указано'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{pe.person.role}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Locations */}
                  {selectedEpisode.locations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <MapPin className="h-4 h-4" /> Места ({selectedEpisode.locations.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedEpisode.locations.map(el => (
                          <div key={el.locationId} className="p-3 bg-muted/50 rounded-lg border border-stone-800">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-500" />
                              <span className="text-sm font-medium">{el.location.name}</span>
                              <Badge variant="outline">{el.location.type || '—'}</Badge>
                            </div>
                            {el.location.address && (
                              <p className="text-xs text-muted-foreground mt-1">📍 {el.location.address}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Connections Tab */}
                <TabsContent value="connections" className="space-y-3 mt-4">
                  {/* Connection Network SVG */}
                  <div className="relative min-h-[200px] bg-stone-900/60 rounded-lg border border-stone-800">
                    <svg viewBox="0 0 400 200" className="w-full h-full">
                      {/* Center episode node */}
                      <rect
                        x={160}
                        y={85}
                        width={80}
                        height={30}
                        rx={8}
                        fill={SEVERITY_HEX[selectedEpisode.severity || ''] || '#525252'}
                      />
                      <text x={200} y={104} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">
                        Эп.{selectedEpisode.episodeNumber || '?'}
                      </text>

                      {/* Person nodes */}
                      {selectedEpisode.persons.map((pe, i) => {
                        const angle = (2 * Math.PI * i) / selectedEpisode.persons.length - Math.PI / 2
                        const px = 200 + Math.cos(angle) * 130
                        const py = 100 + Math.sin(angle) * 70
                        const involvementColor = pe.involvement === 'органиатор' ? '#dc2626' : pe.involvement === 'соучастник' ? '#ea580c' : '#ca8a04'
                        return (
                          <g key={pe.personId}>
                            <line x1={200} y1={100} x2={px} y2={py} stroke={involvementColor} strokeWidth={1.5} opacity={0.6} />
                            <circle cx={px} cy={py} r={14} fill={pe.person.isKolesnichenko ? '#dc2626' : '#525252'} stroke={involvementColor} strokeWidth={1.5} />
                            <text x={px} y={py + 4} textAnchor="middle" fill="white" fontSize={7}>
                              {pe.person.shortName?.split(' ')[0] || 'P'}
                            </text>
                            <text x={px} y={py - 18} textAnchor="middle" fill={involvementColor} fontSize={6}>
                              {pe.involvement || ''}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>

                  {/* Related Persons list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {selectedEpisode.persons.map(pe => (
                      <div key={pe.personId} className="p-3 bg-muted/50 rounded-lg border border-stone-800 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pe.involvement === 'органиатор' ? '#dc2626' : pe.involvement === 'соучастник' ? '#ea580c' : '#ca8a04' }} />
                        <span className="text-sm font-medium">{pe.person.fullName}</span>
                        <Badge className={`${INVOLVEMENT_COLORS[pe.involvement || ''] || 'bg-stone-500'} text-xs`}>
                          {pe.involvement || 'не указано'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{pe.person.role}</Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Articles Tab */}
                <TabsContent value="articles" className="space-y-3 mt-4">
                  {selectedEpisode.articles.map(ea => (
                    <Card key={ea.articleId} className="border-stone-700">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <Scale className="w-5 h-5 text-orange-500" />
                          <CardTitle className="text-base">{ea.article.code}</CardTitle>
                          {ea.article.category && (
                            <Badge variant="outline">{ea.article.category}</Badge>
                          )}
                          <Badge className={SEVERITY_COLORS[ea.article.category || ''] || 'bg-stone-500'}>
                            {ea.article.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">{ea.article.description}</p>
                        <div className="p-3 bg-muted/50 rounded-lg border border-stone-800 text-xs">
                          <p className="text-muted-foreground">
                            <span className="font-medium">Наказание:</span> от {ea.article.punishmentMin || '—'} до {ea.article.punishmentMax || '—'}
                          </p>
                        </div>
                        {/* Person guilt assessments for this article */}
                        {selectedEpisode.persons
                          .filter(pe => pe.person.guiltAssessments?.[0]?.episodeId === selectedEpisode.id)
                          .map(pe => (
                            <div key={pe.personId} className="p-2 bg-muted/30 rounded text-xs">
                              <span className="font-medium">{pe.person.fullName}</span>: 
                              <Badge variant="outline" className="ml-1 text-xs">{pe.person.guiltAssessments?.[0]?.guiltLevel || '—'}</Badge>
                            </div>
                          ))
                        }
                      </CardContent>
                    </Card>
                  ))}
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
