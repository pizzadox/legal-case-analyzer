'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Swords, Shield, Target, AlertTriangle, Lock, Gavel, Calendar, ChevronRight, CheckCircle2, Clock, Activity, Zap, FileText, Filter, ArrowRight, Eye, Sparkles, Scale, ClipboardList, TrendingUp, CircleDot, type LucideIcon } from 'lucide-react'
import { sevBadge, sideBadge, sideHex, statBadge, monthLabel, GRID3 } from '@/lib/shared-ui'

// ─── Types ───

type MoveSide = 'prosecution' | 'defense'
type MoveStatus = 'completed' | 'active' | 'planned'
type FilterKey = 'all' | 'prosecution' | 'defense' | 'completed' | 'planned'

interface BattleMove {
  id: string; side: MoveSide; title: string; startMonth: number; durationMonths: number
  status: MoveStatus; description: string; relatedDocs?: string[]; outcome?: string; nextSteps?: string
}

interface StrategicInsight {
  id: string; title: string; body: string; details: string[]
  color: 'red' | 'emerald' | 'amber'; icon: LucideIcon
}

interface ActionItem {
  id: string; date: string; action: string; responsible: string
  priority: 'critical' | 'high' | 'medium'; status: 'in-progress' | 'planned'
}

interface CriticalEvent { id: string; label: string; monthIndex: number; icon: LucideIcon; color: string }

// ─── Constants ───

const M_LABELS = ['Мар 23','Апр 23','Май 23','Июн 23','Июл 23','Авг 23','Сен 23','Окт 23','Ноя 23','Дек 23','Янв 24','Фев 24','Мар 24']
const SVG_W = 1400, SVG_H = 640, LEFT_P = 130, RIGHT_P = 20, TL_W = SVG_W - LEFT_P - RIGHT_P
const MC = 13, MW = TL_W / MC, HDR_H = 70
const P_LANE = { y: 80, h: 200 }, D_LANE = { y: 320, h: 200 }, SEP_Y = 300
const BAR_H = 22, BAR_G = 2
const P_BAR_Y = P_LANE.y + (P_LANE.h - (6 * BAR_H + 5 * BAR_G)) / 2
const D_BAR_Y = D_LANE.y + (D_LANE.h - (8 * BAR_H + 7 * BAR_G)) / 2
const TODAY = 12

const STATUS_CFG: Record<MoveStatus, { label: string; icon: LucideIcon; badge: string }> = {
  completed: { label: 'Завершён', icon: CheckCircle2, badge: 'bg-emerald-700 text-white' },
  active: { label: 'В работе', icon: Activity, badge: 'bg-amber-600 text-white' },
  planned: { label: 'Запланирован', icon: Clock, badge: 'bg-stone-600 text-white' },
}
const PRI_CFG: Record<string, { label: string; badge: string }> = {
  critical: { label: 'Критическая', badge: 'bg-red-700 text-white' },
  high: { label: 'Высокая', badge: 'bg-amber-600 text-white' },
  medium: { label: 'Средняя', badge: 'bg-stone-600 text-white' },
}
const ACT_CFG: Record<string, { label: string; badge: string }> = {
  'in-progress': { label: 'В работе', badge: 'bg-amber-600 text-white' },
  planned: { label: 'Запланировано', badge: 'bg-stone-600 text-white' },
}

const FILTER_OPTS: { key: FilterKey; label: string; icon: LucideIcon }[] = [
  { key: 'all', label: 'Все ходы', icon: Filter },
  { key: 'prosecution', label: 'Обвинение', icon: Swords },
  { key: 'defense', label: 'Защита', icon: Shield },
  { key: 'completed', label: 'Завершённые', icon: CheckCircle2 },
  { key: 'planned', label: 'Запланированные', icon: Clock },
]

// ─── Insight color config (compact) ───

const INS_CFG: Record<string, { border: string; bg: string; text: string; badge: string; grad: string }> = {
  red: { border: 'border-l-red-700', bg: 'bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-700 text-white', grad: 'from-red-900/15 via-card to-card' },
  emerald: { border: 'border-l-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-700 text-white', grad: 'from-emerald-900/15 via-card to-card' },
  amber: { border: 'border-l-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-600 text-white', grad: 'from-amber-900/15 via-card to-card' },
}

// ─── Mock data ───

