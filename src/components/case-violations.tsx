'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  Gavel,
  AlertOctagon,
  Search,
  Filter,
  X,
  ChevronRight,
  FileText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardList,
  ListChecks,
  Sparkles,
  Eye,
  History,
  Ban,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================================
// Типы данных
// ============================================================================

type Severity = 'critical' | 'serious' | 'moderate'
type ViolationStatus = 'excludable' | 'fixed' | 'disputed' | 'taken-by-court'
type SortKey = 'date-desc' | 'date-asc' | 'severity' | 'article'

interface StatusHistoryEntry {
  date: string
  label: string
  color: 'red' | 'amber' | 'emerald' | 'stone' | 'purple'
}

interface Violation {
  id: string
  date: string
  article: string
  articleKey: string
  type: string
  description: string
  evidence: string
  severity: Severity
  status: ViolationStatus
  impactScore: number
  legalBasis: string
  remediation: string
  relatedDocs: string[]
  statusHistory: StatusHistoryEntry[]
}

// ============================================================================
// Моковые данные: 9 процессуальных нарушений УПК РФ по делу № 2024-00145
// ============================================================================

const VIOLATIONS: Violation[] = [
  {
    id: 'v1',
    date: '2023-05-15',
    article: 'ст. 170 УПК РФ',
    articleKey: '170',
    type: 'Отсутствие понятых при обыске',
    description:
      'При проведении обыска в офисе ООО «ТехноПром» 15 мая 2023 г. в протоколе указаны двое понятых (Иванов И.И., Петров П.П.), однако их подписи в протоколе отсутствуют, а в материалах дела нет информации об их приглашении и фактическом присутствии. Это прямое нарушение ч. 1 ст. 170 УПК РФ, требующей обязательного участия не менее двух понятых при производстве следственных действий.',
    evidence: 'Протокол обыска №3 от 15.05.2023',
    severity: 'critical',
    status: 'excludable',
    impactScore: 95,
    legalBasis:
      'ч. 1 ст. 170 УПК РФ — обязательное участие понятых; Постановление Пленума ВС РФ №1 от 31.10.1995 «О судебном решении»; ч. 1 ст. 75 УПК РФ — недопустимые доказательства.',
    remediation:
      'Подать ходатайство об исключении протокола обыска как недопустимого доказательства (ст. 75 УПК РФ). Основание: отсутствие подписей понятых и сведений об их присутствии лишает протокол юридической силы и не позволяет проверить ход и результаты следственного действия.',
    relatedDocs: ['Протокол обыска №3 от 15.05.2023', 'Рапорт следователя Сидорова А.М.', 'Журнал доступа в помещение'],
    statusHistory: [
      { date: '2023-05-16', label: 'Выявлено защитником', color: 'stone' },
      { date: '2023-06-20', label: 'Заявлено ходатайство об исключении', color: 'amber' },
      { date: '2024-01-15', label: 'Подлежит исключению', color: 'red' },
    ],
  },
  {
    id: 'v2',
    date: '2023-05-15',
    article: 'ст. 182 УПК РФ',
    articleKey: '182',
    type: 'Проведение обыска вне пределов рабочего времени',
    description:
      'Обыск в офисе ООО «ТехноПром» начат в 22:30 и продолжался до 02:15, что выходит за рамки разумного рабочего времени и может свидетельствовать о психологическом давлении на руководство ООО. Отдельного постановления о производстве обыска в ночное время, предусмотренного ч. 2 ст. 164 УПК РФ, в материалах дела не имеется.',
    evidence: 'Протокол обыска №3 от 15.05.2023, Журнал доступа',
    severity: 'serious',
    status: 'disputed',
    impactScore: 65,
    legalBasis:
      'ч. 1 ст. 164 УПК РФ — общие правила производства следственных действий; ч. 2 ст. 164 УПК РФ — ночное время с 22:00 до 06:00; ч. 2 ст. 182 УПК РФ — порядок производства обыска.',
    remediation:
      'Дополнительное ходатайство в дополнение к основному об исключении протокола обыска. Сослаться на отсутствие постановления о производстве обыска в ночное время и нарушение разумных пределов рабочего времени по смыслу ст. 164 УПК РФ.',
    relatedDocs: ['Протокол обыска №3 от 15.05.2023', 'Журнал доступа в помещение', 'Постановление о возбуждении уголовного дела'],
    statusHistory: [
      { date: '2023-05-16', label: 'Выявлено защитником', color: 'stone' },
      { date: '2023-07-10', label: 'Оспаривается в суде', color: 'amber' },
    ],
  },
  {
    id: 'v3',
    date: '2023-06-05',
    article: 'ст. 189 УПК РФ',
    articleKey: '189',
    type: 'Допрос подозреваемого без адвоката',
    description:
      'Допрос Колесниченко Д.А. в качестве подозреваемого 5 июня 2023 г. проведён без участия защитника, при этом в протоколе допроса отсутствует письменный отказ от услуг адвоката по соглашению. Согласно ч. 2 ст. 46 и ч. 1 ст. 189 УПК РФ, допрос подозреваемого допускается только в присутствии защитника, если он не отказался от его услуг в письменной форме. Нарушение является существенным и влечёт недопустимость показаний.',
    evidence: 'Протокол допроса подозреваемого №5 от 05.06.2023',
    severity: 'critical',
    status: 'excludable',
    impactScore: 90,
    legalBasis:
      'ч. 1 ст. 189 УПК РФ — порядок допроса; ч. 2 ст. 46 УПК РФ — права подозреваемого; п. 1 ч. 2 ст. 75 УПК РФ — показания без защитника недопустимы; Постановление КС РФ №11-П от 27.06.2000.',
    remediation:
      'Ходатайство об исключении протокола допроса как недопустимого доказательства. Дополнительно — заявление о недопустимости использования производных доказательств, основанных на показаниях, данных без защитника (плоды отравленного древа).',
    relatedDocs: ['Протокол допроса подозреваемого №5 от 05.06.2023', 'Повестка о вызове на допрос'],
    statusHistory: [
      { date: '2023-06-06', label: 'Выявлено защитником', color: 'stone' },
      { date: '2023-07-15', label: 'Заявлено ходатайство', color: 'amber' },
      { date: '2024-01-15', label: 'Подлежит исключению', color: 'red' },
    ],
  },
  {
    id: 'v4',
    date: '2023-07-18',
    article: 'ст. 195 УПК РФ',
    articleKey: '195',
    type: 'Нарушение порядка назначения судебной экспертизы',
    description:
      'Назначение финансово-экономической экспертизы произведено 18 июля 2023 г. без вынесения соответствующего постановления в установленный законом срок. Постановление о назначении экспертизы датировано 25 июля 2023 г., т.е. задним числом, что подтверждается экспертизой давности документа, проведённой по ходатайству защиты. Также нарушен порядок ознакомления обвиняемого с постановлением о назначении экспертизы.',
    evidence: 'Постановление о назначении экспертизы №2/2023 от 25.07.2023',
    severity: 'serious',
    status: 'excludable',
    impactScore: 75,
    legalBasis:
      'ч. 1 ст. 195 УПК РФ — порядок назначения судебной экспертизы; ст. 196 УПК РФ — обязательное назначение экспертизы; ч. 1 ст. 198 УПК РФ — права подозреваемого/обвиняемого при назначении экспертизы; ч. 3 ст. 195 УПК РФ — ознакомление с постановлением.',
    remediation:
      'Ходатайство об исключении заключения эксперта как производного от незаконного постановления. Заявить ходатайство о проведении повторной независимой экспертизы в порядке ст. 207 УПК РФ.',
    relatedDocs: ['Постановление о назначении экспертизы №2/2023', 'Заключение эксперта №12 от 10.09.2023', 'Заключение эксперта о давности документа от 20.12.2023'],
    statusHistory: [
      { date: '2023-07-26', label: 'Выявлено защитником', color: 'stone' },
      { date: '2023-09-15', label: 'Заявлено ходатайство', color: 'amber' },
      { date: '2024-01-20', label: 'Подлежит исключению', color: 'red' },
    ],
  },
  {
    id: 'v5',
    date: '2023-07-25',
    article: 'ст. 195 УПК РФ',
    articleKey: '195',
    type: 'Экспертиза без ознакомления с постановлением',
    description:
      'Обвиняемый Колесниченко Д.А. и его защитник не были ознакомлены с постановлением о назначении финансово-экономической экспертизы до её начала, что лишило их возможности реализовать права, предусмотренные ст. 198 УПК РФ: заявить отвод эксперту, просить о назначении эксперта из числа указанных ими лиц, представить дополнительные вопросы для эксперта. Постановление вручено только после окончания экспертизы.',
    evidence: 'Уведомление о назначении экспертизы от 12.09.2023 (после даты заключения)',
    severity: 'serious',
    status: 'disputed',
    impactScore: 60,
    legalBasis:
      'ч. 3 ст. 195 УПК РФ — ознакомление с постановлением о назначении экспертизы; п. 1, 2 ч. 1 ст. 198 УПК РФ — права обвиняемого при назначении экспертизы; ст. 206 УПК РФ — содержание заключения эксперта.',
    remediation:
      'Дополнительное ходатайство в составе основного об исключении заключения эксперта. Заявить ходатайство о допросе эксперта в судебном заседании для разъяснения данного процессуального нарушения.',
    relatedDocs: ['Уведомление о назначении экспертизы', 'Заключение эксперта №12 от 10.09.2023'],
    statusHistory: [
      { date: '2023-09-15', label: 'Выявлено защитником', color: 'stone' },
      { date: '2023-11-20', label: 'Оспаривается в суде', color: 'amber' },
    ],
  },
  {
    id: 'v6',
    date: '2024-01-10',
    article: 'ст. 217 УПК РФ',
    articleKey: '217',
    type: 'Отказ в ознакомлении с материалами дела',
    description:
      'Следователь Сидоров А.М. отказал защите в ознакомлении с частью материалов уголовного дела (тома 6–8), содержащих доказательства, на которые ссылается обвинение, в нарушение ч. 1 ст. 217 УПК РФ. Отказ мотивирован «служебной необходимостью», что не предусмотрено законом. Защита была ознакомлена лишь с томами 1–5, после чего ознакомление было приостановлено до неопределённого срока.',
    evidence: 'Заявление защитника от 10.01.2024, ответ следователя от 15.01.2024',
    severity: 'critical',
    status: 'excludable',
    impactScore: 85,
    legalBasis:
      'ч. 1 ст. 217 УПК РФ — ознакомление потерпевшего, гражданского истца, гражданского ответчика и их представителей с материалами уголовного дела; ст. 215 УПК РФ — окончание предварительного следствия; ч. 2 ст. 219 УПК РФ — разрешение ходатайств.',
    remediation:
      'Жалоба в порядке ст. 124 УПК РФ руководителю следственного органа. Жалоба в суд в порядке ст. 125 УПК РФ на действия (бездействие) следователя. Ходатайство о возвращении уголовного дела прокурору в порядке ст. 237 УПК РФ для устранения нарушений.',
    relatedDocs: ['Заявление защитника от 10.01.2024', 'Ответ следователя от 15.01.2024', 'Опись материалов дела (тома 1–8)'],
    statusHistory: [
      { date: '2024-01-12', label: 'Выявлено защитником', color: 'stone' },
      { date: '2024-01-25', label: 'Подана жалоба в суд', color: 'amber' },
      { date: '2024-02-10', label: 'Подлежит исключению', color: 'red' },
    ],
  },
  {
    id: 'v7',
    date: '2023-12-01',
    article: 'ст. 164 УПК РФ',
    articleKey: '164',
    type: 'Нарушение сроков предварительного следствия',
    description:
      'Срок предварительного следствия по делу продлевался трижды без надлежащего обоснования: с 2 до 4 месяцев, затем до 6, затем до 8 месяцев. Постановления о продлении сроков не содержат конкретных обстоятельств, свидетельствующих о невозможности завершить расследование в установленный срок. Несмотря на нарушение, следствие завершено, нарушение устранено подписанием соглашения о сотрудничестве.',
    evidence: 'Постановления о продлении срока следствия от 05.07.2023, 05.09.2023, 05.11.2023',
    severity: 'moderate',
    status: 'fixed',
    impactScore: 30,
    legalBasis:
      'ч. 1, 4, 5 ст. 162 УПК РФ — сроки предварительного следствия; ч. 1 ст. 164 УПК РФ — общие правила производства следственных действий; Приказ Следственного комитета РФ №73 от 01.09.2014.',
    remediation:
      'Нарушение устранено. В материалах дела отсутствуют основания для возвращения дела прокурору по этому основанию. Может быть использовано как дополнительный аргумент в состязательной части судебного разбирательства.',
    relatedDocs: ['Постановления о продлении срока следствия (3 шт.)', 'Постановление о прекращении срока продления'],
    statusHistory: [
      { date: '2023-12-05', label: 'Выявлено защитником', color: 'stone' },
      { date: '2024-01-05', label: 'Устранено следователем', color: 'emerald' },
    ],
  },
  {
    id: 'v8',
    date: '2023-06-12',
    article: 'ст. 170 УПК РФ',
    articleKey: '170',
    type: 'Подмена понятых при осмотре места происшествия',
    description:
      'При осмотре места происшествия 12 июня 2023 г. в качестве понятых указаны граждане Кузнецов А.В. и Морозов С.П., однако, по данным видеозаписи с камер наблюдения, в момент проведения следственного действия они отсутствовали на месте. Подмена понятых выявлена в результате опроса реальных очевидцев сотрудников офиса. Данное нарушение ставит под сомнение достоверность протокола осмотра.',
    evidence: 'Протокол осмотра места происшествия №2 от 12.06.2023, видеозапись с камер наблюдения',
    severity: 'moderate',
    status: 'disputed',
    impactScore: 45,
    legalBasis:
      'ч. 1 ст. 170 УПК РФ — участие понятых; ч. 5 ст. 164 УПК РФ — недопустимость фальсификации доказательств; ст. 75 УПК РФ — недопустимые доказательства; ст. 303 УК РФ — фальсификация доказательств.',
    remediation:
      'Ходатайство о приобщении видеозаписи и допросе очевидцев. Дополнительное ходатайство об исключении протокола осмотра в случае подтверждения подмены понятых материалами дела.',
    relatedDocs: ['Протокол осмотра места происшествия №2', 'Видеозапись с камер наблюдения', 'Объяснения сотрудников офиса'],
    statusHistory: [
      { date: '2023-06-15', label: 'Выявлено защитником', color: 'stone' },
      { date: '2023-08-20', label: 'Оспаривается в суде', color: 'amber' },
    ],
  },
  {
    id: 'v9',
    date: '2023-05-15',
    article: 'ст. 182 УПК РФ',
    articleKey: '182',
    type: 'Изъятие предметов без описи',
    description:
      'При производстве обыска 15 мая 2023 г. изъяты 7 жёстких дисков, 3 системных блока и документы, не отражённые в описи протокола обыска. В протоколе указано лишь «предметы, имеющие значение для дела». Нарушение ч. 13 ст. 182 УПК РФ, требующей точного перечня и индивидуальных признаков изымаемых предметов. Это создаёт риск подмены или утраты изъятого и препятствует проверке допустимости производных доказательств.',
    evidence: 'Протокол обыска №3 от 15.05.2023, Заявление защитника от 20.05.2023',
    severity: 'serious',
    status: 'taken-by-court',
    impactScore: 55,
    legalBasis:
      'ч. 13 ст. 182 УПК РФ — содержимое протокола обыска; ч. 3 ст. 166 УПК РФ — удостоверение факта изъятия; ст. 81 УПК РФ — вещественные доказательства; ст. 82 УПК РФ — хранение вещественных доказательств.',
    remediation:
      'Судом отказано в исключении протокола, однако нарушение отражено в материалах дела. Подготовлена апелляционная жалоба. Дополнительно — заявление о недопустимости производных доказательств, основанных на изъятых предметах.',
    relatedDocs: ['Протокол обыска №3 от 15.05.2023', 'Заявление защитника от 20.05.2023', 'Постановление суда от 10.02.2024'],
    statusHistory: [
      { date: '2023-05-20', label: 'Выявлено защитником', color: 'stone' },
      { date: '2023-08-10', label: 'Заявлено ходатайство', color: 'amber' },
      { date: '2024-02-10', label: 'Принято судом', color: 'purple' },
    ],
  },
]

