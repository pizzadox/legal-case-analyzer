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
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Shield,
  Swords,
  Scale,
  Link2,
  AlertTriangle,
  TrendingUp,
  Eye,
  Filter,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  ChevronRight,
} from 'lucide-react'

// ============================================================================
// Типы данных
// ============================================================================

type EvidenceSide = 'prosecution' | 'defense'
type EvidenceType = 'документ' | 'показание' | 'экспертиза' | 'протокол'
type LinkType = 'contradiction' | 'corroboration' | 'partial'
type LinkStrength = 'strong' | 'moderate' | 'weak'
type FilterKey = 'all' | 'prosecution' | 'defense' | 'strong'

interface EvidenceItem {
  id: string
  name: string
  shortName: string
  date: string // ISO date
  type: EvidenceType
  side: EvidenceSide
  strength: number // 0..100
  source: string
  summary: string
  strengths: string[]
  weaknesses: string[]
}

interface EvidenceLink {
  id: string
  sourceId: string
  targetId: string
  type: LinkType
  strength: LinkStrength
  description: string
}

// ============================================================================
// Конфигурация отображения типов
// ============================================================================

const TYPE_CONFIG: Record<
  EvidenceType,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  документ: {
    label: 'Документ',
    icon: <FileText className="w-3 h-3" />,
    tone: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
  },
  показание: {
    label: 'Показание',
    icon: <Eye className="w-3 h-3" />,
    tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  },
  экспертиза: {
    label: 'Экспертиза',
    icon: <Activity className="w-3 h-3" />,
    tone: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200',
  },
  протокол: {
    label: 'Протокол',
    icon: <Scale className="w-3 h-3" />,
    tone: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200',
  },
}

const LINK_TYPE_CONFIG: Record<
  LinkType,
  { label: string; color: string; dashed: boolean }
> = {
  contradiction: { label: 'Противоречие', color: '#b91c1c', dashed: false },
  corroboration: { label: 'Подтверждение', color: '#047857', dashed: false },
  partial: { label: 'Частичное', color: '#d97706', dashed: true },
}

const LINK_STRENGTH_CONFIG: Record<
  LinkStrength,
  { label: string; width: number; opacity: number }
> = {
  strong: { label: 'Сильная', width: 2.5, opacity: 0.95 },
  moderate: { label: 'Средняя', width: 1.8, opacity: 0.75 },
  weak: { label: 'Слабая', width: 1.2, opacity: 0.55 },
}

const FILTER_OPTIONS: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Все', icon: <Filter className="w-3 h-3" /> },
  { key: 'prosecution', label: 'Обвинение', icon: <Swords className="w-3 h-3" /> },
  { key: 'defense', label: 'Защита', icon: <Shield className="w-3 h-3" /> },
  { key: 'strong', label: 'С сильной связью', icon: <Zap className="w-3 h-3" /> },
]

// ============================================================================
// Вспомогательные функции для силы доказательства
// ============================================================================

function strengthColor(s: number): string {
  if (s >= 70) return '#b91c1c' // strong — red-700 (prosecution) или emerald для defense (определяется вызывающим)
  if (s >= 40) return '#d97706' // moderate — amber-600
  return '#78716c' // weak — stone-500
}

function strengthColorForSide(s: number, side: EvidenceSide): string {
  if (s >= 70) return side === 'prosecution' ? '#b91c1c' : '#047857'
  if (s >= 40) return '#d97706'
  return '#78716c'
}

function strengthLabel(s: number): string {
  if (s >= 70) return 'Сильное'
  if (s >= 40) return 'Умеренное'
  return 'Слабое'
}

function strengthBadge(s: number): string {
  if (s >= 70) return 'bg-emerald-700 text-white'
  if (s >= 40) return 'bg-amber-600 text-white'
  return 'bg-stone-500 text-white'
}

function strengthBadgeForSide(s: number, side: EvidenceSide): string {
  if (s >= 70) return side === 'prosecution' ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'
  if (s >= 40) return 'bg-amber-600 text-white'
  return 'bg-stone-500 text-white'
}

// ============================================================================
// Mock-данные: доказательства обвинения (6), защиты (5), связи (7)
// ============================================================================

