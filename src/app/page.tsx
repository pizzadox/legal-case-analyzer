'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LayoutDashboard, FileText, Users, BookOpen, Search, MessageSquare, Shield, Scale, Sun, Moon, PanelLeft, Bell, HelpCircle, CheckCircle, AlertTriangle, XCircle, Clock, Zap, CalendarClock, TrendingUp, BarChart3, Command as CommandIcon, Activity, ArrowRight, Settings, Gauge, RefreshCw, Swords, Gavel, Link2, Eye, Plus, FolderOpen, Check, Loader2, Trash2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import type { SectionId, NotificationData, CriminalCaseData } from '@/lib/case-store'
import { useCaseStore } from '@/lib/case-store'
import * as caseApi from '@/lib/case-api'
import { Input } from '@/components/ui/input'
import { mockNotifications } from '@/lib/mock-data'

import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'

// Lazy-load all section components to reduce initial bundle size and memory usage
const CaseDashboard = lazy(() => import('@/components/case-dashboard').then(m => ({ default: m.CaseDashboard })))
const CaseDocuments = lazy(() => import('@/components/case-documents').then(m => ({ default: m.CaseDocuments })))
const CasePersons = lazy(() => import('@/components/case-persons').then(m => ({ default: m.CasePersons })))
const CaseEpisodes = lazy(() => import('@/components/case-episodes').then(m => ({ default: m.CaseEpisodes })))
const CaseSearch = lazy(() => import('@/components/case-search').then(m => ({ default: m.CaseSearch })))
const CaseQa = lazy(() => import('@/components/case-qa').then(m => ({ default: m.CaseQa })))
const CaseDefense = lazy(() => import('@/components/case-defense').then(m => ({ default: m.CaseDefense })))
const CaseLegalCheck = lazy(() => import('@/components/case-legal-check').then(m => ({ default: m.CaseLegalCheck })))
const CaseTimeline = lazy(() => import('@/components/case-timeline').then(m => ({ default: m.CaseTimeline })))
const CaseEvidenceChain = lazy(() => import('@/components/case-evidence-chain').then(m => ({ default: m.CaseEvidenceChain })))
const CaseRisk = lazy(() => import('@/components/case-risk').then(m => ({ default: m.CaseRisk })))
const CaseWitnessMatrix = lazy(() => import('@/components/case-witness-matrix').then(m => ({ default: m.CaseWitnessMatrix })))
const CaseBrief = lazy(() => import('@/components/case-brief').then(m => ({ default: m.CaseBrief })))
const CaseAnalytics = lazy(() => import('@/components/case-analytics').then(m => ({ default: m.CaseAnalytics })))
const CaseExportCenter = lazy(() => import('@/components/case-export-center').then(m => ({ default: m.CaseExportCenter })))
const CaseBattlePlan = lazy(() => import('@/components/case-battle-plan').then(m => ({ default: m.CaseBattlePlan })))
const CaseViolations = lazy(() => import('@/components/case-violations').then(m => ({ default: m.CaseViolations })))

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

  // Case switching state
  const [activeCaseId, setActiveCaseId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeCaseId') || ''
    }
    return ''
  })
  const [newCaseDialogOpen, setNewCaseDialogOpen] = useState(false)
  const [newCaseForm, setNewCaseForm] = useState({ caseNumber: '', caseTitle: '', defendantName: '', articles: '' })
  const [isCreatingCase, setIsCreatingCase] = useState(false)
  const [deleteCaseDialogId, setDeleteCaseDialogId] = useState<string | null>(null)
  const [isDeletingCase, setIsDeletingCase] = useState(false)
  const queryClient = useQueryClient()

  // Fetch all criminal cases
  const { data: cases = [], isLoading: isLoadingCases } = useQuery<CriminalCaseData[]>({
    queryKey: ['criminal-cases'],
    queryFn: () => caseApi.getCases(),
    refetchInterval: 10000,
  })

  // Compute the currently active case
  const activeCase = useMemo<CriminalCaseData | null>(() => {
    if (!cases.length) return null
    if (activeCaseId) {
      const found = cases.find(c => c.id === activeCaseId)
      if (found) return found
    }
    // Default to the first case if no active case set or not found
    return cases[0]
  }, [cases, activeCaseId])

  // Sync activeCaseId with the Zustand store - use individual setter to avoid infinite loop
  const setActiveCaseIdInStore = useCaseStore(state => state.setActiveCaseId)

  // Persist active case to localStorage + store when it changes
  useEffect(() => {
    if (activeCase && activeCase.id !== activeCaseId) {
      setActiveCaseId(activeCase.id)
      localStorage.setItem('activeCaseId', activeCase.id)
      setActiveCaseIdInStore(activeCase.id)
    } else if (activeCase) {
      localStorage.setItem('activeCaseId', activeCase.id)
      setActiveCaseIdInStore(activeCase.id)
    }
  }, [activeCase, activeCaseId, setActiveCaseIdInStore])

  const handleSelectCase = (caseId: string) => {
    setActiveCaseId(caseId)
    localStorage.setItem('activeCaseId', caseId)
    setActiveCaseIdInStore(caseId)
    // Invalidate all case-related queries so data refetches for the new case
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['persons'] })
    queryClient.invalidateQueries({ queryKey: ['episodes'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['evidence-chain'] })
    const selectedCase = cases.find(c => c.id === caseId)
    toast.success(`Дело переключено: ${selectedCase?.caseNumber || caseId}`)
  }

  // Compute the case being considered for deletion
  const deleteCase = useMemo<CriminalCaseData | null>(() => {
    if (!deleteCaseDialogId || !cases.length) return null
    return cases.find(c => c.id === deleteCaseDialogId) || null
  }, [cases, deleteCaseDialogId])

  const handleDeleteCase = async () => {
    if (!deleteCaseDialogId) return
    setIsDeletingCase(true)
    try {
      await caseApi.deleteCase(deleteCaseDialogId)
      await queryClient.invalidateQueries({ queryKey: ['criminal-cases'] })
      // If deleted case was active, switch to another
      if (activeCaseId === deleteCaseDialogId) {
        const remaining = cases.filter(c => c.id !== deleteCaseDialogId)
        if (remaining.length > 0) {
          setActiveCaseId(remaining[0].id)
          localStorage.setItem('activeCaseId', remaining[0].id)
          setActiveCaseIdInStore(remaining[0].id)
        } else {
          setActiveCaseId('')
          localStorage.removeItem('activeCaseId')
          setActiveCaseIdInStore('')
        }
      }
      // Invalidate all case-related queries
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['evidence-chain'] })
      setDeleteCaseDialogId(null)
      toast.success('Дело удалено')
    } catch (err) {
      toast.error('Ошибка удаления дела')
    } finally {
      setIsDeletingCase(false)
    }
  }

  const handleCreateCase = async () => {
    if (!newCaseForm.caseNumber || !newCaseForm.caseTitle) {
      toast.error('Номер и название дела обязательны')
      return
    }
    setIsCreatingCase(true)
    try {
      const created = await caseApi.createCase({
        caseNumber: newCaseForm.caseNumber,
        caseTitle: newCaseForm.caseTitle,
        defendantName: newCaseForm.defendantName || null,
        articles: newCaseForm.articles || null,
      })
      await queryClient.invalidateQueries({ queryKey: ['criminal-cases'] })
      setActiveCaseId(created.id)
      localStorage.setItem('activeCaseId', created.id)
      setActiveCaseIdInStore(created.id)
      // Invalidate all case-related queries so new (empty) case data loads
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setNewCaseDialogOpen(false)
      setNewCaseForm({ caseNumber: '', caseTitle: '', defendantName: '', articles: '' })
      toast.success(`Дело ${created.caseNumber} создано`)
    } catch (err) {
      toast.error('Ошибка создания дела')
    } finally {
      setIsCreatingCase(false)
    }
  }

  useEffect(() => { const down = (e: KeyboardEvent) => { if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCommandOpen(true) } }; document.addEventListener('keydown', down); return () => document.removeEventListener('keydown', down) }, [])
  const runCommand = useCallback((id: SectionId) => { setActiveSection(id); setCommandOpen(false) }, [])

  const renderSection = () => {
    const cid = activeCase?.id || ''
    switch (activeSection) {
      case 'dashboard': return <CaseDashboard caseId={cid} />
      case 'documents': return <CaseDocuments caseId={cid} />
      case 'persons': return <CasePersons caseId={cid} />
      case 'episodes': return <CaseEpisodes caseId={cid} />
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
      case 'export-center': return <CaseExportCenter caseId={cid} />
      case 'battle-plan': return <CaseBattlePlan />
      case 'violations': return <CaseViolations />
      default: return <CaseDashboard caseId={cid} />
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
                <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">{activeCase ? activeCase.caseTitle : 'Уголовное дело'}</span><span className="truncate text-xs text-muted-foreground">{activeCase ? activeCase.caseNumber : '№ ...'}</span></div>
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
          <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg"><div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-stone-700 text-white"><Gauge className="size-4" /></div><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold text-xs">Система</span><span className="truncate text-xs text-muted-foreground">v3.5</span></div></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-1.5 flex-1"><Badge variant="outline" className="text-xs font-medium">{NAV_ITEMS.find(n => n.id === activeSection)?.label ?? 'Главная'}</Badge><div className="flex items-center gap-1 text-xs text-muted-foreground"><Activity className="w-3 h-3 text-emerald-600" />Онлайн</div></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-medium">
                <FolderOpen className="h-3.5 w-3.5" />
                {activeCase ? activeCase.caseNumber : 'Выбрать дело'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Переключение дела</DropdownMenuLabel>
              {isLoadingCases && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Загрузка...</DropdownMenuItem>}
              {!isLoadingCases && cases.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Нет доступных дел</DropdownMenuItem>}
              {cases.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => handleSelectCase(c.id)} className="flex items-center gap-2">
                  <Check className={`h-3.5 w-3.5 ${activeCase?.id === c.id ? 'text-emerald-600 opacity-100' : 'opacity-0'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{c.caseNumber}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.caseTitle}</div>
                  </div>
                  {(c.documentCount != null || c.personCount != null || c.episodeCount != null) && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      {c.documentCount != null && <span>{c.documentCount} док.</span>}
                      {c.personCount != null && <span>{c.personCount} уч.</span>}
                      {c.episodeCount != null && <span>{c.episodeCount} эп.</span>}
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setNewCaseDialogOpen(true)} className="text-xs">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Новое дело
              </DropdownMenuItem>
              {activeCase && (
                <DropdownMenuItem onClick={() => setDeleteCaseDialogId(activeCase.id)} className="text-xs text-red-700 focus:text-red-700 focus:bg-red-700/10">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Удалить текущее дело
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2">
            <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-[10px] font-bold text-white">{unreadCount}</span>}</Button></PopoverTrigger><PopoverContent align="end" className="w-80 p-0"><div className="p-3 flex items-center justify-between border-b"><h4 className="font-semibold text-sm">Уведомления</h4><Button variant="ghost" size="sm" className="text-xs h-7">Прочитать все</Button></div><ScrollArea className="h-[300px]"><div className="p-2 space-y-1">{notifications.slice(0, 5).map(n => { const cfg = NOTIF_SEV[n.type] ?? NOTIF_SEV.system; const Ic = cfg.icon; return <div key={n.id} className={`p-2.5 rounded-lg ${n.isRead ? 'bg-muted/30' : 'bg-muted/60'} hover:bg-muted transition-colors`}><div className="flex items-start gap-2"><div className={`flex items-center justify-center w-6 h-6 rounded shrink-0 ${cfg.bg}`}><Ic className={`w-3 h-3 ${cfg.color}`} /></div><div className="flex-1 min-w-0"><p className="text-xs font-semibold leading-tight">{n.title}</p><p className="text-[10px] text-muted-foreground mt-0.5">{n.description}</p></div></div></div> })}</div></ScrollArea></PopoverContent></Popover>
            <Button variant="ghost" size="icon" onClick={() => setCommandOpen(true)} className="hidden sm:flex"><CommandIcon className="h-4 w-4" /><span className="ml-1 text-xs text-muted-foreground">⌘K</span></Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setCommandOpen(true)}><CommandIcon className="mr-2 h-4 w-4" />Команды<CommandShortcut>⌘K</CommandShortcut></DropdownMenuItem><DropdownMenuItem onClick={() => { setActiveSection('risk'); toast.info('Открыт раздел рисков') }}><AlertTriangle className="mr-2 h-4 w-4" />Риски<CommandShortcut>⌘R</CommandShortcut></DropdownMenuItem><DropdownMenuItem onClick={() => { setActiveSection('analytics'); toast.info('Открыт раздел аналитики') }}><BarChart3 className="mr-2 h-4 w-4" />Аналитика<CommandShortcut>⌘A</CommandShortcut></DropdownMenuItem><DropdownMenuItem onClick={() => { setActiveSection('witness-matrix'); toast.info('Открыт раздел свидетелей') }}><Eye className="mr-2 h-4 w-4" />Свидетели<CommandShortcut>⌘W</CommandShortcut></DropdownMenuItem><Separator className="my-1" /><ThemeToggle /><DropdownMenuItem onClick={() => toast.info('Справка по системе') }><HelpCircle className="mr-2 h-4 w-4" />Справка</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto"><div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorBoundary><Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>{renderSection()}</Suspense></ErrorBoundary></div></main>

        <footer className="border-t bg-muted/30 px-4 py-3 mt-auto">
          <div className="flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span className="truncate">Система Управления Уголовным Делом • {activeCase ? `Дело ${activeCase.caseNumber}` : 'Дело № ...'} • {activeCase?.defendantName || '...'}</span>
            <span className="shrink-0 font-medium text-stone-600 dark:text-stone-300">ИИ-аналитик v3.5</span>
          </div>
        </footer>

        <Dialog open={!!deleteCaseDialogId} onOpenChange={(open) => !open && setDeleteCaseDialogId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-700" />
                Удаление дела
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm py-2">
              Вы уверены, что хотите удалить дело <strong>{deleteCase ? deleteCase.caseNumber : ''}</strong>? Все связанные данные (документы, участники, эпизоды) будут удалены навсегда.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteCaseDialogId(null)}>Отмена</Button>
              <Button className="bg-red-700 text-white hover:bg-red-800" onClick={handleDeleteCase} disabled={isDeletingCase}>
                {isDeletingCase ? 'Удаление...' : 'Удалить дело'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={newCaseDialogOpen} onOpenChange={setNewCaseDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Новое уголовное дело</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Номер дела</label>
                <Input placeholder="№ 2024-XXXXX" value={newCaseForm.caseNumber} onChange={e => setNewCaseForm(f => ({ ...f, caseNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Название дела</label>
                <Input placeholder="Уголовное дело по обвинению..." value={newCaseForm.caseTitle} onChange={e => setNewCaseForm(f => ({ ...f, caseTitle: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Подсудимый</label>
                <Input placeholder="Фамилия И.О." value={newCaseForm.defendantName} onChange={e => setNewCaseForm(f => ({ ...f, defendantName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Статьи УК</label>
                <Input placeholder="ст. 159 ч.3, ст. 160 ч.2 УК РФ" value={newCaseForm.articles} onChange={e => setNewCaseForm(f => ({ ...f, articles: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNewCaseDialogOpen(false)}>Отмена</Button>
              <Button onClick={handleCreateCase} disabled={isCreatingCase || !newCaseForm.caseNumber || !newCaseForm.caseTitle}>{isCreatingCase ? 'Создание...' : 'Создать дело'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="Введите команду или раздел..." />
          <CommandList><CommandEmpty>Ничего не найдено</CommandEmpty><CommandGroup heading="Разделы">{NAV_ITEMS.map(item => <CommandItem key={item.id} value={item.label} onSelect={() => runCommand(item.id)}><span className="mr-2">{item.icon}</span><span>{item.label}</span><span className="ml-1 text-xs text-muted-foreground">{item.description}</span></CommandItem>)}</CommandGroup><CommandSeparator /><CommandGroup heading="Быстрые действия"><CommandItem onSelect={() => { setActiveSection('risk'); setCommandOpen(false); toast.info('Открыт раздел рисков') }}><AlertTriangle className="mr-2 h-4 w-4" />Открыть риски<CommandShortcut>⌘R</CommandShortcut></CommandItem><CommandItem onSelect={() => { setActiveSection('analytics'); setCommandOpen(false); toast.info('Открыт раздел аналитики') }}><BarChart3 className="mr-2 h-4 w-4" />Открыть аналитику<CommandShortcut>⌘A</CommandShortcut></CommandItem><CommandItem onSelect={() => { setActiveSection('witness-matrix'); setCommandOpen(false); toast.info('Открыт раздел свидетелей') }}><Eye className="mr-2 h-4 w-4" />Открыть свидетелей<CommandShortcut>⌘W</CommandShortcut></CommandItem><CommandItem onSelect={() => { setCommandOpen(false); toast.info('Справка по системе') }}><HelpCircle className="mr-2 h-4 w-4" />Справка<CommandShortcut>⌘?</CommandShortcut></CommandItem></CommandGroup></CommandList>
        </CommandDialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
