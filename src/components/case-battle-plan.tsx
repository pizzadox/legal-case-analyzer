'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Swords,
  Shield,
  Target,
  AlertTriangle,
  Lock,
  Gavel,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  Activity,
  Zap,
  FileText,
  Filter,
  ArrowRight,
  Eye,
  X,
  Sparkles,
  Scale,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// Типы данных
// ============================================================================

type MoveSide = 'prosecution' | 'defense'
type MoveStatus = 'completed' | 'active' | 'planned'
type FilterKey = 'all' | 'prosecution' | 'defense' | 'completed' | 'planned'

interface BattleMove {
  id: string
  side: MoveSide
  title: string
  startMonth: number // 0 = Мар 23, 12 = Мар 24
  durationMonths: number
  status: MoveStatus
  description: string
  relatedDocs?: string[]
  outcome?: string
  nextSteps?: string
}

interface StrategicInsight {
  id: string
  title: string
  body: string
  details: string[]
  color: 'red' | 'emerald' | 'amber'
  icon: LucideIcon
}

interface ActionItem {
  id: string
  date: string
  action: string
  responsible: string
  priority: 'critical' | 'high' | 'medium'
  status: 'in-progress' | 'planned'
}

// ============================================================================
// Константы SVG-разметки и сетки месяцев
// ============================================================================

const MONTH_LABELS: string[] = [
  'Мар 23',
  'Апр 23',
  'Май 23',
  'Июн 23',
  'Июл 23',
  'Авг 23',
  'Сен 23',
  'Окт 23',
  'Ноя 23',
  'Дек 23',
  'Янв 24',
  'Фев 24',
  'Мар 24',
]

const SVG_WIDTH = 1400
const SVG_HEIGHT = 640
const LEFT_PADDING = 130 // ширина области с подписями дорожек
const RIGHT_PADDING = 20
const TIMELINE_WIDTH = SVG_WIDTH - LEFT_PADDING - RIGHT_PADDING // 1250
const MONTH_COUNT = 13
const MONTH_WIDTH = TIMELINE_WIDTH / MONTH_COUNT // ~96.15

const HEADER_HEIGHT = 70
const PROSECUTION_LANE = { y: 80, height: 200 }
const DEFENSE_LANE = { y: 320, height: 200 }
const SEPARATOR_Y = 300

const BAR_HEIGHT = 22
const BAR_GAP = 2
const PROSECUTION_BAR_START_Y = PROSECUTION_LANE.y + (PROSECUTION_LANE.height - (6 * BAR_HEIGHT + 5 * BAR_GAP)) / 2
const DEFENSE_BAR_START_Y = DEFENSE_LANE.y + (DEFENSE_LANE.height - (8 * BAR_HEIGHT + 7 * BAR_GAP)) / 2

const TODAY_MONTH_INDEX = 12 // Мар 24 — текущий месяц

// ============================================================================
// Конфигурация цветов и статусов
// ============================================================================

const FILTER_OPTIONS: { key: FilterKey; label: string; icon: LucideIcon }[] = [
  { key: 'all', label: 'Все ходы', icon: Filter },
  { key: 'prosecution', label: 'Только обвинение', icon: Swords },
  { key: 'defense', label: 'Только защита', icon: Shield },
  { key: 'completed', label: 'Завершённые', icon: CheckCircle2 },
  { key: 'planned', label: 'Запланированные', icon: Clock },
]

const STATUS_CONFIG: Record<
  MoveStatus,
  { label: string; icon: LucideIcon; badgeClass: string; dotClass: string }
> = {
  completed: {
    label: 'Завершён',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-700 text-white',
    dotClass: 'bg-emerald-700',
  },
  active: {
    label: 'В работе',
    icon: Activity,
    badgeClass: 'bg-amber-600 text-white',
    dotClass: 'bg-amber-600',
  },
  planned: {
    label: 'Запланирован',
    icon: Clock,
    badgeClass: 'bg-stone-600 text-white',
    dotClass: 'bg-stone-600',
  },
}

const PRIORITY_CONFIG: Record<
  ActionItem['priority'],
  { label: string; badgeClass: string; dotClass: string }
> = {
  critical: {
    label: 'Критическая',
    badgeClass: 'bg-red-700 text-white',
    dotClass: 'bg-red-700',
  },
  high: {
    label: 'Высокая',
    badgeClass: 'bg-amber-600 text-white',
    dotClass: 'bg-amber-600',
  },
  medium: {
    label: 'Средняя',
    badgeClass: 'bg-stone-600 text-white',
    dotClass: 'bg-stone-600',
  },
}

const ACTION_STATUS_CONFIG: Record<
  ActionItem['status'],
  { label: string; badgeClass: string }
> = {
  'in-progress': { label: 'В работе', badgeClass: 'bg-amber-600 text-white' },
  planned: { label: 'Запланировано', badgeClass: 'bg-stone-600 text-white' },
}

// ============================================================================
// Mock-данные: ходы обвинения (6) и защиты (8)
// ============================================================================