const PROSECUTION_EVIDENCE: EvidenceItem[] = [
  {
    id: 'pe-1',
    name: 'Обвинительное заключение',
    shortName: 'Обвин. заключение',
    date: '2024-04-25',
    type: 'документ',
    side: 'prosecution',
    strength: 78,
    source: 'Следственный отдел СУ СК России по г. Москве',
    summary:
      'Сводный процессуальный документ, излагающий сформулированное обвинение против Колесниченко Д.А. по ст. 159 ч. 3 и ст. 160 ч. 2 УК РФ. Содержит анализ собранных доказательств, квалификацию деяния и предложения о передаче дела в суд.',
    strengths: [
      'Систематизированы все эпизоды преступной деятельности',
      'Подкреплено результатами четырёх экспертиз',
      'Содержит ссылки на 45 томов материалов дела',
    ],
    weaknesses: [
      'Не учтены показания свидетеля Козлова о местонахождении обвиняемого',
      'Финансовая экспертиза основана на копиях, а не оригиналах документов',
      'Не отражена хронология обысков 20 февраля 2024 года',
    ],
  },
  {
    id: 'pe-2',
    name: 'Показания свидетеля Петрова И.В.',
    shortName: 'Показания Петрова',
    date: '2024-02-05',
    type: 'показание',
    side: 'prosecution',
    strength: 55,
    source: 'Протокол допроса свидетеля от 05.02.2024',
    summary:
      'Свидетель Петров И.В. — бывший сотрудник ООО «ТехноПром» — дал показания о причастности Колесниченко Д.А. к хищению денежных средств путём фиктивных договоров. В повторном допросе 15.04.2024 уточнил отдельные обстоятельства.',
    strengths: [
      'Свидетель являлся непосредственным участником операций',
      'Показания подтверждаются частью бухгалтерских документов',
    ],
    weaknesses: [
      'Противоречия с показаниями свидетеля Козлова В.Н.',
      'Изменение показаний между допросами',
      'Личная заинтересованность свидетеля (конфликт с обвиняемым)',
    ],
  },
  {
    id: 'pe-3',
    name: 'Протокол обыска от 20.02.2024',
    shortName: 'Протокол обыска',
    date: '2024-02-20',
    type: 'протокол',
    side: 'prosecution',
    strength: 62,
    source: 'Протокол обыска № 14/2024 от 20.02.2024',
    summary:
      'Протокол обыска служебного помещения Колесниченко Д.А. в офисе ООО «ТехноПром». Изъяты 45 листов финансовых документов, ноутбук и три флеш-накопителя. Обыск проведён в присутствии понятых.',
    strengths: [
      'Изъятие зафиксировано с участием двух понятых',
      'Документы упакованы и опечатаны',
    ],
    weaknesses: [
      'Обыск проведён без участия адвоката подозреваемого',
      'Отсутствует видеофиксация процесса изъятия',
      'Задержка в передаче на экспертизу (1 день)',
    ],
  },
  {
    id: 'pe-4',
    name: 'Заключение финансово-экономической экспертизы',
    shortName: 'Заключение эксперта',
    date: '2024-04-10',
    type: 'экспертиза',
    side: 'prosecution',
    strength: 72,
    source: 'Заключение эксперта № 128-Э от 10.04.2024',
    summary:
      'Комплексная финансово-экономическая экспертиза, проведённая экспертом Кузнецовой Е.В. Установлено хищение 4,7 млн руб. путём заключения фиктивных договоров с подставными контрагентами. Подтверждена финансовая цепочка от ООО «ТехноПром» в пользу аффилированных структур.',
    strengths: [
      'Эксперт имеет 12-летний стаж и государственную аттестацию',
      'Применены стандартные методики анализа',
      'Заключение согласуется с изъятыми документами',
    ],
    weaknesses: [
      'Экспертиза проводилась по копиям документов, а не оригиналам',
      'Не исследована оборотная сторона договоров',
      'Эксперт не давала показаний в судебном заседании',
    ],
  },
  {
    id: 'pe-5',
    name: 'Финансовые документы ООО «ТехноПром»',
    shortName: 'Финанс. документы',
    date: '2024-03-05',
    type: 'документ',
    side: 'prosecution',
    strength: 68,
    source: 'Изъято при обыске 20.02.2024, приобщено 05.03.2024',
    summary:
      'Совокупность изъятых при обыске первичных учётных документов: договоры, счета, платёжные поручения, акты выполненных работ. Документы подтверждают финансовые операции между ООО «ТехноПром» и подставными контрагентами в период 2023–2024 гг.',
    strengths: [
      'Подлинность подписей подтверждена почерковедческой экспертизой',
      'Документы образуют непрерывную финансовую цепочку',
    ],
    weaknesses: [
      'Часть документов утрачена при хранении',
      'Отсутствуют оригиналы платёжных поручений по трём сделкам',
      'Не все контрагенты идентифицированы',
    ],
  },
  {
    id: 'pe-6',
    name: 'Показания свидетеля Ивановой А.С.',
    shortName: 'Показания Ивановой',
    date: '2024-03-20',
    type: 'показание',
    side: 'prosecution',
    strength: 48,
    source: 'Протокол допроса свидетеля от 20.03.2024',
    summary:
      'Свидетель Иванова А.С. — главный бухгалтер ООО «ТехноПром» — дала показания о порядке согласования финансовых операций с Колесниченко Д.А. Подтвердила подлинность подписей на ключевых документах.',
    strengths: [
      'Свидетель непосредственно подписывала документы',
      'Показания согласуются с результатами экспертизы',
    ],
    weaknesses: [
      'Свидетель имеет собственный интерес (уголовное преследование прекращено)',
      'Отдельные утверждения основаны на слухах',
      'Не может вспомнить детали сделок 2023 года',
    ],
  },
]