const P_MOVES: BattleMove[] = [
  { id: 'pm-1', side: 'prosecution', title: 'Возбуждение дела', startMonth: 0, durationMonths: 1, status: 'completed',
    description: 'СК России возбудил УД в отношении Колесниченко Д.А. по ч. 3 ст. 159 УК РФ по заявлению ООО «ТехноПром» о хищении денежных средств путём обмана.',
    relatedDocs: ['Постановление о возбуждении УД от 15.03.2023', 'Заявление ООО «ТехноПром»'],
    outcome: 'Уголовное дело зарегистрировано в КУСП, следователю назначена предварительная проверка.' },
  { id: 'pm-2', side: 'prosecution', title: 'Допрос свидетелей обвинения', startMonth: 1, durationMonths: 2, status: 'completed',
    description: 'Допросы ключевых свидетелей: Петрова И.В., Ивановой А.С., сотрудников ООО «ТехноПром». Показания подтверждают схему хищения.',
    relatedDocs: ['Протоколы допросов (тома 3–5)'],
    outcome: '7 протоколов допросов свидетелей, часть показаний содержит противоречия.' },
  { id: 'pm-3', side: 'prosecution', title: 'Обыск офиса', startMonth: 2, durationMonths: 1, status: 'completed',
    description: 'Обыск в ООО «ТехноПром» и по месту жительства Колесниченко. Изъяты 45 листов документов, ноутбук, 3 флеш-накопителя.',
    relatedDocs: ['Протокол обыска № 14/2023 от 18.05.2023'],
    outcome: 'Документы приобщены к делу, назначены экспертизы.' },
  { id: 'pm-4', side: 'prosecution', title: 'Предъявление обвинения ст. 159', startMonth: 3, durationMonths: 1, status: 'completed',
    description: 'Колесниченко предъявлено обвинение по ч. 3 ст. 159 УК РФ — мошенничество с использованием служебного положения, в крупном размере. Вину не признал.',
    relatedDocs: ['Постановление о привлечении в качестве обвиняемого'],
    outcome: 'Обвинение сформулировано, материалы переданы для назначения экспертиз.' },
  { id: 'pm-5', side: 'prosecution', title: 'Финансовая экспертиза', startMonth: 4, durationMonths: 3, status: 'completed',
    description: 'Финансово-экономическая экспертиза: эксперт Кузнецова установила хищение 4,7 млн руб. через фиктивные договоры с подставными контрагентами.',
    relatedDocs: ['Заключение эксперта № 128-Э от 15.09.2023'],
    outcome: 'Заключение приобщено к делу, обвинение получило доказательную базу.' },
  { id: 'pm-6', side: 'prosecution', title: 'Доп. эпизоды ст. 160', startMonth: 9, durationMonths: 1, status: 'completed',
    description: 'Выявлены эпизоды присвоения и растраты имущества ООО «ТехноПром» (2022–2023 гг.). Обвинение дополнено по ч. 2 ст. 160. Ущерб увеличен до 5,8 млн руб.',
    relatedDocs: ['Дополнительное постановление о привлечении'],
    outcome: 'Квалификация расширена, объединённое обвинение по двум статьям.' },
]

const D_MOVES: BattleMove[] = [
  { id: 'dm-1', side: 'defense', title: 'Ознакомление с материалами', startMonth: 1, durationMonths: 1, status: 'completed',
    description: 'Адвокат Петрова подала ходатайство об ознакомлении с материалами УД в порядке ст. 216 УПК РФ. Получен доступ к томам 1–12.',
    relatedDocs: ['Ходатайство от 10.04.2023'],
    outcome: 'Защита получила доступ к материалам дела, выявлены процессуальные нарушения.' },
  { id: 'dm-2', side: 'defense', title: 'Заявление об алиби', startMonth: 2, durationMonths: 1, status: 'completed',
    description: 'Заявлено алиби на период ключевого эпизода. Представлены билеты РЖД, показания соседа Козлова, видеозапись ТЦ «Город».',
    relatedDocs: ['Заявление об алиби от 22.05.2023', 'Билеты РЖД'],
    outcome: 'Заявление приобщено, следствие вынуждено проверять алиби.' },
  { id: 'dm-3', side: 'defense', title: 'Исключение доказательств', startMonth: 4, durationMonths: 1, status: 'completed',
    description: 'Ходатайство об исключении протокола обыска: отсутствие адвоката, отсутствие видеофиксации, задержка передачи предметов на экспертизу.',
    relatedDocs: ['Ходатайство от 05.07.2023'],
    outcome: 'Частично удовлетворено: часть документов исключена из доказательств.' },
  { id: 'dm-4', side: 'defense', title: 'Независимая экспертиза', startMonth: 5, durationMonths: 3, status: 'completed',
    description: 'Независимая экспертиза Морозова: выводы государственного эксперта основаны на копиях, методика не учитывала оборотную сторону договоров, арифметические ошибки.',
    relatedDocs: ['Заключение эксперта Морозова от 25.10.2023'],
    outcome: 'Поставило под сомнение достоверность выводов обвинения.' },
  { id: 'dm-5', side: 'defense', title: 'Опрос свидетелей защиты', startMonth: 6, durationMonths: 3, status: 'completed',
    description: 'Опрос свидетелей: Козлова (алиби), Сидоровой (характеристика), Васильева (независимый бухгалтер). Показания опровергают обвинение.',
    relatedDocs: ['Протоколы опроса (том 41)'],
    outcome: 'Свидетели допрошены следователем, показания приобщены.' },
  { id: 'dm-6', side: 'defense', title: 'Переквалификация', startMonth: 9, durationMonths: 1, status: 'completed',
    description: 'Ходатайство о переквалификации с ч. 3 ст. 159 на ч. 1 ст. 159 — размер ущерба не является крупным. Заявлено исключение эпизодов ст. 160.',
    relatedDocs: ['Ходатайство от 12.12.2023'],
    outcome: 'Отклонено следствием, передано для рассмотрения в суде.' },
  { id: 'dm-7', side: 'defense', title: 'Замечания на обвинение', startMonth: 10, durationMonths: 2, status: 'active',
    description: 'Ознакомление с 45 томами дела, подготовка замечаний на обвинительное заключение. Выявлены нарушения, противоречия, недостоверные выводы.',
    relatedDocs: ['Замечания (проект)', 'Опись нарушений'],
    nextSteps: 'Подать замечания до 02.04.2024, ходатайствовать об исключении доказательств.' },
  { id: 'dm-8', side: 'defense', title: 'Подготовка к суду', startMonth: 11, durationMonths: 2, status: 'planned',
    description: 'Формирование позиции по эпизодам, подготовка ходатайств, список свидетелей защиты, тактика допроса.',
    relatedDocs: ['План разбирательства', 'Проекты ходатайств'],
    nextSteps: 'Предварительное заседание 15.04.2024, слушание 06.05.2024.' },
]