const PROSECUTION_MOVES: BattleMove[] = [
  {
    id: 'pm-1',
    side: 'prosecution',
    title: 'Возбуждение дела',
    startMonth: 0,
    durationMonths: 1,
    status: 'completed',
    description:
      'Следственный отдел СУ СК России по г. Москве возбудил уголовное дело в отношении Колесниченко Д.А. по признакам состава преступления, предусмотренного ч. 3 ст. 159 УК РФ. Поступило заявление от ООО «ТехноПром» о хищении денежных средств путём обмана.',
    relatedDocs: ['Постановление о возбуждении УД от 15.03.2023', 'Заявление ООО «ТехноПром»'],
    outcome:
      'Уголовное дело зарегистрировано в КУСП, следователю назначено проведение предварительной проверки.',
  },
  {
    id: 'pm-2',
    side: 'prosecution',
    title: 'Допрос свидетелей обвинения',
    startMonth: 1,
    durationMonths: 2,
    status: 'completed',
    description:
      'Проведены допросы ключевых свидетелей обвинения: Петрова И.В., Ивановой А.С., сотрудников ООО «ТехноПром». Получены показания, подтверждающие схему хищения и роль Колесниченко Д.А. в организации фиктивных сделок.',
    relatedDocs: ['Протоколы допросов (тома 3–5)', 'Объяснения свидетелей'],
    outcome:
      'Получены 7 протоколов допросов свидетелей, согласующихся с версией обвинения. Часть показаний содержит противоречия.',
  },
  {
    id: 'pm-3',
    side: 'prosecution',
    title: 'Обыск офиса',
    startMonth: 2,
    durationMonths: 1,
    status: 'completed',
    description:
      'Проведён обыск в служебном помещении ООО «ТехноПром» и по месту жительства Колесниченко Д.А. Изъяты 45 листов финансовых документов, ноутбук и три флеш-накопителя. Обыск проведён с участием понятых.',
    relatedDocs: ['Протокол обыска № 14/2023 от 18.05.2023', 'Опись изъятых предметов'],
    outcome:
      'Изъятые документы приобщены к материалам дела, назначены компьютерно-техническая и финансово-экономическая экспертизы.',
  },
  {
    id: 'pm-4',
    side: 'prosecution',
    title: 'Предъявление обвинения ст. 159',
    startMonth: 3,
    durationMonths: 1,
    status: 'completed',
    description:
      'Колесниченко Д.А. предъявлено обвинение в совершении преступления, предусмотренного ч. 3 ст. 159 УК РФ — мошенничество с использованием служебного положения, в крупном размере. Обвиняемый вину не признал.',
    relatedDocs: ['Постановление о привлечении в качестве обвиняемого', 'Протокол допроса обвиняемого'],
    outcome:
      'Обвинение сформулировано и предъявлено, материалы переданы для назначения экспертиз.',
  },
  {
    id: 'pm-5',
    side: 'prosecution',
    title: 'Финансовая экспертиза',
    startMonth: 4,
    durationMonths: 3,
    status: 'completed',
    description:
      'Назначена и проведена комплексная финансово-экономическая экспертиза. Эксперт Кузнецова Е.В. установила хищение 4,7 млн руб. путём заключения фиктивных договоров с подставными контрагентами. Подтверждена финансовая цепочка от ООО «ТехноПром» в пользу аффилированных структур.',
    relatedDocs: ['Заключение эксперта № 128-Э от 15.09.2023', 'Материалы экспертизы (тома 18–22)'],
    outcome:
      'Заключение эксперта приобщено к делу, обвинение получило доказательную базу для квалификации ущерба как крупного.',
  },
  {
    id: 'pm-6',
    side: 'prosecution',
    title: 'Дополнительные эпизоды ст. 160',
    startMonth: 9,
    durationMonths: 1,
    status: 'completed',
    description:
      'В результате дополнительных следственных действий выявлены эпизоды присвоения и растраты имущества ООО «ТехноПром» в период 2022–2023 гг. Обвинение дополнено квалификацией по ч. 2 ст. 160 УК РФ. Общий ущерб увеличен до 5,8 млн руб.',
    relatedDocs: ['Дополнительное постановление о привлечении', 'Дополнения к обвинению (том 38)'],
    outcome:
      'Квалификация дела расширена, Колесниченко Д.А. предъявлено объединённое обвинение по двум статьям.',
  },
]

const DEFENSE_MOVES: BattleMove[] = [
  {
    id: 'dm-1',
    side: 'defense',
    title: 'Подача ходатайства об ознакомлении',
    startMonth: 1,
    durationMonths: 1,
    status: 'completed',
    description:
      'Адвокат Петрова Е.С. подала ходатайство об ознакомлении с материалами уголовного дела в порядке ст. 216 УПК РФ. Ходатайство удовлетворено, защитник получил доступ к томам 1–12 для изучения доказательственной базы обвинения.',
    relatedDocs: ['Ходатайство от 10.04.2023', 'Постановление об удовлетворении ходатайства'],
    outcome:
      'Защита получила полный доступ к материалам дела, выявлены первые процессуальные нарушения.',
  },
  {
    id: 'dm-2',
    side: 'defense',
    title: 'Заявление об алиби',
    startMonth: 2,
    durationMonths: 1,
    status: 'completed',
    description:
      'Защита заявила об алиби Колесниченко Д.А. на период ключевого эпизода хищения. Представлены билеты на поезд Москва — Казань, показания соседа Козлова В.Н. и видеозапись с камер наблюдения ТЦ «Город», подтверждающие нахождение обвиняемого вне места совершения преступления.',
    relatedDocs: ['Заявление об алиби от 22.05.2023', 'Билеты РЖД', 'DVD с видеозаписью'],
    outcome:
      'Заявление приобщено к делу, следствие вынуждено проводить проверку алиби, что ослабило позицию обвинения.',
  },
  {
    id: 'dm-3',
    side: 'defense',
    title: 'Ходатайство об исключении доказательств',
    startMonth: 4,
    durationMonths: 1,
    status: 'completed',
    description:
      'Защита подала ходатайство об исключении из числа доказательств протокола обыска от 18.05.2023 в связи с процессуальными нарушениями: отсутствие адвоката при проведении обыска, отсутствие видеофиксации, задержка в передаче изъятых предметов на экспертизу.',
    relatedDocs: ['Ходатайство от 05.07.2023', 'Возражения на протокол обыска'],
    outcome:
      'Ходатайство частично удовлетворено: часть изъятых документов исключена из доказательственной базы. Сила обвинения снижена.',
  },
  {
    id: 'dm-4',
    side: 'defense',
    title: 'Независимая финансовая экспертиза',
    startMonth: 5,
    durationMonths: 3,
    status: 'completed',
    description:
      'По инициативе защиты проведена независимая финансово-экономическая экспертиза. Эксперт Морозов А.П. установил, что выводы государственного эксперта основаны на копиях документов, а не на оригиналах, методика не учитывала оборотную сторону договоров, расчёт ущерба содержит арифметические ошибки.',
    relatedDocs: ['Заключение эксперта Морозова А.П. от 25.10.2023', 'Сравнительный анализ экспертиз'],
    outcome:
      'Заключение защиты поставило под сомнение достоверность выводов государственного эксперта, что усилило позицию защиты.',
  },
  {
    id: 'dm-5',
    side: 'defense',
    title: 'Опрос свидетелей защиты',
    startMonth: 6,
    durationMonths: 3,
    status: 'completed',
    description:
      'Защитником проведён опрос свидетелей защиты: Козлова В.Н. (алиби), Сидоровой М.Н. (характеристика личности), Васильева А.А. (независимый бухгалтер). Получены показания, опровергающие ключевые элементы обвинения и подтверждающие алиби обвиняемого.',
    relatedDocs: ['Протоколы опроса (том 41)', 'Показания Козлова В.Н.', 'Показания Васильева А.А.'],
    outcome:
      'Свидетели защиты допрошены следователем, их показания приобщены к материалам дела.',
  },
  {
    id: 'dm-6',
    side: 'defense',
    title: 'Ходатайство о переквалификации',
    startMonth: 9,
    durationMonths: 1,
    status: 'completed',
    description:
      'Защита подала ходатайство о переквалификации деяния с ч. 3 ст. 159 УК РФ на ч. 1 ст. 159 УК РФ в связи с тем, что размер ущерба, доказанный обвинением, не является крупным. Также заявлено об исключении эпизодов ст. 160 как недоказанных.',
    relatedDocs: ['Ходатайство от 12.12.2023', 'Расчёт размера ущерба по версии защиты'],
    outcome:
      'Ходатайство отклонено следствием, но материалы переданы для рассмотрения в судебном заседании.',
  },
  {
    id: 'dm-7',
    side: 'defense',
    title: 'Замечания на обвинительное заключение',
    startMonth: 10,
    durationMonths: 2,
    status: 'active',
    description:
      'Защита в порядке ст. 217 УПК РФ знакомится с материалами уголовного дела в полном объёме (45 томов) и готовит письменные замечания на обвинительное заключение. Выявлены процессуальные нарушения, противоречия в показаниях, недостоверные выводы экспертиз.',
    relatedDocs: ['Замечания на обвинительное заключение (проект)', 'Опись выявленных нарушений'],
    nextSteps:
      'Подать замечания в срок до 02.04.2024, ходатайствовать об исключении недопустимых доказательств в судебном заседании.',
  },
  {
    id: 'dm-8',
    side: 'defense',
    title: 'Подготовка к судебному разбирательству',
    startMonth: 11,
    durationMonths: 2,
    status: 'planned',
    description:
      'Защита готовится к судебному разбирательству: формируется позиция по каждому эпизоду, готовятся ходатайства об исключении доказательств, формируется список свидетелей защиты, согласуется тактика допроса свидетелей обвинения.',
    relatedDocs: ['План судебного разбирательства', 'Проекты ходатайств', 'Список свидетелей защиты'],
    nextSteps:
      'Предварительное судебное заседание 15.04.2024, основное слушание назначено на 06.05.2024.',
  },
]

