'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Minus,
  AlertTriangle,
  Star,
  Filter,
  ArrowUpDown,
  Activity,
  MessageSquare,
  FileText,
  Shield,
  Eye,
  TrendingDown,
  Flame,
} from 'lucide-react'

// ============================================================================
// Типы данных
// ============================================================================

type Position = 'confirm' | 'deny' | 'dont-remember' | 'no-data'

type WitnessRole =
  | 'обвиняемый'
  | 'соучастник'
  | 'свидетель'
  | 'свидетель алиби'
  | 'потерпевшая'
  | 'эксперт'

interface WitnessPosition {
  position: Position
  confidence: number // 0..100
  statement: string
  contradictsOthers: boolean
  relatedDocuments: string[]
}

interface Witness {
  id: string
  name: string
  role: WitnessRole
  statementDate: string
  positions: Record<string, WitnessPosition>
}

interface Fact {
  id: string
  text: string
}

type SortKey = 'name' | 'reliability' | 'contradictions'

// ============================================================================
// Моковые данные
// ============================================================================

const FACTS: Fact[] = [
  { id: 'F1', text: 'Присутствие Колесниченко на встрече 15.03' },
  { id: 'F2', text: 'Передача денежных средств' },
  { id: 'F3', text: 'Наличие умысла на хищение' },
  { id: 'F4', text: 'Алиби Колесниченко на 15.03' },
  { id: 'F5', text: 'Использование служебного положения' },
  { id: 'F6', text: 'Размер ущерба (особо крупный)' },
  { id: 'F7', text: 'Факт обыска без адвоката' },
  { id: 'F8', text: 'Подлинность финансовых документов' },
]

