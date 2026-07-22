'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LayoutDashboard, FileText, Users, BookOpen, Search, MessageSquare, Shield, Scale, Sun, Moon, PanelLeft, Bell, HelpCircle, CheckCircle, AlertTriangle, XCircle, Clock, Zap, CalendarClock, TrendingUp, BarChart3, Command as CommandIcon, Activity, ArrowRight, Settings, Gauge, RefreshCw, Swords, Gavel, Link2, Eye } from 'lucide-react'
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
import { CaseEvidenceChain } from '@/components/case-evidence-chain'
import { CaseRisk } from '@/components/case-risk'
import { CaseWitnessMatrix } from '@/components/case-witness-matrix'
import { CaseBrief } from '@/components/case-brief'
import { CaseAnalytics } from '@/components/case-analytics'
import { CaseExportCenter } from '@/components/case-export-center'
import { CaseBattlePlan } from '@/components/case-battle-plan'
import { CaseViolations } from '@/components/case-violations'
import { ErrorBoundary } from '@/components/error-boundary'

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ReactNode; description: string; shortcut: string }[] = [
  { id: 'dashboard', label: 'Главная', icon: <LayoutDashboard className="h-4 w-4" />, description: 'Обзор дела и статистика', shortcut: '1' },
  { id: 'documents', label: 'Документы', icon: <FileText className="h-4 w-4" />, description: 'Загрузка и просмотр PDF', shortcut: '2' },
  { id: 'persons', label: 'Участники', icon: <Users className="h-4 w-4" />, description: 'Участники дела и виновность', shortcut: '3' },
  { id: 'episodes', label: 'Эпизоды', icon: <BookOpen className="h-4 w-4" />, description: 'Преступные эпизоды', shortcut: '4' },
  { id: 'search', label: 'Поиск', icon: <Search className="h-4 w-4" />, description: 'Поиск по материалам дела', shortcut: '5' },
  { id: 'qa', label: 'Вопросы ИИ', icon: <MessageSquare className="h-4 w-4" />, description: 'ИИ-аналитик дела', shortcut: '6' },
  { id: 'defense', label: 'Линия защиты', icon: <Shield className="h-4 w-4" />, description: 'Стратегии защиты Колесниченко', shortcut: '7' },
  { id: 'legal-check', label: 'Правовая проверка', icon: <Scale className="h-4 w-4" />, description: 'Проверка норм УК и УПК', shortcut: '8' },
  { id: 'timeline', label: 'Хронология', icon: <CalendarClock className="h-4 w-4" />, description: 'Хронология событий дела', shortcut: '9' },
  { id: 'evidence-chain', label: 'Цепочка улик', icon: <Link2 className="h-4 w-4" />, description: 'Допустимость и сохранность', shortcut: '0' },
  { id: 'risk', label: 'Риски', icon: <AlertTriangle className="h-4 w-4" />, description: 'Матрица рисков и сделки', shortcut: 'r' },
  { id: 'witness-matrix', label: 'Свидетели', icon: <Eye className="h-4 w-4" />, description: 'Матрица согласованности', shortcut: 'w' },
  { id: 'brief', label: 'Бриф', icon: <FileText className="h-4 w-4" />, description: 'Краткое изложение дела', shortcut: 'b' },
  { id: 'analytics', label: 'Аналитика', icon: <BarChart3 className="h-4 w-4" />, description: 'Тренды и прогнозы', shortcut: 'a' },
  { id: 'export-center', label: 'Экспорт', icon: <Gavel className="h-4 w-4" />, description: 'Экспорт отчётов', shortcut: 'e' },
  { id: 'battle-plan', label: 'Боевой план', icon: <Swords className="h-4 w-4" />, description: 'План действий защиты', shortcut: 'p' },
  { id: 'violations', label: 'Нарушения', icon: <XCircle className="h-4 w-4" />, description: 'Процессуальные нарушения', shortcut: 'v' },
]