// Критические события (вертикальные маркеры)
interface CriticalEvent {
  id: string
  label: string
  monthIndex: number
  icon: LucideIcon
  color: string // hex
}

const CRITICAL_EVENTS: CriticalEvent[] = [
  { id: 'ce-1', label: 'Арест', monthIndex: 0, icon: Lock, color: '#b45309' },
  { id: 'ce-2', label: 'Суд 1 инст.', monthIndex: 12, icon: Gavel, color: '#7c2d12' },
]

// Стратегические инсайты
const STRATEGIC_INSIGHTS: StrategicInsight[] = [
  {
    id: 'si-1',
    title: 'Слабые места обвинения',
    body:
      'Обвинение опирается преимущественно на показания свидетеля Петрова И.В., чья надёжность ставится под сомнение из-за противоречий в показаниях. Финансовая экспертиза имеет процессуальные нарушения при изъятии документов. Алгоритмическая связь между деньгами и Колесниченко не доказана.',
    details: [
      'Свидетель Петров И.В. изменял показания между допросами (15.04.2023 и 20.06.2023)',
      'Государственная экспертиза проводилась по копиям, а не оригиналам документов',
      'Не исследована оборотная сторона 3 ключевых договоров',
      'Эксперт Кузнецова Е.В. не давала показаний в судебном заседании',
      'Часть изъятых при обыске предметов не опечатана надлежащим образом',
    ],
    color: 'red',
    icon: Target,
  },
  {
    id: 'si-2',
    title: 'Сильные аргументы защиты',
    body:
      'Алиби на период эпизода 1 подтверждается билетами на поезд и показаниями соседа. Процессуальные нарушения при обыске (отсутствие понятых) могут привести к исключению доказательств. Смягчающие обстоятельства (сотрудничество, характеристика) снижают риск максимального наказания.',
    details: [
      'Алиби подтверждено билетами РЖД, видеозаписью ТЦ «Город» и показаниями Козлова В.Н.',
      'Независимая экспертиза Морозова А.П. опровергает выводы государственного эксперта',
      'Процессуальные нарушения при обыске — основание для исключения доказательств',
      'Положительная производственная характеристика и отсутствие судимости',
      'Готовность к сотрудничеству со следствием и возмещению ущерба',
    ],
    color: 'emerald',
    icon: Shield,
  },
  {
    id: 'si-3',
    title: 'Критические риски',
    body:
      'Доказанный эпизод 1 (мошенничество с инвестициями) имеет сильную доказательную базу. Финансовые документы прямо указывают на причастность Колесниченко. Рецидив риска (бывший соучастник Сидоров готов дать показания).',
    details: [
      'Эпизод 1 подтверждён 12 первичными документами с подписью обвиняемого',
      'Свидетель Иванова А.С. подтвердила подлинность подписей на ключевых документах',
      'Бывший соучастник Сидоров А.К. дал согласие на дачу показаний (досудебное соглашение)',
      'Размер ущерба 5,8 млн руб. квалифицируется как крупный (ст. 158 примечание 4)',
      'Эпизоды ст. 160 могут быть переквалифицированы, но не исключены полностью',
    ],
    color: 'amber',
    icon: AlertTriangle,
  },
]

// План действий на ближайшие 30 дней
const ACTION_PLAN: ActionItem[] = [
  {
    id: 'ap-1',
    date: '25 Мар',
    action: 'Подготовка ходатайства об исключении экспертизы',
    responsible: 'Адвокат Петрова',
    priority: 'high',
    status: 'in-progress',
  },
  {
    id: 'ap-2',
    date: '28 Мар',
    action: 'Допрос свидетеля Козлова В.Н. (алиби)',
    responsible: 'Следователь',
    priority: 'high',
    status: 'planned',
  },
  {
    id: 'ap-3',
    date: '02 Апр',
    action: 'Подача замечаний на обвинительное заключение',
    responsible: 'Адвокат Петрова',
    priority: 'critical',
    status: 'planned',
  },
  {
    id: 'ap-4',
    date: '05 Апр',
    action: 'Встреча с Колесниченко для подготовки к суду',
    responsible: 'Адвокат Петрова',
    priority: 'high',
    status: 'planned',
  },
  {
    id: 'ap-5',
    date: '10 Апр',
    action: 'Запрос дополнительных документов из ООО «ТехноПром»',
    responsible: 'Адвокат Петрова',
    priority: 'medium',
    status: 'planned',
  },
  {
    id: 'ap-6',
    date: '15 Апр',
    action: 'Предварительное судебное заседание',
    responsible: 'Суд',
    priority: 'critical',
    status: 'planned',
  },
]

// ============================================================================
// Вспомогательные функции
// ============================================================================

function monthToX(month: number): number {
  return LEFT_PADDING + month * MONTH_WIDTH
}

function formatMonthRange(start: number, duration: number): string {
  const end = start + duration - 1
  if (duration === 1) {
    return MONTH_LABELS[start]
  }
  return `${MONTH_LABELS[start]} — ${MONTH_LABELS[end]}`
}

function getMoveGradient(side: MoveSide): { id: string; from: string; to: string; stroke: string } {
  if (side === 'prosecution') {
    return { id: 'grad-prosecution', from: '#b91c1c', to: '#991b1b', stroke: '#7f1d1d' }
  }
  return { id: 'grad-defense', from: '#047857', to: '#065f46', stroke: '#064e3b' }
}

function isFutureMove(move: BattleMove): boolean {
  return move.startMonth >= TODAY_MONTH_INDEX
}