const CRIT_EVENTS: CriticalEvent[] = [
  { id: 'ce-1', label: 'Арест', monthIndex: 0, icon: Lock, color: '#b45309' },
  { id: 'ce-2', label: 'Суд 1 инст.', monthIndex: 12, icon: Gavel, color: '#7c2d12' },
]

const INSIGHTS: StrategicInsight[] = [
  { id: 'si-1', title: 'Слабые места обвинения', color: 'red', icon: Target,
    body: 'Обвинение опирается на показания Петрова И.В. (противоречия). Экспертиза имеет нарушения при изъятии. Алгоритмическая связь с Колесниченко не доказана.',
    details: ['Петров изменял показания между допросами','Экспертиза по копиям, не оригиналам','Не исследована оборотная сторона 3 договоров','Эксперт Кузнецова не давала показаний в суде','Часть изъятых предметов не опечатана'] },
  { id: 'si-2', title: 'Сильные аргументы защиты', color: 'emerald', icon: Shield,
    body: 'Алиби подтверждено билетами и показаниями. Процессуальные нарушения при обыске. Смягчающие обстоятельства снижают риск максимального наказания.',
    details: ['Алиби: билеты РЖД, видео ТЦ «Город», Козлов В.Н.','Независимая экспертиза опровергает обвинение','Нарушения при обыске — основание для исключения','Положительная характеристика, отсутствие судимости','Готовность к сотрудничеству и возмещению'] },
  { id: 'si-3', title: 'Критические риски', color: 'amber', icon: AlertTriangle,
    body: 'Эпизод 1 имеет сильную доказательную базу. Финансовые документы указывают на причастность. Рецидив риска (Сидоров готов дать показания).',
    details: ['Эпизод 1: 12 документов с подписью обвиняемого','Иванова подтвердила подлинность подписей','Сидоров согласился на дачу показаний','Ущерб 5,8 млн руб. — крупный размер','Эпизоды ст. 160 могут быть переквалифицированы'] },
]

const ACT_PLAN: ActionItem[] = [
  { id: 'ap-1', date: '25 Мар', action: 'Ходатайство об исключении экспертизы', responsible: 'Адвокат Петрова', priority: 'high', status: 'in-progress' },
  { id: 'ap-2', date: '28 Мар', action: 'Допрос Козлова В.Н. (алиби)', responsible: 'Следователь', priority: 'high', status: 'planned' },
  { id: 'ap-3', date: '02 Апр', action: 'Замечания на обвинительное заключение', responsible: 'Адвокат Петрова', priority: 'critical', status: 'planned' },
  { id: 'ap-4', date: '05 Апр', action: 'Встреча с Колесниченко для подготовки', responsible: 'Адвокат Петрова', priority: 'high', status: 'planned' },
  { id: 'ap-5', date: '10 Апр', action: 'Запрос документов из ООО «ТехноПром»', responsible: 'Адвокат Петрова', priority: 'medium', status: 'planned' },
  { id: 'ap-6', date: '15 Апр', action: 'Предварительное судебное заседание', responsible: 'Суд', priority: 'critical', status: 'planned' },
]

// ─── Helpers ───

const mX = (m: number) => LEFT_P + m * MW
const fmtRange = (s: number, d: number) => d === 1 ? M_LABELS[s] : `${M_LABELS[s]} — ${M_LABELS[s + d - 1]}`
const gradId = (s: MoveSide) => s === 'prosecution' ? 'grad-p' : 'grad-d'
const gradStroke = (s: MoveSide) => s === 'prosecution' ? '#7f1d1d' : '#064e3b'

function visibleMoves(f: FilterKey) {
  const all = [...P_MOVES, ...D_MOVES]
  const ok = (m: BattleMove) => f === 'all' || (f === 'prosecution' && m.side === 'prosecution') || (f === 'defense' && m.side === 'defense') || (f === 'completed' && m.status === 'completed') || (f === 'planned' && m.status !== 'completed')
  const filtered = all.filter(ok)
  return { prosecution: filtered.filter(m => m.side === 'prosecution'), defense: filtered.filter(m => m.side === 'defense') }
}

// ─── ForceBalanceBar ───

