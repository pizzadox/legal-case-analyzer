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
  TrendingUp, TrendingDown, Download, AlertTriangle, Shield, Scale, Gavel,
  Plus, Minus, FileWarning, Banknote, ListChecks,
  Calculator, CheckCircle2, XCircle, Percent, Coins, Clock, Users,
  FileText, Sparkles, BrainCircuit, Zap, ChevronRight, Star, Award,
  AlertCircle, Info,
} from 'lucide-react'
import { mockRiskAssessment, mockSentencing } from '@/lib/mock-data'
import { getRiskAssessment, getSentencing } from '@/lib/case-api'
import type { RiskAssessmentData, SentencingData } from '@/lib/case-store'

// ============================================================================
// PLEA BARGAINING & SENTENCE CALCULATOR — Mock data + types
// ============================================================================

type ArticleCategory = 'тяжкое' | 'особо тяжкое' | 'средней тяжести'

interface PleaArticle {
  code: string
  name: string
  category: ArticleCategory
  punishmentMin: number
  punishmentMax: number
  baseSentence: number
  fineMin: number
  fineMax: number
}

const PLEA_ARTICLES: PleaArticle[] = [
  {
    code: 'ст. 159 ч.3',
    name: 'Мошенничество с использованием служебного положения, в крупном размере',
    category: 'тяжкое',
    punishmentMin: 2,
    punishmentMax: 6,
    baseSentence: 4.5,
    fineMin: 100_000,
    fineMax: 500_000,
  },
  {
    code: 'ст. 159 ч.4',
    name: 'Мошенничество, совершённое в особо крупном размере',
    category: 'тяжкое',
    punishmentMin: 5,
    punishmentMax: 10,
    baseSentence: 7.5,
    fineMin: 1_000_000,
    fineMax: 5_000_000,
  },
  {
    code: 'ст. 160 ч.2',
    name: 'Присвоение или растрата группой лиц по предварительному сговору',
    category: 'средней тяжести',
    punishmentMin: 0,
    punishmentMax: 5,
    baseSentence: 3.0,
    fineMin: 100_000,
    fineMax: 500_000,
  },
  {
    code: 'ст. 160 ч.3',
    name: 'Присвоение или растрата с использованием служебного положения, в крупном размере',
    category: 'тяжкое',
    punishmentMin: 2,
    punishmentMax: 6,
    baseSentence: 4.0,
    fineMin: 100_000,
    fineMax: 500_000,
  },
]

interface MitigatingFactorDef {
  id: string
  label: string
  reduction: number
}

const PLEA_MITIGATING: MitigatingFactorDef[] = [
  { id: 'first-offense', label: 'Первое преступление (ст. 61 ч.1 п. «а»)', reduction: 0.5 },
  { id: 'minor-children', label: 'Несовершеннолетние дети', reduction: 0.5 },
  { id: 'positive-character', label: 'Положительные характеристики', reduction: 0.3 },
  { id: 'cooperation', label: 'Сотрудничество со следствием (ст. 61 ч.1 п. «и»)', reduction: 1.0 },
  { id: 'guilt-plea', label: 'Полное признание вины', reduction: 1.0 },
  { id: 'damage-compensation', label: 'Возмещение ущерба (ст. 61 ч.1 п. «к»)', reduction: 1.5 },
  { id: 'active-assistance', label: 'Активное способствование раскрытию', reduction: 0.8 },
  { id: 'health-condition', label: 'Состояние здоровья', reduction: 0.5 },
  { id: 'elderly-age', label: 'Пожилой возраст', reduction: 0.3 },
  { id: 'pregnancy', label: 'Беременность (ст. 61 ч.1 п. «в»)', reduction: 1.0 },
  { id: 'desperation', label: 'Доведение до отчаяния (ст. 61 ч.1 п. «д»)', reduction: 0.8 },
  { id: 'victim-immoral', label: 'Аморальное поведение потерпевшего', reduction: 0.5 },
]

interface AggravatingFactorDef {
  id: string
  label: string
  increase: number
}

