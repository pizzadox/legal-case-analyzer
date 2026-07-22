'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'

import {
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  Search,
  MessageSquare,
  Shield,
  Scale,
  Sun,
  Moon,
  PanelLeft,
  ScaleIcon,
  Bell,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  CalendarClock,
  TrendingUp,
  FileBarChart,
  BarChart3,
  Command as CommandIcon,
  Activity,
  Heart,
  Sparkles,
  ArrowRight,
  Settings,
  Type,
  Gauge,
  Sparkle,
  RotateCcw,
  Save,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  Folder,
  Plus,
  CheckCircle2,
  Link2,
  Package,
  Swords,
  Gavel,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import type { SectionId, NotificationData } from '@/lib/case-store'
import { mockNotifications } from '@/lib/mock-data'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { CaseDashboard } from '@/components/case-dashboard'
import { CaseDocuments } from '@/components/case-documents'
import { CasePersons } from '@/components/case-persons'
import { CaseEpisodes } from '@/components/case-episodes'
import { CaseSearch } from '@/components/case-search'
import { CaseQa } from '@/components/case-qa'
import { CaseDefense } from '@/components/case-defense'
import { CaseLegalCheck } from '@/components/case-legal-check'
import { CaseTimeline } from '@/components/case-timeline'
import { CaseEvidenceChain } from '@/components/case-evidence-chain'
import { CaseRisk } from '@/components/case-risk'
import { CaseWitnessMatrix } from '@/components/case-witness-matrix'
import { CaseBrief } from '@/components/case-brief'
import { CaseAnalytics } from '@/components/case-analytics'
import { CaseExportCenter } from '@/components/case-export-center'
import { CaseBattlePlan } from '@/components/case-battle-plan'
import { CaseViolations } from '@/components/case-violations'

const NAV_ITEMS: {
  id: SectionId
  label: string
  icon: React.ReactNode
  description: string
  shortcut: string
}[] = [
  { id: 'dashboard', label: 'Главная', icon: <LayoutDashboard className="h-4 w-4" />, description: 'Обзор дела и статистика', shortcut: '1' },
  { id: 'documents', label: 'Документы', icon: <FileText className="h-4 w-4" />, description: 'Загрузка и просмотр PDF', shortcut: '2' },
  { id: 'persons', label: 'Участники', icon: <Users className="h-4 w-4" />, description: 'Участники дела и виновность', shortcut: '3' },
  { id: 'episodes', label: 'Эпизоды', icon: <BookOpen className="h-4 w-4" />, description: 'Преступные эпизоды', shortcut: '4' },
  { id: 'search', label: 'Поиск', icon: <Search className="h-4 w-4" />, description: 'Поиск по материалам дела', shortcut: '5' },
  { id: 'qa', label: 'Вопросы ИИ', icon: <MessageSquare className="h-4 w-4" />, description: 'ИИ-аналитик по делу', shortcut: '6' },
  { id: 'defense', label: 'Линия защиты', icon: <Shield className="h-4 w-4" />, description: 'Стратегии защиты', shortcut: '7' },
  { id: 'legal-check', label: 'Правовая проверка', icon: <Scale className="h-4 w-4" />, description: 'Проверка по нормам РФ', shortcut: '8' },
  { id: 'timeline', label: 'Хронология', icon: <CalendarClock className="h-4 w-4" />, description: 'Полная хронология дела', shortcut: '9' },
  { id: 'evidence-chain', label: 'Цепочка доказательств', icon: <Link2 className="h-4 w-4" />, description: 'Связи доказательств обвинения и защиты', shortcut: 'E' },
  { id: 'risk', label: 'Оценка рисков', icon: <TrendingUp className="h-4 w-4" />, description: 'Матрица рисков и наказания', shortcut: '0' },
  { id: 'witness-matrix', label: 'Матрица показаний', icon: <MessageSquare className="h-4 w-4" />, description: 'Согласованность показаний свидетелей', shortcut: 'M' },
  { id: 'brief', label: 'Краткое изложение', icon: <FileBarChart className="h-4 w-4" />, description: 'Итоговое резюме дела', shortcut: 'B' },
  { id: 'analytics', label: 'Аналитика', icon: <BarChart3 className="h-4 w-4" />, description: 'Глубокий анализ и прогнозы', shortcut: 'A' },
  { id: 'export-center', label: 'Экспорт дела', icon: <Package className="h-4 w-4" />, description: 'Экспорт материалов', shortcut: 'X' },
  { id: 'battle-plan', label: 'Боевой план', icon: <Swords className="h-4 w-4" />, description: 'Стратегия защиты', shortcut: 'G' },
  { id: 'violations', label: 'Нарушения УПК', icon: <Gavel className="h-4 w-4" />, description: 'Процессуальные нарушения', shortcut: 'V' },
]

const NOTIF_TYPE_ICON: Record<string, React.ReactNode> = {
  processing: <Clock className="w-4 h-4 text-amber-500" />,
  compliance: <AlertTriangle className="w-4 h-4 text-orange-600" />,
  defense: <Shield className="w-4 h-4 text-emerald-600" />,
  evidence: <FileText className="w-4 h-4 text-red-600" />,
  system: <Zap className="w-4 h-4 text-stone-500" />,
}

const NOTIF_TYPE_BADGE: Record<string, string> = {
  processing: 'bg-amber-600 text-white',
  compliance: 'bg-orange-600 text-white',
  defense: 'bg-emerald-700 text-white',
  evidence: 'bg-red-700 text-white',
  system: 'bg-stone-600 text-white',
}



function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Переключить тему</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Светлая</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Тёмная</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>Системная</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationCenter({ notifications, setActiveSection }: {
  notifications: NotificationData[]
  setActiveSection: (section: SectionId) => void
}) {
  const [localNotifications, setLocalNotifications] = useState(notifications)
  const unreadCount = localNotifications.filter(n => !n.isRead).length

  const markAllRead = () => {
    setLocalNotifications(localNotifications.map(n => ({ ...n, isRead: true })))
    toast.success('Все уведомления отмечены как прочитанные')
  }

  const handleClick = (notif: NotificationData) => {
    setLocalNotifications(localNotifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n))
    if (notif.relatedSection) {
      setActiveSection(notif.relatedSection)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-700 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Уведомления</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-xl">
        <div className="p-3 border-b flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold text-sm">Уведомления</p>
          <Badge className="bg-stone-600 text-white text-xs">{unreadCount} новых</Badge>
          <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={markAllRead}>
            <CheckCircle className="w-3 h-3 mr-1" />Прочитать все
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {localNotifications.map(notif => (
            <div key={notif.id}
              className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted ${!notif.isRead ? 'bg-muted/30' : ''}`}
              onClick={() => handleClick(notif)}>
              <div className="flex items-center gap-2">
                {NOTIF_TYPE_ICON[notif.type] ?? <Bell className="w-4 h-4" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{notif.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{notif.description}</p>
                </div>
                {!notif.isRead && <div className="w-2 h-2 rounded-full bg-red-700 shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{new Date(notif.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          ))}
          {localNotifications.length === 0 && (
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Нет уведомлений</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function KeyboardShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> Горячие клавиши
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {NAV_ITEMS.map(item => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono border">Ctrl+{item.shortcut}</kbd>
              <span className="text-sm">{item.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{item.description}</span>
            </div>
          ))}
          <Separator className="mt-3" />
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono border">Ctrl+K</kbd>
            <span className="text-sm">Командная палитра</span>
            <span className="text-xs text-muted-foreground ml-auto">Быстрый поиск и действия</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono border">Ctrl+,</kbd>
            <span className="text-sm">Настройки системы</span>
            <span className="text-xs text-muted-foreground ml-auto">Тема, шрифт, поведение</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono border">?</kbd>
            <span className="text-sm">Показать эту справку</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CommandPalette({
  open,
  onOpenChange,
  setActiveSection,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  setActiveSection: (s: SectionId) => void
}) {
  // Quick action shortcuts
  const quickActions = [
    { id: 'refresh', label: 'Обновить данные', icon: <Activity className="h-4 w-4" />, section: 'dashboard' as SectionId, hint: 'Перейти на главную' },
    { id: 'qa-ask', label: 'Задать вопрос ИИ', icon: <MessageSquare className="h-4 w-4" />, section: 'qa' as SectionId, hint: 'AI-аналитик' },
    { id: 'check-compliance', label: 'Проверить соответствие', icon: <Scale className="h-4 w-4" />, section: 'legal-check' as SectionId, hint: 'Правовая проверка' },
    { id: 'view-risk', label: 'Посмотреть риски', icon: <TrendingUp className="h-4 w-4" />, section: 'risk' as SectionId, hint: 'Матрица рисков' },
    { id: 'view-witness-matrix', label: 'Матрица показаний', icon: <MessageSquare className="h-4 w-4" />, section: 'witness-matrix' as SectionId, hint: 'Согласованность показаний свидетелей' },
    { id: 'view-timeline', label: 'Открыть хронологию', icon: <CalendarClock className="h-4 w-4" />, section: 'timeline' as SectionId, hint: 'Все события дела' },
  ]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Поиск разделов, действий, документов..." />
      <CommandList>
        <CommandEmpty>Ничего не найдено</CommandEmpty>
        <CommandGroup heading="Разделы дела">
          {NAV_ITEMS.map(item => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.description}`}
              onSelect={() => {
                setActiveSection(item.id)
                onOpenChange(false)
              }}
              className="gap-2"
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground truncate">{item.description}</span>
              <CommandShortcut>Ctrl+{item.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Быстрые действия">
          {quickActions.map(action => (
            <CommandItem
              key={action.id}
              value={action.label}
              onSelect={() => {
                setActiveSection(action.section)
                onOpenChange(false)
              }}
              className="gap-2"
            >
              {action.icon}
              <span className="font-medium">{action.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{action.hint}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

function CaseHealthBadge() {
  // Compact health indicator for sidebar footer
  const [score, setScore] = useState<number | null>(null)
  useEffect(() => {
    fetch('/api/case/health-score')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && typeof d.score === 'number') setScore(d.score)
        else if (d && typeof d.overallScore === 'number') setScore(d.overallScore)
      })
      .catch(() => setScore(null))
  }, [])

  if (score === null) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span className="group-data-[collapsible=icon]:hidden">Загрузка...</span>
      </div>
    )
  }

  // Color thresholds: <50 red, 50-75 amber, >75 emerald
  const color = score >= 75 ? 'emerald' : score >= 50 ? 'amber' : 'red'
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  }
  const statusText = score >= 75 ? 'Здоровое' : score >= 50 ? 'Среднее' : 'Проблемное'

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs ${colorClasses[color]}`}>
      <Heart className="w-3.5 h-3.5 fill-current" />
      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold">{score}/100</span>
          <span className="opacity-70">·</span>
          <span className="truncate">{statusText}</span>
        </div>
        <div className="mt-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              color === 'emerald' ? 'bg-emerald-600' : color === 'amber' ? 'bg-amber-600' : 'bg-red-700'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function AppSidebar({ activeSection, setActiveSection, preferences }: {
  activeSection: SectionId
  setActiveSection: (section: SectionId) => void
  preferences: UserPreferences
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="gap-2">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-red-700 text-white">
                <ScaleIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0">
                <span className="font-semibold truncate">Уголовное Дело</span>
                <span className="text-xs text-muted-foreground truncate">№ 2024-00145</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Разделы дела</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => setActiveSection(item.id)}
                    tooltip={`${item.label}: ${item.description}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <div className="flex flex-col gap-2 px-2 pb-1">
          {preferences.showHealthBadge && <CaseHealthBadge />}
          <div className="flex items-center gap-2 px-1">
            <ThemeToggle />
            <span className="group-data-[collapsible=icon]:hidden text-xs text-muted-foreground">Тема</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// Mock list of available criminal cases for the switcher
const AVAILABLE_CASES: Array<{
  id: string
  number: string
  title: string
  defendant: string
  status: 'active' | 'archived' | 'closed'
  articles: string
  progress: number
  updatedAt: string
}> = [
  {
    id: 'case-00145',
    number: '2024-00145',
    title: 'Мошенничество в крупном размере',
    defendant: 'Колесниченко Д.А.',
    status: 'active',
    articles: 'ст. 159 ч.3, 160 ч.2 УК РФ',
    progress: 65,
    updatedAt: '2024-05-22',
  },
  {
    id: 'case-00138',
    number: '2024-00138',
    title: 'Присвоение и растрата',
    defendant: 'Сидоров А.П.',
    status: 'active',
    articles: 'ст. 160 ч.3 УК РФ',
    progress: 42,
    updatedAt: '2024-05-18',
  },
  {
    id: 'case-00122',
    number: '2024-00122',
    title: 'Незаконное предпринимательство',
    defendant: 'Морозов В.И.',
    status: 'active',
    articles: 'ст. 171 УК РФ',
    progress: 78,
    updatedAt: '2024-05-10',
  },
  {
    id: 'case-00098',
    number: '2023-00098',
    title: 'Кража с незаконным проникновением',
    defendant: 'Иванов П.С.',
    status: 'archived',
    articles: 'ст. 158 ч.2 УК РФ',
    progress: 100,
    updatedAt: '2024-03-15',
  },
  {
    id: 'case-00076',
    number: '2023-00076',
    title: 'Умышленное уничтожение имущества',
    defendant: 'Петров К.Л.',
    status: 'closed',
    articles: 'ст. 167 ч.2 УК РФ',
    progress: 100,
    updatedAt: '2023-12-20',
  },
]

const CASE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: 'Активно', color: 'bg-emerald-700 text-white' },
  archived: { label: 'Архив', color: 'bg-stone-500 text-white' },
  closed: { label: 'Закрыто', color: 'bg-red-700 text-white' },
}

function CaseSwitcher() {
  const [activeCaseId, setActiveCaseId] = useState('case-00145')
  const activeCase = AVAILABLE_CASES.find(c => c.id === activeCaseId) ?? AVAILABLE_CASES[0]
  const activeStatus = CASE_STATUS_LABEL[activeCase.status]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 px-2.5 text-xs font-medium rounded-lg border-border/60 hover:bg-muted/40 transition-colors"
          title="Переключить дело"
        >
          <FolderOpen className="w-3.5 h-3.5 text-red-700" />
          <span className="hidden md:inline">Дело № {activeCase.number}</span>
          <span className="md:hidden">№{activeCase.number}</span>
          <Badge className={`${activeStatus.color} text-[10px] px-1 py-0 h-4 rounded`}>{activeStatus.label}</Badge>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl overflow-hidden">
        <div className="p-3 border-b bg-gradient-to-r from-red-900/10 to-transparent">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-red-700" />
            Переключение дела
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Выберите уголовное дело для работы</p>
        </div>
        <ScrollArea className="max-h-72">
          {AVAILABLE_CASES.map(c => {
            const status = CASE_STATUS_LABEL[c.status]
            const isActive = c.id === activeCaseId
            return (
              <DropdownMenuItem
                key={c.id}
                onClick={() => {
                  setActiveCaseId(c.id)
                  if (c.id !== 'case-00145') {
                    toast.info(`Дело № ${c.number} загружается...`, {
                      description: 'Демонстрационная версия. Активное дело: Колесниченко Д.А.',
                    })
                  } else {
                    toast.success(`Активное дело: № ${c.number}`)
                  }
                }}
                className={`p-3 cursor-pointer flex flex-col items-start gap-1 border-b last:border-b-0 transition-colors ${
                  isActive ? 'bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-red-700' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-mono text-muted-foreground">№ {c.number}</span>
                  <Badge className={`${status.color} text-[10px] px-1 py-0 h-4 rounded ml-auto`}>{status.label}</Badge>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-red-700" />}
                </div>
                <p className="text-sm font-medium leading-tight">{c.title}</p>
                <p className="text-xs text-muted-foreground">Обвиняемый: {c.defendant}</p>
                <p className="text-[10px] text-muted-foreground/80">{c.articles}</p>
                <div className="flex items-center gap-2 w-full mt-1">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.progress === 100 ? 'bg-emerald-600' : c.progress >= 60 ? 'bg-amber-600' : 'bg-red-700'}`}
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.progress}%</span>
                </div>
              </DropdownMenuItem>
            )
          })}
        </ScrollArea>
        <div className="p-2 border-t bg-muted/30">
          <DropdownMenuItem
            onClick={() => toast.info('Создание нового дела', { description: 'Функция будет доступна в полной версии' })}
            className="p-2 cursor-pointer rounded-lg gap-2 text-xs text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Создать новое дело
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TopHeader({ activeSection, notifications, setActiveSection, onHelpClick, onCommandClick, onSettingsClick, preferences }: {
  activeSection: SectionId
  notifications: NotificationData[]
  setActiveSection: (section: SectionId) => void
  onHelpClick: () => void
  onCommandClick: () => void
  onSettingsClick: () => void
  preferences: UserPreferences
}) {
  const { toggleSidebar } = useSidebar()
  const activeItem = NAV_ITEMS.find(item => item.id === activeSection)
  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-gradient-to-r from-background via-background to-muted/30 backdrop-blur-sm">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
        <PanelLeft className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-2 h-4" />
      <div className="flex items-center gap-2 min-w-0">
        {activeItem?.icon}
        <h1 className="text-sm font-semibold truncate">{activeItem?.label || 'Главная'}</h1>
        <Badge variant="outline" className="text-xs shrink-0 hidden md:inline-flex">{activeItem?.description}</Badge>
        <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded bg-muted text-xs font-mono border text-muted-foreground">Ctrl+{activeItem?.shortcut}</kbd>
      </div>
      <div className="ml-auto flex items-center gap-2 mr-1">
        {preferences.showCommandHint && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCommandClick}
            className="h-8 gap-2 px-2.5 text-xs text-muted-foreground hidden sm:inline-flex"
          >
            <CommandIcon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Поиск</span>
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border">⌘K</kbd>
          </Button>
        )}
        <NotificationCenter notifications={notifications} setActiveSection={setActiveSection} />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSettingsClick} title="Настройки (Ctrl+,)">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onHelpClick} title="Справка (?)">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <CaseSwitcher />
      </div>
    </header>
  )
}