const WITNESSES: Witness[] = [
  {
    id: 'W1',
    name: 'Колесниченко Д.А.',
    role: 'обвиняемый',
    statementDate: '2024-04-12',
    positions: {
      F1: {
        position: 'deny',
        confidence: 90,
        statement:
          'Я не присутствовал на встрече 15 марта. В этот день находился у своего знакомого Козлова В.Н., что подтверждается показаниями свидетеля алиби.',
        contradictsOthers: true,
        relatedDocuments: ['Показания обвиняемого т.3 л.д. 45-48', 'Протокол допроса №12'],
      },
      F2: {
        position: 'deny',
        confidence: 95,
        statement:
          'Никаких денежных средств я не передавал и не получал. Утверждения Сидорова А.П. и потерпевшей Ивановой М.С. являются ложными.',
        contradictsOthers: true,
        relatedDocuments: ['Показания обвиняемого т.3 л.д. 45-48'],
      },
      F3: {
        position: 'deny',
        confidence: 100,
        statement:
          'Умысла на хищение у меня не было. Все действия совершались в рамках договорных обязательств, о чём имеются платёжные поручения.',
        contradictsOthers: true,
        relatedDocuments: ['Возражения на обвинение т.5 л.д. 110-115'],
      },
      F4: {
        position: 'confirm',
        confidence: 85,
        statement:
          '15 марта 2024 года с 14:00 до 18:00 я находился по адресу г. Москва, ул. Лесная, д. 12, кв. 45, у Козлова В.Н. Это подтверждается записями с камер видеонаблюдения подъезда.',
        contradictsOthers: true,
        relatedDocuments: ['Показания обвиняемого т.3 л.д. 45-48', 'Запись с камер наблюдения'],
      },
      F5: {
        position: 'deny',
        confidence: 80,
        statement:
          'Служебное положение я не использовал. Все операции производились в личном качестве, без привлечения ресурсов организации.',
        contradictsOthers: true,
        relatedDocuments: ['Возражения на обвинение т.5 л.д. 110-115'],
      },
      F6: {
        position: 'deny',
        confidence: 70,
        statement:
          'Размер ущерба, указанный следствием, не соответствует действительности. Реальные финансовые потери потерпевшей составляют существенно меньшую сумму.',
        contradictsOthers: true,
        relatedDocuments: ['Заключение специалиста защиты от 15.06.2024'],
      },
      F7: {
        position: 'confirm',
        confidence: 95,
        statement:
          'Обыск в моей квартире 20 марта 2024 года проводился в отсутствие адвоката, что является существенным нарушением ч.3 ст.182 УПК РФ.',
        contradictsOthers: false,
        relatedDocuments: ['Протокол обыска т.2 л.д. 88-94', 'Жалоба в порядке ст.125 УПК РФ'],
      },
      F8: {
        position: 'deny',
        confidence: 60,
        statement:
          'Финансовые документы, изъятые в ходе обыска, являются подложными и не были составлены мной. Требую проведения повторной почерковедческой экспертизы.',
        contradictsOthers: true,
        relatedDocuments: ['Ходатайство о повторной экспертизе т.6 л.д. 22-25'],
      },
    },
  },
  {
    id: 'W2',
    name: 'Сидоров А.П.',
    role: 'соучастник',
    statementDate: '2024-04-20',
    positions: {
      F1: {
        position: 'confirm',
        confidence: 95,
        statement:
          'Колесниченко Д.А. лично присутствовал на встрече 15 марта 2024 года и участвовал в обсуждении условий передачи денежных средств.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Сидорова А.П. т.4 л.д. 12-18'],
      },
      F2: {
        position: 'confirm',
        confidence: 90,
        statement:
          'Передача денежных средств в размере 2,5 млн рублей состоялась в присутствии Колесниченко Д.А. и Ивановой М.С.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Сидорова А.П. т.4 л.д. 12-18'],
      },
      F3: {
        position: 'confirm',
        confidence: 85,
        statement:
          'Умысел на хищение денежных средств возник у Колесниченко Д.А. заранее, о чём он неоднократно высказывался в моём присутствии.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Сидорова А.П. т.4 л.д. 12-18'],
      },
      F4: {
        position: 'deny',
        confidence: 80,
        statement:
          'Утверждение Колесниченко Д.А. об алиби является ложным. Козлов В.Н. — его давний знакомый, который оговаривает следствие в его интересах.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Сидорова А.П. т.4 л.д. 12-18', 'Протокол очной ставки'],
      },
      F5: {
        position: 'confirm',
        confidence: 75,
        statement:
          'Колесниченко Д.А. использовал своё служебное положение руководителя отдела для обеспечения совершения хищения.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Сидорова А.П. т.4 л.д. 12-18'],
      },
      F6: {
        position: 'confirm',
        confidence: 70,
        statement:
          'Размер ущерба является особо крупным и, по моим сведениям, превышает 2,5 млн рублей, что соответствует особо крупному размеру.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Сидорова А.П. т.4 л.д. 12-18'],
      },
      F7: {
        position: 'no-data',
        confidence: 0,
        statement: 'По обстоятельствам проведения обыска показаний не давал.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F8: {
        position: 'confirm',
        confidence: 80,
        statement:
          'Финансовые документы, изъятые у Колесниченко Д.А., являются подлинными и составлялись в моём присутствии.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Сидорова А.П. т.4 л.д. 12-18'],
      },
    },
  },
  {
    id: 'W3',
    name: 'Петров И.В.',
    role: 'свидетель',
    statementDate: '2024-05-03',
    positions: {
      F1: {
        position: 'confirm',
        confidence: 80,
        statement:
          'Я видел Колесниченко Д.А. в здании по адресу ул. Тверская, д. 18, 15 марта около 15:00, что совпадает с указанной встречей.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Петрова И.В. т.3 л.д. 102-105'],
      },
      F2: {
        position: 'dont-remember',
        confidence: 40,
        statement:
          'Передачу денежных средств я не видел, не могу подтвердить или опровергнуть данный факт.',
        contradictsOthers: false,
        relatedDocuments: ['Показания Петрова И.В. т.3 л.д. 102-105'],
      },
      F3: {
        position: 'no-data',
        confidence: 0,
        statement: 'Об умысле Колесниченко Д.А. мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F4: {
        position: 'no-data',
        confidence: 0,
        statement: 'Об алиби Колесниченко Д.А. мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F5: {
        position: 'no-data',
        confidence: 0,
        statement: 'По использованию служебного положения показаний не давал.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F6: {
        position: 'no-data',
        confidence: 0,
        statement: 'О размере ущерба мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F7: {
        position: 'no-data',
        confidence: 0,
        statement: 'Об обстоятельствах обыска мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F8: {
        position: 'no-data',
        confidence: 0,
        statement: 'О подлинности финансовых документов мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
    },
  },
  {
    id: 'W4',
    name: 'Козлов В.Н.',
    role: 'свидетель алиби',
    statementDate: '2024-05-10',
    positions: {
      F1: {
        position: 'deny',
        confidence: 85,
        statement:
          '15 марта Колесниченко Д.А. находился у меня дома, поэтому не мог присутствовать на указанной встрече. Утверждения других свидетелей ошибочны.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Козлова В.Н. т.3 л.д. 130-134'],
      },
      F2: {
        position: 'no-data',
        confidence: 0,
        statement: 'О передаче денежных средств мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F3: {
        position: 'no-data',
        confidence: 0,
        statement: 'Об умысле Колесниченко Д.А. мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F4: {
        position: 'confirm',
        confidence: 90,
        statement:
          'Подтверждаю, что 15 марта 2024 года Колесниченко Д.А. находился у меня дома с 14:00 до 18:00. Это подтверждается записями с камер видеонаблюдения моего подъезда.',
        contradictsOthers: true,
        relatedDocuments: ['Показания Козлова В.Н. т.3 л.д. 130-134', 'Запись с камер наблюдения'],
      },
      F5: {
        position: 'no-data',
        confidence: 0,
        statement: 'По использованию служебного положения показаний не давал.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F6: {
        position: 'no-data',
        confidence: 0,
        statement: 'О размере ущерба мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F7: {
        position: 'no-data',
        confidence: 0,
        statement: 'Об обстоятельствах обыска мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F8: {
        position: 'no-data',
        confidence: 0,
        statement: 'О подлинности финансовых документов мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
    },
  },
  {
    id: 'W5',
    name: 'Иванова М.С.',
    role: 'потерпевшая',
    statementDate: '2024-05-15',
    positions: {
      F1: {
        position: 'dont-remember',
        confidence: 30,
        statement:
          'Точно не помню, присутствовал ли Колесниченко Д.А. на встрече. На встрече было несколько человек.',
        contradictsOthers: false,
        relatedDocuments: ['Показания потерпевшей Ивановой М.С. т.2 л.д. 50-56'],
      },
      F2: {
        position: 'confirm',
        confidence: 90,
        statement:
          'Денежные средства в размере 2,5 млн рублей были мной переданы в ходе встречи 15 марта 2024 года.',
        contradictsOthers: true,
        relatedDocuments: ['Показания потерпевшей Ивановой М.С. т.2 л.д. 50-56', 'Расписка от 15.03.2024'],
      },
      F3: {
        position: 'confirm',
        confidence: 95,
        statement:
          'У Колесниченко Д.А. был явный умысел на хищение, так как он обещал оказать услуги, которые фактически не собирался предоставлять.',
        contradictsOthers: true,
        relatedDocuments: ['Показания потерпевшей Ивановой М.С. т.2 л.д. 50-56'],
      },
      F4: {
        position: 'no-data',
        confidence: 0,
        statement: 'Об алиби Колесниченко Д.А. мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F5: {
        position: 'confirm',
        confidence: 70,
        statement:
          'Колесниченко Д.А. представился мне как руководитель отдела и использовал это при убеждении передать денежные средства.',
        contradictsOthers: true,
        relatedDocuments: ['Показания потерпевшей Ивановой М.С. т.2 л.д. 50-56'],
      },
      F6: {
        position: 'confirm',
        confidence: 100,
        statement:
          'Размер причинённого мне ущерба составляет 2,5 млн рублей, что, согласно заключению эксперта, является особо крупным размером.',
        contradictsOthers: true,
        relatedDocuments: ['Показания потерпевшей Ивановой М.С. т.2 л.д. 50-56', 'Гражданский иск'],
      },
      F7: {
        position: 'no-data',
        confidence: 0,
        statement: 'Об обстоятельствах обыска мне ничего не известно.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F8: {
        position: 'confirm',
        confidence: 85,
        statement:
          'Финансовые документы, на основании которых я передавала денежные средства, являются подлинными и были оформлены надлежащим образом.',
        contradictsOthers: true,
        relatedDocuments: ['Показания потерпевшей Ивановой М.С. т.2 л.д. 50-56', 'Договор от 01.03.2024'],
      },
    },
  },
  {
    id: 'W6',
    name: 'Эксперт Смирнов',
    role: 'эксперт',
    statementDate: '2024-06-01',
    positions: {
      F1: {
        position: 'no-data',
        confidence: 0,
        statement: 'По факту присутствия Колесниченко Д.А. экспертиза не проводилась.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F2: {
        position: 'no-data',
        confidence: 0,
        statement: 'По факту передачи денежных средств экспертиза не проводилась.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F3: {
        position: 'dont-remember',
        confidence: 50,
        statement:
          'Вопрос о наличии умысла не входит в компетенцию эксперта и не может быть установлен судебной экспертизой.',
        contradictsOthers: false,
        relatedDocuments: ['Заключение эксперта №142/2024'],
      },
      F4: {
        position: 'no-data',
        confidence: 0,
        statement: 'По факту алиби экспертиза не проводилась.',
        contradictsOthers: false,
        relatedDocuments: [],
      },
      F5: {
        position: 'confirm',
        confidence: 75,
        statement:
          'Согласно исследованным документам, Колесниченко Д.А. использовал своё служебное положение для оформления соответствующих распоряжений.',
        contradictsOthers: true,
        relatedDocuments: ['Заключение эксперта №142/2024', 'Приказы организации'],
      },
      F6: {
        position: 'confirm',
        confidence: 90,
        statement:
          'Проведённая финансовая экспертиза установила размер ущерба в 2 547 000 рублей, что, согласно примечанию к ст.158 УК РФ, является особо крупным размером.',
        contradictsOthers: true,
        relatedDocuments: ['Заключение эксперта №142/2024', 'Бухгалтерская экспертиза'],
      },
      F7: {
        position: 'confirm',
        confidence: 80,
        statement:
          'В протоколе обыска отсутствует подпись адвоката, что является нарушением уголовно-процессуального законодательства.',
        contradictsOthers: false,
        relatedDocuments: ['Заключение эксперта №142/2024', 'Протокол обыска т.2 л.д. 88-94'],
      },
      F8: {
        position: 'confirm',
        confidence: 95,
        statement:
          'Проведённая почерковедческая и технико-криминалистическая экспертиза установила подлинность изъятых финансовых документов.',
        contradictsOthers: true,
        relatedDocuments: ['Заключение эксперта №142/2024', 'Почерковедческая экспертиза №7'],
      },
    },
  },
]