const PLEA_AGGRAVATING: AggravatingFactorDef[] = [
  { id: 'recidivism', label: 'Рецидив (ст. 63 ч.1 п. «а»)', increase: 2.0 },
  { id: 'group-conspiracy', label: 'Группа лиц по сговору (ст. 63 ч.1 п. «в»)', increase: 1.5 },
  { id: 'large-scale', label: 'Особо крупный размер', increase: 1.5 },
  { id: 'official-position', label: 'Использование служебного положения', increase: 1.0 },
  { id: 'severe-consequences', label: 'С особо тяжкими последствиями', increase: 2.0 },
  { id: 'against-minors', label: 'Преступление против несовершеннолетнего', increase: 2.0 },
  { id: 'intoxication', label: 'Состояние опьянения', increase: 0.8 },
  { id: 'trace-concealment', label: 'Сокрытие следов', increase: 0.7 },
]

type PleaRecommendation = 'recommended' | 'possible' | 'not-recommended'

interface PleaScenario {
  id: 'denial' | 'special-order' | 'pretrial-agreement'
  title: string
  subtitle: string
  lawRef: string
  sentenceMin: number
  sentenceMax: number
  reductionFromMax: number
  acquittalProbability: number
  maxSentenceRisk: number
  pros: string[]
  cons: string[]
  recommendation: PleaRecommendation
}

const PLEA_SCENARIOS: PleaScenario[] = [
  {
    id: 'denial',
    title: 'Полное отрицание вины',
    subtitle: 'Текущая стратегия защиты',
    lawRef: 'Общий порядок',
    sentenceMin: 5,
    sentenceMax: 8,
    reductionFromMax: 10,
    acquittalProbability: 8,
    maxSentenceRisk: 65,
    pros: [
      'Сохранение шанса на оправдательный приговор',
      'Отсутствие признательных показаний',
      'Возможность оспаривания доказательств в суде',
      'Право на пересмотр при появлении новых улик',
    ],
    cons: [
      'Высокий риск максимального наказания',
      'Длительный судебный процесс (6–12 мес.)',
      'Психологическое давление на обвиняемого',
      'Риск усиления обвинения при новых уликах',
    ],
    recommendation: 'not-recommended',
  },
  {
    id: 'special-order',
    title: 'Особый порядок',
    subtitle: 'Сделка с правосудием без судебного разбирательства',
    lawRef: 'ст. 314 УПК РФ',
    sentenceMin: 4,
    sentenceMax: 6.5,
    reductionFromMax: 35,
    acquittalProbability: 0,
    maxSentenceRisk: 25,
    pros: [
      'Сокращение срока до 2/3 от максимального',
      'Ускоренное рассмотрение дела',
      'Снижение судебных издержек',
      'Меньше стресса для обвиняемого',
      'Гарантия непревышения 2/3 максимума',
    ],
    cons: [
      'Невозможность оправдания',
      'Отказ от оспаривания доказательств',
      'Приговор без полноценного исследования',
      'Необходимость полного признания вины',
    ],
    recommendation: 'possible',
  },
  {
    id: 'pretrial-agreement',
    title: 'Досудебное соглашение',
    subtitle: 'Соглашение о сотрудничестве со следствием',
    lawRef: 'ст. 317.1 УПК РФ',
    sentenceMin: 3,
    sentenceMax: 5,
    reductionFromMax: 50,
    acquittalProbability: 0,
    maxSentenceRisk: 10,
    pros: [
      'Максимальное снижение наказания (до 1/2 от максимума)',
      'Возможность освобождения от наказания (ст. 64 УК РФ)',
      'Защита от усиления обвинения',
      'Гарантии безопасности для обвиняемого',
      'Применение особых условий отбывания наказания',
    ],
    cons: [
      'Необходимость давать показания против соучастников',
      'Риск мести со стороны соучастников',
      'Невозможность изменения показаний',
      'Публичность соглашения в приговоре',
    ],
    recommendation: 'recommended',
  },
]

