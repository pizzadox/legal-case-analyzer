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
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import type { SectionId, NotificationData } from '@/lib/case-store'
import { mockNotifications } from '@/lib/mock-data'

import { CaseDashboard } from '@/components/case-dashboard'
import { CaseDocuments } from '@/components/case-documents'
import { CasePersons } from '@/components/case-persons'
import { CaseEpisodes } from '@/components/case-episodes'
import { CaseSearch } from '@/components/case-search'
import { CaseQa } from '@/components/case-qa'
import { CaseDefense } from '@/components/case-defense'
import { CaseLegalCheck } from '@/components/case-legal-check'
import { CaseTimeline } from '@/components/case-timeline'
import { CaseRisk } from '@/components/case-risk'
import { CaseBrief } from '@/components/case-brief'
import { CaseAnalytics } from '@/components/case-analytics'

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
  { id: 'risk', label: 'Оценка рисков', icon: <TrendingUp className="h-4 w-4" />, description: 'Матрица рисков и наказания', shortcut: '0' },
  { id: 'brief', label: 'Краткое изложение', icon: <FileBarChart className="h-4 w-4" />, description: 'Итоговое резюме дела', shortcut: 'B' },
  { id: 'analytics', label: 'Аналитика', icon: <BarChart3 className="h-4 w-4" />, description: 'Глубокий анализ и прогнозы', shortcut: 'A' },
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

function AppSidebar({ activeSection, setActiveSection }: {
  activeSection: SectionId
  setActiveSection: (section: SectionId) => void
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
          <CaseHealthBadge />
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

function TopHeader({ activeSection, notifications, setActiveSection, onHelpClick, onCommandClick }: {
  activeSection: SectionId
  notifications: NotificationData[]
  setActiveSection: (section: SectionId) => void
  onHelpClick: () => void
  onCommandClick: () => void
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
      <div className="ml-auto flex items-center gap-2">
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
        <NotificationCenter notifications={notifications} setActiveSection={setActiveSection} />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onHelpClick}>
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <Badge variant="outline" className="text-xs">
          Дело № 2024-00145
        </Badge>
        {unreadCount > 0 && (
          <Badge className="bg-red-700 text-white text-xs">{unreadCount}</Badge>
        )}
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
      case 'risk': return CaseRisk
      case 'brief': return CaseBrief
      case 'analytics': return CaseAnalytics
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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Система Управления Уголовным Делом • Дело № 2024-00145 • Колесниченко Д.А. и другие</span>
        <span>ИИ-аналитик v1.0</span>
      </div>
    </footer>
  )
}

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard')
  const [helpOpen, setHelpOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const notifications = mockNotifications

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+K opens command palette (highest priority)
    if (e.ctrlKey && (e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л')) {
      e.preventDefault()
      setCommandOpen(prev => !prev)
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
    }
  }, [helpOpen, commandOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <SidebarProvider>
      <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <SidebarInset>
        <TopHeader
          activeSection={activeSection}
          notifications={notifications}
          setActiveSection={setActiveSection}
          onHelpClick={() => setHelpOpen(true)}
          onCommandClick={() => setCommandOpen(true)}
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
    </SidebarProvider>
  )
}