// ============================================================================
// Данные для диаграмм
// ============================================================================

const SEVERITY_CHART_DATA = [
  { severity: 'Критические', short: 'Крит.', count: 3, color: '#991b1b' },
  { severity: 'Серьёзные', short: 'Серьёз.', count: 4, color: '#d97706' },
  { severity: 'Умеренные', short: 'Умер.', count: 2, color: '#a8a29e' },
]

interface ArticleDatum {
  article: string
  key: string
  count: number
  color: string
}

const ARTICLE_CHART_DATA: ArticleDatum[] = [
  { article: 'ст. 170', key: '170', count: 2, color: '#57534e' },
  { article: 'ст. 182', key: '182', count: 2, color: '#b91c1c' },
  { article: 'ст. 189', key: '189', count: 1, color: '#d97706' },
  { article: 'ст. 195', key: '195', count: 2, color: '#7e22ce' },
  { article: 'ст. 217', key: '217', count: 1, color: '#ea580c' },
  { article: 'ст. 164', key: '164', count: 1, color: '#7f1d1d' },
]

// ============================================================================
// Хелперы
// ============================================================================

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}.${m}.${y}`
}

const SEVERITY_BADGE: Record<Severity, { className: string; label: string; icon: LucideIcon }> = {
  critical: { className: 'bg-red-700 text-white gap-1', label: 'Критическая', icon: AlertOctagon },
  serious: { className: 'bg-amber-600 text-white gap-1', label: 'Серьёзная', icon: AlertTriangle },
  moderate: { className: 'bg-stone-600 text-white gap-1', label: 'Умеренная', icon: Clock },
}

function getSeverityBadge(s: Severity): { className: string; label: string } {
  const e = SEVERITY_BADGE[s]
  return { className: e.className, label: e.label }
}

function getSeverityIcon(s: Severity): LucideIcon {
  return SEVERITY_BADGE[s].icon
}

const STATUS_BADGE: Record<ViolationStatus, { className: string; label: string; icon: LucideIcon }> = {
  excludable: { className: 'bg-red-700 text-white gap-1', label: 'Подлежит исключению', icon: Ban },
  fixed: { className: 'bg-emerald-700 text-white gap-1', label: 'Исправлено', icon: CheckCircle2 },
  disputed: { className: 'bg-amber-600 text-white gap-1', label: 'Оспаривается', icon: ShieldAlert },
  'taken-by-court': { className: 'bg-stone-600 text-white gap-1', label: 'Принято судом', icon: Gavel },
}

function getStatusBadge(s: ViolationStatus): { className: string; label: string } {
  const e = STATUS_BADGE[s]
  return { className: e.className, label: e.label }
}

function getStatusIcon(s: ViolationStatus): LucideIcon {
  return STATUS_BADGE[s].icon
}

function getArticleColor(key: string): { bg: string; text: string; hex: string } {
  const entry = ARTICLE_CHART_DATA.find((a) => a.key === key)
  if (!entry) return { bg: 'bg-stone-600', text: 'text-white', hex: '#57534e' }
  const map: Record<string, { bg: string; text: string; hex: string }> = {
    '170': { bg: 'bg-stone-600', text: 'text-white', hex: '#57534e' },
    '182': { bg: 'bg-red-700', text: 'text-white', hex: '#b91c1c' },
    '189': { bg: 'bg-amber-600', text: 'text-white', hex: '#d97706' },
    '195': { bg: 'bg-purple-700', text: 'text-white', hex: '#7e22ce' },
    '217': { bg: 'bg-orange-600', text: 'text-white', hex: '#ea580c' },
    '164': { bg: 'bg-red-900', text: 'text-white', hex: '#7f1d1d' },
  }
  return map[key] ?? { bg: 'bg-stone-600', text: 'text-white', hex: entry.color }
}

function getImpactColorClass(score: number): string {
  if (score >= 80) return 'bg-red-700'
  if (score >= 50) return 'bg-amber-600'
  return 'bg-stone-500'
}

function getImpactTextColorClass(score: number): string {
  if (score >= 80) return 'text-red-700 dark:text-red-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-stone-500 dark:text-stone-400'
}

function getImpactLabel(score: number): string {
  if (score >= 80) return 'Высокое влияние'
  if (score >= 50) return 'Среднее влияние'
  return 'Низкое влияние'
}

const STATUS_HISTORY_COLOR: Record<StatusHistoryEntry['color'], string> = {
  red: 'bg-red-600',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-600',
  stone: 'bg-stone-400',
  purple: 'bg-purple-700',
}

const STATUS_HISTORY_BADGE: Record<StatusHistoryEntry['color'], string> = {
  red: 'bg-red-700 text-white',
  amber: 'bg-amber-600 text-white',
  emerald: 'bg-emerald-700 text-white',
  stone: 'bg-stone-600 text-white',
  purple: 'bg-purple-700 text-white',
}

// ============================================================================
// Подкомпонент: Плитка статистики
// ============================================================================

interface StatTileProps {
  label: string
  value: string | number
  color: 'red' | 'amber' | 'emerald' | 'purple'
  icon: LucideIcon
}

function StatTile({ label, value, color, icon: Icon }: StatTileProps) {
  const palette: Record<string, { bg: string; ring: string; text: string }> = {
    red: { bg: 'bg-red-700/15 dark:bg-red-950/30', ring: 'ring-red-700/20', text: 'text-red-700 dark:text-red-400' },
    amber: { bg: 'bg-amber-600/15 dark:bg-amber-950/30', ring: 'ring-amber-600/20', text: 'text-amber-600 dark:text-amber-400' },
    emerald: { bg: 'bg-emerald-700/15 dark:bg-emerald-950/30', ring: 'ring-emerald-700/20', text: 'text-emerald-700 dark:text-emerald-400' },
    purple: { bg: 'bg-purple-700/15 dark:bg-purple-950/30', ring: 'ring-purple-700/20', text: 'text-purple-700 dark:text-purple-400' },
  }
  const c = palette[color]
  return (
    <div className={`rounded-xl ${c.bg} ring-1 ${c.ring} p-3 min-w-0`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${c.text} shrink-0`} />
        <span className="text-[11px] text-muted-foreground truncate">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${c.text}`}>{value}</p>
    </div>
  )
}

// ============================================================================
// Подкомпонент: Прогресс-бар с кастомным цветом
// ============================================================================

interface ColoredProgressProps {
  value: number
  colorClass: string
  height?: string
}

function ColoredProgress({ value, colorClass, height = 'h-2.5' }: ColoredProgressProps) {
  const safe = Math.max(0, Math.min(100, value))
  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-full bg-muted`}>
      <div
        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  )
}