const RECOMMENDATION_CONFIG: Record<PleaRecommendation, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  recommended: { label: 'Рекомендуется', className: 'bg-emerald-700 text-white', icon: CheckCircle2 },
  possible: { label: 'Возможно', className: 'bg-amber-600 text-white', icon: AlertCircle },
  'not-recommended': { label: 'Не рекомендуется', className: 'bg-red-700 text-white', icon: XCircle },
}

const ARTICLE_CATEGORY_BADGE: Record<ArticleCategory, string> = {
  'особо тяжкое': 'bg-red-800 text-white',
  'тяжкое': 'bg-orange-600 text-white',
  'средней тяжести': 'bg-amber-600 text-white',
}

interface RadarAxis {
  key: string
  label: string
  current: number
  target: number
}

const DEFENSE_RADAR: RadarAxis[] = [
  { key: 'prosecution', label: 'Сила доказательств обвинения', current: 75, target: 30 },
  { key: 'alibi', label: 'Сила алиби', current: 30, target: 80 },
  { key: 'procedural', label: 'Процессуальные нарушения', current: 55, target: 85 },
  { key: 'witnesses', label: 'Свидетельская поддержка', current: 40, target: 75 },
  { key: 'mitigation', label: 'Смягчающие обстоятельства', current: 65, target: 90 },
  { key: 'defense-quality', label: 'Качество защиты', current: 70, target: 95 },
]

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function formatRub(value: number): string {
  return value.toLocaleString('ru-RU') + ' ₽'
}

// ============================================================================
// PLEA BARGAINING & SENTENCE CALCULATOR — Sub-components
// ============================================================================

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 7,
  color,
  label,
  sublabel,
}: {
  value: number
  size?: number
  strokeWidth?: number
  color: string
  label: string
  sublabel: string
}) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const off = c - (clamp(value, 0, 100) / 100) * c
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-stone-200 dark:text-stone-700" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={off}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold tabular-nums" style={{ color }}>{Math.round(value)}%</span>
        </div>
      </div>
      <p className="text-xs font-semibold mt-1.5">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sublabel}</p>
    </div>
  )
}

function radarPoint(axisIndex: number, value: number, totalAxes = 6, cx = 120, cy = 120, r = 88): { x: number; y: number } {
  const angle = (axisIndex / totalAxes) * 2 * Math.PI - Math.PI / 2
  return {
    x: cx + (clamp(value, 0, 100) / 100) * r * Math.cos(angle),
    y: cy + (clamp(value, 0, 100) / 100) * r * Math.sin(angle),
  }
}

function radarPolygonPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const p = radarPoint(i, v)
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
    })
    .join(' ')
}