// ============================================================================
// Конфигурация отображения позиций
// ============================================================================

const POSITION_CONFIG: Record<
  Position,
  {
    label: string
    short: string
    icon: React.ReactNode
    cellClass: string
    textClass: string
    badgeClass: string
  }
> = {
  confirm: {
    label: 'Подтверждает',
    short: 'Подтв.',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    cellClass: 'bg-emerald-700 text-white',
    textClass: 'text-emerald-700',
    badgeClass: 'bg-emerald-700 text-white',
  },
  deny: {
    label: 'Опровергает',
    short: 'Опров.',
    icon: <XCircle className="w-3.5 h-3.5" />,
    cellClass: 'bg-red-700 text-white',
    textClass: 'text-red-700',
    badgeClass: 'bg-red-700 text-white',
  },
  'dont-remember': {
    label: 'Не помнит',
    short: 'Не помнит',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    cellClass: 'bg-amber-600 text-white',
    textClass: 'text-amber-600',
    badgeClass: 'bg-amber-600 text-white',
  },
  'no-data': {
    label: 'Нет данных',
    short: '—',
    icon: <Minus className="w-3.5 h-3.5" />,
    cellClass: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
    textClass: 'text-stone-500',
    badgeClass: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200',
  },
}

const ROLE_TONE: Record<WitnessRole, string> = {
  обвиняемый: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  соучастник: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200',
  свидетель: 'bg-stone-100 text-stone-800 dark:bg-stone-800/50 dark:text-stone-200',
  'свидетель алиби': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  потерпевшая: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
  эксперт: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
}

