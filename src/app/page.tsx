'use client'

import { useState, useEffect, useMemo, startTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarRail, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { LayoutDashboard, FileText, Users, Scale, Sun, Moon, Loader2, Plus, Trash2, AlertTriangle, Check, FolderOpen } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import type { SectionId, CriminalCaseData } from '@/lib/case-store'
import { useCaseStore } from '@/lib/case-store'
import * as caseApi from '@/lib/case-api'
import { ErrorBoundary } from '@/components/error-boundary'

const COMPONENT_REGISTRY: Record<string, () => Promise<{ default: React.ComponentType<any> }>> = {
  'dashboard': () => import('@/components/case-dashboard').then(m => ({ default: m.CaseDashboard })),
  'documents': () => import('@/components/case-documents').then(m => ({ default: m.CaseDocuments })),
  'persons': () => import('@/components/case-persons').then(m => ({ default: m.CasePersons })),
  'episodes': () => import('@/components/case-episodes').then(m => ({ default: m.CaseEpisodes })),
  'search': () => import('@/components/case-search').then(m => ({ default: m.CaseSearch })),
  'qa': () => import('@/components/case-qa').then(m => ({ default: m.CaseQa })),
  'defense': () => import('@/components/case-defense').then(m => ({ default: m.CaseDefense })),
  'legal-check': () => import('@/components/case-legal-check').then(m => ({ default: m.CaseLegalCheck })),
  'timeline': () => import('@/components/case-timeline').then(m => ({ default: m.CaseTimeline })),
  'evidence-chain': () => import('@/components/case-evidence-chain').then(m => ({ default: m.CaseEvidenceChain })),
  'risk': () => import('@/components/case-risk').then(m => ({ default: m.CaseRisk })),
  'witness-matrix': () => import('@/components/case-witness-matrix').then(m => ({ default: m.CaseWitnessMatrix })),
  'brief': () => import('@/components/case-brief').then(m => ({ default: m.CaseBrief })),
  'analytics': () => import('@/components/case-analytics').then(m => ({ default: m.CaseAnalytics })),
  'export-center': () => import('@/components/case-export-center').then(m => ({ default: m.CaseExportCenter })),
  'battle-plan': () => import('@/components/case-battle-plan').then(m => ({ default: m.CaseBattlePlan })),
  'violations': () => import('@/components/case-violations').then(m => ({ default: m.CaseViolations })),
}

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Главная', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'documents', label: 'Документы', icon: <FileText className="h-4 w-4" /> },
  { id: 'persons', label: 'Участники', icon: <Users className="h-4 w-4" /> },
  { id: 'episodes', label: 'Этапы производства', icon: <span className="text-sm">📖</span> },
  { id: 'search', label: 'Поиск', icon: <span className="text-sm">🔍</span> },
  { id: 'qa', label: 'Вопросы ИИ', icon: <span className="text-sm">💬</span> },
  { id: 'defense', label: 'Линия защиты', icon: <span className="text-sm">🛡️</span> },
  { id: 'legal-check', label: 'Правовая проверка', icon: <Scale className="h-4 w-4" /> },
  { id: 'timeline', label: 'Хронология', icon: <span className="text-sm">📅</span> },
  { id: 'evidence-chain', label: 'Цепочка улик', icon: <span className="text-sm">🔗</span> },
  { id: 'risk', label: 'Риски', icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'witness-matrix', label: 'Свидетели', icon: <span className="text-sm">👁️</span> },
  { id: 'brief', label: 'Бриф', icon: <FileText className="h-4 w-4" /> },
  { id: 'analytics', label: 'Аналитика', icon: <span className="text-sm">📊</span> },
  { id: 'export-center', label: 'Экспорт', icon: <span className="text-sm">⚖️</span> },
  { id: 'battle-plan', label: 'Боевой план', icon: <span className="text-sm">⚔️</span> },
  { id: 'violations', label: 'Нарушения', icon: <span className="text-sm">❌</span> },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Переключить тему</span>
    </Button>
  )
}