function MainContent({ activeSection }: { activeSection: SectionId }) {
  const SectionComponent = (() => {
    switch (activeSection) {
      case 'dashboard': return CaseDashboard
      case 'documents': return CaseDocuments
      case 'persons': return CasePersons
      case 'episodes': return CaseEpisodes
      case 'search': return CaseSearch
      case 'qa': return CaseQa
      case 'defense': return CaseDefense
      case 'legal-check': return CaseLegalCheck
      case 'timeline': return CaseTimeline
      case 'evidence-chain': return CaseEvidenceChain
      case 'risk': return CaseRisk
      case 'witness-matrix': return CaseWitnessMatrix
      case 'brief': return CaseBrief
      case 'analytics': return CaseAnalytics
      case 'export-center': return CaseExportCenter
      case 'battle-plan': return CaseBattlePlan
      case 'violations': return CaseViolations
      default: return CaseDashboard
    }
  })()
  return (
      <SectionComponent />
    )
}

function AppFooter() {
  return (
    <footer className="border-t bg-muted/30 px-4 py-3 mt-auto">
      <div className="flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
        <span className="truncate">Система Управления Уголовным Делом • Дело № 2024-00145 • Колесниченко Д.А. и другие</span>
        <span className="shrink-0 font-medium text-stone-600 dark:text-stone-300">ИИ-аналитик v1.0</span>
      </div>
    </footer>
  )
}