function visibleMoves(filter: FilterKey): { prosecution: BattleMove[]; defense: BattleMove[] } {
  const all = [...PROSECUTION_MOVES, ...DEFENSE_MOVES]
  const matches = (m: BattleMove) => {
    switch (filter) {
      case 'all':
        return true
      case 'prosecution':
        return m.side === 'prosecution'
      case 'defense':
        return m.side === 'defense'
      case 'completed':
        return m.status === 'completed'
      case 'planned':
        return m.status === 'planned' || m.status === 'active'
    }
  }
  const filtered = all.filter(matches)
  return {
    prosecution: filtered.filter((m) => m.side === 'prosecution'),
    defense: filtered.filter((m) => m.side === 'defense'),
  }
}

// ============================================================================
// Подкомпонент: баланс сил (полоса)
// ============================================================================

function ForceBalanceBar() {
  const prosecutionPct = 45
  const defensePct = 55

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-700 dark:text-purple-400" />
            Баланс сил сторон
          </CardTitle>
          <Badge className="bg-purple-700 text-white gap-1">
            <Sparkles className="w-3 h-3" />
            ИИ-прогноз
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Полоса баланса */}
        <div className="relative h-12 w-full rounded-lg overflow-hidden flex shadow-inner bg-stone-100 dark:bg-stone-900">
          <div
            className="h-full bg-gradient-to-r from-red-800 to-red-700 flex items-center justify-start pl-3 transition-all duration-700 ease-out"
            style={{ width: `${prosecutionPct}%` }}
          >
            <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm">
              ОБВИНЕНИЕ {prosecutionPct}%
            </span>
          </div>
          <div
            className="h-full bg-gradient-to-r from-emerald-700 to-emerald-800 flex items-center justify-end pr-3 transition-all duration-700 ease-out"
            style={{ width: `${defensePct}%` }}
          >
            <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm">
              {defensePct}% ЗАЩИТА
            </span>
          </div>
          {/* VS badge в центре */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-9 h-9 rounded-full bg-purple-700 text-white flex items-center justify-center shadow-lg ring-4 ring-card text-[11px] font-black tracking-wider">
              VS
            </div>
          </div>
        </div>

        {/* Легенда в 3 колонки */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
            <span className="w-2.5 h-2.5 rounded-full bg-red-700 mt-1 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                Сила доказательств обвинения
              </p>
              <p className="text-lg font-bold text-red-700 dark:text-red-400 tabular-nums">
                {prosecutionPct}%
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 mt-1 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                Сила аргументов защиты
              </p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {defensePct}%
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-700 mt-1 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Прогноз</p>
              <p className="text-sm font-bold text-purple-700 dark:text-purple-400 leading-snug">
                Защита имеет преимущество
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Подкомпонент: полоса хода (Gantt bar) — внутри SVG
// ============================================================================

interface BattleMoveBarProps {
  move: BattleMove
  y: number
  index: number
  isHovered: boolean
  onHover: (id: string | null) => void
  onSelect: (move: BattleMove) => void
}

function BattleMoveBar({ move, y, isHovered, onHover, onSelect }: BattleMoveBarProps) {
  const x = monthToX(move.startMonth)
  const width = move.durationMonths * MONTH_WIDTH - 2
  const grad = getMoveGradient(move.side)
  const future = isFutureMove(move)
  const baseOpacity = future ? 0.7 : 1
  const opacity = isHovered ? 1 : baseOpacity
  const statusCfg = STATUS_CONFIG[move.status]
  const StatusIcon = statusCfg.icon

  // Текст внутри бара — обрезаем, если не помещается
  const maxChars = Math.floor(width / 6.5)
  const displayTitle =
    move.title.length > maxChars ? move.title.slice(0, Math.max(3, maxChars - 1)) + '…' : move.title
  const showText = width > 50

  return (
    <g
      onMouseEnter={() => onHover(move.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(move)}
      className="cursor-pointer"
      style={{ transition: 'opacity 200ms ease' }}
      opacity={opacity}
    >
      {/* Невидимая широкая дорожка для наведения */}
      <rect x={x - 2} y={y - 2} width={width + 4} height={BAR_HEIGHT + 4} fill="transparent" />
      {/* Тень-подложка */}
      <rect
        x={x}
        y={y + 2}
        width={width}
        height={BAR_HEIGHT}
        rx={4}
        ry={4}
        fill="#000000"
        opacity={isHovered ? 0.18 : 0.1}
      />
      {/* Основной бар с градиентом */}
      <rect
        x={x}
        y={y}
        width={width}
        height={BAR_HEIGHT}
        rx={4}
        ry={4}
        fill={`url(#${grad.id})`}
        stroke={grad.stroke}
        strokeWidth={isHovered ? 1.5 : 1}
        style={{ transition: 'stroke-width 150ms ease' }}
      />
      {/* Блик сверху (для глубины) */}
      <rect
        x={x}
        y={y}
        width={width}
        height={BAR_HEIGHT / 2}
        rx={4}
        ry={4}
        fill="#ffffff"
        opacity={0.1}
      />
      {/* Текст внутри бара */}
      {showText && (
        <text
          x={x + 8}
          y={y + BAR_HEIGHT / 2 + 3}
          fontSize={10}
          fontWeight={600}
          fill="#ffffff"
          className="pointer-events-none select-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
        >
          {displayTitle}
        </text>
      )}
      {/* Иконка статуса справа внутри бара */}
      {width > 90 && (
        <g transform={`translate(${x + width - 18}, ${y + BAR_HEIGHT / 2 - 6})`}>
          <StatusIcon className="pointer-events-none" size={12} color="#ffffff" strokeWidth={2.5} />
        </g>
      )}
      {/* Подсветка при наведении — золотистая рамка */}
      {isHovered && (
        <rect
          x={x - 2}
          y={y - 2}
          width={width + 4}
          height={BAR_HEIGHT + 4}
          rx={5}
          ry={5}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={1.5}
          opacity={0.9}
        />
      )}
    </g>
  )
}

// ============================================================================
// Подкомпонент: основная SVG-диаграмма Ганта
// ============================================================================

interface GanttChartProps {
  filter: FilterKey
  onSelect: (move: BattleMove) => void
}

function GanttChart({ filter, onSelect }: GanttChartProps) {
  const [hoveredMoveId, setHoveredMoveId] = useState<string | null>(null)
  const { prosecution, defense } = visibleMoves(filter)
  const hoveredMove = useMemo(
    () => [...prosecution, ...defense].find((m) => m.id === hoveredMoveId) ?? null,
    [hoveredMoveId, prosecution, defense],
  )

  const handleHover = useCallback((id: string | null) => setHoveredMoveId(id), [])

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-700 dark:text-purple-400" />
            Хронология боевых действий
            <Badge variant="outline" className="text-[10px] font-normal">
              {MONTH_LABELS[0]} — {MONTH_LABELS[12]}
            </Badge>
          </CardTitle>
          {/* Подсказка по наведению */}
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Наведите курсор для деталей, нажмите для полного описания
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {/* Контейнер с горизонтальной прокруткой на мобильных */}
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[900px]">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-auto"
              style={{ aspectRatio: `${SVG_WIDTH} / ${SVG_HEIGHT}` }}
            >
              <defs>
                {/* Градиенты баров */}
                <linearGradient id="grad-prosecution" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="50%" stopColor="#b91c1c" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id="grad-defense" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#065f46" />
                </linearGradient>
                {/* Градиенты фона дорожек */}
                <linearGradient id="grad-prosecution-lane" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef2f2" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#fee2e2" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="grad-defense-lane" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="grad-prosecution-lane-dark" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.08" />
                </linearGradient>
                <linearGradient id="grad-defense-lane-dark" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#064e3b" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#064e3b" stopOpacity="0.08" />
                </linearGradient>
                {/* Фильтр тени */}
                <filter id="bar-shadow" x="-10%" y="-10%" width="120%" height="160%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
                  <feOffset dx="0" dy="1" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.35" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Фон дорожек */}
              <rect
                x={LEFT_PADDING}
                y={PROSECUTION_LANE.y}
                width={TIMELINE_WIDTH}
                height={PROSECUTION_LANE.height}
                fill="url(#grad-prosecution-lane)"
                className="dark:opacity-0"
                rx={6}
              />
              <rect
                x={LEFT_PADDING}
                y={DEFENSE_LANE.y}
                width={TIMELINE_WIDTH}
                height={DEFENSE_LANE.height}
                fill="url(#grad-defense-lane)"
                className="dark:opacity-0"
                rx={6}
              />
              {/* Тёмные фоны (видны в тёмной теме) */}
              <rect
                x={LEFT_PADDING}
                y={PROSECUTION_LANE.y}
                width={TIMELINE_WIDTH}
                height={PROSECUTION_LANE.height}
                fill="url(#grad-prosecution-lane-dark)"
                className="opacity-0 dark:opacity-100"
                rx={6}
              />
              <rect
                x={LEFT_PADDING}
                y={DEFENSE_LANE.y}
                width={TIMELINE_WIDTH}
                height={DEFENSE_LANE.height}
                fill="url(#grad-defense-lane-dark)"
                className="opacity-0 dark:opacity-100"
                rx={6}
              />

              {/* Вертикальная сетка месяцев */}
              {Array.from({ length: MONTH_COUNT + 1 }).map((_, i) => {
                const x = monthToX(i)
                return (
                  <line
                    key={`grid-${i}`}
                    x1={x}
                    y1={HEADER_HEIGHT - 4}
                    x2={x}
                    y2={SVG_HEIGHT - 50}
                    stroke="#e7e5e4"
                    strokeWidth={i === 0 || i === MONTH_COUNT ? 1.2 : 0.6}
                    className="dark:stroke-stone-800"
                  />
                )
              })}

              {/* Подписи месяцев сверху */}
              {MONTH_LABELS.map((label, i) => {
                const x = monthToX(i) + MONTH_WIDTH / 2
                const isToday = i === TODAY_MONTH_INDEX
                return (
                  <text
                    key={`month-${i}`}
                    x={x}
                    y={HEADER_HEIGHT - 14}
                    fontSize={11}
                    fontWeight={isToday ? 700 : 500}
                    fill={isToday ? '#7e22ce' : '#78716c'}
                    textAnchor="middle"
                    className="dark:fill-stone-400"
                    style={isToday ? { fill: '#9333ea' } : undefined}
                  >
                    {label}
                  </text>
                )
              })}

              {/* Маркеры критических событий (вертикальные пунктирные линии) */}
              {CRITICAL_EVENTS.map((event) => {
                const x = monthToX(event.monthIndex) + MONTH_WIDTH / 2
                const Icon = event.icon
                return (
                  <g key={event.id}>
                    <line
                      x1={x}
                      y1={HEADER_HEIGHT - 4}
                      x2={x}
                      y2={SVG_HEIGHT - 50}
                      stroke={event.color}
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                      opacity={0.7}
                    />
                    {/* Иконка в верхней части */}
                    <circle cx={x} cy={HEADER_HEIGHT - 14} r={9} fill="#fef3c7" stroke={event.color} strokeWidth={1.2} className="dark:fill-amber-950" />
                    <g transform={`translate(${x - 6}, ${HEADER_HEIGHT - 20})`}>
                      <Icon size={12} color={event.color} />
                    </g>
                    {/* Подпись события */}
                    <text
                      x={x}
                      y={HEADER_HEIGHT + 8}
                      fontSize={9}
                      fontWeight={600}
                      fill={event.color}
                      textAnchor="middle"
                      className="dark:fill-amber-400"
                    >
                      {event.label}
                    </text>
                  </g>
                )
              })}

              {/* Маркер текущей даты (Сегодня) */}
              <g>
                <line
                  x1={monthToX(TODAY_MONTH_INDEX) + MONTH_WIDTH / 2}
                  y1={HEADER_HEIGHT - 4}
                  x2={monthToX(TODAY_MONTH_INDEX) + MONTH_WIDTH / 2}
                  y2={SVG_HEIGHT - 50}
                  stroke="#9333ea"
                  strokeWidth={1.5}
                  opacity={0.85}
                />
                {/* Бейдж "Сегодня" */}
                <g transform={`translate(${monthToX(TODAY_MONTH_INDEX) + MONTH_WIDTH / 2 - 28}, ${SVG_HEIGHT - 44})`}>
                  <rect width={56} height={18} rx={9} fill="#9333ea" />
                  <text
                    x={28}
                    y={12}
                    fontSize={10}
                    fontWeight={700}
                    fill="#ffffff"
                    textAnchor="middle"
                    letterSpacing="0.3"
                  >
                    СЕГОДНЯ
                  </text>
                </g>
              </g>

              {/* Подписи дорожек слева */}
              {/* ОБВИНЕНИЕ (верхняя дорожка) */}
              <g>
                <rect
                  x={6}
                  y={PROSECUTION_LANE.y + 10}
                  width={LEFT_PADDING - 18}
                  height={PROSECUTION_LANE.height - 20}
                  rx={6}
                  fill="#b91c1c"
                  className="dark:fill-red-900"
                />
                <text
                  x={LEFT_PADDING / 2 - 4}
                  y={PROSECUTION_LANE.y + PROSECUTION_LANE.height / 2}
                  fontSize={13}
                  fontWeight={800}
                  fill="#ffffff"
                  textAnchor="middle"
                  transform={`rotate(-90 ${LEFT_PADDING / 2 - 4} ${PROSECUTION_LANE.y + PROSECUTION_LANE.height / 2})`}
                  letterSpacing="1.5"
                >
                  ОБВИНЕНИЕ
                </text>
                <text
                  x={LEFT_PADDING / 2 - 4}
                  y={PROSECUTION_LANE.y + 16}
                  fontSize={10}
                  fontWeight={600}
                  fill="#fecaca"
                  textAnchor="middle"
                  className="dark:fill-red-200"
                >
                  {PROSECUTION_MOVES.length} ходов
                </text>
              </g>

              {/* ЗАЩИТА (нижняя дорожка) */}
              <g>
                <rect
                  x={6}
                  y={DEFENSE_LANE.y + 10}
                  width={LEFT_PADDING - 18}
                  height={DEFENSE_LANE.height - 20}
                  rx={6}
                  fill="#047857"
                  className="dark:fill-emerald-900"
                />
                <text
                  x={LEFT_PADDING / 2 - 4}
                  y={DEFENSE_LANE.y + DEFENSE_LANE.height / 2}
                  fontSize={13}
                  fontWeight={800}
                  fill="#ffffff"
                  textAnchor="middle"
                  transform={`rotate(-90 ${LEFT_PADDING / 2 - 4} ${DEFENSE_LANE.y + DEFENSE_LANE.height / 2})`}
                  letterSpacing="1.5"
                >
                  ЗАЩИТА
                </text>
                <text
                  x={LEFT_PADDING / 2 - 4}
                  y={DEFENSE_LANE.y + 16}
                  fontSize={10}
                  fontWeight={600}
                  fill="#a7f3d0"
                  textAnchor="middle"
                  className="dark:fill-emerald-200"
                >
                  {DEFENSE_MOVES.length} ходов
                </text>
              </g>

              {/* Разделительная линия между дорожками */}
              <line
                x1={LEFT_PADDING}
                y1={SEPARATOR_Y}
                x2={SVG_WIDTH - RIGHT_PADDING}
                y2={SEPARATOR_Y}
                stroke="#d6d3d1"
                strokeWidth={1}
                strokeDasharray="2 3"
                className="dark:stroke-stone-700"
              />

              {/* Бары обвинения */}
              {prosecution.map((move, i) => (
                <BattleMoveBar
                  key={move.id}
                  move={move}
                  y={PROSECUTION_BAR_START_Y + i * (BAR_HEIGHT + BAR_GAP)}
                  index={i}
                  isHovered={hoveredMoveId === move.id}
                  onHover={handleHover}
                  onSelect={onSelect}
                />
              ))}
              {/* Если в фильтре нет ходов обвинения */}
              {prosecution.length === 0 && (
                <text
                  x={LEFT_PADDING + TIMELINE_WIDTH / 2}
                  y={PROSECUTION_LANE.y + PROSECUTION_LANE.height / 2}
                  fontSize={12}
                  fill="#a8a29e"
                  textAnchor="middle"
                  className="dark:fill-stone-500"
                >
                  Нет ходов обвинения для выбранного фильтра
                </text>
              )}

              {/* Бары защиты */}
              {defense.map((move, i) => (
                <BattleMoveBar
                  key={move.id}
                  move={move}
                  y={DEFENSE_BAR_START_Y + i * (BAR_HEIGHT + BAR_GAP)}
                  index={i}
                  isHovered={hoveredMoveId === move.id}
                  onHover={handleHover}
                  onSelect={onSelect}
                />
              ))}
              {/* Если в фильтре нет ходов защиты */}
              {defense.length === 0 && (
                <text
                  x={LEFT_PADDING + TIMELINE_WIDTH / 2}
                  y={DEFENSE_LANE.y + DEFENSE_LANE.height / 2}
                  fontSize={12}
                  fill="#a8a29e"
                  textAnchor="middle"
                  className="dark:fill-stone-500"
                >
                  Нет ходов защиты для выбранного фильтра
                </text>
              )}

              {/* Hovered tooltip внутри SVG */}
              {hoveredMove && (
                <HoverTooltip move={hoveredMove} />
              )}

              {/* Подпись оси времени снизу */}
              <text
                x={LEFT_PADDING + TIMELINE_WIDTH / 2}
                y={SVG_HEIGHT - 18}
                fontSize={10}
                fontWeight={600}
                fill="#78716c"
                textAnchor="middle"
                className="dark:fill-stone-400"
              >
                Хронология дела — 13 месяцев (Март 2023 — Март 2024)
              </text>
            </svg>
          </div>
        </div>

        {/* HTML-подсказка под графиком при наведении */}
        {hoveredMove && (
          <div className="mt-3 p-3 rounded-lg border bg-gradient-to-br from-card to-muted/30 text-xs animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  hoveredMove.side === 'prosecution' ? 'bg-red-700' : 'bg-emerald-700'
                }`}
              />
              <span className="font-semibold text-sm">{hoveredMove.title}</span>
              <Badge className={STATUS_CONFIG[hoveredMove.status].badgeClass + ' text-[10px] gap-1'}>
                <CircleDot className="w-3 h-3" />
                {STATUS_CONFIG[hoveredMove.status].label}
              </Badge>
              <Badge variant="outline" className="text-[10px] tabular-nums">
                {formatMonthRange(hoveredMove.startMonth, hoveredMove.durationMonths)}
              </Badge>
              <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Нажмите для деталей
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed line-clamp-2">
              {hoveredMove.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Подкомпонент: tooltip внутри SVG при наведении на бар
// ============================================================================

function HoverTooltip({ move }: { move: BattleMove }) {
  const x = monthToX(move.startMonth)
  const width = move.durationMonths * MONTH_WIDTH
  const tooltipWidth = Math.min(280, width + 80)
  const tooltipX = Math.min(SVG_WIDTH - tooltipWidth - 6, Math.max(6, x + width / 2 - tooltipWidth / 2))
  const tooltipY = move.side === 'prosecution' ? PROSECUTION_LANE.y + PROSECUTION_LANE.height + 4 : DEFENSE_LANE.y - 56
  const grad = getMoveGradient(move.side)

  return (
    <g pointerEvents="none">
      <rect
        x={tooltipX}
        y={tooltipY}
        width={tooltipWidth}
        height={50}
        rx={6}
        ry={6}
        fill="#1c1917"
        opacity={0.95}
        className="dark:fill-stone-900"
      />
      <rect
        x={tooltipX}
        y={tooltipY}
        width={4}
        height={50}
        rx={2}
        ry={2}
        fill={grad.from}
      />
      <text
        x={tooltipX + 12}
        y={tooltipY + 18}
        fontSize={11}
        fontWeight={700}
        fill="#fafaf9"
        className="dark:fill-stone-50"
      >
        {move.title.length > 38 ? move.title.slice(0, 36) + '…' : move.title}
      </text>
      <text
        x={tooltipX + 12}
        y={tooltipY + 34}
        fontSize={10}
        fill="#d6d3d1"
        className="dark:fill-stone-300"
      >
        {formatMonthRange(move.startMonth, move.durationMonths)} · {STATUS_CONFIG[move.status].label}
      </text>
    </g>
  )
}

// ============================================================================
// Подкомпонент: Sheet с деталями хода
// ============================================================================

interface MoveDetailSheetProps {
  move: BattleMove | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MoveDetailSheet({ move, open, onOpenChange }: MoveDetailSheetProps) {
  if (!move) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg" />
      </Sheet>
    )
  }

  const grad = getMoveGradient(move.side)
  const statusCfg = STATUS_CONFIG[move.status]
  const StatusIcon = statusCfg.icon
  const SideIcon = move.side === 'prosecution' ? Swords : Shield
  const sideLabel = move.side === 'prosecution' ? 'Ход обвинения' : 'Ход защиты'
  const sideBg =
    move.side === 'prosecution'
      ? 'from-red-900/30 via-card to-card border-l-red-700'
      : 'from-emerald-900/30 via-card to-card border-l-emerald-700'
  const dateRange = formatMonthRange(move.startMonth, move.durationMonths)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className={`bg-gradient-to-r ${sideBg} border-l-4 rounded-r-lg`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SideIcon className="w-4 h-4" style={{ color: grad.from }} />
            <span>{sideLabel}</span>
          </div>
          <SheetTitle className="text-base leading-tight">{move.title}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={`${statusCfg.badgeClass} gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </Badge>
            <Badge variant="outline" className="tabular-nums gap-1">
              <Calendar className="w-3 h-3" />
              {dateRange}
            </Badge>
            <Badge variant="outline" className="tabular-nums">
              Длительность: {move.durationMonths} мес.
            </Badge>
          </div>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Описание */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> Описание хода
            </p>
            <p className="text-sm leading-relaxed">{move.description}</p>
          </div>

          <Separator />

          {/* Связанные документы */}
          {move.relatedDocs && move.relatedDocs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Связанные документы ({move.relatedDocs.length})
              </p>
              <ul className="space-y-1.5">
                {move.relatedDocs.map((doc, i) => (
                  <li
                    key={i}
                    className="text-xs flex items-start gap-2 p-2 rounded-md bg-muted/40 border border-border/50"
                  >
                    <FileText className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="leading-relaxed">{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Результат (если завершён) */}
          {move.outcome && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Результат
                </p>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-100">
                    {move.outcome}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Следующие шаги (если запланирован) */}
          {move.nextSteps && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <ArrowRight className="w-3 h-3" /> Следующие шаги
                </p>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-100">
                    {move.nextSteps}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Шкала прогресса по времени */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" /> Положение на временной шкале
            </p>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${
                  move.side === 'prosecution' ? 'bg-red-700' : 'bg-emerald-700'
                }`}
                style={{
                  left: `${(move.startMonth / MONTH_COUNT) * 100}%`,
                  width: `${(move.durationMonths / MONTH_COUNT) * 100}%`,
                }}
              />
              {/* Маркер "сегодня" */}
              <div
                className="absolute top-0 h-full w-0.5 bg-purple-700"
                style={{ left: `${(TODAY_MONTH_INDEX / MONTH_COUNT) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{MONTH_LABELS[0]}</span>
              <span className="text-purple-700 dark:text-purple-400 font-semibold">Сегодня · {MONTH_LABELS[TODAY_MONTH_INDEX]}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Подкомпонент: карточка стратегического инсайта
// ============================================================================

const INSIGHT_COLOR_CONFIG: Record<
  StrategicInsight['color'],
  {
    border: string
    iconTile: string
    iconColor: string
    accentText: string
    accentBg: string
    badge: string
    gradient: string
  }
> = {
  red: {
    border: 'border-l-red-700',
    iconTile: 'bg-red-700/15',
    iconColor: 'text-red-700 dark:text-red-400',
    accentText: 'text-red-700 dark:text-red-400',
    accentBg: 'bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40',
    badge: 'bg-red-700 text-white',
    gradient: 'from-red-900/15 via-card to-card',
  },
  emerald: {
    border: 'border-l-emerald-700',
    iconTile: 'bg-emerald-700/15',
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    accentText: 'text-emerald-700 dark:text-emerald-400',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40',
    badge: 'bg-emerald-700 text-white',
    gradient: 'from-emerald-900/15 via-card to-card',
  },
  amber: {
    border: 'border-l-amber-600',
    iconTile: 'bg-amber-600/15',
    iconColor: 'text-amber-700 dark:text-amber-400',
    accentText: 'text-amber-700 dark:text-amber-400',
    accentBg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40',
    badge: 'bg-amber-600 text-white',
    gradient: 'from-amber-900/15 via-card to-card',
  },
}

function StrategicInsightCard({ insight }: { insight: StrategicInsight }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = INSIGHT_COLOR_CONFIG[insight.color]
  const Icon = insight.icon
  const count = insight.details.length

  return (
    <Card className={`rounded-xl shadow-sm border-l-4 ${cfg.border} bg-gradient-to-br ${cfg.gradient} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${cfg.iconTile} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-tight">{insight.title}</CardTitle>
            <Badge variant="outline" className={`text-[10px] mt-1 ${cfg.iconColor} border-current/30`}>
              {count} {count === 1 ? 'пункт' : count < 5 ? 'пункта' : 'пунктов'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">{insight.body}</p>

        {expanded && (
          <div className={`space-y-1.5 p-3 rounded-lg border ${cfg.accentBg}`}>
            <p className={`text-[11px] font-semibold ${cfg.accentText} mb-2 flex items-center gap-1`}>
              <ClipboardList className="w-3 h-3" />
              Детальный перечень:
            </p>
            <ul className="space-y-1.5">
              {insight.details.map((detail, i) => (
                <li key={i} className="text-xs flex items-start gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.iconColor.replace('text-', 'bg-')} mt-1.5 shrink-0`} />
                  <span className="leading-relaxed text-stone-700 dark:text-stone-200">{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className={`w-full justify-between text-xs h-8 ${cfg.accentText} hover:bg-transparent`}
        >
          <span className="flex items-center gap-1">
            {expanded ? 'Свернуть' : 'Узнать больше'}
          </span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Подкомпонент: таблица плана действий на 30 дней
// ============================================================================

function ActionPlanTable() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            План действий на ближайшие 30 дней
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-700 text-white gap-1">
              <Calendar className="w-3 h-3" />
              {ACTION_PLAN.length} задач
            </Badge>
            <Badge variant="outline" className="gap-1 text-red-700 dark:text-red-400 border-current/30">
              <AlertTriangle className="w-3 h-3" />
              2 критические
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[80px] text-xs font-semibold">Дата</TableHead>
                <TableHead className="text-xs font-semibold min-w-[260px]">Ход</TableHead>
                <TableHead className="text-xs font-semibold min-w-[140px]">Ответственный</TableHead>
                <TableHead className="text-xs font-semibold w-[110px]">Приоритет</TableHead>
                <TableHead className="text-xs font-semibold w-[130px]">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTION_PLAN.map((item) => {
                const priCfg = PRIORITY_CONFIG[item.priority]
                const statCfg = ACTION_STATUS_CONFIG[item.status]
                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <TableCell className="font-semibold text-xs tabular-nums whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                        {item.date}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs leading-snug">
                      <span className="text-stone-800 dark:text-stone-100">{item.action}</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="text-muted-foreground">{item.responsible}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${priCfg.badge} gap-1 text-[10px]`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priCfg.dotClass} bg-white`} />
                        {priCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statCfg.badgeClass} text-[10px] gap-1`}>
                        {item.status === 'in-progress' ? (
                          <Activity className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {statCfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Легенда под таблицей */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-t bg-muted/20 text-[10px] text-muted-foreground">
          <span className="font-semibold">Приоритеты:</span>
          {(['critical', 'high', 'medium'] as const).map((p) => (
            <span key={p} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[p].dotClass}`} />
              {PRIORITY_CONFIG[p].label}
            </span>
          ))}
          <Separator orientation="vertical" className="h-3 mx-1" />
          <span className="font-semibold">Статусы:</span>
          {(['in-progress', 'planned'] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s === 'in-progress' ? 'bg-amber-600' : 'bg-stone-600'}`} />
              {ACTION_STATUS_CONFIG[s].label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Главный компонент: CaseBattlePlan
// ============================================================================

export function CaseBattlePlan() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSelectMove = useCallback((move: BattleMove) => {
    setSelectedMove(move)
    setSheetOpen(true)
  }, [])

  const defenseCount = DEFENSE_MOVES.length
  const prosecutionCount = PROSECUTION_MOVES.length
  const balance = defenseCount - prosecutionCount

  return (
    <div className="space-y-6 pb-8">
      {/* ===================================================================== */}
      {/* Секция 1: Шапка-баннер с градиентом                                    */}
      {/* ===================================================================== */}
      <Card className="rounded-xl shadow-sm overflow-hidden border-l-4 border-l-red-700 bg-gradient-to-r from-red-900/30 via-purple-900/30 to-stone-900/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            {/* Левая часть: иконка + заголовок */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-red-700/20 flex items-center justify-center shrink-0 ring-1 ring-red-700/30">
                <Swords className="w-7 h-7 text-red-700 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                    Боевой план защиты
                  </h2>
                  <Badge className="bg-purple-700 text-white gap-1">
                    <Sparkles className="w-3 h-3" />
                    Стратегия
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  Хронология стратегических ходов обвинения и защиты по делу № 2024-00145
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Swords className="w-3 h-3 text-red-700" />
                    ст. 159 ч.3 · ст. 160 ч.2
                  </span>
                  <span className="text-stone-400">•</span>
                  <span className="flex items-center gap-1">
                    <Scale className="w-3 h-3 text-purple-700" />
                    Колесниченко Д.А.
                  </span>
                </div>
              </div>
            </div>

            {/* Правая часть: 3 статистические плитки */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
              <div className="flex flex-col p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 min-w-[100px]">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wide">
                  <Shield className="w-3 h-3" />
                  Ходов защиты
                </div>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                  {defenseCount}
                </span>
              </div>
              <div className="flex flex-col p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 min-w-[100px]">
                <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wide">
                  <Swords className="w-3 h-3" />
                  Ходов обвинения
                </div>
                <span className="text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums mt-0.5">
                  {prosecutionCount}
                </span>
              </div>
              <div className="flex flex-col p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 min-w-[100px]">
                <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 text-[10px] font-semibold uppercase tracking-wide">
                  <TrendingUp className="w-3 h-3" />
                  Баланс сил
                </div>
                <span className="text-2xl font-bold text-purple-700 dark:text-purple-400 tabular-nums mt-0.5">
                  {balance > 0 ? '+' : ''}{balance}
                </span>
                <span className="text-[10px] text-purple-700/80 dark:text-purple-400/80 -mt-1">
                  защита
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================================================================== */}
      {/* Секция 2: Полоса баланса сил                                           */}
      {/* ===================================================================== */}
      <ForceBalanceBar />

      {/* ===================================================================== */}
      {/* Секция 3: Диаграмма Ганта + фильтры                                    */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        {/* Кнопки фильтра */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" />
                Фильтр:
              </span>
              {FILTER_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = filter === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFilter(opt.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      active
                        ? 'bg-purple-700 text-white shadow-sm'
                        : 'bg-muted/60 text-stone-700 dark:text-stone-300 hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {opt.label}
                  </button>
                )
              })}
              <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Клик по элементу — детали в панели
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SVG-диаграмма Ганта */}
        <GanttChart filter={filter} onSelect={handleSelectMove} />

        {/* Цветовая легенда диаграммы */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                Легенда:
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-3 rounded-sm bg-gradient-to-b from-red-500 to-red-800" />
                Ход обвинения
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-3 rounded-sm bg-gradient-to-b from-emerald-500 to-emerald-800" />
                Ход защиты
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 bg-purple-700" />
                Сегодня
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-amber-700" />
                Критическое событие
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                Завершён
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-amber-600" />
                В работе
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-stone-600" />
                Запланирован
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-sm bg-stone-400 opacity-70" />
                Будущие ходы (приглушённые)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* Секция 4: Карточки стратегических инсайтов                             */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-700 dark:text-purple-400" />
            Стратегические инсайты
          </h3>
          <p className="text-[11px] text-muted-foreground">
            ИИ-анализ слабых мест, сильных аргументов и критических рисков
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STRATEGIC_INSIGHTS.map((insight) => (
            <StrategicInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* Секция 5: Таблица плана действий на 30 дней                            */}
      {/* ===================================================================== */}
      <ActionPlanTable />

      {/* ===================================================================== */}
      {/* Итоговый блок с прогнозом                                              */}
      {/* ===================================================================== */}
      <Card className="rounded-xl shadow-sm border-l-4 border-l-purple-700 bg-gradient-to-r from-purple-900/20 via-card to-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-700/15 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold">Итоговый прогноз по делу</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  На основе анализа 14 ходов и стратегических инсайтов защита имеет преимущество в +{balance} хода.
                  Рекомендуется сосредоточиться на исключении недопустимых доказательств и подтверждении алиби
                  на предварительном судебном заседании 15.04.2024.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Вероятность успеха
                </span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  55%
                </span>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-700 text-purple-700 hover:bg-purple-700 hover:text-white dark:text-purple-400 dark:border-purple-700"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Обновить прогноз
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">ИИ переанализирует все ходы и обновит прогноз</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sheet с деталями выбранного хода */}
      <MoveDetailSheet move={selectedMove} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
