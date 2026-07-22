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
import { Users, Shield, Star, ChevronDown, ChevronUp, AlertTriangle, Gavel, Download, FileText, Link2, MessageSquare, Target, ArrowRight, MapPin, Cake, CheckCircle, XCircle, GitCompare, Plus, X, RefreshCw, Share2, Network, Minus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

  // Compute relationship count for each person for visual emphasis
  const relCount = useMemo(() => {
    const counts: Record<string, number> = {}
    relationships.forEach(r => {
      counts[r.sourcePersonId] = (counts[r.sourcePersonId] ?? 0) + 1
      counts[r.targetPersonId] = (counts[r.targetPersonId] ?? 0) + 1
    })
    return counts
  }, [relationships])

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-600" /> Связи между участниками
          <Badge variant="outline" className="text-xs">{relationships.length} связей</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
          {persons.map(person => {
            const rels = personRelMap[person.id] ?? []
            const count = relCount[person.id] ?? 0
            // Heat color: more relationships → more red
            const heatClass = count >= 3 ? 'border-l-red-700 bg-red-50/40 dark:bg-red-950/20'
              : count === 2 ? 'border-l-amber-600 bg-amber-50/40 dark:bg-amber-950/20'
              : count === 1 ? 'border-l-stone-400 bg-stone-50/40 dark:bg-stone-900/20'
              : 'border-l-transparent'
            return (
              <Card key={person.id} className={`rounded-xl border border-l-4 ${heatClass} shadow-sm transition-all duration-200 hover:shadow-md hover:translate-x-0.5`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="font-medium text-sm truncate">{person.shortName ?? person.fullName}</p>
                    </div>
                    <Badge className={`${ROLE_BADGE[person.role ?? ''] ?? 'bg-stone-500 text-white'} text-xs shrink-0`}>{ROLE_LABEL[person.role ?? ''] ?? person.role}</Badge>
                  </div>
                  {rels.length > 0 ? (
                    <div className="space-y-1.5">
                      {rels.map(rel => (
                        <div key={rel.id} className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-md px-2 py-1.5">
                          <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="font-medium truncate flex-1 min-w-0">{rel.targetPersonName}</span>
                          <Badge className={`${REL_TYPE_BADGE[rel.relationshipType] ?? 'bg-stone-500 text-white'} text-[10px] shrink-0 leading-tight`}>{rel.relationshipType}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Нет исходящих связей</p>
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

// === Граф связей участников ===
// Интерактивная визуализация связей между участниками уголовного дела
// с круговой раскладкой узлов, подсветкой при наведении и попапом при клике.

// Типы для графа связей
type GraphRole = 'обвиняемый' | 'соучастник' | 'свидетель' | 'потерпевшая' | 'следователь'

interface GraphNode {
  id: string
  name: string
  role: GraphRole
  status: string
  occupation: string
  description: string
  isKolesnichenko?: boolean
}

interface GraphEdge {
  source: string
  target: string
  label: string
}

// Моковые данные графа на основе участников дела Кolesnichenko
const GRAPH_NODES: GraphNode[] = [
  { id: 'kolesnichenko', name: 'Колесниченко Д.А.', role: 'обвиняемый', status: 'задержанный', occupation: 'Бывший директор ООО "ТехноПром"', description: 'Главный обвиняемый — организатор хищения средств инвесторов', isKolesnichenko: true },
  { id: 'sidorov', name: 'Сидоров А.П.', role: 'соучастник', status: 'под подпиской', occupation: 'Бухгалтер ООО "ТехноПром"', description: 'Соучастник, отвечал за финансовое оформление операций' },
  { id: 'petrov', name: 'Петров И.С.', role: 'свидетель', status: 'допрошен', occupation: 'Бывший менеджер ООО', description: 'Свидетель обвинения, давал показания против Кolesnichenko' },
  { id: 'kozlova', name: 'Козлова Е.М.', role: 'свидетель', status: 'допрошена', occupation: 'Коллега по работе', description: 'Свидетель защиты, подтверждает алиби на период эпизода 1' },
  { id: 'morozova', name: 'Морозова А.В. (ООО "ТехноПром")', role: 'потерпевшая', status: 'признана потерпевшей', occupation: 'Представитель ООО "ТехноПром"', description: 'Юридический представитель потерпевшей организации' },
]

const GRAPH_EDGES: GraphEdge[] = [
  { source: 'kolesnichenko', target: 'sidorov', label: 'соучастники' },
  { source: 'kolesnichenko', target: 'petrov', label: 'давал показания' },
  { source: 'kolesnichenko', target: 'kozlova', label: 'алиби-свидетель' },
  { source: 'kolesnichenko', target: 'morozova', label: 'потерпевшая сторона' },
  { source: 'kozlova', target: 'petrov', label: 'коллеги' },
  { source: 'morozova', target: 'sidorov', label: 'финансовая связь' },
]

// Цветовая палитра ролей (без indigo и blue-700)
const ROLE_COLOR: Record<GraphRole, string> = {
  обвиняемый: '#b91c1c', // red-700
  соучастник: '#ea580c', // orange-600
  свидетель: '#57534e', // stone-600
  потерпевшая: '#047857', // emerald-700
  следователь: '#7e22ce', // purple-700
}

const ROLE_LABEL_RU: Record<GraphRole, string> = {
  обвиняемый: 'Обвиняемый',
  соучастник: 'Соучастник',
  свидетель: 'Свидетель',
  потерпевшая: 'Потерпевшая',
  следователь: 'Следователь',
}

// Параметры круговой раскладки
const GRAPH_W = 600
const GRAPH_H = 500
const CENTER_X = GRAPH_W / 2
const CENTER_Y = GRAPH_H / 2
const OUTER_RADIUS = 175

function PersonRelationshipGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: GRAPH_W, h: GRAPH_H })

  const DEFAULT_VB = { x: 0, y: 0, w: GRAPH_W, h: GRAPH_H }
  const MIN_W = 200
  const MAX_W = 1500

  // Расчёт координат: Кolesnichenko в центре, остальные — по кругу
  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    const outerNodes = GRAPH_NODES.filter(n => !n.isKolesnichenko)
    GRAPH_NODES.forEach(n => {
      if (n.isKolesnichenko) {
        pos[n.id] = { x: CENTER_X, y: CENTER_Y }
      } else {
        const idx = outerNodes.findIndex(o => o.id === n.id)
        // Начинаем сверху (-90°), равномерно по кругу
        const angle = (-90 + idx * (360 / outerNodes.length)) * Math.PI / 180
        pos[n.id] = {
          x: CENTER_X + OUTER_RADIUS * Math.cos(angle),
          y: CENTER_Y + OUTER_RADIUS * Math.sin(angle),
        }
      }
    })
    return pos
  }, [])

  // Множество узлов, связанных с наведённым
  const hoveredConnections = useMemo(() => {
    if (!hoveredNode) return null
    const ids = new Set<string>()
    GRAPH_EDGES.forEach(e => {
      if (e.source === hoveredNode) ids.add(e.target)
      if (e.target === hoveredNode) ids.add(e.source)
    })
    return ids
  }, [hoveredNode])

  const isNodeDimmed = (id: string) => {
    if (!hoveredNode) return false
    return id !== hoveredNode && !hoveredConnections?.has(id)
  }

  const isEdgeHighlighted = (e: GraphEdge) => {
    if (!hoveredNode) return false
    return e.source === hoveredNode || e.target === hoveredNode
  }

  const isEdgeDimmed = (e: GraphEdge) => {
    if (!hoveredNode) return false
    return !isEdgeHighlighted(e)
  }

  // Управление масштабом через viewBox
  const zoomIn = () => {
    setViewBox(vb => {
      const newW = Math.max(MIN_W, vb.w / 1.25)
      const newH = Math.max(MIN_W * (GRAPH_H / GRAPH_W), vb.h / 1.25)
      const newX = vb.x + (vb.w - newW) / 2
      const newY = vb.y + (vb.h - newH) / 2
      return { x: newX, y: newY, w: newW, h: newH }
    })
  }
  const zoomOut = () => {
    setViewBox(vb => {
      const newW = Math.min(MAX_W, vb.w * 1.25)
      const newH = Math.min(MAX_W * (GRAPH_H / GRAPH_W), vb.h * 1.25)
      const newX = vb.x - (newW - vb.w) / 2
      const newY = vb.y - (newH - vb.h) / 2
      return { x: newX, y: newY, w: newW, h: newH }
    })
  }
  const resetZoom = () => setViewBox(DEFAULT_VB)

  const selected = selectedNode ? GRAPH_NODES.find(n => n.id === selectedNode) ?? null : null

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-amber-600">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-600" /> Граф связей участников
            <Badge variant="outline" className="text-xs">{GRAPH_NODES.length} узлов · {GRAPH_EDGES.length} связей</Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg gap-1"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Развернуть граф' : 'Свернуть граф'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            {collapsed ? 'Развернуть граф' : 'Свернуть граф'}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="p-4 space-y-3">
          {/* Панель управления масштабом и подсказка */}
          <div className="flex items-center gap-1 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg" onClick={zoomIn} aria-label="Увеличить">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Увеличить масштаб графа</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg" onClick={zoomOut} aria-label="Уменьшить">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Уменьшить масштаб графа</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 px-2 rounded-lg gap-1" onClick={resetZoom} aria-label="Сбросить масштаб">
                    <RotateCcw className="w-3.5 h-3.5" /> Сброс
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Вернуть исходный масштаб</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Separator orientation="vertical" className="h-5 mx-2" />
            <span className="text-xs text-muted-foreground">
              Наведите курсор для подсветки связей · нажмите на узел для подробной информации
            </span>
          </div>

          {/* SVG-граф */}
          <div className="relative w-full max-w-2xl mx-auto rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-stone-200/60 dark:border-stone-800/60 overflow-hidden">
            <svg
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full block"
              style={{ height: '420px' }}
              role="img"
              aria-label="Граф связей участников уголовного дела"
            >
              <defs>
                {/* Маркер стрелки (обычная) */}
                <marker id="rel-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a8a29e" />
                </marker>
                {/* Маркер стрелки (активная — при наведении) */}
                <marker id="rel-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
                </marker>
              </defs>

              {/* Рёбра (линии связей) */}
              {GRAPH_EDGES.map((e, i) => {
                const src = positions[e.source]
                const tgt = positions[e.target]
                if (!src || !tgt) return null
                const highlighted = isEdgeHighlighted(e)
                const dimmed = isEdgeDimmed(e)
                const dx = tgt.x - src.x
                const dy = tgt.y - src.y
                const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
                const srcNode = GRAPH_NODES.find(n => n.id === e.source)
                const tgtNode = GRAPH_NODES.find(n => n.id === e.target)
                const srcR = srcNode?.isKolesnichenko ? 30 : 24
                const tgtR = tgtNode?.isKolesnichenko ? 30 : 24
                // Укорачиваем линию с обеих сторон, чтобы не пересекала узлы и стрелку
                const x1 = src.x + (dx / dist) * srcR
                const y1 = src.y + (dy / dist) * srcR
                const x2 = tgt.x - (dx / dist) * (tgtR + 6)
                const y2 = tgt.y - (dy / dist) * (tgtR + 6)
                // Середина ребра — для подписи
                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2
                const labelW = Math.max(80, e.label.length * 6 + 18)
                const labelH = 20
                return (
                  <g
                    key={`edge-${i}`}
                    style={{ opacity: dimmed ? 0.2 : 1, transition: 'opacity 200ms ease' }}
                  >
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={highlighted ? '#ea580c' : '#a8a29e'}
                      strokeWidth={highlighted ? 2.5 : 1.5}
                      markerEnd={`url(#${highlighted ? 'rel-arrow-active' : 'rel-arrow'})`}
                    />
                    {/* Подложка для подписи ребра */}
                    <rect
                      x={midX - labelW / 2}
                      y={midY - labelH / 2}
                      width={labelW}
                      height={labelH}
                      rx={4}
                      fill="white"
                      stroke={highlighted ? '#ea580c' : '#e7e5e4'}
                      strokeWidth={0.6}
                      opacity={0.96}
                      className="dark:fill-stone-900 dark:stroke-stone-700"
                      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.12))' } as React.CSSProperties}
                    />
                    <text
                      x={midX}
                      y={midY}
                      fontSize={9}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={highlighted ? '#ea580c' : '#44403c'}
                      className="font-medium dark:fill-stone-200"
                      style={{ pointerEvents: 'none' } as React.CSSProperties}
                    >
                      {e.label}
                    </text>
                  </g>
                )
              })}

              {/* Узлы (круги) */}
              {GRAPH_NODES.map(node => {
                const pos = positions[node.id]
                if (!pos) return null
                const r = node.isKolesnichenko ? 28 : 22
                const color = ROLE_COLOR[node.role]
                const dimmed = isNodeDimmed(node.id)
                const isSelected = selectedNode === node.id
                const initials = node.name
                  .replace(/\(.*?\)/g, '')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(p => p[0])
                  .join('')
                // Разбиваем на две строки: Фамилия + И.О.
                const nameParts = node.name.replace(/\(.*?\)/g, '').trim().split(/\s+/)
                const surname = nameParts[0] ?? ''
                const initialsRest = nameParts.slice(1).map(p => p[0] ? `${p[0]}.` : '').join(' ')
                const line1 = surname
                const line2 = initialsRest || ''
                return (
                  <g
                    key={node.id}
                    style={{
                      opacity: dimmed ? 0.3 : 1,
                      transition: 'opacity 200ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  >
                    {/* Свечение для Кolesnichenko (amber-500) */}
                    {node.isKolesnichenko && (
                      <>
                        <circle cx={pos.x} cy={pos.y} r={r + 10} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.35} />
                        <circle cx={pos.x} cy={pos.y} r={r + 5} fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={0.65} />
                      </>
                    )}
                    {/* Кольцо выделения при клике */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={r + 7}
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      >
                        <animateTransform
                          attributeName="transform"
                          attributeType="XML"
                          type="rotate"
                          from={`0 ${pos.x} ${pos.y}`}
                          to={`360 ${pos.x} ${pos.y}`}
                          dur="8s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    {/* Тень-подложка для узла */}
                    <circle cx={pos.x + 1} cy={pos.y + 2} r={r} fill="black" opacity={0.15} />
                    {/* Основной круг узла */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      fill={color}
                      stroke={node.isKolesnichenko ? '#f59e0b' : '#ffffff'}
                      strokeWidth={node.isKolesnichenko ? 3 : 2}
                    />
                    {/* Инициалы внутри круга */}
                    <text
                      x={pos.x}
                      y={pos.y}
                      fontSize={node.isKolesnichenko ? 13 : 11}
                      fontWeight={700}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      style={{ pointerEvents: 'none', userSelect: 'none' } as React.CSSProperties}
                    >
                      {initials}
                    </text>
                    {/* Подпись под узлом — фамилия (жирно) и И.О. (бледнее) на фоне-подушке */}
                    {(() => {
                      const labelW = Math.max(70, Math.max(line1.length, line2.length) * 6.5 + 12)
                      const labelH = line2 ? 30 : 16
                      return (
                        <>
                          <rect
                            x={pos.x - labelW / 2}
                            y={pos.y + r + 6}
                            width={labelW}
                            height={labelH}
                            rx={5}
                            fill="white"
                            stroke="#e7e5e4"
                            strokeWidth={0.6}
                            opacity={0.92}
                            className="dark:fill-stone-900 dark:stroke-stone-700"
                          />
                          <text
                            x={pos.x}
                            y={pos.y + r + 17}
                            fontSize={11}
                            fontWeight={700}
                            textAnchor="middle"
                            className="fill-stone-800 dark:fill-stone-100"
                            style={{ pointerEvents: 'none', userSelect: 'none' } as React.CSSProperties}
                          >
                            {line1}
                          </text>
                          {line2 && (
                            <text
                              x={pos.x}
                              y={pos.y + r + 30}
                              fontSize={9.5}
                              textAnchor="middle"
                              className="fill-stone-700 dark:fill-stone-200 font-medium"
                              style={{ pointerEvents: 'none', userSelect: 'none' } as React.CSSProperties}
                            >
                              {line2}
                            </text>
                          )}
                        </>
                      )
                    })()}
                  </g>
                )
              })}
            </svg>

            {/* Попап с деталями при клике на узел */}
            {selected && (
              <div className="absolute top-3 right-3 w-[230px] z-10 animate-in fade-in-0 zoom-in-95 duration-200">
                <Card className="rounded-lg shadow-md border border-amber-300/60 dark:border-amber-700/60">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold leading-tight">{selected.name}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0"
                        onClick={() => setSelectedNode(null)}
                        aria-label="Закрыть"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge
                        className="text-[10px] text-white"
                        style={{ backgroundColor: ROLE_COLOR[selected.role] }}
                      >
                        {ROLE_LABEL_RU[selected.role]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{selected.status}</Badge>
                      {selected.isKolesnichenko && (
                        <Badge className="bg-amber-600 text-white text-[10px]">Главный обвиняемый</Badge>
                      )}
                    </div>
                    {selected.occupation && (
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-medium">Должность:</span> {selected.occupation}
                      </p>
                    )}
                    <p className="text-[10px] leading-relaxed">{selected.description}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Легенда ролей */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-lg bg-muted/30 border border-stone-200/50 dark:border-stone-800/50">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Network className="w-3 h-3" /> Легенда:
            </span>
            {(Object.keys(ROLE_COLOR) as GraphRole[]).map(role => (
              <TooltipProvider key={role}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <span
                        className="inline-block w-3 h-3 rounded-full ring-2 ring-white/70 dark:ring-stone-900/70"
                        style={{ backgroundColor: ROLE_COLOR[role] }}
                      />
                      <span className="text-xs">{ROLE_LABEL_RU[role]}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Роль участника: {ROLE_LABEL_RU[role]}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-stone-300/60 dark:border-stone-700/60">
              <span className="inline-block w-3 h-3 rounded-full ring-2 ring-amber-500" style={{ backgroundColor: ROLE_COLOR['обвиняемый'] }} />
              <span className="text-xs">Главный обвиняемый (Кolesnichenko)</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function CasePersons() {
  const [roleFilter, setRoleFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])

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
      {/* Граф связей участников — интерактивная визуализация сверху */}
      <PersonRelationshipGraph />

      {/* Guilt Assessment Summary - Enhanced with progress bars + breakdown */}
      <Card className="bg-gradient-to-r from-red-900/20 to-stone-900/10 rounded-xl shadow-sm border-l-4 border-red-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-700/20">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Оценка виновности участников</p>
              <p className="text-xs text-muted-foreground">Распределение по уровню виновности ({persons.length} участников)</p>
            </div>
            <Badge className="bg-red-700 text-white text-xs">{guiltSummary.high + guiltSummary.moderate} обвиняемых</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(guiltSummary).map(([level, count]) => {
              const pct = persons.length > 0 ? Math.round((count / persons.length) * 100) : 0
              const cfg = GUILT[level] ?? GUILT.none
              return (
                <div key={level} className="p-2 rounded-lg bg-background/60 border border-stone-200/40">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={`${cfg.badge} text-xs`}>{cfg.label}</Badge>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-0.5">{pct}% от всех</p>
                </div>
              )
            })}
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

      {/* Empty state for filtered persons (no results) */}
      {filtered.length === 0 && persons.length > 0 && (
        <Card className="rounded-xl shadow-sm border-t-2 border-t-emerald-500 bg-gradient-to-br from-card via-card to-emerald-500/5">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mx-auto mb-4 ring-4 ring-emerald-500/5">
              <Users className="w-10 h-10 text-emerald-600" />
            </div>
            <p className="text-base font-semibold">Участники не найдены</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Попробуйте изменить фильтр по ролям или сбросить его, чтобы увидеть всех участников дела.</p>
            <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => setRoleFilter('all')}>
              <RefreshCw className="w-3 h-3 mr-1" />Сбросить фильтр
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Witness Statements */}
      <WitnessStatementsSection statements={statements} />

      {/* Alibi Verification Card - new feature for the main defendant */}
      {kolesnichenko && (
        <Card className="rounded-xl shadow-sm border-l-4 border-amber-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" /> Проверка алиби
              <Badge variant="outline" className="text-xs">Колесниченко Д.А.</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Alibi timeline visualization */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Заявленное алиби</p>
                <p className="text-xs text-muted-foreground">Находился в командировке в г. Санкт-Петербург</p>
                <p className="text-xs text-muted-foreground mt-1">Период: 10.03.2024 — 14.03.2024</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="bg-emerald-700 text-white text-xs">Подтверждено документами</Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Опровержение</p>
                <p className="text-xs text-muted-foreground">Свидетель Сидорова видела обвиняемого 12.03.2024 в Москве</p>
                <p className="text-xs text-muted-foreground mt-1">Билет на поезд найден, но не использован</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="bg-red-700 text-white text-xs">Противоречие</Badge>
                </div>
              </div>
            </div>
            <Separator />
            {/* Verification status */}
            <div>
              <p className="text-xs font-semibold mb-2">Статус проверки по источникам:</p>
              <div className="space-y-1.5">
                {[
                  { src: 'Билеты на поезд', status: 'verified', note: 'Куплены, но не использованы' },
                  { src: 'Свидетель Сидорова А.М.', status: 'contradicts', note: 'Видела в Москве 12.03' },
                  { src: 'Отель "Невский"', status: 'unverified', note: 'Бронь была, но заселение не подтверждено' },
                  { src: 'GPS-трекинг телефона', status: 'verified', note: 'Находился в СПб 10-11.03' },
                ].map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-muted/30">
                    {v.status === 'verified' && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                    {v.status === 'contradicts' && <XCircle className="w-3 h-3 text-red-600 shrink-0" />}
                    {v.status === 'unverified' && <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />}
                    <span className="font-medium flex-1 min-w-0 truncate">{v.src}</span>
                    <span className="text-muted-foreground text-xs truncate">{v.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">Показано {filtered.length} из {persons.length} участников дела</p>

      {/* Comparison View - side-by-side analysis */}
      <ComparisonView persons={persons} compareIds={compareIds} setCompareIds={setCompareIds} />
    </div>
  )
}

// === Comparison View Component ===
// Allows side-by-side comparison of up to 3 selected persons across key dimensions
function ComparisonView({ persons, compareIds, setCompareIds }: {
  persons: PersonData[]
  compareIds: string[]
  setCompareIds: (ids: string[]) => void
}) {
  const selected = compareIds
    .map(id => persons.find(p => p.id === id))
    .filter((p): p is PersonData => p !== undefined)

  const availablePersons = persons.filter(p => !compareIds.includes(p.id))

  const addPerson = (id: string) => {
    if (compareIds.length >= 3) {
      toast.info('Можно сравнить не более 3 участников одновременно')
      return
    }
    setCompareIds([...compareIds, id])
  }

  const removePerson = (id: string) => {
    setCompareIds(compareIds.filter(x => x !== id))
  }

  // Comparison dimensions
  const dimensions = [
    { key: 'role', label: 'Роль', getValue: (p: PersonData) => ROLE_LABEL[p.role ?? ''] ?? p.role ?? '—' },
    { key: 'status', label: 'Статус', getValue: (p: PersonData) => p.status ?? '—' },
    { key: 'guiltLevel', label: 'Виновность', getValue: (p: PersonData) => GUILT[p.guiltLevel ?? 'none'].label },
    { key: 'guiltPct', label: 'Уровень вины', getValue: (p: PersonData) => `${GUILT[p.guiltLevel ?? 'none'].pct}%` },
    { key: 'occupation', label: 'Должность', getValue: (p: PersonData) => p.occupation ?? '—' },
    { key: 'alias', label: 'Псевдоним', getValue: (p: PersonData) => p.alias ?? '—' },
    { key: 'defense', label: 'Стратегия защиты', getValue: (p: PersonData) => p.defenseStrategy ?? 'Не определена' },
  ]

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-purple-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-purple-600" /> Сравнение участников
          <Badge variant="outline" className="text-xs">{selected.length}/3 выбрано</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {selected.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-dashed border-purple-300/50 dark:border-purple-700/40">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 mx-auto mb-3 ring-4 ring-purple-500/5">
              <GitCompare className="w-10 h-10 text-purple-600" />
            </div>
            <p className="text-sm font-semibold">Выберите участников для сравнения</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Сравнение по 7 ключевым параметрам: роль, статус, виновность, стратегия защиты и др.</p>
            <p className="text-[10px] text-muted-foreground mt-2">Можно выбрать до 3 участников одновременно</p>
          </div>
        ) : (
          <>
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-muted-foreground w-32">Параметр</th>
                    {selected.map(p => (
                      <th key={p.id} className="text-left p-2 font-semibold align-top min-w-[180px]">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{p.shortName ?? p.fullName}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge className={`${ROLE_BADGE[p.role ?? ''] ?? 'bg-stone-500 text-white'} text-[10px]`}>
                                {ROLE_LABEL[p.role ?? ''] ?? p.role}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 shrink-0"
                            onClick={() => removePerson(p.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map((dim, idx) => (
                    <tr key={dim.key} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                      <td className="p-2 font-medium text-muted-foreground">{dim.label}</td>
                      {selected.map(p => {
                        const value = dim.getValue(p)
                        // Highlight guilt level with color
                        const isGuilt = dim.key === 'guiltLevel'
                        const guiltClass = isGuilt ? GUILT[p.guiltLevel ?? 'none'].badge : ''
                        return (
                          <td key={p.id} className="p-2 align-top">
                            {isGuilt ? (
                              <Badge className={`${guiltClass} text-xs`}>{value}</Badge>
                            ) : (
                              <span className="text-xs">{value}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual guilt comparison */}
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                <Target className="w-3 h-3" /> Сравнение уровней виновности
              </p>
              <div className="space-y-2">
                {selected.map(p => {
                  const pct = GUILT[p.guiltLevel ?? 'none'].pct
                  const color = GUILT[p.guiltLevel ?? 'none'].color
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-xs w-24 truncate text-muted-foreground">{p.shortName ?? p.fullName}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-10 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Add person to comparison */}
        {availablePersons.length > 0 && compareIds.length < 3 && (
          <div className="flex items-center gap-2">
            <Select onValueChange={addPerson}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="+ Добавить участника для сравнения" />
              </SelectTrigger>
              <SelectContent>
                {availablePersons.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.shortName ?? p.fullName} ({ROLE_LABEL[p.role ?? ''] ?? p.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