function ForceBalanceBar() {
  const pPct = 45, dPct = 55
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-700 dark:text-purple-400" /> Баланс сил сторон
          </CardTitle>
          <Badge className="bg-purple-700 text-white gap-1"><Sparkles className="w-3 h-3" /> ИИ-прогноз</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-12 w-full rounded-lg overflow-hidden flex shadow-inner bg-stone-100 dark:bg-stone-900">
          <div className="h-full bg-gradient-to-r from-red-800 to-red-700 flex items-center pl-3" style={{ width: `${pPct}%` }}>
            <span className="text-xs font-bold text-white tracking-wide">ОБВИНЕНИЕ {pPct}%</span>
          </div>
          <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-800 flex items-center justify-end pr-3" style={{ width: `${dPct}%` }}>
            <span className="text-xs font-bold text-white tracking-wide">{dPct}% ЗАЩИТА</span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-9 h-9 rounded-full bg-purple-700 text-white flex items-center justify-center shadow-lg ring-4 ring-card text-[11px] font-black">VS</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { bg: 'bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40', dot: 'bg-red-700', lbl: 'Сила доказательств обвинения', val: `${pPct}%`, valC: 'text-red-700 dark:text-red-400' },
            { bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40', dot: 'bg-emerald-700', lbl: 'Сила аргументов защиты', val: `${dPct}%`, valC: 'text-emerald-700 dark:text-emerald-400' },
            { bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40', dot: 'bg-purple-700', lbl: 'Прогноз', val: 'Защита имеет преимущество', valC: 'text-purple-700 dark:text-purple-400' },
          ].map((it, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${it.bg}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${it.dot} mt-1 shrink-0`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{it.lbl}</p>
                <p className={`text-lg font-bold ${it.valC} tabular-nums`}>{it.val}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── BattleMoveBar (SVG Gantt bar) ───

interface BarProps { move: BattleMove; y: number; isHovered: boolean; onHover: (id: string|null) => void; onSelect: (move: BattleMove) => void }

function BattleMoveBar({ move, y, isHovered, onHover, onSelect }: BarProps) {
  const x = mX(move.startMonth), w = move.durationMonths * MW - 2
  const gid = gradId(move.side), stroke = gradStroke(move.side)
  const op = isHovered ? 1 : (move.startMonth >= TODAY ? 0.7 : 1)
  const sCfg = STATUS_CFG[move.status], SIcon = sCfg.icon
  const maxCh = Math.floor(w / 6.5)
  const dispTitle = move.title.length > maxCh ? move.title.slice(0, Math.max(3, maxCh - 1)) + '…' : move.title

  return (
    <g onMouseEnter={() => onHover(move.id)} onMouseLeave={() => onHover(null)} onClick={() => onSelect(move)} className="cursor-pointer" opacity={op}>
      <rect x={x - 2} y={y - 2} width={w + 4} height={BAR_H + 4} fill="transparent" />
      <rect x={x} y={y + 2} width={w} height={BAR_H} rx={4} ry={4} fill="#000" opacity={isHovered ? 0.18 : 0.1} />
      <rect x={x} y={y} width={w} height={BAR_H} rx={4} ry={4} fill={`url(#${gid})`} stroke={stroke} strokeWidth={isHovered ? 1.5 : 1} />
      <rect x={x} y={y} width={w} height={BAR_H / 2} rx={4} ry={4} fill="#fff" opacity={0.1} />
      {w > 50 && <text x={x + 8} y={y + BAR_H / 2 + 3} fontSize={10} fontWeight={600} fill="#fff" className="pointer-events-none select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{dispTitle}</text>}
      {w > 90 && <g transform={`translate(${x + w - 18}, ${y + BAR_H / 2 - 6})`}><SIcon className="pointer-events-none" size={12} color="#fff" strokeWidth={2.5} /></g>}
      {isHovered && <rect x={x - 2} y={y - 2} width={w + 4} height={BAR_H + 4} rx={5} ry={5} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.9} />}
    </g>
  )
}

// ─── HoverTooltip (SVG) ───

function HoverTooltip({ move }: { move: BattleMove }) {
  const x = mX(move.startMonth), w = move.durationMonths * MW
  const tw = Math.min(280, w + 80), tx = Math.min(SVG_W - tw - 6, Math.max(6, x + w / 2 - tw / 2))
  const ty = move.side === 'prosecution' ? P_LANE.y + P_LANE.h + 4 : D_LANE.y - 56
  const titleTxt = move.title.length > 38 ? move.title.slice(0, 36) + '…' : move.title
  return (
    <g pointerEvents="none">
      <rect x={tx} y={ty} width={tw} height={50} rx={6} fill="#1c1917" opacity={0.95} className="dark:fill-stone-900" />
      <rect x={tx} y={ty} width={4} height={50} rx={2} fill={move.side === 'prosecution' ? '#b91c1c' : '#047857'} />
      <text x={tx + 12} y={ty + 18} fontSize={11} fontWeight={700} fill="#fafaf9">{titleTxt}</text>
      <text x={tx + 12} y={ty + 34} fontSize={10} fill="#d6d3d1">{fmtRange(move.startMonth, move.durationMonths)} · {STATUS_CFG[move.status].label}</text>
    </g>
  )
}

// ─── GanttChart ───

interface GanttProps { filter: FilterKey; onSelect: (move: BattleMove) => void }

function GanttChart({ filter, onSelect }: GanttProps) {
  const [hovId, setHovId] = useState<string | null>(null)
  const { prosecution, defense } = visibleMoves(filter)
  const hovMove = useMemo(() => [...prosecution, ...defense].find(m => m.id === hovId), [hovId, prosecution, defense])
  const handleHov = useCallback((id: string|null) => setHovId(id), [])

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-700 dark:text-purple-400" /> Хронология боевых действий
            <Badge variant="outline" className="text-[10px]">{M_LABELS[0]} — {M_LABELS[12]}</Badge>
          </CardTitle>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> Наведите для деталей, нажмите для описания</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-thin"><div className="min-w-[900px]">
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto" style={{ aspectRatio: `${SVG_W}/${SVG_H}` }}>
            <defs>
              <linearGradient id="grad-p" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dc2626" /><stop offset="50%" stopColor="#b91c1c" /><stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
              <linearGradient id="grad-d" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" /><stop offset="50%" stopColor="#047857" /><stop offset="100%" stopColor="#065f46" />
              </linearGradient>
              <linearGradient id="gp-lane" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef2f2" stopOpacity="0.7" /><stop offset="100%" stopColor="#fee2e2" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="gd-lane" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.7" /><stop offset="100%" stopColor="#d1fae5" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="gp-lane-dk" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.18" /><stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="gd-lane-dk" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#064e3b" stopOpacity="0.18" /><stop offset="100%" stopColor="#064e3b" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {/* Lane backgrounds */}
            <rect x={LEFT_P} y={P_LANE.y} width={TL_W} height={P_LANE.h} fill="url(#gp-lane)" className="dark:opacity-0" rx={6} />
            <rect x={LEFT_P} y={D_LANE.y} width={TL_W} height={D_LANE.h} fill="url(#gd-lane)" className="dark:opacity-0" rx={6} />
            <rect x={LEFT_P} y={P_LANE.y} width={TL_W} height={P_LANE.h} fill="url(#gp-lane-dk)" className="opacity-0 dark:opacity-100" rx={6} />
            <rect x={LEFT_P} y={D_LANE.y} width={TL_W} height={D_LANE.h} fill="url(#gd-lane-dk)" className="opacity-0 dark:opacity-100" rx={6} />

            {/* Vertical grid */}
            {Array.from({ length: MC + 1 }).map((_, i) => (
              <line key={`g${i}`} x1={mX(i)} y1={HDR_H - 4} x2={mX(i)} y2={SVG_H - 50} stroke="#e7e5e4" strokeWidth={i === 0 || i === MC ? 1.2 : 0.6} className="dark:stroke-stone-800" />
            ))}

            {/* Month labels */}
            {M_LABELS.map((l, i) => (
              <text key={`m${i}`} x={mX(i) + MW / 2} y={HDR_H - 14} fontSize={11} fontWeight={i === TODAY ? 700 : 500} fill={i === TODAY ? '#9333ea' : '#78716c'} textAnchor="middle" className="dark:fill-stone-400">{l}</text>
            ))}

            {/* Critical events */}
            {CRIT_EVENTS.map(ev => {
              const ex = mX(ev.monthIndex) + MW / 2, EIcon = ev.icon
              return (
                <g key={ev.id}>
                  <line x1={ex} y1={HDR_H - 4} x2={ex} y2={SVG_H - 50} stroke={ev.color} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7} />
                  <circle cx={ex} cy={HDR_H - 14} r={9} fill="#fef3c7" stroke={ev.color} strokeWidth={1.2} className="dark:fill-amber-950" />
                  <g transform={`translate(${ex - 6}, ${HDR_H - 20})`}><EIcon size={12} color={ev.color} /></g>
                  <text x={ex} y={HDR_H + 8} fontSize={9} fontWeight={600} fill={ev.color} textAnchor="middle" className="dark:fill-amber-400">{ev.label}</text>
                </g>
              )
            })}

            {/* Today marker */}
            <line x1={mX(TODAY) + MW / 2} y1={HDR_H - 4} x2={mX(TODAY) + MW / 2} y2={SVG_H - 50} stroke="#9333ea" strokeWidth={1.5} opacity={0.85} />
            <g transform={`translate(${mX(TODAY) + MW / 2 - 28}, ${SVG_H - 44})`}>
              <rect width={56} height={18} rx={9} fill="#9333ea" />
              <text x={28} y={12} fontSize={10} fontWeight={700} fill="#fff" textAnchor="middle" letterSpacing="0.3">СЕГОДНЯ</text>
            </g>

            {/* Lane labels */}
            <rect x={6} y={P_LANE.y + 10} width={LEFT_P - 18} height={P_LANE.h - 20} rx={6} fill="#b91c1c" className="dark:fill-red-900" />
            <text x={LEFT_P / 2 - 4} y={P_LANE.y + P_LANE.h / 2} fontSize={13} fontWeight={800} fill="#fff" textAnchor="middle" transform={`rotate(-90 ${LEFT_P / 2 - 4} ${P_LANE.y + P_LANE.h / 2})`} letterSpacing="1.5">ОБВИНЕНИЕ</text>
            <text x={LEFT_P / 2 - 4} y={P_LANE.y + 16} fontSize={10} fontWeight={600} fill="#fecaca" textAnchor="middle" className="dark:fill-red-200">{P_MOVES.length} ходов</text>
            <rect x={6} y={D_LANE.y + 10} width={LEFT_P - 18} height={D_LANE.h - 20} rx={6} fill="#047857" className="dark:fill-emerald-900" />
            <text x={LEFT_P / 2 - 4} y={D_LANE.y + D_LANE.h / 2} fontSize={13} fontWeight={800} fill="#fff" textAnchor="middle" transform={`rotate(-90 ${LEFT_P / 2 - 4} ${D_LANE.y + D_LANE.h / 2})`} letterSpacing="1.5">ЗАЩИТА</text>
            <text x={LEFT_P / 2 - 4} y={D_LANE.y + 16} fontSize={10} fontWeight={600} fill="#a7f3d0" textAnchor="middle" className="dark:fill-emerald-200">{D_MOVES.length} ходов</text>

            {/* Separator */}
            <line x1={LEFT_P} y1={SEP_Y} x2={SVG_W - RIGHT_P} y2={SEP_Y} stroke="#d6d3d1" strokeDasharray="2 3" className="dark:stroke-stone-700" />

            {/* Bars */}
            {prosecution.map((m, i) => <BattleMoveBar key={m.id} move={m} y={P_BAR_Y + i * (BAR_H + BAR_G)} isHovered={hovId === m.id} onHover={handleHov} onSelect={onSelect} />)}
            {prosecution.length === 0 && <text x={LEFT_P + TL_W / 2} y={P_LANE.y + P_LANE.h / 2} fontSize={12} fill="#a8a29e" textAnchor="middle" className="dark:fill-stone-500">Нет ходов обвинения</text>}
            {defense.map((m, i) => <BattleMoveBar key={m.id} move={m} y={D_BAR_Y + i * (BAR_H + BAR_G)} isHovered={hovId === m.id} onHover={handleHov} onSelect={onSelect} />)}
            {defense.length === 0 && <text x={LEFT_P + TL_W / 2} y={D_LANE.y + D_LANE.h / 2} fontSize={12} fill="#a8a29e" textAnchor="middle" className="dark:fill-stone-500">Нет ходов защиты</text>}

            {hovMove && <HoverTooltip move={hovMove} />}

            <text x={LEFT_P + TL_W / 2} y={SVG_H - 18} fontSize={10} fontWeight={600} fill="#78716c" textAnchor="middle" className="dark:fill-stone-400">
              Хронология дела — 13 месяцев (Март 2023 — Март 2024)
            </text>
          </svg>
        </div></div>

        {/* HTML hover hint */}
        {hovMove && (
          <div className="mt-3 p-3 rounded-lg border bg-gradient-to-br from-card to-muted/30 text-xs animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${hovMove.side === 'prosecution' ? 'bg-red-700' : 'bg-emerald-700'}`} />
              <span className="font-semibold text-sm">{hovMove.title}</span>
              <Badge className={STATUS_CFG[hovMove.status].badge + ' text-[10px] gap-1'}>
                <CircleDot className="w-3 h-3" />{STATUS_CFG[hovMove.status].label}
              </Badge>
              <Badge variant="outline" className="text-[10px] tabular-nums">{fmtRange(hovMove.startMonth, hovMove.durationMonths)}</Badge>
              <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" />Нажмите для деталей</span>
            </div>
            <p className="text-muted-foreground leading-relaxed line-clamp-2">{hovMove.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── MoveDetailSheet ───

function MoveDetailSheet({ move, open, onOpenChange }: { move: BattleMove|null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!move) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full sm:max-w-lg" /></Sheet>
  const gid = gradId(move.side), sCfg = STATUS_CFG[move.status], SIcon = sCfg.icon
  const SideIcon = move.side === 'prosecution' ? Swords : Shield
  const sideLbl = move.side === 'prosecution' ? 'Ход обвинения' : 'Ход защиты'
  const sideBg = move.side === 'prosecution' ? 'from-red-900/30 via-card to-card border-l-red-700' : 'from-emerald-900/30 via-card to-card border-l-emerald-700'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className={`bg-gradient-to-r ${sideBg} border-l-4 rounded-r-lg`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><SideIcon className="w-4 h-4" style={{ color: move.side === 'prosecution' ? '#b91c1c' : '#047857' }} /><span>{sideLbl}</span></div>
          <SheetTitle className="text-base leading-tight">{move.title}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={`${sCfg.badge} gap-1`}><SIcon className="w-3 h-3" />{sCfg.label}</Badge>
            <Badge variant="outline" className="tabular-nums gap-1"><Calendar className="w-3 h-3" />{fmtRange(move.startMonth, move.durationMonths)}</Badge>
            <Badge variant="outline" className="tabular-nums">Длительность: {move.durationMonths} мес.</Badge>
          </div>
        </SheetHeader>
        <div className="px-4 pb-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />Описание</p>
            <p className="text-sm leading-relaxed">{move.description}</p>
          </div>
          <Separator />
          {move.relatedDocs?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><ClipboardList className="w-3 h-3" />Документы ({move.relatedDocs.length})</p>
              <ul className="space-y-1.5">{move.relatedDocs.map((d, i) => (
                <li key={i} className="text-xs flex items-start gap-2 p-2 rounded-md bg-muted/40 border border-border/50"><FileText className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" /><span>{d}</span></li>
              ))}</ul>
            </div>
          )}
          {move.outcome && (<><Separator /><div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Результат</p>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40"><p className="text-xs text-emerald-900 dark:text-emerald-100">{move.outcome}</p></div>
          </div></>)}
          {move.nextSteps && (<><Separator /><div className="space-y-2">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1"><ArrowRight className="w-3 h-3" />Следующие шаги</p>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40"><p className="text-xs text-amber-900 dark:text-amber-100">{move.nextSteps}</p></div>
          </div></>)}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" />Временная шкала</p>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div className={`absolute top-0 h-full rounded-full ${move.side === 'prosecution' ? 'bg-red-700' : 'bg-emerald-700'}`} style={{ left: `${(move.startMonth / MC) * 100}%`, width: `${(move.durationMonths / MC) * 100}%` }} />
              <div className="absolute top-0 h-full w-0.5 bg-purple-700" style={{ left: `${(TODAY / MC) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{M_LABELS[0]}</span><span className="text-purple-700 dark:text-purple-400 font-semibold">Сегодня · {M_LABELS[TODAY]}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── StrategicInsightCard ───

function StrategicInsightCard({ insight }: { insight: StrategicInsight }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = INS_CFG[insight.color], Icon = insight.icon, n = insight.details.length
  return (
    <Card className={`rounded-xl shadow-sm border-l-4 ${cfg.border} bg-gradient-to-br ${cfg.grad}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${cfg.badge.replace('text-white','/15')} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-tight">{insight.title}</CardTitle>
            <Badge variant="outline" className={`text-[10px] mt-1 ${cfg.text}`}>{n} {n === 1 ? 'пункт' : n < 5 ? 'пункта' : 'пунктов'}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">{insight.body}</p>
        {expanded && (
          <div className={`space-y-1.5 p-3 rounded-lg border ${cfg.bg}`}>
            <p className={`text-[11px] font-semibold ${cfg.text} mb-2 flex items-center gap-1`}><ClipboardList className="w-3 h-3" />Детальный перечень:</p>
            <ul className="space-y-1.5">{insight.details.map((d, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.text.replace('text-','bg-')} mt-1.5 shrink-0`} />
                <span className="leading-relaxed text-stone-700 dark:text-stone-200">{d}</span>
              </li>
            ))}</ul>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)} className={`w-full justify-between text-xs h-8 ${cfg.text} hover:bg-transparent`}>
          <span>{expanded ? 'Свернуть' : 'Узнать больше'}</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── ActionPlanTable ───

function ActionPlanTable() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />План действий на 30 дней</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-700 text-white gap-1"><Calendar className="w-3 h-3" />{ACT_PLAN.length} задач</Badge>
            <Badge variant="outline" className="gap-1 text-red-700 dark:text-red-400 border-current/30"><AlertTriangle className="w-3 h-3" />2 критические</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[80px] text-xs font-semibold">Дата</TableHead>
              <TableHead className="text-xs font-semibold min-w-[260px]">Ход</TableHead>
              <TableHead className="text-xs font-semibold min-w-[140px]">Ответственный</TableHead>
              <TableHead className="text-xs font-semibold w-[110px]">Приоритет</TableHead>
              <TableHead className="text-xs font-semibold w-[130px]">Статус</TableHead>
            </TableRow></TableHeader>
            <TableBody>{ACT_PLAN.map(it => {
              const pc = PRI_CFG[it.priority], sc = ACT_CFG[it.status]
              return (
                <TableRow key={it.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <TableCell className="font-semibold text-xs tabular-nums"><Calendar className="w-3 h-3 text-muted-foreground shrink-0 mr-1.5 inline" />{it.date}</TableCell>
                  <TableCell className="text-xs">{it.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{it.responsible}</TableCell>
                  <TableCell><Badge className={`${pc.badge} gap-1 text-[10px]`}><span className="w-1.5 h-1.5 rounded-full bg-white" />{pc.label}</Badge></TableCell>
                  <TableCell><Badge className={`${sc.badge} text-[10px] gap-1`}>{it.status === 'in-progress' ? <Activity className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{sc.label}</Badge></TableCell>
                </TableRow>
              )
            })}</TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-t bg-muted/20 text-[10px] text-muted-foreground">
          <span className="font-semibold">Приоритеты:</span>
          {(['critical','high','medium'] as const).map(p => <span key={p} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${PRI_CFG[p].badge.split(' ')[0]}`} />{PRI_CFG[p].label}</span>)}
          <Separator orientation="vertical" className="h-3 mx-1" />
          <span className="font-semibold">Статусы:</span>
          {(['in-progress','planned'] as const).map(s => <span key={s} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${s === 'in-progress' ? 'bg-amber-600' : 'bg-stone-600'}`} />{ACT_CFG[s].label}</span>)}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main: CaseBattlePlan ───

export function CaseBattlePlan() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selMove, setSelMove] = useState<BattleMove | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const handleSelect = useCallback((m: BattleMove) => { setSelMove(m); setSheetOpen(true) }, [])
  const dCount = D_MOVES.length, pCount = P_MOVES.length, balance = dCount - pCount

  return (
    <div className="space-y-6 pb-8">
      {/* Banner */}
      <Card className="rounded-xl shadow-sm overflow-hidden border-l-4 border-l-red-700 bg-gradient-to-r from-red-900/30 via-purple-900/30 to-stone-900/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-red-700/20 flex items-center justify-center shrink-0 ring-1 ring-red-700/30"><Swords className="w-7 h-7 text-red-700 dark:text-red-400" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Боевой план защиты</h2>
                  <Badge className="bg-purple-700 text-white gap-1"><Sparkles className="w-3 h-3" />Стратегия</Badge>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl">Хронология стратегических ходов обвинения и защиты по делу № 2024-00145</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Swords className="w-3 h-3 text-red-700" />ст. 159 ч.3 · ст. 160 ч.2</span>
                  <span className="text-stone-400">•</span>
                  <span className="flex items-center gap-1"><Scale className="w-3 h-3 text-purple-700" />Колесниченко Д.А.</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
              {[
                { bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40', icon: Shield, lbl: 'Ходов защиты', val: dCount, c: 'text-emerald-700 dark:text-emerald-400' },
                { bg: 'bg-red-50 dark:bg-red-950/30 border-red-200/60 dark:border-red-900/40', icon: Swords, lbl: 'Ходов обвинения', val: pCount, c: 'text-red-700 dark:text-red-400' },
                { bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200/60 dark:border-purple-900/40', icon: TrendingUp, lbl: 'Баланс сил', val: `${balance > 0 ? '+' : ''}${balance}`, c: 'text-purple-700 dark:text-purple-400', sub: 'защита' },
              ].map((it, i) => (
                <div key={i} className={`flex flex-col p-3 rounded-lg border ${it.bg} min-w-[100px]`}>
                  <div className={`flex items-center gap-1.5 ${it.c} text-[10px] font-semibold uppercase`}><it.icon className="w-3 h-3" />{it.lbl}</div>
                  <span className={`text-2xl font-bold ${it.c} tabular-nums mt-0.5`}>{it.val}</span>
                  {it.sub && <span className={`text-[10px] ${it.c} opacity-80 -mt-1`}>{it.sub}</span>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ForceBalanceBar />

      {/* Filters + Gantt */}
      <div className="space-y-3">
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1"><Filter className="w-3.5 h-3.5" />Фильтр:</span>
            {FILTER_OPTS.map(opt => {
              const active = filter === opt.key, Icon = opt.icon
              return <button key={opt.key} onClick={() => setFilter(opt.key)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${active ? 'bg-purple-700 text-white shadow-sm' : 'bg-muted/60 text-stone-700 dark:text-stone-300 hover:bg-muted'}`}><Icon className="w-3 h-3" />{opt.label}</button>
            })}
            <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" />Клик — детали в панели</span>
          </div>
        </CardContent></Card>

        <GanttChart filter={filter} onSelect={handleSelect} />

        {/* Legend */}
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1"><Activity className="w-3.5 h-3.5" />Легенда:</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-3 rounded-sm bg-gradient-to-b from-red-500 to-red-800" />Обвинение</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-3 rounded-sm bg-gradient-to-b from-emerald-500 to-emerald-800" />Защита</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-purple-700" />Сегодня</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-amber-700" />Критическое событие</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-700" />Завершён</span>
            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-amber-600" />В работе</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-stone-600" />Запланирован</span>
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="inline-block w-3 h-3 rounded-sm bg-stone-400 opacity-70" />Будущие ходы</span>
          </div>
        </CardContent></Card>
      </div>

      {/* Strategic insights */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-purple-700 dark:text-purple-400" />Стратегические инсайты</h3>
          <p className="text-[11px] text-muted-foreground">ИИ-анализ слабых мест, аргументов и рисков</p>
        </div>
        <div className={GRID3}>{INSIGHTS.map(ins => <StrategicInsightCard key={ins.id} insight={ins} />)}</div>
      </div>

      <ActionPlanTable />

      {/* Forecast */}
      <Card className="rounded-xl shadow-sm border-l-4 border-l-purple-700 bg-gradient-to-r from-purple-900/20 via-card to-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-700/15 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5 text-purple-700 dark:text-purple-400" /></div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold">Итоговый прогноз по делу</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  На основе анализа 14 ходов защита имеет преимущество в +{balance} хода. Рекомендуется сосредоточиться на исключении недопустимых доказательств и подтверждении алиби на заседании 15.04.2024.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase text-muted-foreground">Вероятность успеха</span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">55%</span>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="border-purple-700 text-purple-700 hover:bg-purple-700 hover:text-white dark:text-purple-400 dark:border-purple-700">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />Обновить прогноз
                </Button>
              </TooltipTrigger><TooltipContent side="left"><p className="text-xs">ИИ переанализирует все ходы и обновит прогноз</p></TooltipContent></Tooltip></TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      <MoveDetailSheet move={selMove} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