const NOTIF_SEV: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = { processing: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-600/15' }, compliance: { icon: Shield, color: 'text-emerald-700', bg: 'bg-emerald-700/15' }, defense: { icon: Swords, color: 'text-stone-600', bg: 'bg-stone-600/15' }, evidence: { icon: FileText, color: 'text-red-700', bg: 'bg-red-700/15' }, system: { icon: Zap, color: 'text-stone-500', bg: 'bg-stone-500/15' } }

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /><Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /><span className="sr-only">Переключить тему</span></Button>
}

export default function CasePage() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard')
  const [commandOpen, setCommandOpen] = useState(false)
  const [notifications] = useState<NotificationData[]>(mockNotifications)
  const unreadCount = notifications.filter(n => !n.isRead).length

  useEffect(() => { const down = (e: KeyboardEvent) => { if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCommandOpen(true) } }; document.addEventListener('keydown', down); return () => document.removeEventListener('keydown', down) }, [])
  const runCommand = useCallback((id: SectionId) => { setActiveSection(id); setCommandOpen(false) }, [])

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <CaseDashboard />
      case 'documents': return <CaseDocuments />
      case 'persons': return <CasePersons />
      case 'episodes': return <CaseEpisodes />
      case 'search': return <CaseSearch />
      case 'qa': return <CaseQa />
      case 'defense': return <CaseDefense />
      case 'legal-check': return <CaseLegalCheck />
      case 'timeline': return <CaseTimeline />
      case 'evidence-chain': return <CaseEvidenceChain />
      case 'risk': return <CaseRisk />
      case 'witness-matrix': return <CaseWitnessMatrix />
      case 'brief': return <CaseBrief />
      case 'analytics': return <CaseAnalytics />
      case 'export-center': return <CaseExportCenter />
      case 'battle-plan': return <CaseBattlePlan />
      case 'violations': return <CaseViolations />
      default: return <CaseDashboard />
    }
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Scale className="size-4" /></div>
                <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">Уголовное дело</span><span className="truncate text-xs text-muted-foreground">№ 2024-00145</span></div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{NAV_ITEMS.map(item => (<SidebarMenuItem key={item.id}><SidebarMenuButton isActive={activeSection === item.id} onClick={() => setActiveSection(item.id)} tooltip={{ children: item.description }}><div className="flex items-center gap-2">{item.icon}<span>{item.label}</span></div></SidebarMenuButton></SidebarMenuItem>))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg"><div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-stone-700 text-white"><Gauge className="size-4" /></div><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold text-xs">Система</span><span className="truncate text-xs text-muted-foreground">v2.0</span></div></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-1.5 flex-1"><Badge variant="outline" className="text-xs font-medium">{NAV_ITEMS.find(n => n.id === activeSection)?.label ?? 'Главная'}</Badge><div className="flex items-center gap-1 text-xs text-muted-foreground"><Activity className="w-3 h-3 text-emerald-600" />Онлайн</div></div>
          <div className="flex items-center gap-2">
            <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-[10px] font-bold text-white">{unreadCount}</span>}</Button></PopoverTrigger><PopoverContent align="end" className="w-80 p-0"><div className="p-3 flex items-center justify-between border-b"><h4 className="font-semibold text-sm">Уведомления</h4><Button variant="ghost" size="sm" className="text-xs h-7">Прочитать все</Button></div><ScrollArea className="h-[300px]"><div className="p-2 space-y-1">{notifications.slice(0, 5).map(n => { const cfg = NOTIF_SEV[n.type] ?? NOTIF_SEV.system; const Ic = cfg.icon; return <div key={n.id} className={`p-2.5 rounded-lg ${n.isRead ? 'bg-muted/30' : 'bg-muted/60'} hover:bg-muted transition-colors`}><div className="flex items-start gap-2"><div className={`flex items-center justify-center w-6 h-6 rounded shrink-0 ${cfg.bg}`}><Ic className={`w-3 h-3 ${cfg.color}`} /></div><div className="flex-1 min-w-0"><p className="text-xs font-semibold leading-tight">{n.title}</p><p className="text-[10px] text-muted-foreground mt-0.5">{n.description}</p></div></div></div> })}</div></ScrollArea></PopoverContent></Popover>
            <Button variant="ghost" size="icon" onClick={() => setCommandOpen(true)} className="hidden sm:flex"><CommandIcon className="h-4 w-4" /><span className="ml-1 text-xs text-muted-foreground">⌘K</span></Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setCommandOpen(true)}><CommandIcon className="mr-2 h-4 w-4" />Команды<CommandShortcut>⌘K</CommandShortcut></DropdownMenuItem><DropdownMenuItem onClick={() => { setActiveSection('risk'); toast.info('Открыт раздел рисков') }}><AlertTriangle className="mr-2 h-4 w-4" />Риски<CommandShortcut>⌘R</CommandShortcut></DropdownMenuItem><DropdownMenuItem onClick={() => { setActiveSection('analytics'); toast.info('Открыт раздел аналитики') }}><BarChart3 className="mr-2 h-4 w-4" />Аналитика<CommandShortcut>⌘A</CommandShortcut></DropdownMenuItem><DropdownMenuItem onClick={() => { setActiveSection('witness-matrix'); toast.info('Открыт раздел свидетелей') }}><Eye className="mr-2 h-4 w-4" />Свидетели<CommandShortcut>⌘W</CommandShortcut></DropdownMenuItem><Separator className="my-1" /><ThemeToggle /><DropdownMenuItem onClick={() => toast.info('Справка по системе') }><HelpCircle className="mr-2 h-4 w-4" />Справка</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto"><div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorBoundary>{renderSection()}</ErrorBoundary></div></main>

        <footer className="border-t bg-muted/30 px-4 py-3 mt-auto">
          <div className="flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span className="truncate">Система Управления Уголовным Делом • Дело № 2024-00145 • Колесниченко Д.А.</span>
            <span className="shrink-0 font-medium text-stone-600 dark:text-stone-300">ИИ-аналитик v2.0</span>
          </div>
        </footer>

        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="Введите команду или раздел..." />
          <CommandList><CommandEmpty>Ничего не найдено</CommandEmpty><CommandGroup heading="Разделы">{NAV_ITEMS.map(item => <CommandItem key={item.id} value={item.label} onSelect={() => runCommand(item.id)}><span className="mr-2">{item.icon}</span><span>{item.label}</span><span className="ml-1 text-xs text-muted-foreground">{item.description}</span></CommandItem>)}</CommandGroup><CommandSeparator /><CommandGroup heading="Быстрые действия"><CommandItem onSelect={() => { setActiveSection('risk'); setCommandOpen(false); toast.info('Открыт раздел рисков') }}><AlertTriangle className="mr-2 h-4 w-4" />Открыть риски<CommandShortcut>⌘R</CommandShortcut></CommandItem><CommandItem onSelect={() => { setActiveSection('analytics'); setCommandOpen(false); toast.info('Открыт раздел аналитики') }}><BarChart3 className="mr-2 h-4 w-4" />Открыть аналитику<CommandShortcut>⌘A</CommandShortcut></CommandItem><CommandItem onSelect={() => { setActiveSection('witness-matrix'); setCommandOpen(false); toast.info('Открыт раздел свидетелей') }}><Eye className="mr-2 h-4 w-4" />Открыть свидетелей<CommandShortcut>⌘W</CommandShortcut></CommandItem><CommandItem onSelect={() => { setCommandOpen(false); toast.info('Справка по системе') }}><HelpCircle className="mr-2 h-4 w-4" />Справка<CommandShortcut>⌘?</CommandShortcut></CommandItem></CommandGroup></CommandList>
        </CommandDialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