// ============================================================================
// Подкомпонент: Секция 1 — Шапка-баннер
// ============================================================================

function HeaderBanner() {
  const total = VIOLATIONS.length
  const critical = VIOLATIONS.filter((v) => v.severity === 'critical').length
  const excludable = VIOLATIONS.filter((v) => v.status === 'excludable').length
  const fixed = VIOLATIONS.filter((v) => v.status === 'fixed').length

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden border-l-4 border-l-red-700 bg-gradient-to-r from-red-900/30 via-orange-900/20 to-stone-900/20">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Левая часть: иконка + заголовок */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-red-700/20 flex items-center justify-center shrink-0 ring-1 ring-red-700/30">
              <Gavel className="w-7 h-7 text-red-700 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  Реестр процессуальных нарушений
                </h2>
                <Badge className="bg-red-700 text-white gap-1">
                  <AlertOctagon className="w-3 h-3" />
                  УПК РФ
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Выявленные нарушения УПК РФ, их тяжесть и основания для исключения доказательств по делу № 2024-00145
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Scale className="w-3 h-3 text-red-700" />
                  ст. 159 ч.3 · ст. 160 ч.2
                </span>
                <span className="text-stone-400">•</span>
                <span className="flex items-center gap-1">
                  <Gavel className="w-3 h-3 text-purple-700" />
                  Колесниченко Д.А.
                </span>
                <span className="text-stone-400">•</span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-stone-500" />
                  ст. 75, 88, 164, 170, 182, 189, 195, 217 УПК РФ
                </span>
              </div>
            </div>
          </div>

          {/* Правая часть: 4 плитки статистики */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2 lg:max-w-md xl:max-w-2xl">
            <StatTile label="Всего нарушений" value={total} color="red" icon={AlertOctagon} />
            <StatTile label="Критических" value={critical} color="red" icon={AlertTriangle} />
            <StatTile label="Подлежат исключению" value={excludable} color="amber" icon={Ban} />
            <StatTile label="Исправлено" value={fixed} color="emerald" icon={CheckCircle2} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Подкомпонент: Секция 2 — Диаграммы (BarChart + PieChart + Карточка потенциала защиты)
// ============================================================================

function ChartsSection() {
  const excludableCount = VIOLATIONS.filter((v) => v.status === 'excludable').length
  const totalImpact = VIOLATIONS.reduce((sum, v) => sum + v.impactScore, 0)
  const maxImpact = VIOLATIONS.length * 100
  const defensePotential = Math.round((totalImpact / maxImpact) * 100)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Диаграмма: распределение по тяжести */}
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-red-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            Распределение по тяжести
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer
            config={{
              count: { label: 'Нарушений', color: '#dc2626' },
            }}
            className="h-[180px] w-full"
          >
            <BarChart data={SEVERITY_CHART_DATA} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="short"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={26}>
                {SEVERITY_CHART_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="flex items-center justify-around mt-2 text-xs">
            {SEVERITY_CHART_DATA.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground">{s.severity}</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 tabular-nums">{s.count}</Badge>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Диаграмма: распределение по статьям УПК */}
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-purple-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-700" />
            По статьям УПК РФ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer
            config={{ count: { label: 'Нарушений', color: '#7e22ce' } }}
            className="h-[180px] w-full"
          >
            <PieChart>
              <Pie
                data={ARTICLE_CHART_DATA}
                dataKey="count"
                nameKey="article"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={2}
              >
                {ARTICLE_CHART_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
            {ARTICLE_CHART_DATA.map((a, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
                <span className="font-mono text-xs truncate">{a.article}</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 tabular-nums shrink-0 ml-auto">{a.count}</Badge>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Карточка: Потенциал защиты */}
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-purple-950/20 via-card to-red-950/10 border-t-2 border-t-amber-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            Потенциал защиты
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">Суммарный потенциал исключения</p>
              <p className={`text-4xl font-bold tabular-nums ${getImpactTextColorClass(defensePotential)}`}>
                {defensePotential}<span className="text-xl">/100</span>
              </p>
            </div>
            <Badge className="bg-purple-700 text-white gap-1">
              <ShieldCheck className="w-3 h-3" />
              {defensePotential > 60 ? 'Высокий' : defensePotential > 30 ? 'Средний' : 'Низкий'}
            </Badge>
          </div>
          <ColoredProgress
            value={defensePotential}
            colorClass={defensePotential > 60 ? 'bg-red-700' : defensePotential > 30 ? 'bg-amber-600' : 'bg-stone-500'}
            height="h-3"
          />
          <div className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Ban className="w-3 h-3 text-red-700" />
                Подлежит исключению
              </span>
              <span className="font-bold text-red-700 tabular-nums">{excludableCount} наруш.</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Ключевые доказательства
              </span>
              <span className="font-bold text-amber-600 tabular-nums">3 шт.</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3 text-purple-700" />
                Ходатайств подготовлено
              </span>
              <span className="font-bold text-purple-700 tabular-nums">5 шт.</span>
            </div>
          </div>
          {defensePotential > 60 && (
            <div className="rounded-md bg-red-700/10 border border-red-700/30 p-2 text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Высокий потенциал для исключения ключевых доказательств обвинения.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Подкомпонент: Секция 3 — Панель фильтров
// ============================================================================

interface FiltersBarProps {
  search: string
  setSearch: (v: string) => void
  severityFilter: 'all' | Severity
  setSeverityFilter: (v: 'all' | Severity) => void
  articleFilter: 'all' | string
  setArticleFilter: (v: 'all' | string) => void
  statusFilter: 'all' | ViolationStatus
  setStatusFilter: (v: 'all' | ViolationStatus) => void
  sortBy: SortKey
  setSortBy: (v: SortKey) => void
  onReset: () => void
  activeCount: number
  totalFiltered: number
}

function FiltersBar({
  search,
  setSearch,
  severityFilter,
  setSeverityFilter,
  articleFilter,
  setArticleFilter,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  onReset,
  activeCount,
  totalFiltered,
}: FiltersBarProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            Фильтры и поиск
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs tabular-nums gap-1">
              <ListChecks className="w-3 h-3" />
              Найдено: {totalFiltered}
            </Badge>
            {activeCount > 0 && (
              <Badge className="text-xs bg-amber-600 text-white gap-1">
                <Filter className="w-3 h-3" />
                Активно: {activeCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2 flex-wrap">
          {/* Поиск */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Поиск по нарушениям..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Очистить поиск"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Тяжесть */}
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as 'all' | Severity)}>
            <SelectTrigger className="h-9 w-full md:w-[160px] text-sm">
              <SelectValue placeholder="Тяжесть" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все тяжести</SelectItem>
              <SelectItem value="critical">Критические</SelectItem>
              <SelectItem value="serious">Серьёзные</SelectItem>
              <SelectItem value="moderate">Умеренные</SelectItem>
            </SelectContent>
          </Select>

          {/* Статья */}
          <Select value={articleFilter} onValueChange={setArticleFilter}>
            <SelectTrigger className="h-9 w-full md:w-[150px] text-sm">
              <SelectValue placeholder="Статья" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статьи</SelectItem>
              <SelectItem value="170">ст. 170 УПК РФ</SelectItem>
              <SelectItem value="182">ст. 182 УПК РФ</SelectItem>
              <SelectItem value="189">ст. 189 УПК РФ</SelectItem>
              <SelectItem value="195">ст. 195 УПК РФ</SelectItem>
              <SelectItem value="217">ст. 217 УПК РФ</SelectItem>
              <SelectItem value="164">ст. 164 УПК РФ</SelectItem>
            </SelectContent>
          </Select>

          {/* Статус */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | ViolationStatus)}>
            <SelectTrigger className="h-9 w-full md:w-[180px] text-sm">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="excludable">Подлежит исключению</SelectItem>
              <SelectItem value="disputed">Оспаривается</SelectItem>
              <SelectItem value="fixed">Исправлено</SelectItem>
              <SelectItem value="taken-by-court">Принято судом</SelectItem>
            </SelectContent>
          </Select>

          {/* Сортировка */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-full md:w-[180px] text-sm">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">По дате (новые)</SelectItem>
              <SelectItem value="date-asc">По дате (старые)</SelectItem>
              <SelectItem value="severity">По тяжести</SelectItem>
              <SelectItem value="article">По статье</SelectItem>
            </SelectContent>
          </Select>

          {/* Сбросить */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={activeCount === 0}
            className="h-9 text-sm gap-1"
          >
            <RotateCcwIcon />
            Сбросить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Вспомогательный компонент: иконка RotateCcw (т.к. не импортирован напрямую)
function RotateCcwIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

// ============================================================================
// Подкомпонент: Секция 4 — Таблица нарушений
// ============================================================================

interface ViolationsTableProps {
  violations: Violation[]
  onSelect: (v: Violation) => void
  petitionItems: Set<string>
  togglePetition: (id: string) => void
}

function ViolationsTable({ violations, onSelect, petitionItems, togglePetition }: ViolationsTableProps) {
  if (violations.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-12 text-center">
          <AlertOctagon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Нарушения не найдены</p>
          <p className="text-xs text-muted-foreground mt-1">Измените параметры фильтрации или сбросьте фильтры</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-red-700" />
          Реестр нарушений
          <Badge variant="outline" className="text-xs tabular-nums">{violations.length} из {VIOLATIONS.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[44px] text-center">№</TableHead>
                <TableHead className="min-w-[100px]">Дата выявления</TableHead>
                <TableHead className="min-w-[110px]">Статья УПК</TableHead>
                <TableHead className="min-w-[180px]">Тип нарушения</TableHead>
                <TableHead className="min-w-[260px]">Описание</TableHead>
                <TableHead className="min-w-[180px]">Доказательство</TableHead>
                <TableHead className="min-w-[110px]">Тяжесть</TableHead>
                <TableHead className="min-w-[150px]">Статус</TableHead>
                <TableHead className="min-w-[120px] text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((v, idx) => {
                const sev = getSeverityBadge(v.severity)
                const SevIcon = getSeverityIcon(v.severity)
                const st = getStatusBadge(v.status)
                const StIcon = getStatusIcon(v.status)
                const articleCol = getArticleColor(v.articleKey)
                const inPetition = petitionItems.has(v.id)
                return (
                  <TableRow
                    key={v.id}
                    className={`cursor-pointer transition-colors ${idx % 2 === 1 ? 'bg-muted/30' : ''} hover:bg-red-50/50 dark:hover:bg-red-950/20`}
                    onClick={() => onSelect(v)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground text-center tabular-nums">
                      {v.id.replace('v', '')}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">
                      {formatDate(v.date)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${articleCol.bg} ${articleCol.text} text-xs font-mono gap-1`}>
                        <Scale className="w-3 h-3" />
                        {v.articleKey}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="line-clamp-1 max-w-[220px]">{v.type}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="line-clamp-1 max-w-[300px] text-muted-foreground cursor-help">
                              {v.description}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[400px] whitespace-normal">
                            <p className="text-xs leading-relaxed">{v.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1 max-w-[180px]">{v.evidence}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${sev.className} text-xs`}>
                        <SevIcon className="w-3 h-3" />
                        {sev.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${st.className} text-xs`}>
                        <StIcon className="w-3 h-3" />
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => onSelect(v)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Подробнее</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 w-7 p-0 ${inPetition ? 'text-purple-700 dark:text-purple-400' : ''}`}
                                onClick={() => togglePetition(v.id)}
                              >
                                {inPetition ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {inPetition ? 'В ходатайстве' : 'Добавить в ходатайство'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Подкомпонент: Секция 5 — Sheet с деталями нарушения
// ============================================================================

interface DetailSheetProps {
  violation: Violation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToPetition: (id: string) => void
  inPetition: boolean
}

function DetailSheet({ violation, open, onOpenChange, onAddToPetition, inPetition }: DetailSheetProps) {
  if (!violation) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg" />
      </Sheet>
    )
  }

  const sev = SEVERITY_BADGE[violation.severity]
  const st = STATUS_BADGE[violation.status]
  const SevIcon = sev.icon
  const StIcon = st.icon
  const articleCol = getArticleColor(violation.articleKey)

  const headerBg =
    violation.severity === 'critical'
      ? 'from-red-900/40 via-card to-card border-l-red-700'
      : violation.severity === 'serious'
        ? 'from-amber-900/30 via-card to-card border-l-amber-600'
        : 'from-stone-700/30 via-card to-card border-l-stone-600'

  const impactColor = getImpactColorClass(violation.impactScore)
  const impactText = getImpactTextColorClass(violation.impactScore)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className={`bg-gradient-to-r ${headerBg} border-l-4 rounded-r-lg`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SevIcon className="w-4 h-4" />
            <span>Нарушение {violation.id.toUpperCase()}</span>
            <span className="text-stone-400">•</span>
            <Clock className="w-3 h-3" />
            <span className="tabular-nums">{formatDate(violation.date)}</span>
          </div>
          <SheetTitle className="text-base leading-tight">{violation.type}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={`${sev.className} text-xs`}>
              <SevIcon className="w-3 h-3" />
              {sev.label}
            </Badge>
            <Badge className={`${st.className} text-xs`}>
              <StIcon className="w-3 h-3" />
              {st.label}
            </Badge>
            <Badge className={`${articleCol.bg} ${articleCol.text} text-xs font-mono gap-1`}>
              <Scale className="w-3 h-3" />
              {violation.article}
            </Badge>
          </div>
          <SheetDescription className="sr-only">
            Детали процессуального нарушения по делу № 2024-00145
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Описание нарушения */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Описание нарушения
            </p>
            <p className="text-sm leading-relaxed whitespace-normal">{violation.description}</p>
          </div>

          <Separator />

          {/* Правовая основа */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Scale className="w-3 h-3" />
              Правовая основа
            </p>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
              <p className="text-xs leading-relaxed text-purple-900 dark:text-purple-100 whitespace-normal">
                {violation.legalBasis}
              </p>
            </div>
          </div>

          {/* Доказательство нарушения */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Доказательство нарушения
            </p>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
              <p className="text-xs leading-relaxed">{violation.evidence}</p>
            </div>
          </div>

          {/* Оценка влияния */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Оценка влияния на дело
            </p>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">{getImpactLabel(violation.impactScore)}</p>
                  <p className={`text-3xl font-bold tabular-nums ${impactText}`}>
                    {violation.impactScore}<span className="text-lg text-muted-foreground">/100</span>
                  </p>
                </div>
                <Badge variant="outline" className="text-xs tabular-nums">
                  Влияние: {violation.impactScore}%
                </Badge>
              </div>
              <ColoredProgress value={violation.impactScore} colorClass={impactColor} height="h-2.5" />
            </div>
          </div>

          {/* Рекомендуемые действия */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Рекомендуемые действия защиты
            </p>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-100 whitespace-normal">
                {violation.remediation}
              </p>
            </div>
          </div>

          {/* Связанные документы */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ClipboardList className="w-3 h-3" />
              Связанные документы ({violation.relatedDocs.length})
            </p>
            <ul className="space-y-1.5">
              {violation.relatedDocs.map((doc, i) => (
                <li
                  key={i}
                  className="text-xs flex items-start gap-2 p-2 rounded-md bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer group"
                  onClick={() => toast.info(`Открытие документа: ${doc}`)}
                >
                  <FileText className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0 group-hover:text-foreground" />
                  <span className="leading-relaxed group-hover:text-foreground">{doc}</span>
                  <ChevronRight className="w-3 h-3 mt-0.5 ml-auto shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* История статусов */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <History className="w-3 h-3" />
              История статусов
            </p>
            <div className="relative pl-6 space-y-3 py-1">
              {violation.statusHistory.map((entry, i) => (
                <div key={i} className="relative">
                  <div
                    className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${STATUS_HISTORY_COLOR[entry.color]} ring-2 ring-background`}
                  />
                  {i < violation.statusHistory.length - 1 && (
                    <div className="absolute -left-[19px] top-4 w-0.5 h-full bg-stone-300 dark:bg-stone-600" />
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${STATUS_HISTORY_BADGE[entry.color]} text-xs tabular-nums`}>
                      {formatDate(entry.date)}
                    </Badge>
                    <span className="text-xs">{entry.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t bg-muted/30">
          <Button
            className={`gap-1 ${inPetition ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-purple-700 hover:bg-purple-800'} text-white`}
            onClick={() => onAddToPetition(violation.id)}
          >
            {inPetition ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                В ходатайстве
              </>
            ) : (
              <>
                <ScrollText className="w-4 h-4" />
                Добавить в ходатайство
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Подкомпонент: Секция 6 — Конструктор ходатайства
// ============================================================================

interface PetitionBuilderProps {
  petitionItems: Set<string>
  violations: Violation[]
  onGenerate: () => void
  onDownloadTemplate: () => void
  onClear: () => void
}

function PetitionBuilder({
  petitionItems,
  violations,
  onGenerate,
  onDownloadTemplate,
  onClear,
}: PetitionBuilderProps) {
  // По умолчанию выбираем все excludable
  const excludable = violations.filter((v) => v.status === 'excludable')
  const selectedViolations = violations.filter((v) => petitionItems.has(v.id))
  const displayList = selectedViolations.length > 0 ? selectedViolations : excludable
  const displayCount = selectedViolations.length > 0 ? selectedViolations.length : excludable.length

  const keyEvidenceCount = displayList.filter((v) => v.impactScore >= 75).length

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-l-red-700 bg-gradient-to-r from-red-950/15 via-purple-950/10 to-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-red-700" />
              Конструктор ходатайства об исключении доказательств
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Выбранные нарушения будут включены в ходатайство
            </p>
          </div>
          <Badge className="bg-red-700 text-white gap-1 tabular-nums shrink-0">
            <Ban className="w-3 h-3" />
            {displayCount} наруш. подлежит исключению
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Список выбранных нарушений */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ListChecks className="w-3 h-3" />
              {selectedViolations.length > 0 ? 'Выбранные нарушения' : 'Нарушения, подлежащие исключению (по умолчанию)'}
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-2 max-h-44 overflow-y-auto">
              <ul className="space-y-1.5">
                {displayList.slice(0, 5).map((v) => {
                  const articleCol = getArticleColor(v.articleKey)
                  return (
                    <li key={v.id} className="text-xs flex items-start gap-2">
                      <Badge className={`${articleCol.bg} ${articleCol.text} text-[10px] font-mono px-1.5 py-0 h-4 shrink-0`}>
                        {v.articleKey}
                      </Badge>
                      <span className="leading-relaxed line-clamp-1">{v.type}</span>
                    </li>
                  )
                })}
                {displayList.length > 5 && (
                  <li className="text-[11px] text-muted-foreground italic pl-1">
                    + ещё {displayList.length - 5} нарушений
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Оценка влияния */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Прогноз исключения
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Всего в ходатайстве:</span>
                <span className="font-bold text-stone-900 dark:text-stone-50 tabular-nums">{displayCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Ключевых доказательств:</span>
                <span className="font-bold text-red-700 dark:text-red-400 tabular-nums">{keyEvidenceCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Среднее влияние:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {displayList.length > 0
                    ? Math.round(displayList.reduce((s, v) => s + v.impactScore, 0) / displayList.length)
                    : 0}
                  /100
                </span>
              </div>
              <Separator />
              <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Потенциальное исключение {keyEvidenceCount} ключевых доказательств обвинения
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-red-700 hover:bg-red-800 text-white gap-1"
              onClick={onGenerate}
            >
              <ScrollText className="w-4 h-4" />
              Сформировать ходатайство
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={onDownloadTemplate}
            >
              <FileText className="w-4 h-4" />
              Скачать шаблон
            </Button>
          </div>
          {selectedViolations.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs"
              onClick={onClear}
            >
              <X className="w-3.5 h-3.5" />
              Очистить выбор ({selectedViolations.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Главный компонент: CaseViolations
// ============================================================================

export function CaseViolations() {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all')
  const [articleFilter, setArticleFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ViolationStatus>('all')
  const [sortBy, setSortBy] = useState<SortKey>('date-desc')
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  // По умолчанию в ходатайстве — все нарушения со статусом excludable
  const [petitionItems, setPetitionItems] = useState<Set<string>>(
    () => new Set(VIOLATIONS.filter((v) => v.status === 'excludable').map((v) => v.id))
  )

  const handleSelect = useCallback((v: Violation) => {
    setSelectedViolation(v)
    setSheetOpen(true)
  }, [])

  const handleTogglePetition = useCallback((id: string) => {
    setPetitionItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleAddToPetition = useCallback(
    (id: string) => {
      const wasIn = petitionItems.has(id)
      handleTogglePetition(id)
      if (wasIn) {
        toast.info('Нарушение удалено из ходатайства')
      } else {
        const v = VIOLATIONS.find((x) => x.id === id)
        toast.success(`Нарушение добавлено в ходатайство`, {
          description: v ? v.type : undefined,
        })
      }
    },
    [petitionItems, handleTogglePetition]
  )

  const handleResetFilters = useCallback(() => {
    setSearch('')
    setSeverityFilter('all')
    setArticleFilter('all')
    setStatusFilter('all')
    setSortBy('date-desc')
  }, [])

  const handleGenerate = useCallback(() => {
    toast.success('Ходатайство сформировано. Открыть редактор?', {
      description: `Включено нарушений: ${petitionItems.size || VIOLATIONS.filter((v) => v.status === 'excludable').length}`,
      action: {
        label: 'Открыть',
        onClick: () => toast.info('Открытие редактора ходатайств...'),
      },
    })
  }, [petitionItems])

  const handleDownloadTemplate = useCallback(() => {
    try {
      const template = `ХОДАТАЙСТВО\nоб исключении доказательств\n\nВ производстве следователя (дознавателя) находится уголовное дело № 2024-00145\nпо обвинению Колесниченко Д.А. по ст. 159 ч.3, ст. 160 ч.2 УК РФ.\n\nЗащита заявляет ходатайство об исключении следующих доказательств\nкак недопустимых в порядке ст. 75, 88 УПК РФ:\n\n${VIOLATIONS.filter((v) => v.status === 'excludable').map((v, i) => `${i + 1}. ${v.type} (${v.article}) — ${v.evidence}`).join('\n')}\n\nОснование: ч. 1 ст. 75 УПК РФ, Постановление Пленума ВС РФ №1 от 31.10.1995.\n\nЗащитник ___________________ /___________________/\n\nДата: «___» ___________ 2024 г.`
      const blob = new Blob([template], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hodataystvo-isobshenie-dokazatelstv.txt'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Шаблон ходатайства сохранён в загрузки')
    } catch {
      toast.error('Не удалось сохранить шаблон')
    }
  }, [])

  const handleClearPetition = useCallback(() => {
    setPetitionItems(new Set())
    toast.info('Выбор нарушений очищен')
  }, [])

  // Активные фильтры
  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.trim()) n++
    if (severityFilter !== 'all') n++
    if (articleFilter !== 'all') n++
    if (statusFilter !== 'all') n++
    if (sortBy !== 'date-desc') n++
    return n
  }, [search, severityFilter, articleFilter, statusFilter, sortBy])

  // Фильтрация и сортировка
  const filteredViolations = useMemo(() => {
    const sevRank: Record<Severity, number> = { critical: 3, serious: 2, moderate: 1 }
    let arr = VIOLATIONS.filter((v) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matches =
          v.type.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.article.toLowerCase().includes(q) ||
          v.evidence.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (severityFilter !== 'all' && v.severity !== severityFilter) return false
      if (articleFilter !== 'all' && v.articleKey !== articleFilter) return false
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      return true
    })

    arr = arr.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'severity':
          return sevRank[b.severity] - sevRank[a.severity]
        case 'article':
          return a.articleKey.localeCompare(b.articleKey)
        default:
          return 0
      }
    })

    return arr
  }, [search, severityFilter, articleFilter, statusFilter, sortBy])

  return (
    <div className="space-y-6 pb-8">
      {/* Секция 1: Шапка-баннер */}
      <HeaderBanner />

      {/* Секция 2: Диаграммы распределения + Потенциал защиты */}
      <ChartsSection />

      {/* Секция 3: Панель фильтров */}
      <FiltersBar
        search={search}
        setSearch={setSearch}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        articleFilter={articleFilter}
        setArticleFilter={setArticleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onReset={handleResetFilters}
        activeCount={activeFilterCount}
        totalFiltered={filteredViolations.length}
      />

      {/* Секция 4: Таблица нарушений */}
      <ViolationsTable
        violations={filteredViolations}
        onSelect={handleSelect}
        petitionItems={petitionItems}
        togglePetition={handleTogglePetition}
      />

      {/* Секция 6: Конструктор ходатайства (под таблицей) */}
      <PetitionBuilder
        petitionItems={petitionItems}
        violations={VIOLATIONS}
        onGenerate={handleGenerate}
        onDownloadTemplate={handleDownloadTemplate}
        onClear={handleClearPetition}
      />

      {/* Секция 5: Sheet с деталями нарушения (открывается по клику) */}
      <DetailSheet
        violation={selectedViolation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAddToPetition={handleAddToPetition}
        inPetition={selectedViolation ? petitionItems.has(selectedViolation.id) : false}
      />
    </div>
  )
}