// Dynamic section renderer that loads components on demand
function SectionRenderer({ sectionId, caseId }: { sectionId: SectionId; caseId: string }) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader = COMPONENT_REGISTRY[sectionId]
    if (!loader) {
      startTransition(() => {
        setError('Секция не найдена')
        setLoading(false)
      })
      return
    }
    startTransition(() => {
      setLoading(true)
      setError(null)
      setComponent(null)
    })
    loader()
      .then(mod => {
        if (!cancelled) {
          startTransition(() => {
            setComponent(() => mod.default)
            setLoading(false)
          })
        }
      })
      .catch(err => {
        if (!cancelled) {
          startTransition(() => {
            setError(`Ошибка загрузки: ${String(err)}`)
            setLoading(false)
          })
        }
      })
    return () => { cancelled = true }
  }, [sectionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-red-700">
        <AlertTriangle className="w-4 h-4 mr-2" />
        {error}
      </div>
    )
  }
  if (!Component) return null

  const needsCaseId = ['dashboard', 'documents', 'persons', 'episodes', 'export-center']
  if (needsCaseId.includes(sectionId)) {
    return <Component caseId={caseId} />
  }
  return <Component />
}

export default function CasePage() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard')
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
    refetchInterval: 30000,
  })

  // Compute the currently active case
  const activeCase = useMemo<CriminalCaseData | null>(() => {
    if (!cases.length) return null
    if (activeCaseId) {
      const found = cases.find(c => c.id === activeCaseId)
      if (found) return found
    }
    return cases[0]
  }, [cases, activeCaseId])

  // Sync activeCaseId with the Zustand store
  const setActiveCaseIdInStore = useCaseStore(state => state.setActiveCaseId)

  // Persist active case to localStorage + store when it changes
  useEffect(() => {
    if (activeCase) {
      localStorage.setItem('activeCaseId', activeCase.id)
      setActiveCaseIdInStore(activeCase.id)
    }
  }, [activeCase, setActiveCaseIdInStore])

  const handleSelectCase = (caseId: string) => {
    setActiveCaseId(caseId)
    localStorage.setItem('activeCaseId', caseId)
    setActiveCaseIdInStore(caseId)
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['persons'] })
    queryClient.invalidateQueries({ queryKey: ['episodes'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Scale className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{activeCase ? activeCase.caseTitle : 'Уголовное дело'}</span>
                  <span className="truncate text-xs text-muted-foreground">{activeCase ? activeCase.caseNumber : '№ ...'}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(item => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      onClick={() => setActiveSection(item.id)}
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

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-stone-700 text-white">
                  <span className="text-xs font-bold">СУ</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-xs">Система</span>
                  <span className="truncate text-xs text-muted-foreground">v3.9</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-1.5 flex-1">
            <Badge variant="outline" className="text-xs font-medium">
              {NAV_ITEMS.find(n => n.id === activeSection)?.label ?? 'Главная'}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600" />
              Онлайн
            </div>
          </div>

          {/* Case switching dropdown - КНОПКА В ШАПКЕ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-medium">
                <FolderOpen className="h-3.5 w-3.5" />
                {activeCase ? activeCase.caseNumber : 'Выбрать дело'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Переключение дела</DropdownMenuLabel>
              {isLoadingCases && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Загрузка...
                </DropdownMenuItem>
              )}
              {!isLoadingCases && cases.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Нет доступных дел
                </DropdownMenuItem>
              )}
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

          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <ErrorBoundary>
              {activeCase ? (
                <SectionRenderer sectionId={activeSection} caseId={activeCase.id} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <Scale className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Создайте дело для начала работы</p>
                  <Button onClick={() => setNewCaseDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Новое дело
                  </Button>
                </div>
              )}
            </ErrorBoundary>
          </div>
        </main>

        <footer className="border-t bg-muted/30 px-4 py-3 mt-auto">
          <div className="flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span className="truncate">Система Управления Уголовным Делом • {activeCase ? `Дело ${activeCase.caseNumber}` : 'Дело № ...'} • {activeCase?.defendantName || '...'}</span>
            <span className="shrink-0 font-medium text-stone-600 dark:text-stone-300">ИИ-аналитик v3.9</span>
          </div>
        </footer>

        {/* Delete case dialog */}
        <Dialog open={!!deleteCaseDialogId} onOpenChange={(open) => !open && setDeleteCaseDialogId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-700" />
                Удаление дела
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm py-2">
              Вы уверены, что хотите удалить дело <strong>{deleteCase ? deleteCase.caseNumber : ''}</strong>? Все связанные данные будут удалены навсегда.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteCaseDialogId(null)}>Отмена</Button>
              <Button className="bg-red-700 text-white hover:bg-red-800" onClick={handleDeleteCase} disabled={isDeletingCase}>
                {isDeletingCase ? 'Удаление...' : 'Удалить дело'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create case dialog */}
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
              <Button onClick={handleCreateCase} disabled={isCreatingCase || !newCaseForm.caseNumber || !newCaseForm.caseTitle}>
                {isCreatingCase ? 'Создание...' : 'Создать дело'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