function DefenseRadarChart() {
  const rings = [20, 40, 60, 80, 100]
  const currentValues = DEFENSE_RADAR.map(a => a.current)
  const targetValues = DEFENSE_RADAR.map(a => a.target)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full flex justify-center">
        <svg viewBox="0 0 240 240" width="240" height="240" className="max-w-full h-auto">
          {/* Concentric rings */}
          {rings.map(r => {
            const pts = DEFENSE_RADAR.map((_, i) => {
              const p = radarPoint(i, r)
              return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
            }).join(' ')
            return (
              <polygon
                key={r}
                points={pts}
                fill="none"
                className="stroke-stone-200 dark:stroke-stone-700"
                strokeWidth={1}
              />
            )
          })}
          {/* Axis lines */}
          {DEFENSE_RADAR.map((_, i) => {
            const p = radarPoint(i, 100)
            return <line key={i} x1="120" y1="120" x2={p.x} y2={p.y} className="stroke-stone-200 dark:stroke-stone-700" strokeWidth={1} />
          })}
          {/* Target polygon (emerald) */}
          <polygon
            points={radarPolygonPoints(targetValues)}
            fill="rgba(4, 120, 87, 0.18)"
            stroke="#047857"
            strokeWidth={2}
            className="transition-all duration-500"
          />
          {/* Target vertices */}
          {targetValues.map((v, i) => {
            const p = radarPoint(i, v)
            return <circle key={`t-${i}`} cx={p.x} cy={p.y} r={3} fill="#047857" />
          })}
          {/* Current polygon (red) */}
          <polygon
            points={radarPolygonPoints(currentValues)}
            fill="rgba(185, 28, 28, 0.22)"
            stroke="#b91c1c"
            strokeWidth={2}
            className="transition-all duration-500"
          />
          {/* Current vertices */}
          {currentValues.map((v, i) => {
            const p = radarPoint(i, v)
            return <circle key={`c-${i}`} cx={p.x} cy={p.y} r={3} fill="#b91c1c" />
          })}
          {/* Axis labels */}
          {DEFENSE_RADAR.map((axis, i) => {
            const labelP = radarPoint(i, 122)
            let anchor: 'start' | 'middle' | 'end' = 'middle'
            if (labelP.x < 110) anchor = 'end'
            else if (labelP.x > 130) anchor = 'start'
            return (
              <text
                key={axis.key}
                x={labelP.x}
                y={labelP.y}
                fontSize={8}
                fontWeight={600}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="fill-stone-600 dark:fill-stone-300"
              >
                {axis.label}
              </text>
            )
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-md text-xs">
        {DEFENSE_RADAR.map(axis => (
          <div key={axis.key} className="flex items-center gap-1.5 p-1.5 rounded bg-muted/40">
            <span className="flex-1 truncate text-[11px] text-muted-foreground">{axis.label}</span>
            <Badge variant="outline" className="text-[10px] border-red-700 text-red-700 tabular-nums">{axis.current}</Badge>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <Badge variant="outline" className="text-[10px] border-emerald-700 text-emerald-700 tabular-nums">{axis.target}</Badge>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(185, 28, 28, 0.45)', border: '1px solid #b91c1c' }} />
          <span className="text-muted-foreground">Текущее состояние</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(4, 120, 87, 0.45)', border: '1px solid #047857' }} />
          <span className="text-muted-foreground">Целевое состояние</span>
        </div>
      </div>
    </div>
  )
}

function PleaBargainingCalculator() {
  const [articleCode, setArticleCode] = useState<string>(PLEA_ARTICLES[0]!.code)
  const [mitState, setMitState] = useState<Record<string, boolean>>({})
  const [aggState, setAggState] = useState<Record<string, boolean>>({})

  const article = PLEA_ARTICLES.find(a => a.code === articleCode) ?? PLEA_ARTICLES[0]!

  const calc = useMemo(() => {
    const mitTotal = PLEA_MITIGATING.reduce((sum, f) => sum + (mitState[f.id] ? f.reduction : 0), 0)
    const aggTotal = PLEA_AGGRAVATING.reduce((sum, f) => sum + (aggState[f.id] ? f.increase : 0), 0)
    const raw = article.baseSentence - mitTotal + aggTotal
    const sentence = Math.round(clamp(raw, article.punishmentMin, article.punishmentMax) * 10) / 10
    const activeMitCount = PLEA_MITIGATING.filter(f => mitState[f.id]).length
    const activeAggCount = PLEA_AGGRAVATING.filter(f => aggState[f.id]).length

    // Probability heuristics
    const sentenceRatio = sentence / Math.max(article.punishmentMax, 0.001)
    let imprisonmentRaw = 45 + sentenceRatio * 50 - mitTotal * 6 + aggTotal * 6
    let suspendedRaw = 25 + mitTotal * 8 - aggTotal * 5 - Math.max(0, sentence - 3) * 6
    let fineRaw = 30 - sentenceRatio * 25 + (activeMitCount > activeAggCount ? 10 : 0)

    // Normalize so the three primary outcomes sum to 100%
    const totalRaw = imprisonmentRaw + suspendedRaw + fineRaw
    if (totalRaw > 0) {
      imprisonmentRaw = (imprisonmentRaw / totalRaw) * 100
      suspendedRaw = (suspendedRaw / totalRaw) * 100
      fineRaw = (fineRaw / totalRaw) * 100
    }
    const imprisonment = clamp(imprisonmentRaw, 1, 99)
    const suspended = clamp(suspendedRaw, 1, 99)
    const fine = clamp(fineRaw, 1, 99)

    // Fine calculation — moves between min and max depending on mitigation
    const fineRatio = clamp(1 - mitTotal * 0.15 + aggTotal * 0.1, 0, 1)
    const fineAmount = Math.round((article.fineMin + (article.fineMax - article.fineMin) * fineRatio) / 1000) * 1000

    // Category badge logic
    let category: { label: string; className: string; icon: typeof Gavel }
    if (sentence < 1 && fine > imprisonment && fine > suspended) {
      category = { label: 'Обязательные работы', className: 'bg-purple-700 text-white', icon: Zap }
    } else if (imprisonment >= suspended && imprisonment >= fine) {
      category = { label: 'Лишение свободы', className: 'bg-red-700 text-white', icon: Gavel }
    } else if (suspended >= fine) {
      category = { label: 'Условный срок', className: 'bg-amber-600 text-white', icon: Clock }
    } else {
      category = { label: 'Штраф', className: 'bg-emerald-700 text-white', icon: Coins }
    }

    return {
      sentence,
      fineAmount,
      imprisonment,
      suspended,
      fine,
      mitTotal: Math.round(mitTotal * 10) / 10,
      aggTotal: Math.round(aggTotal * 10) / 10,
      category,
      activeMitCount,
      activeAggCount,
    }
  }, [article, mitState, aggState])

  const toggleMit = (id: string, v: boolean) => setMitState(s => ({ ...s, [id]: v }))
  const toggleAgg = (id: string, v: boolean) => setAggState(s => ({ ...s, [id]: v }))

  const resetAll = () => {
    setMitState({})
    setAggState({})
  }

  const recommendedScenario = PLEA_SCENARIOS.find(s => s.recommendation === 'recommended') ?? PLEA_SCENARIOS[2]!

  return (
    <div className="space-y-4">
      {/* Widget header banner */}
      <Card className="bg-gradient-to-r from-red-900/30 via-orange-900/20 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20 shrink-0">
              <BrainCircuit className="w-6 h-6 text-red-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold flex items-center gap-2 flex-wrap">
                Калькулятор наказания и сделок с правосудием
                <Badge className="bg-red-700 text-white text-[10px] gap-1">
                  <Sparkles className="w-3 h-3" /> AI-анализ
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Интерактивный расчёт прогноза наказания, сравнение стратегий сделок с правосудием и радар силы защиты по делу № 2024-00145
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* SECTION A — Interactive Sentence Calculator                  */}
      {/* ============================================================ */}
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-orange-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-orange-600" />
            Калькулятор наказания
            <Badge variant="outline" className="text-[10px] gap-1">
              <Zap className="w-3 h-3 text-amber-600" /> Обновляется в реальном времени
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Article selector */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Статья УК РФ</label>
              <Select value={articleCode} onValueChange={setArticleCode}>
                <SelectTrigger className="w-72 rounded-xl"><SelectValue placeholder="Выберите статью" /></SelectTrigger>
                <SelectContent>
                  {PLEA_ARTICLES.map(a => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.code} — {a.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Полное наименование</label>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs">{article.name}</span>
                <Badge className={`${ARTICLE_CATEGORY_BADGE[article.category]} text-[10px]`}>{article.category}</Badge>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={resetAll}>
              <XCircle className="w-3 h-3" /> Сбросить
            </Button>
          </div>

          {/* Article range info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Мин. срок</p>
              <p className="text-sm font-bold tabular-nums">{article.punishmentMin} лет</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Макс. срок</p>
              <p className="text-sm font-bold tabular-nums">{article.punishmentMax} лет</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Scale className="w-3 h-3" /> Базовый срок</p>
              <p className="text-sm font-bold tabular-nums">{article.baseSentence} лет</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Coins className="w-3 h-3" /> Штраф</p>
              <p className="text-sm font-bold tabular-nums">{formatRub(article.fineMin)} – {formatRub(article.fineMax)}</p>
            </div>
          </div>

          {/* Mitigating + Aggravating factors */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Mitigating */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1 text-emerald-700">
                  <Minus className="w-3 h-3" /> Смягчающие обстоятельства
                </p>
                <Badge variant="outline" className="text-[10px] text-emerald-700 gap-1">
                  <TrendingDown className="w-3 h-3" /> −{calc.mitTotal} лет · активно: {calc.activeMitCount}
                </Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {PLEA_MITIGATING.map(f => {
                  const checked = !!mitState[f.id]
                  return (
                    <label
                      key={f.id}
                      htmlFor={`plea-mit-${f.id}`}
                      className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-700/40'
                          : 'bg-card border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={`plea-mit-${f.id}`}
                        checked={checked}
                        onCheckedChange={(v) => toggleMit(f.id, !!v)}
                        className="mt-0.5 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                      />
                      <span className="text-[11px] flex-1 leading-tight">{f.label}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-700 tabular-nums shrink-0">−{f.reduction}</Badge>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Aggravating */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1 text-red-700">
                  <Plus className="w-3 h-3" /> Отягчающие обстоятельства
                </p>
                <Badge variant="outline" className="text-[10px] text-red-700 gap-1">
                  <TrendingUp className="w-3 h-3" /> +{calc.aggTotal} лет · активно: {calc.activeAggCount}
                </Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {PLEA_AGGRAVATING.map(f => {
                  const checked = !!aggState[f.id]
                  return (
                    <label
                      key={f.id}
                      htmlFor={`plea-agg-${f.id}`}
                      className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
                        checked
                          ? 'bg-red-50 dark:bg-red-950/30 border-red-700/40'
                          : 'bg-card border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={`plea-agg-${f.id}`}
                        checked={checked}
                        onCheckedChange={(v) => toggleAgg(f.id, !!v)}
                        className="mt-0.5 data-[state=checked]:bg-red-700 data-[state=checked]:border-red-700"
                      />
                      <span className="text-[11px] flex-1 leading-tight">{f.label}</span>
                      <Badge variant="outline" className="text-[10px] text-red-700 tabular-nums shrink-0">+{f.increase}</Badge>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Result panel */}
          <Card className="rounded-xl bg-gradient-to-r from-red-900/15 via-orange-900/10 to-stone-900/10 border-red-700/40 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Gavel className="w-4 h-4 text-red-700" /> Расчётная панель
                </p>
                <Badge className={`${calc.category.className} gap-1`}>
                  <calc.category.icon className="w-3 h-3" /> {calc.category.label}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                {/* Sentence */}
                <div className="rounded-lg bg-card/80 p-3 border border-red-700/20">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Gavel className="w-3 h-3" /> Расчётный срок</p>
                  <p className="text-3xl font-bold text-red-700 tabular-nums mt-0.5 transition-all duration-300">{calc.sentence}<span className="text-sm font-medium ml-1">лет</span></p>
                  <Progress value={(calc.sentence / article.punishmentMax) * 100} className="h-2 mt-2 [&>div]:bg-red-700 transition-all duration-300" />
                  <p className="text-[10px] text-muted-foreground mt-1">из макс. {article.punishmentMax} лет</p>
                </div>

                {/* Fine */}
                <div className="rounded-lg bg-card/80 p-3 border border-amber-600/20">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="w-3 h-3" /> Расчётный штраф</p>
                  <p className="text-3xl font-bold text-amber-600 tabular-nums mt-0.5 transition-all duration-300">{calc.fineAmount.toLocaleString('ru-RU')}<span className="text-sm font-medium ml-1">₽</span></p>
                  <Progress value={((calc.fineAmount - article.fineMin) / Math.max(article.fineMax - article.fineMin, 1)) * 100} className="h-2 mt-2 [&>div]:bg-amber-600 transition-all duration-300" />
                  <p className="text-[10px] text-muted-foreground mt-1">из диапазона {formatRub(article.fineMin)} – {formatRub(article.fineMax)}</p>
                </div>

                {/* Probabilities */}
                <div className="rounded-lg bg-card/80 p-3 border border-stone-300/40">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Percent className="w-3 h-3" /> Вероятности видов наказания</p>
                  <div className="grid grid-cols-3 gap-1">
                    <CircularProgress value={calc.imprisonment} size={70} color="#b91c1c" label="Лишение свободы" sublabel="реальный срок" />
                    <CircularProgress value={calc.suspended} size={70} color="#d97706" label="Условный срок" sublabel="без отбывания" />
                    <CircularProgress value={calc.fine} size={70} color="#047857" label="Штраф" sublabel="основное наказание" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 p-2">
                  <p className="text-[10px] text-muted-foreground">Смягчающие (всего)</p>
                  <p className="font-bold text-emerald-700 tabular-nums">−{calc.mitTotal} лет</p>
                </div>
                <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-2">
                  <p className="text-[10px] text-muted-foreground">Отягчающие (всего)</p>
                  <p className="font-bold text-red-700 tabular-nums">+{calc.aggTotal} лет</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[10px] text-muted-foreground">Базовый срок</p>
                  <p className="font-bold tabular-nums">{article.baseSentence} лет</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[10px] text-muted-foreground">Расчётный срок</p>
                  <p className="font-bold text-orange-700 tabular-nums">{calc.sentence} лет</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* SECTION B — Plea Bargaining Analysis                         */}
      {/* ============================================================ */}
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-purple-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-700" />
            Анализ сделок с правосудием
            <Badge variant="outline" className="text-[10px] gap-1">
              <FileText className="w-3 h-3" /> 3 стратегии
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid lg:grid-cols-3 gap-3">
            {PLEA_SCENARIOS.map(scenario => {
              const rec = RECOMMENDATION_CONFIG[scenario.recommendation]
              const RecIcon = rec.icon
              return (
                <Card
                  key={scenario.id}
                  className={`rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border-t-4 ${
                    scenario.recommendation === 'recommended'
                      ? 'border-t-emerald-700 bg-gradient-to-b from-emerald-50/50 to-card dark:from-emerald-950/20'
                      : scenario.recommendation === 'possible'
                        ? 'border-t-amber-600'
                        : 'border-t-red-700'
                  }`}
                >
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold leading-tight">{scenario.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{scenario.subtitle}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">{scenario.lawRef}</Badge>
                      </div>
                      <Badge className={`${rec.className} gap-1 shrink-0`}>
                        <RecIcon className="w-3 h-3" /> {rec.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Срок</p>
                        <p className="text-sm font-bold tabular-nums">{scenario.sentenceMin}–{scenario.sentenceMax} лет</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingDown className="w-2.5 h-2.5" /> Снижение от макс.</p>
                        <p className="text-sm font-bold text-emerald-700 tabular-nums">−{scenario.reductionFromMax}%</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Вероятность оправдания</p>
                        <p className="text-sm font-bold tabular-nums">{scenario.acquittalProbability}%</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Риск макс. срока</p>
                        <p className={`text-sm font-bold tabular-nums ${scenario.maxSentenceRisk >= 50 ? 'text-red-700' : scenario.maxSentenceRisk >= 25 ? 'text-amber-600' : 'text-emerald-700'}`}>{scenario.maxSentenceRisk}%</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                        <Plus className="w-3 h-3" /> Преимущества
                      </p>
                      <ul className="space-y-0.5">
                        {scenario.pros.map((p, i) => (
                          <li key={i} className="text-[11px] flex items-start gap-1.5 leading-tight">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700 mt-0.5 shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-red-700 flex items-center gap-1 mb-1">
                        <Minus className="w-3 h-3" /> Недостатки
                      </p>
                      <ul className="space-y-0.5">
                        {scenario.cons.map((c, i) => (
                          <li key={i} className="text-[11px] flex items-start gap-1.5 leading-tight">
                            <XCircle className="w-3 h-3 text-red-700 mt-0.5 shrink-0" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Recommendation banner */}
          <Card className="rounded-xl bg-gradient-to-r from-emerald-700/15 via-emerald-600/10 to-stone-900/10 border-l-4 border-emerald-700 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-700/20 shrink-0">
                  <Award className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Рекомендация для текущего состояния дела</p>
                  <p className="text-sm font-bold text-emerald-700 mt-0.5">
                    Оптимальная стратегия: {recommendedScenario.title}
                  </p>
                  <p className="text-xs mt-1">
                    {recommendedScenario.lawRef} · прогноз срока {recommendedScenario.sentenceMin}–{recommendedScenario.sentenceMax} лет · снижение от максимума на {recommendedScenario.reductionFromMax}% · риск максимального срока всего {recommendedScenario.maxSentenceRisk}%
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge className="bg-emerald-700 text-white text-[10px] gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {RECOMMENDATION_CONFIG[recommendedScenario.recommendation].label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" /> Решение принимается на основе совокупности доказательств и процессуальной ситуации
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* SECTION C — Defense Strength Radar                           */}
      {/* ============================================================ */}
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-emerald-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700" />
            Радар силы защиты
            <Badge variant="outline" className="text-[10px] gap-1">
              <Star className="w-3 h-3 text-amber-500" /> 6 осей · текущее vs цель
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
            <DefenseRadarChart />
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <Users className="w-3 h-3" /> Анализ разрывов
              </p>
              {DEFENSE_RADAR.map(axis => {
                const gap = axis.target - axis.current
                const isGood = axis.key === 'prosecution' ? gap < 0 : gap > 0
                const gapAbs = Math.abs(gap)
                return (
                  <div key={axis.key} className="rounded-lg bg-muted/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium flex-1 truncate">{axis.label}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] tabular-nums ${
                          gapAbs >= 30 ? 'border-red-700 text-red-700' : gapAbs >= 15 ? 'border-amber-600 text-amber-600' : 'border-emerald-700 text-emerald-700'
                        }`}
                      >
                        {isGood ? '✓' : '↑'} {gap > 0 ? '+' : ''}{gap}
                      </Badge>
                    </div>
                    <Progress
                      value={axis.current}
                      className={`h-1.5 mt-1.5 ${axis.key === 'prosecution' ? '[&>div]:bg-red-700' : '[&>div]:bg-emerald-700'}`}
                    />
                  </div>
                )
              })}
              <div className="rounded-lg bg-emerald-700/10 border border-emerald-700/30 p-2 mt-2">
                <p className="text-[11px] flex items-start gap-1.5 text-emerald-700">
                  <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Цель защиты — снизить силу доказательств обвинения и усилить алиби, процессуальные нарушения и смягчающие обстоятельства.</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Existing CaseRisk helpers
// ============================================================================

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
      <div className="grid grid-cols-6 gap-1.5">
        <div />
        {[1, 2, 3, 4, 5].map(n => <div key={n} className="text-xs text-center text-muted-foreground font-medium pt-1">{n}</div>)}
        {[5, 4, 3, 2, 1].map(imRow => (
          <Fragment key={`row-${imRow}`}>
            <div className="text-xs text-muted-foreground flex items-center justify-center font-medium">{imRow}</div>
            {[1, 2, 3, 4, 5].map(lCol => {
              const lik = lCol * 20 - 10, imp = imRow * 20 - 10
              const matched = items.find(it => Math.ceil(it.likelihood / 20) === lCol && Math.ceil(it.impact / 20) === imRow)
              return (
                <div key={`${imRow}-${lCol}`} className={`relative h-9 sm:h-10 rounded-md ${matrixColor(lik, imp)} flex items-center justify-center transition-all duration-200 hover:scale-[1.08] hover:z-10 hover:ring-2 hover:ring-foreground/40`}>
                  {matched && (
                    <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><div className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-black/70 shadow-sm" /></TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[220px]"><p className="font-semibold">{matched.category}</p><p>Вероятность: {matched.likelihood}%</p><p>Влияние: {matched.impact}%</p><p className="mt-1 italic text-muted-foreground">Уровень: {matched.riskLevel}</p></TooltipContent>
                    </Tooltip></TooltipProvider>
                  )}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500/40" /> Низкий</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500/60" /> Средний</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-500/70" /> Высокий</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-700/80" /> Критич.</div>
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
      {/* === PLEA BARGAINING & SENTENCE CALCULATOR WIDGET === */}
      <PleaBargainingCalculator />

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