const DEFENSE_EVIDENCE: EvidenceItem[] = [
  {
    id: 'de-1',
    name: 'Показания свидетеля Козлова В.Н. — алиби',
    shortName: 'Козлов — алиби',
    date: '2024-02-28',
    type: 'показание',
    side: 'defense',
    strength: 74,
    source: 'Протокол допроса свидетеля от 28.02.2024',
    summary:
      'Свидетель Козлов В.Н. — сосед Колесниченко Д.А. — подтвердил, что в день проведения обыска (20.02.2024) и в день предполагаемой ключевой сделки обвиняемый находился у него дома в связи с семейным торжеством. Алиби охватывает период 14:00–18:00.',
    strengths: [
      'Свидетель не связан с обвиняемым служебными отношениями',
      'Показания согласуются с записями видеонаблюдения',
      'Алиби подтверждается третьим лицом (супруга Козлова)',
    ],
    weaknesses: [
      'Свидетель является давним знакомым обвиняемого',
      'Не может вспомнить точное время прихода Колесниченко',
    ],
  },
  {
    id: 'de-2',
    name: 'Видеозапись с камер наблюдения',
    shortName: 'Видео с камер',
    date: '2024-03-12',
    type: 'документ',
    side: 'defense',
    strength: 81,
    source: 'DVD-носитель, изъятый адвокатом у администратора ТЦ «Город»',
    summary:
      'Видеозапись с камер наружного наблюдения ТЦ «Город» за 20.02.2024, фиксирующая нахождение Колесниченко Д.А. в торговом центре в период 14:30–17:45, что противоречит версии следствия о его присутствии в офисе ООО «ТехноПром».',
    strengths: [
      'Видеозапись имеет непрерывный характер без признаков монтажа',
      'Подлинность подтверждена технической экспертизой',
      'Время на записи синхронизировано с сервером ТЦ',
    ],
    weaknesses: [
      'Запись получена адвокатом вне процессуального порядка',
      'Часть изображения перекрыта конструкцией',
    ],
  },
  {
    id: 'de-3',
    name: 'Билеты на поезд Москва — Казань',
    shortName: 'Билеты на поезд',
    date: '2024-02-15',
    type: 'документ',
    side: 'defense',
    strength: 65,
    source: 'Электронные билеты, распечатка от РЖД',
    summary:
      'Электронные проездные билеты на поезд Москва — Казань, оформленные на имя Колесниченко Д.А. на 19.02.2024 (вечерний рейс). Документ подтверждает, что обвиняемый покинул Москву накануне обыска и предполагаемой ключевой сделки.',
    strengths: [
      'Билеты оформлены через официальную систему РЖД',
      'Подтверждены системой бронирования',
      'Согласуются с показаниями Козлова',
    ],
    weaknesses: [
      'Не подтверждено фактическое использование билетов',
      'Отсутствует посадочный талон',
    ],
  },
  {
    id: 'de-4',
    name: 'Характеристика с места работы',
    shortName: 'Характеристика',
    date: '2024-04-05',
    type: 'документ',
    side: 'defense',
    strength: 45,
    source: 'Характеристика ООО «ТехноПром» от 05.04.2024',
    summary:
      'Положительная производственная характеристика на Колесниченко Д.А. с места работы, подписанная генеральным директором. Отражает высокие профессиональные качества, отсутствие дисциплинарных взысканий и поощрения за период работы.',
    strengths: [
      'Подписана действующим руководителем организации',
      'Содержит конкретные достижения',
    ],
    weaknesses: [
      'Подписана лицом, не являющимся независимым',
      'Относится к личности, а не к обстоятельствам дела',
    ],
  },
  {
    id: 'de-5',
    name: 'Справка об отсутствии судимости',
    shortName: 'Справка о судимости',
    date: '2024-04-22',
    type: 'документ',
    side: 'defense',
    strength: 38,
    source: 'Справка МВД России от 22.04.2024 № 77-АА-123456',
    summary:
      'Официальная справка МВД России об отсутствии у Колесниченко Д.А. судимости и фактов уголовного преследования на момент возбуждения настоящего уголовного дела. Имеет значение для характеристики личности и назначения наказания.',
    strengths: [
      'Официальный документ государственного органа',
      'Имеет неопровержимый характер',
    ],
    weaknesses: [
      'Относится к личности, а не к обстоятельствам дела',
      'Не опровергает инкриминируемое деяние',
    ],
  },
]

const EVIDENCE_LINKS: EvidenceLink[] = [
  {
    id: 'link-1',
    sourceId: 'pe-3',
    targetId: 'de-1',
    type: 'contradiction',
    strength: 'strong',
    description:
      'Протокол обыска фиксирует присутствие Колесниченко в офисе в 14:00–18:00, тогда как Козлов утверждает, что обвиняемый в это время находился у него дома. Прямое противоречие по ключевому временному промежутку.',
  },
  {
    id: 'link-2',
    sourceId: 'pe-2',
    targetId: 'de-1',
    type: 'contradiction',
    strength: 'strong',
    description:
      'Петров И.В. утверждает, что видел Колесниченко в офисе в день сделки, Козлов В.Н. — что обвиняемый находился у него дома. Взаимоисключающие показания по месту нахождения обвиняемого.',
  },
  {
    id: 'link-3',
    sourceId: 'pe-4',
    targetId: 'de-2',
    type: 'contradiction',
    strength: 'moderate',
    description:
      'Заключение эксперта основано на предположении о совершении сделок в офисе в период 14:00–18:00, видеозапись фиксирует Колесниченко в другом месте в это же время. Экспертиза не учитывает альтернативный сценарий.',
  },
  {
    id: 'link-4',
    sourceId: 'pe-2',
    targetId: 'de-2',
    type: 'contradiction',
    strength: 'moderate',
    description:
      'Показания Петрова о присутствии Колесниченко в офисе опровергаются видеозаписью с камер наблюдения в ТЦ «Город», где обвиняемый зафиксирован в это же время.',
  },
  {
    id: 'link-5',
    sourceId: 'pe-1',
    targetId: 'de-5',
    type: 'corroboration',
    strength: 'weak',
    description:
      'Обвинительное заключение и справка о судимости характеризуют личность обвиняемого. Справка подтверждает отсутствие прежней судимости, что должно быть учтено при назначении наказания, но не опровергает обвинение.',
  },
  {
    id: 'link-6',
    sourceId: 'pe-6',
    targetId: 'de-4',
    type: 'partial',
    strength: 'weak',
    description:
      'Показания Ивановой о деловых качествах Колесниченко частично согласуются с производственной характеристикой, но относятся к личности обвиняемого, а не к обстоятельствам преступления.',
  },
  {
    id: 'link-7',
    sourceId: 'pe-3',
    targetId: 'de-3',
    type: 'contradiction',
    strength: 'strong',
    description:
      'Протокол обыска предполагает нахождение Колесниченко в Москве 20.02.2024, билеты на поезд подтверждают его отъезд в Казань 19.02.2024 вечером. Прямое противоречие по месту нахождения обвиняемого.',
  },
]