// ===== User Preferences Types =====
interface UserPreferences {
  density: 'comfortable' | 'compact'
  fontSize: 'sm' | 'md' | 'lg'
  animations: boolean
  showQuickActions: boolean
  showHealthBadge: boolean
  showCommandHint: boolean
  autoRefresh: boolean
  defaultSection: SectionId
}

const DEFAULT_PREFERENCES: UserPreferences = {
  density: 'comfortable',
  fontSize: 'md',
  animations: true,
  showQuickActions: true,
  showHealthBadge: true,
  showCommandHint: true,
  autoRefresh: false,
  defaultSection: 'dashboard',
}

function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem('case-user-preferences')
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function savePreferences(prefs: UserPreferences) {
  if (typeof window === 'undefined') return
  localStorage.setItem('case-user-preferences', JSON.stringify(prefs))
}

function applyPreferencesToBody(prefs: UserPreferences) {
  if (typeof document === 'undefined') return
  const body = document.body
  // Density
  body.classList.toggle('compact', prefs.density === 'compact')
  // Font size
  body.classList.remove('text-size-sm', 'text-size-md', 'text-size-lg')
  body.classList.add(`text-size-${prefs.fontSize}`)
  // Animations
  body.classList.toggle('no-animations', !prefs.animations)
}

function SettingsDialog({
  open,
  onClose,
  preferences,
  setPreferences,
}: {
  open: boolean
  onClose: () => void
  preferences: UserPreferences
  setPreferences: (p: UserPreferences) => void
}) {
  const { theme, setTheme } = useTheme()

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    savePreferences(next)
    applyPreferencesToBody(next)
  }

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES)
    savePreferences(DEFAULT_PREFERENCES)
    applyPreferencesToBody(DEFAULT_PREFERENCES)
    toast.success('Настройки сброшены к значениям по умолчанию')
  }

  const handleSave = () => {
    savePreferences(preferences)
    toast.success('Настройки сохранены')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> Настройки системы
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance" className="text-xs gap-1"><Sparkle className="w-3 h-3" /> Внешний вид</TabsTrigger>
            <TabsTrigger value="layout" className="text-xs gap-1"><Gauge className="w-3 h-3" /> Макет</TabsTrigger>
            <TabsTrigger value="behavior" className="text-xs gap-1"><Zap className="w-3 h-3" /> Поведение</TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Тема оформления</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: 'light', label: 'Светлая', icon: <Sun className="w-4 h-4" /> },
                  { id: 'dark', label: 'Тёмная', icon: <Moon className="w-4 h-4" /> },
                  { id: 'system', label: 'Системная', icon: <Settings className="w-4 h-4" /> },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setTheme(opt.id); toast.success(`Тема: ${opt.label}`) }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      theme === opt.id
                        ? 'border-red-700 bg-red-50 dark:bg-red-950/30'
                        : 'border-border hover:border-muted-foreground/40 bg-muted/30'
                    }`}
                  >
                    <div className={`theme-preview ${opt.id === 'dark' ? 'theme-preview-dark' : 'theme-preview-light'} w-full h-12 rounded-md`} />
                    {opt.icon}
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Type className="w-4 h-4" /> Размер шрифта
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'sm', label: 'Малый', sample: 'text-sm' },
                  { id: 'md', label: 'Средний', sample: 'text-base' },
                  { id: 'lg', label: 'Крупный', sample: 'text-lg' },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => update('fontSize', opt.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      preferences.fontSize === opt.id
                        ? 'border-red-700 bg-red-50 dark:bg-red-950/30'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <div className={`${opt.sample} font-medium`}>Аа</div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-purple-600" />
                <div>
                  <Label className="text-sm font-medium cursor-pointer">Анимации интерфейса</Label>
                  <p className="text-xs text-muted-foreground">Плавные переходы и эффекты</p>
                </div>
              </div>
              <Switch
                checked={preferences.animations}
                onCheckedChange={(v) => update('animations', v)}
              />
            </div>
          </TabsContent>

          {/* Layout Tab */}
          <TabsContent value="layout" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Плотность интерфейса
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'comfortable', label: 'Комфортная', desc: 'Больше воздуха между элементами' },
                  { id: 'compact', label: 'Компактная', desc: 'Больше информации на экране' },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => update('density', opt.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      preferences.density === opt.id
                        ? 'border-red-700 bg-red-50 dark:bg-red-950/30'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                    <div className="mt-2 space-y-1">
                      <div className={`h-1.5 rounded bg-muted-foreground/30 ${opt.id === 'compact' ? 'w-3/4' : 'w-full'}`} />
                      <div className={`h-1.5 rounded bg-muted-foreground/20 ${opt.id === 'compact' ? 'w-1/2' : 'w-3/4'}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Видимые элементы</Label>
              {[
                { key: 'showQuickActions' as const, label: 'Быстрые действия на главной', desc: 'Виджет с 4 кнопками' },
                { key: 'showHealthBadge' as const, label: 'Индекс здоровья дела', desc: 'В нижней части боковой панели' },
                { key: 'showCommandHint' as const, label: 'Подсказка ⌘K в шапке', desc: 'Кнопка быстрого поиска' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <Label className="text-sm font-medium cursor-pointer">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={preferences[item.key]}
                    onCheckedChange={(v) => update(item.key, v)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <div>
                  <Label className="text-sm font-medium cursor-pointer">Автообновление данных</Label>
                  <p className="text-xs text-muted-foreground">Обновлять статистику каждые 30 секунд</p>
                </div>
              </div>
              <Switch
                checked={preferences.autoRefresh}
                onCheckedChange={(v) => update('autoRefresh', v)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Раздел по умолчанию</Label>
              <p className="text-xs text-muted-foreground">Какой раздел открывать при запуске</p>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => update('defaultSection', item.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all ${
                      preferences.defaultSection === item.id
                        ? 'border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Настройки хранятся локально</p>
                  <p>Ваши предпочтения сохраняются в браузере (localStorage) и не синхронизируются между устройствами.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1">
            <RotateCcw className="w-3 h-3" /> Сбросить
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
            <Button size="sm" onClick={handleSave} className="gap-1">
              <Save className="w-3 h-3" /> Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Home() {
  // Lazy-load preferences from localStorage on first render (avoids setState-in-effect)
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES
    const loaded = loadPreferences()
    // Apply to body immediately on first client render
    if (typeof document !== 'undefined') {
      applyPreferencesToBody(loaded)
    }
    return loaded
  })
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    if (typeof window === 'undefined') return 'dashboard'
    const loaded = loadPreferences()
    return loaded.defaultSection ?? 'dashboard'
  })
  const [helpOpen, setHelpOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const notifications = mockNotifications

  // Auto-refresh handler
  useEffect(() => {
    if (!preferences.autoRefresh) return
    const interval = setInterval(() => {
      // Trigger a refetch by dispatching a custom event
      window.dispatchEvent(new CustomEvent('case-auto-refresh'))
    }, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [preferences.autoRefresh])

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+K opens command palette (highest priority)
    if (e.ctrlKey && (e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л')) {
      e.preventDefault()
      setCommandOpen(prev => !prev)
      return
    }
    // Ctrl+, (comma) opens settings
    if (e.ctrlKey && (e.key === ',' || e.key === 'б' || e.key === 'Б')) {
      e.preventDefault()
      setSettingsOpen(true)
      return
    }
    // Ctrl+1-8 for section navigation
    if (e.ctrlKey && !e.altKey && !e.shiftKey) {
      const num = parseInt(e.key)
      if (num >= 1 && num <= 8) {
        e.preventDefault()
        setActiveSection(NAV_ITEMS[num - 1].id)
      }
      // Ctrl+9 for timeline
      if (e.key === '9') {
        e.preventDefault()
        setActiveSection('timeline')
      }
      // Ctrl+0 for risk
      if (e.key === '0') {
        e.preventDefault()
        setActiveSection('risk')
      }
      // Ctrl+B for brief
      if (e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') {
        e.preventDefault()
        setActiveSection('brief')
      }
      // Ctrl+A for analytics
      if (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        e.preventDefault()
        setActiveSection('analytics')
      }
      // Ctrl+E for evidence chain
      if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
        e.preventDefault()
        setActiveSection('evidence-chain')
      }
      // Ctrl+M for witness matrix
      if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
        e.preventDefault()
        setActiveSection('witness-matrix')
      }
      // Ctrl+X for export center
      if (e.key === 'x' || e.key === 'X' || e.key === 'ч' || e.key === 'Ч') {
        e.preventDefault()
        setActiveSection('export-center')
      }
      // Ctrl+G for battle plan (Боевой план)
      if (e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П') {
        e.preventDefault()
        setActiveSection('battle-plan')
      }
      // Ctrl+V for violations (Нарушения УПК)
      if (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М') {
        e.preventDefault()
        setActiveSection('violations')
      }
    }
    // ? for help
    if (e.key === '?' && !e.ctrlKey && !e.altKey) {
      // Only trigger when not in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setHelpOpen(true)
      }
    }
    // Escape to close help or command palette
    if (e.key === 'Escape') {
      if (helpOpen) setHelpOpen(false)
      if (commandOpen) setCommandOpen(false)
      if (settingsOpen) setSettingsOpen(false)
    }
  }, [helpOpen, commandOpen, settingsOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <SidebarProvider>
      <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} preferences={preferences} />
      <SidebarInset>
        <TopHeader
          activeSection={activeSection}
          notifications={notifications}
          setActiveSection={setActiveSection}
          onHelpClick={() => setHelpOpen(true)}
          onCommandClick={() => setCommandOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
          preferences={preferences}
        />
        <div className="flex flex-1 flex-col min-h-0">
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <MainContent activeSection={activeSection} />
          </main>
          <AppFooter />
        </div>
      </SidebarInset>
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        setActiveSection={setActiveSection}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        setPreferences={setPreferences}
      />
    </SidebarProvider>
  )
}
