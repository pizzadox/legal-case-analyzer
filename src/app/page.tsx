'use client'

import { useState, lazy, Suspense } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  Loader2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import type { SectionId } from '@/lib/case-store'

const CaseDashboard = lazy(() => import('@/components/case-dashboard').then(m => ({ default: m.CaseDashboard })))
const CaseDocuments = lazy(() => import('@/components/case-documents').then(m => ({ default: m.CaseDocuments })))
const CasePersons = lazy(() => import('@/components/case-persons').then(m => ({ default: m.CasePersons })))
const CaseEpisodes = lazy(() => import('@/components/case-episodes').then(m => ({ default: m.CaseEpisodes })))
const CaseSearch = lazy(() => import('@/components/case-search').then(m => ({ default: m.CaseSearch })))
const CaseQa = lazy(() => import('@/components/case-qa').then(m => ({ default: m.CaseQa })))
const CaseDefense = lazy(() => import('@/components/case-defense').then(m => ({ default: m.CaseDefense })))
const CaseLegalCheck = lazy(() => import('@/components/case-legal-check').then(m => ({ default: m.CaseLegalCheck })))

const NAV_ITEMS: {
  id: SectionId
  label: string
  icon: React.ReactNode
  description: string
}[] = [
  { id: 'dashboard', label: 'Главная', icon: <LayoutDashboard className="h-4 w-4" />, description: 'Обзор дела и статистика' },
  { id: 'documents', label: 'Документы', icon: <FileText className="h-4 w-4" />, description: 'Загрузка и просмотр PDF' },
  { id: 'persons', label: 'Участники', icon: <Users className="h-4 w-4" />, description: 'Участники дела и виновность' },
  { id: 'episodes', label: 'Эпизоды', icon: <BookOpen className="h-4 w-4" />, description: 'Преступные эпизоды' },
  { id: 'search', label: 'Поиск', icon: <Search className="h-4 w-4" />, description: 'Поиск по материалам дела' },
  { id: 'qa', label: 'Вопросы ИИ', icon: <MessageSquare className="h-4 w-4" />, description: 'ИИ-аналитик по делу' },
  { id: 'defense', label: 'Линия защиты', icon: <Shield className="h-4 w-4" />, description: 'Стратегии защиты' },
  { id: 'legal-check', label: 'Правовая проверка', icon: <Scale className="h-4 w-4" />, description: 'Проверка по нормам РФ' },
]

function SuspenseFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Загрузка раздела...</p>
    </div>
  )
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
        <div className="flex items-center gap-2 px-2 py-1">
          <ThemeToggle />
          <span className="group-data-[collapsible=icon]:hidden text-xs text-muted-foreground">Тема</span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function TopHeader({ activeSection }: { activeSection: SectionId }) {
  const { toggleSidebar } = useSidebar()
  const activeItem = NAV_ITEMS.find(item => item.id === activeSection)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
        <PanelLeft className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-2 h-4" />
      <div className="flex items-center gap-2 min-w-0">
        {activeItem?.icon}
        <h1 className="text-sm font-semibold truncate">{activeItem?.label || 'Главная'}</h1>
        <Badge variant="outline" className="text-xs shrink-0">{activeItem?.description}</Badge>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Дело № 2024-00145
        </Badge>
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
      default: return CaseDashboard
    }
  })()
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <SectionComponent />
    </Suspense>
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

  return (
    <SidebarProvider>
      <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <SidebarInset>
        <TopHeader activeSection={activeSection} />
        <div className="flex flex-1 flex-col min-h-0">
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <MainContent activeSection={activeSection} />
          </main>
          <AppFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