// ============================================================================
// Геометрия SVG-визуализации
// ============================================================================

const SVG_WIDTH = 1400
const SVG_HEIGHT = 460
const NODE_WIDTH = 132
const NODE_HEIGHT = 92
const PADDING_X = 80
const PROSECUTION_Y = 100 // центр верхнего узла (увеличен, чтобы не перекрывать заголовок)
const DEFENSE_Y = 380 // центр нижнего узла (немного поднят, чтобы не перекрывать нижний заголовок)
const AXIS_Y = 230

const ALL_EVIDENCE: EvidenceItem[] = [...PROSECUTION_EVIDENCE, ...DEFENSE_EVIDENCE]

const EVIDENCE_MAP: Record<string, EvidenceItem> = Object.fromEntries(
  ALL_EVIDENCE.map((e) => [e.id, e]),
)

// Рассчитываем x-координату по дате
const dateToX = (dateStr: string): number => {
  const dates = ALL_EVIDENCE.map((e) => new Date(e.date).getTime())
  const min = Math.min(...dates)
  const max = Math.max(...dates)
  const t = (new Date(dateStr).getTime() - min) / (max - min || 1)
  return PADDING_X + t * (SVG_WIDTH - 2 * PADDING_X)
}

// Предварительно посчитанные позиции узлов (с лёгким «расталкиванием»)
const nodePositions: Record<string, { x: number; y: number }> = (() => {
  const pos: Record<string, { x: number; y: number }> = {}
  // Prosecution: сортируем по дате и расталкиваем
  const pros = [...PROSECUTION_EVIDENCE].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const def = [...DEFENSE_EVIDENCE].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const minSpacing = NODE_WIDTH + 24
  const applyDodge = (arr: EvidenceItem[], y: number) => {
    const coords = arr.map((e) => ({ id: e.id, x: dateToX(e.date) }))
    for (let i = 1; i < coords.length; i++) {
      if (coords[i].x - coords[i - 1].x < minSpacing) {
        coords[i].x = coords[i - 1].x + minSpacing
      }
    }
    // Не даём выйти за правую границу
    const maxX = SVG_WIDTH - PADDING_X
    for (let i = coords.length - 1; i >= 0; i--) {
      if (coords[i].x > maxX) coords[i].x = maxX
    }
    coords.forEach((c) => {
      pos[c.id] = { x: c.x, y }
    })
  }
  applyDodge(pros, PROSECUTION_Y)
  applyDodge(def, DEFENSE_Y)
  return pos
})()

// Метки месяцев для центральной оси
const monthLabels: { x: number; label: string }[] = (() => {
  const labels: { x: number; label: string }[] = []
  const months = [
    { y: 2024, m: 1, label: 'Февраль 2024' },
    { y: 2024, m: 2, label: 'Март 2024' },
    { y: 2024, m: 3, label: 'Апрель 2024' },
  ]
  const firstOfMonth = (y: number, m: number) => new Date(y, m, 1).getTime()
  const feb1 = firstOfMonth(2024, 1)
  const mar1 = firstOfMonth(2024, 2)
  const apr1 = firstOfMonth(2024, 3)
  const may1 = firstOfMonth(2024, 4)
  // Используем ту же логику, что и dateToX (мин/макс по фактическим датам)
  const dates = ALL_EVIDENCE.map((e) => new Date(e.date).getTime())
  const min = Math.min(...dates)
  const max = Math.max(...dates)
  const t2x = (t: number) => PADDING_X + ((t - min) / (max - min || 1)) * (SVG_WIDTH - 2 * PADDING_X)
  labels.push({ x: t2x(feb1), label: months[0].label })
  labels.push({ x: t2x(mar1), label: months[1].label })
  labels.push({ x: t2x(apr1), label: months[2].label })
  // Ограничиваем
  void may1
  return labels.filter((l) => l.x >= PADDING_X - 10 && l.x <= SVG_WIDTH - PADDING_X + 10)
})()

// ============================================================================
// Подсчёт «разрывов» в цепочке доказательств
// ============================================================================

const getGaps = (): string[] => {
  // Обвинительные доказательства, не имеющие ни одной связи с защитой
  const linkedProsecution = new Set(
    EVIDENCE_LINKS.flatMap((l) =>
      l.sourceId.startsWith('pe-') ? [l.sourceId] : l.targetId.startsWith('pe-') ? [l.targetId] : [],
    ),
  )
  return PROSECUTION_EVIDENCE.filter((e) => !linkedProsecution.has(e.id)).map((e) => e.id)
}

const GAP_IDS = getGaps()

// ============================================================================
// Подкомпонент: узел-карточка доказательства
// ============================================================================