// ============================================================================
// Вспомогательные функции
// ============================================================================

function countContradictions(w: Witness): number {
  return FACTS.reduce(
    (sum, f) => sum + (w.positions[f.id]?.contradictsOthers ? 1 : 0),
    0,
  )
}

function reliabilityStars(contradictions: number): number {
  if (contradictions <= 1) return 5
  if (contradictions <= 3) return 4
  if (contradictions <= 5) return 3
  if (contradictions <= 7) return 2
  return 1
}

function confidenceColor(c: number): string {
  if (c >= 85) return 'text-emerald-700'
  if (c >= 60) return 'text-amber-600'
  if (c > 0) return 'text-orange-600'
  return 'text-stone-400'
}

function confidenceBarClass(c: number): string {
  if (c >= 85) return '[&>div]:bg-emerald-700'
  if (c >= 60) return '[&>div]:bg-amber-600'
  if (c > 0) return '[&>div]:bg-orange-600'
  return '[&>div]:bg-stone-400'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// ============================================================================
// Подкомпоненты
// ============================================================================

function StarRating({ stars, size = 'sm' }: { stars: number; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${sz} ${
            n <= stars
              ? 'fill-amber-400 text-amber-500'
              : 'fill-stone-200 text-stone-300 dark:fill-stone-700 dark:text-stone-600'
          }`}
        />
      ))}
    </div>
  )
}

function ConflictsSummary({
  witnesses,
  facts,
}: {
  witnesses: Witness[]
  facts: Fact[]
}) {
  const totalConflicts = useMemo(() => {
    return witnesses.reduce((sum, w) => sum + countContradictions(w), 0)
  }, [witnesses])

  const worstOffender = useMemo(() => {
    return [...witnesses].sort((a, b) => {
      const ca = countContradictions(a)
      const cb = countContradictions(b)
      if (cb !== ca) return cb - ca
      return a.name.localeCompare(b.name, 'ru')
    })[0]
  }, [witnesses])

  const mostDisputedFact = useMemo(() => {
    let best: { fact: Fact; count: number } | null = null
    for (const f of facts) {
      const count = witnesses.filter(
        w => w.positions[f.id]?.contradictsOthers,
      ).length
      if (!best || count > best.count) {
        best = { fact: f, count }
      }
    }
    return best
  }, [witnesses, facts])

  const stats = [
    {
      icon: <Flame className="w-5 h-5 text-red-700" />,
      bgIcon: 'bg-red-100 dark:bg-red-950/40',
      label: 'Всего противоречий',
      value: totalConflicts,
      hint: 'Сумма конфликтующих ячеек',
      tone: 'text-red-700',
    },
    {
      icon: <TrendingDown className="w-5 h-5 text-orange-600" />,
      bgIcon: 'bg-orange-100 dark:bg-orange-950/40',
      label: 'Худший свидетель',
      value: worstOffender?.name ?? '—',
      hint: `${worstOffender ? countContradictions(worstOffender) : 0} противоречий`,
      tone: 'text-orange-700',
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      bgIcon: 'bg-amber-100 dark:bg-amber-950/40',
      label: 'Самый спорный факт',
      value: mostDisputedFact?.fact.text ?? '—',
      hint: `${mostDisputedFact?.count ?? 0} свидетелей в конфликте`,
      tone: 'text-amber-700',
    },
  ]

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-red-700 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-700" />
          Сводка противоречий
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${s.bgIcon}`}
              >
                {s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`font-bold truncate ${s.tone}`} title={String(s.value)}>
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CellIcon({ position, conflictsOnly }: { position: Position; conflictsOnly: boolean }) {
  const cfg = POSITION_CONFIG[position]
  if (position === 'no-data') {
    return <Minus className="w-3.5 h-3.5 opacity-60" />
  }
  return <span className="flex items-center justify-center">{cfg.icon}</span>
}

interface CellProps {
  witness: Witness
  fact: Fact
  isSelected: boolean
  conflictsOnly: boolean
  onClick: () => void
}

function MatrixCell({ witness, fact, isSelected, conflictsOnly, onClick }: CellProps) {
  const pos = witness.positions[fact.id]
  if (!pos) return null
  const cfg = POSITION_CONFIG[pos.position]
  const isContradiction = pos.contradictsOthers

  // Determine if cell should be dimmed (when filter is on, only show conflicts highlighted)
  const dimmed = conflictsOnly && !isContradiction

  // Background class
  let bgClass = cfg.cellClass
  if (dimmed) {
    bgClass = 'bg-stone-50 text-stone-400 dark:bg-stone-900 dark:text-stone-600'
  } else if (isContradiction && pos.position !== 'no-data') {
    // For contradictions, use red-700 background regardless of position
    bgClass = 'bg-red-700 text-white'
  }

  const ringClass = isSelected
    ? 'ring-2 ring-purple-700 ring-offset-1'
    : isContradiction && !dimmed
      ? 'ring-1 ring-red-900/40'
      : ''

  const pulseClass =
    isContradiction && !dimmed && pos.position === 'deny'
      ? 'animate-pulse'
      : ''

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${witness.name} — ${fact.text}: ${cfg.label}${
        isContradiction ? ' (противоречит другим)' : ''
      }`}
      className={`relative h-12 min-w-[64px] flex items-center justify-center transition-all duration-150 ${bgClass} ${ringClass} ${pulseClass} hover:brightness-110 hover:z-10 cursor-pointer`}
    >
      <CellIcon position={pos.position} conflictsOnly={conflictsOnly} />
      {isContradiction && !dimmed && pos.position !== 'no-data' && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm" />
      )}
      {isSelected && (
        <span className="absolute inset-0 ring-2 ring-purple-700 rounded-sm pointer-events-none" />
      )}
    </button>
  )
}

function MatrixTable({
  witnesses,
  facts,
  selectedCell,
  onSelectCell,
  conflictsOnly,
}: {
  witnesses: Witness[]
  facts: Fact[]
  selectedCell: { witnessId: string; factId: string } | null
  onSelectCell: (witnessId: string, factId: string) => void
  conflictsOnly: boolean
}) {
  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-700" />
          Матрица согласованности показаний
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
          <table className="border-collapse w-full">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 bg-stone-800 text-white px-3 py-2 text-xs font-semibold text-left min-w-[180px] max-w-[220px] border-b border-r border-stone-700">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Свидетель</span>
                  </div>
                </th>
                {facts.map(f => (
                  <th
                    key={f.id}
                    className="sticky top-0 z-20 bg-stone-800 text-white px-2 py-2 text-[11px] font-medium text-center min-w-[80px] max-w-[120px] border-b border-r border-stone-700 last:border-r-0"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] uppercase tracking-wide text-stone-400">
                        {f.id}
                      </span>
                      <span
                        className="line-clamp-2 leading-tight text-white"
                        title={f.text}
                      >
                        {f.text}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {witnesses.map((w, idx) => {
                const contradictions = countContradictions(w)
                const stars = reliabilityStars(contradictions)
                return (
                  <tr
                    key={w.id}
                    className={`group ${
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                    } hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors`}
                  >
                    <td
                      className={`sticky left-0 z-10 px-3 py-2 text-xs font-medium border-b border-r border-border min-w-[180px] max-w-[220px] ${
                        idx % 2 === 0
                          ? 'bg-background'
                          : 'bg-muted/30'
                      } group-hover:bg-amber-50/80 dark:group-hover:bg-amber-950/20`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold truncate" title={w.name}>
                            {w.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${ROLE_TONE[w.role]} border-0`}
                          >
                            {w.role}
                          </Badge>
                          {contradictions > 0 && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-red-700 text-white">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                              {contradictions}
                            </Badge>
                          )}
                        </div>
                        <StarRating stars={stars} size="sm" />
                      </div>
                    </td>
                    {facts.map(f => {
                      const isSelected =
                        selectedCell?.witnessId === w.id &&
                        selectedCell?.factId === f.id
                      return (
                        <td
                          key={f.id}
                          className="p-0 border-b border-r border-border last:border-r-0"
                        >
                          <MatrixCell
                            witness={w}
                            fact={f}
                            isSelected={isSelected}
                            conflictsOnly={conflictsOnly}
                            onClick={() => onSelectCell(w.id, f.id)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Легенда */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
          <span className="font-medium">Легенда:</span>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-sm bg-emerald-700 inline-flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
            </span>
            <span>Подтверждает</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-sm bg-red-700 inline-flex items-center justify-center">
              <XCircle className="w-2.5 h-2.5 text-white" />
            </span>
            <span>Опровергает</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-sm bg-amber-600 inline-flex items-center justify-center">
              <HelpCircle className="w-2.5 h-2.5 text-white" />
            </span>
            <span>Не помнит</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-sm bg-stone-200 dark:bg-stone-700 inline-flex items-center justify-center">
              <Minus className="w-2.5 h-2.5 text-stone-600 dark:text-stone-300" />
            </span>
            <span>Нет данных</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-sm bg-red-700 ring-1 ring-red-900 animate-pulse" />
            <span>Противоречит другим (пульсация)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailPanel({
  witness,
  fact,
  onClose,
}: {
  witness: Witness | undefined
  fact: Fact | undefined
  onClose: () => void
}) {
  if (!witness || !fact) {
    return (
      <Card className="rounded-xl shadow-sm border-dashed">
        <CardContent className="p-6 text-center">
          <Eye className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground mt-2">
            Выберите ячейку матрицы, чтобы увидеть подробные показания свидетеля по выбранному факту.
          </p>
        </CardContent>
      </Card>
    )
  }

  const pos = witness.positions[fact.id]
  if (!pos) return null
  const cfg = POSITION_CONFIG[pos.position]
  const contradictions = countContradictions(witness)
  const stars = reliabilityStars(contradictions)

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-purple-700 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-700" />
            Детали показаний
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onClose}
          >
            Закрыть
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/40">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Свидетель
            </p>
            <p className="font-semibold text-sm mt-0.5">{witness.name}</p>
            <Badge
              variant="outline"
              className={`text-[10px] mt-1 border-0 ${ROLE_TONE[witness.role]}`}
            >
              {witness.role}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1.5">
              Дата показаний: {formatDate(witness.statementDate)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/40">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> Факт
            </p>
            <p className="font-semibold text-sm mt-0.5" title={fact.text}>
              {fact.id}. {fact.text}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={`text-[10px] ${cfg.badgeClass}`}>
                {cfg.icon}
                <span className="ml-1">{cfg.label}</span>
              </Badge>
              {pos.contradictsOthers && (
                <Badge className="text-[10px] bg-red-700 text-white">
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                  Противоречит другим
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border bg-background">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Показания свидетеля
          </p>
          <p className="text-sm italic leading-relaxed">«{pos.statement}»</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {/* Confidence */}
          <div className="p-3 rounded-lg bg-muted/40">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3" /> Уверенность
            </p>
            <p className={`text-2xl font-bold ${confidenceColor(pos.confidence)}`}>
              {pos.confidence}%
            </p>
            <div className="mt-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pos.confidence >= 85
                    ? 'bg-emerald-700'
                    : pos.confidence >= 60
                      ? 'bg-amber-600'
                      : pos.confidence > 0
                        ? 'bg-orange-600'
                        : 'bg-stone-400'
                }`}
                style={{ width: `${Math.max(pos.confidence, 4)}%` }}
              />
            </div>
          </div>

          {/* Contradictions */}
          <div className="p-3 rounded-lg bg-muted/40">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3" /> Противоречий у свидетеля
            </p>
            <p className="text-2xl font-bold text-red-700">{contradictions}</p>
            <p className="text-xs text-muted-foreground mt-1">
              из {FACTS.length} рассматриваемых фактов
            </p>
          </div>

          {/* Reliability */}
          <div className="p-3 rounded-lg bg-muted/40">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Shield className="w-3 h-3" /> Надёжность свидетеля
            </p>
            <StarRating stars={stars} size="md" />
            <p className="text-xs text-muted-foreground mt-1">
              {stars >= 5
                ? 'Высокая надёжность'
                : stars >= 4
                  ? 'Хорошая надёжность'
                  : stars >= 3
                    ? 'Средняя надёжность'
                    : stars >= 2
                      ? 'Низкая надёжность'
                      : 'Очень низкая надёжность'}
            </p>
          </div>
        </div>

        {/* Related documents */}
        {pos.relatedDocuments.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/40">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Связанные документы
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pos.relatedDocuments.map((d, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[11px] gap-1 bg-background"
                >
                  <FileText className="w-2.5 h-2.5 text-purple-700" />
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AgreementAnalysis({ witnesses, facts }: { witnesses: Witness[]; facts: Fact[] }) {
  const analysis = useMemo(() => {
    return facts.map(f => {
      const counts = { confirm: 0, deny: 0, 'dont-remember': 0, 'no-data': 0 }
      for (const w of witnesses) {
        const p = w.positions[f.id]?.position
        if (p) counts[p]++
      }
      const total = counts.confirm + counts.deny + counts['dont-remember']
      const consensus =
        total > 0
          ? Math.max(counts.confirm, counts.deny, counts['dont-remember']) / total
          : 0
      return { fact: f, counts, consensus, total }
    })
  }, [witnesses, facts])

  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-700" />
          Анализ согласия
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2 max-h-[640px] overflow-y-auto scrollbar-thin">
        {analysis.map(a => {
          const maxCount = Math.max(
            a.counts.confirm,
            a.counts.deny,
            a.counts['dont-remember'],
            a.counts['no-data'],
            1,
          )
          return (
            <div
              key={a.fact.id}
              className="p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {a.fact.id}
                </Badge>
                <p
                  className="text-xs font-medium leading-tight flex-1"
                  title={a.fact.text}
                >
                  {a.fact.text}
                </p>
              </div>

              {/* Stacked bar */}
              <div className="flex h-2 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700">
                {(['confirm', 'deny', 'dont-remember', 'no-data'] as Position[]).map(p => {
                  const count = a.counts[p]
                  if (count === 0) return null
                  const width = (count / Math.max(witnesses.length, 1)) * 100
                  const cfg = POSITION_CONFIG[p]
                  return (
                    <div
                      key={p}
                      className={cfg.cellClass}
                      style={{ width: `${width}%` }}
                      title={`${cfg.label}: ${count}`}
                    />
                  )
                })}
              </div>

              {/* Counts */}
              <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
                <span className="inline-flex items-center gap-0.5 text-emerald-700">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {a.counts.confirm}
                </span>
                <span className="inline-flex items-center gap-0.5 text-red-700">
                  <XCircle className="w-2.5 h-2.5" />
                  {a.counts.deny}
                </span>
                <span className="inline-flex items-center gap-0.5 text-amber-600">
                  <HelpCircle className="w-2.5 h-2.5" />
                  {a.counts['dont-remember']}
                </span>
                <span className="inline-flex items-center gap-0.5 text-stone-500">
                  <Minus className="w-2.5 h-2.5" />
                  {a.counts['no-data']}
                </span>
                <span className="ml-auto text-muted-foreground">
                  Согласие: {Math.round(a.consensus * 100)}%
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Главный компонент
// ============================================================================

export function CaseWitnessMatrix() {
  const [selectedCell, setSelectedCell] = useState<{
    witnessId: string
    factId: string
  } | null>(null)
  const [conflictsOnly, setConflictsOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const sortedWitnesses = useMemo(() => {
    const arr = [...WITNESSES]
    switch (sortKey) {
      case 'name':
        arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        break
      case 'reliability':
        // Worst (fewest stars) first → most contradictions first
        arr.sort(
          (a, b) =>
            countContradictions(b) - countContradictions(a) ||
            a.name.localeCompare(b.name, 'ru'),
        )
        break
      case 'contradictions':
        arr.sort(
          (a, b) =>
            countContradictions(b) - countContradictions(a) ||
            a.name.localeCompare(b.name, 'ru'),
        )
        break
    }
    return arr
  }, [sortKey])

  const selectedWitness = selectedCell
    ? WITNESSES.find(w => w.id === selectedCell.witnessId)
    : undefined
  const selectedFact = selectedCell
    ? FACTS.find(f => f.id === selectedCell.factId)
    : undefined

  const handleSelectCell = (witnessId: string, factId: string) => {
    if (
      selectedCell?.witnessId === witnessId &&
      selectedCell?.factId === factId
    ) {
      // Click same cell again to close
      setSelectedCell(null)
    } else {
      setSelectedCell({ witnessId, factId })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-purple-900/30 to-stone-900/20 border-l-4 border-purple-700 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-700/20">
              <MessageSquare className="w-6 h-6 text-purple-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Матрица согласованности показаний</h2>
              <p className="text-sm text-muted-foreground">
                Сравнение показаний свидетелей по ключевым фактам дела, выявление
                противоречий и оценка надёжности
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1 text-right">
              <span className="text-xs text-muted-foreground">Свидетелей</span>
              <span className="text-xl font-bold text-purple-700">
                {WITNESSES.length}
              </span>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-12" />
            <div className="hidden sm:flex flex-col items-end gap-1 text-right">
              <span className="text-xs text-muted-foreground">Фактов</span>
              <span className="text-xl font-bold text-amber-600">{FACTS.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts Summary */}
      <ConflictsSummary witnesses={WITNESSES} facts={FACTS} />

      {/* Controls */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium">Сортировка:</span>
            </div>
            <Select value={sortKey} onValueChange={v => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-56 rounded-xl h-8 text-xs">
                <SelectValue placeholder="Выберите сортировку" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">По имени (А→Я)</SelectItem>
                <SelectItem value="reliability">По надёжности (худшие первыми)</SelectItem>
                <SelectItem value="contradictions">По противоречиям (больше первыми)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Только противоречия:</span>
            <Switch
              checked={conflictsOnly}
              onCheckedChange={setConflictsOnly}
              aria-label="Показать только противоречия"
            />
            {conflictsOnly && (
              <Badge className="bg-red-700 text-white text-[10px] ml-1">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                Фильтр активен
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main grid: matrix + agreement sidebar */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <MatrixTable
          witnesses={sortedWitnesses}
          facts={FACTS}
          selectedCell={selectedCell}
          onSelectCell={handleSelectCell}
          conflictsOnly={conflictsOnly}
        />
        <AgreementAnalysis witnesses={WITNESSES} facts={FACTS} />
      </div>

      {/* Detail Panel */}
      <DetailPanel
        witness={selectedWitness}
        fact={selectedFact}
        onClose={() => setSelectedCell(null)}
      />

      <Separator />
      <p className="text-xs text-muted-foreground">
        Матрица согласованности показаний • Дело № 2024-00145 • Колесниченко Д.А.
        и другие • Не является юридической консультацией
      </p>
    </div>
  )
}