interface EvidenceNodeProps {
  item: EvidenceItem
  x: number
  y: number
  isDimmed: boolean
  isHighlighted: boolean
  isGap: boolean
  showGap: boolean
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

function EvidenceNode({
  item,
  x,
  y,
  isDimmed,
  isHighlighted,
  isGap,
  showGap,
  onClick,
  onHover,
}: EvidenceNodeProps) {
  const typeCfg = TYPE_CONFIG[item.type]
  const sideColor = item.side === 'prosecution' ? '#b91c1c' : '#047857'
  const sideGradient =
    item.side === 'prosecution'
      ? 'from-card via-card to-red-500/5'
      : 'from-card via-card to-emerald-500/5'
  const topBorder = item.side === 'prosecution' ? 'border-t-red-700' : 'border-t-emerald-700'
  const dateObj = new Date(item.date)
  const dateStr = dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })

  const leftPct = (x / SVG_WIDTH) * 100
  const topPct = (y / SVG_HEIGHT) * 100

  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 text-left rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[calc(50%+2px)] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 border-t-4 ${topBorder} bg-gradient-to-br ${sideGradient} ${
        isDimmed ? 'opacity-30' : 'opacity-100'
      } ${isHighlighted ? 'ring-2 ring-amber-500 scale-105 z-20' : 'z-10'} ${
        showGap && isGap ? 'outline outline-2 outline-dashed outline-red-700' : ''
      }`}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${(NODE_WIDTH / SVG_WIDTH) * 100}%`,
        maxWidth: `${NODE_WIDTH}px`,
        minWidth: '110px',
      }}
      title={item.name}
    >
      <div className="p-2 space-y-1">
        {/* Верхняя строка: тип + сила */}
        <div className="flex items-center gap-1">
          <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium ${typeCfg.tone}`}>
            {typeCfg.icon}
            <span className="hidden sm:inline">{typeCfg.label}</span>
          </span>
          <span
            className="ml-auto inline-flex items-center justify-center min-w-[28px] px-1 py-0.5 rounded text-[9px] font-bold text-white"
            style={{ backgroundColor: sideColor }}
            title={`Сила доказательства: ${item.strength}/100`}
          >
            {item.strength}
          </span>
        </div>
        {/* Название (2 строки) */}
        <p className="text-[11px] font-semibold leading-tight line-clamp-2 min-h-[26px]">
          {item.name}
        </p>
        {/* Дата */}
        <p className="text-[9px] text-muted-foreground tabular-nums">{dateStr}</p>
        {/* Полоса силы */}
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${item.strength}%`,
              backgroundColor: strengthColorForSide(item.strength, item.side),
            }}
          />
        </div>
        {showGap && isGap && (
          <div className="flex items-center gap-1 mt-0.5">
            <AlertTriangle className="w-2.5 h-2.5 text-red-700" />
            <span className="text-[8px] font-semibold text-red-700 uppercase tracking-wide">
              Разрыв в защите
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================================================
// Подкомпонент: SVG-путь связи между узлами
// ============================================================================

interface EvidenceLinkPathProps {
  link: EvidenceLink
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  isDimmed: boolean
  isHighlighted: boolean
  onHover: (id: string | null) => void
}

function EvidenceLinkPath({
  link,
  sourceX,
  sourceY,
  targetX,
  targetY,
  isDimmed,
  isHighlighted,
  onHover,
}: EvidenceLinkPathProps) {
  const typeCfg = LINK_TYPE_CONFIG[link.type]
  const strCfg = LINK_STRENGTH_CONFIG[link.strength]

  // Источник сверху (обвинение), цель снизу (защита) — всегда так по построению
  const x1 = sourceX
  const y1 = sourceY + NODE_HEIGHT / 2
  const x2 = targetX
  const y2 = targetY - NODE_HEIGHT / 2
  // Контрольные точки для плавной Bezier-кривой
  const midY = (y1 + y2) / 2
  const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`

  const opacity = isDimmed ? 0.12 : isHighlighted ? 1 : strCfg.opacity
  const width = isHighlighted ? strCfg.width + 1.2 : strCfg.width

  return (
    <g
      onMouseEnter={() => onHover(link.id)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer"
    >
      {/* Широкая невидимая дорожка для удобного наведения */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
      {/* Видимая линия */}
      <path
        d={path}
        fill="none"
        stroke={typeCfg.color}
        strokeWidth={width}
        strokeOpacity={opacity}
        strokeDasharray={typeCfg.dashed ? '5 4' : undefined}
        strokeLinecap="round"
        style={{ transition: 'stroke-opacity 200ms ease, stroke-width 200ms ease' }}
      />
      {/* Маркер в средней точке связи */}
      <circle
        cx={(x1 + x2) / 2}
        cy={midY}
        r={isHighlighted ? 4.5 : 3}
        fill={typeCfg.color}
        fillOpacity={opacity}
        stroke="#ffffff"
        strokeWidth={1}
        style={{ transition: 'r 200ms ease, fill-opacity 200ms ease' }}
      />
    </g>
  )
}

// ============================================================================
// Подкомпонент: легенда
// ============================================================================

function Legend() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Тип связи
            </p>
            <div className="space-y-1.5">
              {(['contradiction', 'corroboration', 'partial'] as LinkType[]).map((t) => {
                const cfg = LINK_TYPE_CONFIG[t]
                return (
                  <div key={t} className="flex items-center gap-2 text-xs">
                    <svg width="32" height="8" className="shrink-0">
                      <line
                        x1="0"
                        y1="4"
                        x2="32"
                        y2="4"
                        stroke={cfg.color}
                        strokeWidth="2"
                        strokeDasharray={cfg.dashed ? '4 3' : undefined}
                      />
                    </svg>
                    <span>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Сила связи
            </p>
            <div className="space-y-1.5">
              {(['strong', 'moderate', 'weak'] as LinkStrength[]).map((s) => {
                const cfg = LINK_STRENGTH_CONFIG[s]
                return (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <svg width="32" height="8" className="shrink-0">
                      <line
                        x1="0"
                        y1="4"
                        x2="32"
                        y2="4"
                        stroke="#78716c"
                        strokeWidth={cfg.width}
                        strokeOpacity={cfg.opacity}
                      />
                    </svg>
                    <span>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Сила доказательства
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-6 h-2 rounded-full bg-red-700" />
                <span>Сильное (≥70) — обвинение</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-6 h-2 rounded-full bg-emerald-700" />
                <span>Сильное (≥70) — защита</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-6 h-2 rounded-full bg-amber-600" />
                <span>Умеренное (40–69)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-6 h-2 rounded-full bg-stone-500" />
                <span>Слабое (&lt;40)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Подкомпонент: панель деталей доказательства (Sheet)
// ============================================================================

interface EvidenceDetailSheetProps {
  item: EvidenceItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  links: EvidenceLink[]
  allItems: EvidenceItem[]
  onSelectItem: (id: string) => void
}

function EvidenceDetailSheet({
  item,
  open,
  onOpenChange,
  links,
  allItems,
  onSelectItem,
}: EvidenceDetailSheetProps) {
  if (!item) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg" />
      </Sheet>
    )
  }

  const typeCfg = TYPE_CONFIG[item.type]
  const relatedLinks = links.filter(
    (l) => l.sourceId === item.id || l.targetId === item.id,
  )
  const relatedItems = relatedLinks
    .map((l) => {
      const otherId = l.sourceId === item.id ? l.targetId : l.sourceId
      return { link: l, item: allItems.find((i) => i.id === otherId) }
    })
    .filter((r) => r.item)

  const dateObj = new Date(item.date)
  const dateStr = dateObj.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const sideBg =
    item.side === 'prosecution'
      ? 'from-red-900/30 via-card to-card border-l-red-700'
      : 'from-emerald-900/30 via-card to-card border-l-emerald-700'
  const sideLabel =
    item.side === 'prosecution' ? 'Доказательство обвинения' : 'Доказательство защиты'
  const sideIcon =
    item.side === 'prosecution' ? <Swords className="w-4 h-4 text-red-700" /> : <Shield className="w-4 h-4 text-emerald-700" />

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className={`bg-gradient-to-r ${sideBg} border-l-4 rounded-r-lg`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {sideIcon}
            <span>{sideLabel}</span>
          </div>
          <SheetTitle className="text-base leading-tight">{item.name}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={`gap-1 ${typeCfg.tone}`}>
              {typeCfg.icon}
              {typeCfg.label}
            </Badge>
            <Badge className={strengthBadgeForSide(item.strength, item.side)}>
              Сила: {item.strength}/100 · {strengthLabel(item.strength)}
            </Badge>
            <Badge variant="outline" className="tabular-nums">{dateStr}</Badge>
          </div>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Источник */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> Источник
            </p>
            <p className="text-sm">{item.source}</p>
          </div>

          <Separator />

          {/* Краткое описание */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Eye className="w-3 h-3" /> Краткое описание
            </p>
            <p className="text-sm leading-relaxed">{item.summary}</p>
          </div>

          <Separator />

          {/* Сильные стороны */}
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Сильные стороны
            </p>
            <ul className="space-y-1.5">
              {item.strengths.map((s, i) => (
                <li key={i} className="text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-600 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Слабые стороны */}
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1 text-red-700 dark:text-red-400">
              <XCircle className="w-3 h-3" /> Слабые стороны
            </p>
            <ul className="space-y-1.5">
              {item.weaknesses.map((w, i) => (
                <li key={i} className="text-xs flex items-start gap-2">
                  <XCircle className="w-3 h-3 mt-0.5 text-red-600 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Связанные доказательства */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Связанные доказательства ({relatedItems.length})
            </p>
            {relatedItems.length === 0 ? (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  У данного доказательства отсутствуют связи с противоположной стороной.
                  Это может указывать на пробел в аргументации.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {relatedItems.map(({ link, item: related }) => {
                  if (!related) return null
                  const linkTypeCfg = LINK_TYPE_CONFIG[link.type]
                  const strCfg = LINK_STRENGTH_CONFIG[link.strength]
                  return (
                    <button
                      key={link.id}
                      onClick={() => onSelectItem(related.id)}
                      className="w-full text-left p-2 rounded-lg border bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-sm hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: linkTypeCfg.color }}
                        />
                        <span className="text-xs font-medium truncate">{related.name}</span>
                        <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {linkTypeCfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {strCfg.label} связь
                        </Badge>
                        <Badge
                          className={`text-[10px] px-1 py-0 ml-auto ${
                            related.side === 'prosecution'
                              ? 'bg-red-700 text-white'
                              : 'bg-emerald-700 text-white'
                          }`}
                        >
                          {related.side === 'prosecution' ? 'Обвинение' : 'Защита'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                        {link.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Главный компонент
// ============================================================================

export function CaseEvidenceChain() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showGaps, setShowGaps] = useState(false)

  // Сильные связи
  const strongLinkIds = useMemo(
    () => new Set(EVIDENCE_LINKS.filter((l) => l.strength === 'strong').map((l) => l.id)),
    [],
  )
  // Все ID узлов, имеющих хотя бы одну сильную связь
  const strongConnectedIds = useMemo(() => {
    const ids = new Set<string>()
    EVIDENCE_LINKS.filter((l) => l.strength === 'strong').forEach((l) => {
      ids.add(l.sourceId)
      ids.add(l.targetId)
    })
    return ids
  }, [])

  // Список узлов с учётом фильтра
  const visibleItems = useMemo(() => {
    if (filter === 'all') return ALL_EVIDENCE
    if (filter === 'prosecution') return PROSECUTION_EVIDENCE
    if (filter === 'defense') return DEFENSE_EVIDENCE
    if (filter === 'strong') return ALL_EVIDENCE.filter((e) => strongConnectedIds.has(e.id))
    return ALL_EVIDENCE
  }, [filter, strongConnectedIds])

  const visibleIds = useMemo(() => new Set(visibleItems.map((i) => i.id)), [visibleItems])

  // Связи, у которых оба конца видимы
  const visibleLinks = useMemo(() => {
    return EVIDENCE_LINKS.filter(
      (l) => visibleIds.has(l.sourceId) && visibleIds.has(l.targetId),
    )
  }, [visibleIds])

  // Множество ID узлов и связей, связанных с наведённым элементом
  const activeIds = useMemo(() => {
    if (hoveredId) {
      const linked = new Set<string>([hoveredId])
      EVIDENCE_LINKS.forEach((l) => {
        if (l.sourceId === hoveredId) linked.add(l.targetId)
        if (l.targetId === hoveredId) linked.add(l.sourceId)
      })
      return { nodes: linked, links: new Set<string>() }
    }
    if (hoveredLinkId) {
      const link = EVIDENCE_LINKS.find((l) => l.id === hoveredLinkId)
      if (link) {
        return {
          nodes: new Set([link.sourceId, link.targetId]),
          links: new Set([hoveredLinkId]),
        }
      }
    }
    return { nodes: new Set<string>(), links: new Set<string>() }
  }, [hoveredId, hoveredLinkId])

  const handleSelectItem = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedId(null)
  }, [])

  const selectedItem = selectedId ? EVIDENCE_MAP[selectedId] ?? null : null

  // Статистика
  const stats = useMemo(() => {
    const pros = PROSECUTION_EVIDENCE
    const def = DEFENSE_EVIDENCE
    const avgStrength = (arr: EvidenceItem[]) =>
      arr.length ? Math.round(arr.reduce((s, i) => s + i.strength, 0) / arr.length) : 0
    return {
      prosCount: pros.length,
      defCount: def.length,
      prosAvg: avgStrength(pros),
      defAvg: avgStrength(def),
      linksCount: EVIDENCE_LINKS.length,
      contradictions: EVIDENCE_LINKS.filter((l) => l.type === 'contradiction').length,
      gaps: GAP_IDS.length,
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <Card className="bg-gradient-to-r from-red-900/30 via-stone-900/20 to-emerald-900/20 border-l-4 border-l-red-700 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20">
              <Link2 className="w-6 h-6 text-red-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Визуализация цепочки доказательств</h2>
              <p className="text-sm text-muted-foreground">
                Интерактивная схема связей между доказательствами обвинения и защиты по делу
                № 2024-00145
              </p>
            </div>
            <Badge className="bg-red-700 text-white gap-1">
              <Swords className="w-3 h-3" /> Обвинение: {stats.prosCount}
            </Badge>
            <Badge className="bg-emerald-700 text-white gap-1">
              <Shield className="w-3 h-3" /> Защита: {stats.defCount}
            </Badge>
            <Badge className="bg-stone-700 text-white gap-1">
              <Link2 className="w-3 h-3" /> Связей: {stats.linksCount}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Сводная статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-700 bg-gradient-to-br from-card via-card to-red-500/5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-red-700" />
              <span className="text-2xl font-bold">{stats.prosAvg}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Средняя сила обвинения</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-700 bg-gradient-to-br from-card via-card to-emerald-500/5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span className="text-2xl font-bold">{stats.defAvg}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Средняя сила защиты</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-600 bg-gradient-to-br from-card via-card to-amber-500/5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-600" />
              <span className="text-2xl font-bold">{stats.contradictions}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Противоречий в деле</p>
          </CardContent>
        </Card>
        <Card
          className={`border-l-4 ${
            stats.gaps > 0
              ? 'border-l-red-700 bg-gradient-to-br from-card via-card to-red-500/5'
              : 'border-l-emerald-700 bg-gradient-to-br from-card via-card to-emerald-500/5'
          } rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-4 h-4 ${stats.gaps > 0 ? 'text-red-700' : 'text-emerald-700'}`}
              />
              <span className="text-2xl font-bold">{stats.gaps}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.gaps > 0 ? 'Разрывов в защите' : 'Разрывов не найдено'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Панель фильтров и переключателей */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="w-3 h-3" /> Фильтр:
            </p>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  size="sm"
                  variant={filter === opt.key ? 'default' : 'outline'}
                  className={`rounded-xl text-xs gap-1 ${
                    filter === opt.key ? 'bg-red-700 text-white hover:bg-red-800' : ''
                  }`}
                  onClick={() => setFilter(opt.key)}
                >
                  {opt.icon}
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant={showGaps ? 'default' : 'outline'}
              className={`rounded-xl text-xs gap-1 ${
                showGaps ? 'bg-red-700 text-white hover:bg-red-800' : ''
              }`}
              onClick={() => setShowGaps((v) => !v)}
            >
              <AlertTriangle className="w-3 h-3" />
              {showGaps ? 'Анализ разрывов: включён' : 'Анализ разрывов'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Подсветить доказательства обвинения, не имеющие контраргументов со стороны защиты
              ({GAP_IDS.length} шт.)
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Показано: <strong className="text-foreground">{visibleItems.length}</strong> доказательств
              {' • '}
              <strong className="text-foreground">{visibleLinks.length}</strong> связей
            </span>
            <span className="text-muted-foreground hidden md:inline">
              Подсказка: наведите курсор на узел или связь — подсветятся связанные элементы. Нажмите для деталей.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* SVG-визуализация */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-700" />
            Схема доказательств во времени
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div
            className="relative w-full"
            style={{ aspectRatio: `${SVG_WIDTH} / ${SVG_HEIGHT}` }}
          >
            {/* SVG-слой: ось, метки, кривые связей */}
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Фон верхней (обвинение) и нижней (защита) зон */}
              <rect
                x="0"
                y="0"
                width={SVG_WIDTH}
                height={AXIS_Y}
                fill="url(#prosBg)"
                opacity={0.4}
              />
              <rect
                x="0"
                y={AXIS_Y}
                width={SVG_WIDTH}
                height={SVG_HEIGHT - AXIS_Y}
                fill="url(#defBg)"
                opacity={0.4}
              />
              <defs>
                <linearGradient id="prosBg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="defBg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#047857" stopOpacity="0" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.06" />
                </linearGradient>
              </defs>

              {/* Подписи дорожек */}
              <text
                x={PADDING_X}
                y={20}
                fontSize={13}
                fontWeight={700}
                className="fill-red-700 dark:fill-red-400"
              >
                Доказательства обвинения
              </text>
              <text
                x={PADDING_X}
                y={SVG_HEIGHT - 8}
                fontSize={13}
                fontWeight={700}
                className="fill-emerald-700 dark:fill-emerald-400"
              >
                Доказательства защиты
              </text>

              {/* Центральная ось времени */}
              <line
                x1={PADDING_X}
                y1={AXIS_Y}
                x2={SVG_WIDTH - PADDING_X}
                y2={AXIS_Y}
                stroke="#a8a29e"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.6}
              />
              {/* Метки месяцев */}
              {monthLabels.map((m, i) => (
                <g key={i}>
                  <line
                    x1={m.x}
                    y1={AXIS_Y - 8}
                    x2={m.x}
                    y2={AXIS_Y + 8}
                    stroke="#78716c"
                    strokeWidth={1.5}
                  />
                  <text
                    x={m.x}
                    y={AXIS_Y + 24}
                    fontSize={11}
                    textAnchor="middle"
                    className="fill-stone-600 dark:fill-stone-300"
                    fontWeight={600}
                  >
                    {m.label}
                  </text>
                </g>
              ))}

              {/* Связи */}
              {visibleLinks.map((link) => {
                const src = nodePositions[link.sourceId]
                const tgt = nodePositions[link.targetId]
                if (!src || !tgt) return null
                const isHl = activeIds.links.has(link.id) || activeIds.nodes.has(link.sourceId) || activeIds.nodes.has(link.targetId)
                const isDim =
                  (hoveredId !== null || hoveredLinkId !== null) && !isHl
                return (
                  <EvidenceLinkPath
                    key={link.id}
                    link={link}
                    sourceX={src.x}
                    sourceY={src.y}
                    targetX={tgt.x}
                    targetY={tgt.y}
                    isDimmed={isDim}
                    isHighlighted={isHl}
                    onHover={setHoveredLinkId}
                  />
                )
              })}

              {/* Маркеры силы на дорожках (горизонтальные «рельсы») */}
              <line
                x1={PADDING_X}
                y1={PROSECUTION_Y}
                x2={SVG_WIDTH - PADDING_X}
                y2={PROSECUTION_Y}
                stroke="#b91c1c"
                strokeWidth={1}
                strokeDasharray="2 6"
                opacity={0.25}
              />
              <line
                x1={PADDING_X}
                y1={DEFENSE_Y}
                x2={SVG_WIDTH - PADDING_X}
                y2={DEFENSE_Y}
                stroke="#047857"
                strokeWidth={1}
                strokeDasharray="2 6"
                opacity={0.25}
              />
            </svg>

            {/* HTML-слой: узлы-карточки (поверх SVG) */}
            {visibleItems.map((item) => {
              const pos = nodePositions[item.id]
              if (!pos) return null
              const isActive = activeIds.nodes.has(item.id) || hoveredId === item.id
              const isDim =
                (hoveredId !== null || hoveredLinkId !== null) && !isActive
              const isGap = GAP_IDS.includes(item.id)
              return (
                <EvidenceNode
                  key={item.id}
                  item={item}
                  x={pos.x}
                  y={pos.y}
                  isDimmed={isDim}
                  isHighlighted={isActive}
                  isGap={isGap}
                  showGap={showGaps}
                  onClick={handleSelectItem}
                  onHover={setHoveredId}
                />
              )
            })}
          </div>

          {/* Список видимых элементов под схемой (для мобильных) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {visibleItems.map((item) => {
              const typeCfg = TYPE_CONFIG[item.type]
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item.id)}
                  className={`text-left p-2 rounded-lg border bg-gradient-to-br from-card via-card to-muted/20 hover:shadow-sm hover:-translate-y-0.5 transition-all ${
                    item.side === 'prosecution' ? 'border-l-4 border-l-red-700' : 'border-l-4 border-l-emerald-700'
                  } ${showGaps && GAP_IDS.includes(item.id) ? 'ring-1 ring-red-700' : ''}`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Badge className={`gap-0.5 text-[9px] px-1 ${typeCfg.tone}`}>
                      {typeCfg.icon}
                      {typeCfg.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                      {new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-medium line-clamp-2 leading-tight">{item.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.strength}%`,
                          backgroundColor: strengthColorForSide(item.strength, item.side),
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: strengthColorForSide(item.strength, item.side) }}>
                      {item.strength}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Легенда */}
      <Legend />

      {/* Панель деталей */}
      <EvidenceDetailSheet
        item={selectedItem}
        open={selectedId !== null}
        onOpenChange={handleOpenChange}
        links={EVIDENCE_LINKS}
        allItems={ALL_EVIDENCE}
        onSelectItem={handleSelectItem}
      />
    </div>
  )
}
