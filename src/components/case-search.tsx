'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Search, FileText, Users, BookOpen, Link2, Calendar, Loader2,
  Filter, ChevronDown, ChevronUp, X, History, Network, Sparkles,
  MapPin, Scale, Zap, Crosshair, TrendingUp, Star, ArrowRight
} from 'lucide-react'
import { mockSearchResults, mockDocuments, mockPersons, mockEpisodes } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { SearchResultData, DocumentData, PersonData, EpisodeData } from '@/lib/case-store'

// Highlight search terms in text
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-orange-500/30 text-orange-200 rounded px-0.5">{part}</mark>
    ) : part
  )
}

interface SearchHistoryItem {
  query: string
  timestamp: string
  resultCount: number
}

const CATEGORY_TABS = [
  { key: 'documents', icon: FileText, label: 'Документы' },
  { key: 'persons', icon: Users, label: 'Участники' },
  { key: 'episodes', icon: BookOpen, label: 'Эпизоды' },
  { key: 'articles', icon: Scale, label: 'Статьи' },
  { key: 'references', icon: Link2, label: 'Ссылки' },
  { key: 'all', icon: Search, label: 'Все' },
]

export function CaseSearch() {
  // Search state
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [personFilter, setPersonFilter] = useState('')
  const [articleFilter, setArticleFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [crossRefMode, setCrossRefMode] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [activeResultTab, setActiveResultTab] = useState('all')

  // TanStack Query - search mutation
  const searchMutation = useMutation({
    mutationFn: caseApi.advancedSearch,
    onSuccess: (data) => {
      // Save to history
      const totalResults = data.documents.length + data.persons.length + data.episodes.length + data.crossReferences.length
      setSearchHistory(prev => [
        { query, timestamp: new Date().toISOString(), resultCount: totalResults },
        ...prev.slice(0, 19), // Keep max 20
      ])
    },
    onError: (error: Error) => {
      toast.error(`Ошибка поиска: ${error.message}`)
    },
  })

  // TanStack Query - documents for filters
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: caseApi.getDocuments,
  })
  const displayDocs = documents.length > 0 ? documents : mockDocuments

  // TanStack Query - persons for filters
  const { data: persons = [] } = useQuery({
    queryKey: ['persons'],
    queryFn: caseApi.getPersons,
  })
  const displayPersons = persons.length > 0 ? persons : mockPersons

  // Results - use mutation data or mock fallback
  const searchResults = searchMutation.data || (searchMutation.isError ? mockSearchResults : null)

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    searchMutation.mutate({
      query,
      filterType,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      person: personFilter || null,
      article: articleFilter || null,
      location: locationFilter || null,
      documentType: docTypeFilter || null,
      crossReferenceMode: crossRefMode,
    })
  }, [query, filterType, dateFrom, dateTo, personFilter, articleFilter, locationFilter, docTypeFilter, crossRefMode, searchMutation])

  const clearFilters = () => {
    setFilterType('all')
    setDateFrom('')
    setDateTo('')
    setPersonFilter('')
    setArticleFilter('')
    setLocationFilter('')
    setDocTypeFilter('')
    setCrossRefMode(false)
  }

  const hasActiveFilters = filterType !== 'all' || dateFrom || dateTo || personFilter || articleFilter || locationFilter || docTypeFilter || crossRefMode

  // Animated variants
  const resultVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, y: -5, transition: { duration: 0.15 } },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  }

  // Cross-reference connection graph data
  const connections = searchResults?.crossReferences || []

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Поиск по материалам дела
                </CardTitle>
                <CardDescription className="mt-1">
                  Расширенный поиск по документам, участникам, эпизодам, статьям и перекрёстным ссылкам
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Расширенные фильтры
                <motion.div animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-3 w-3" />
                </motion.div>
                {hasActiveFilters && <Badge className="bg-orange-600 text-white text-xs ml-1">!</Badge>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Search Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Введите запрос для поиска... (поддерживается неточный поиск)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-10 pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px] h-10">
                  <SelectValue placeholder="Область поиска" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="documents">Документы</SelectItem>
                  <SelectItem value="persons">Участники</SelectItem>
                  <SelectItem value="episodes">Эпизоды</SelectItem>
                  <SelectItem value="articles">Статьи УК</SelectItem>
                  <SelectItem value="cross-references">Перекрёстные ссылки</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={searchMutation.isPending || !query.trim()} className="gap-2 shrink-0 h-10">
                {searchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {searchMutation.isPending ? 'Поиск...' : 'Найти'}
              </Button>
            </div>

            {/* Cross-reference mode toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={crossRefMode}
                  onCheckedChange={setCrossRefMode}
                />
                <Label className="text-sm flex items-center gap-1">
                  <Network className="h-3.5 w-3.5" />
                  Режим перекрёстных связей
                </Label>
              </div>
              {crossRefMode && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Badge className="bg-orange-600 text-white text-xs">
                    <Crosshair className="w-3 h-3 mr-1" />
                    Связи между объектами
                  </Badge>
                </motion.div>
              )}
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="border-t pt-4 space-y-4"
                >
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Расширенные фильтры
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={clearFilters}>
                        <X className="h-3 w-3" />
                        Сбросить
                      </Button>
                    )}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Date range */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Период от
                      </label>
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Период до
                      </label>
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
                    </div>

                    {/* Person filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Участник
                      </label>
                      <Input
                        placeholder="Имя участника..."
                        value={personFilter}
                        onChange={(e) => setPersonFilter(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Article filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        Статья УК РФ
                      </label>
                      <Input
                        placeholder="Номер статьи..."
                        value={articleFilter}
                        onChange={(e) => setArticleFilter(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Location filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Место/адрес
                      </label>
                      <Input
                        placeholder="Место или адрес..."
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Document type filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Тип документа
                      </label>
                      <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Все типы" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Все типы</SelectItem>
                          <SelectItem value="обвинение">Обвинение</SelectItem>
                          <SelectItem value="показание">Показание</SelectItem>
                          <SelectItem value="протокол">Протокол</SelectItem>
                          <SelectItem value="доказательство">Доказательство</SelectItem>
                          <SelectItem value="заключение">Заключение</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Последние запросы
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSearchHistory([])}>
                  Очистить
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {searchHistory.slice(0, 8).map((item, i) => (
                  <motion.button
                    key={item.timestamp}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => { setQuery(item.query); handleSearch() }}
                    className="px-3 py-1.5 bg-muted/50 rounded-lg text-xs hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <Search className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">{item.query}</span>
                    <Badge variant="outline" className="text-xs">{item.resultCount}</Badge>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cross-Reference Graph */}
      {crossRefMode && searchResults && connections.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-orange-600/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Network className="h-4 w-4 text-orange-600" />
                Граф перекрёстных связей
              </CardTitle>
              <CardDescription className="text-xs">
                Визуализация связей между документами и объектами
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {connections.map((conn, i) => (
                  <motion.div
                    key={conn.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    {/* Source node */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-stone-500 shrink-0" />
                        <span className="text-xs font-medium truncate">{conn.sourceDocument.originalName}</span>
                      </div>
                      {conn.sourceDocument.documentType && (
                        <Badge variant="outline" className="text-xs">{conn.sourceDocument.documentType}</Badge>
                      )}
                    </div>

                    {/* Arrow + reference type */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <Badge className="bg-orange-600 text-white text-xs">{conn.referenceType || 'связь'}</Badge>
                      <ArrowRight className="h-4 w-4 text-orange-600" />
                    </div>

                    {/* Target node */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-xs font-medium truncate">{conn.targetDocument.originalName}</span>
                      </div>
                      {conn.targetDocument.documentType && (
                        <Badge variant="outline" className="text-xs">{conn.targetDocument.documentType}</Badge>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Connection summary text */}
                {connections.length > 0 && (
                  <div className="p-3 bg-orange-50/5 dark:bg-orange-950/10 rounded-lg border border-orange-200/20 dark:border-orange-900/20">
                    <p className="text-xs text-muted-foreground">
                      {highlightText(
                        connections.map(c => c.referenceText).join(' | '),
                        query
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {searchMutation.isPending && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[120px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search Results */}
      {searchResults && !searchMutation.isPending && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Tabs value={activeResultTab} onValueChange={setActiveResultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-9">
              {CATEGORY_TABS.map(tab => {
                const Icon = tab.icon
                const count = tab.key === 'all'
                  ? searchResults.documents.length + searchResults.persons.length + searchResults.episodes.length + searchResults.crossReferences.length
                  : tab.key === 'documents' ? searchResults.documents.length
                  : tab.key === 'persons' ? searchResults.persons.length
                  : tab.key === 'episodes' ? searchResults.episodes.length
                  : tab.key === 'articles' ? 0
                  : searchResults.crossReferences.length
                return (
                  <TabsTrigger key={tab.key} value={tab.key} className="gap-1 text-xs">
                    <Icon className="w-3 h-3" />
                    {tab.label} ({count})
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Documents Results */}
            <TabsContent value="documents">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Найденные документы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96 [&>div]:!overflow-y-auto">
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                      {searchResults.documents.map((doc) => (
                        <motion.div
                          key={doc.id}
                          variants={resultVariants}
                          whileHover={{ scale: 1.01, backgroundColor: 'rgba(0,0,0,0.04)' }}
                          className="p-4 bg-muted/50 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <motion.div whileHover={{ rotate: 5 }}>
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                            <span className="font-medium text-sm">
                              {highlightText(doc.originalName, query)}
                            </span>
                            {doc.documentType && <Badge className="bg-stone-700 text-white text-xs">{doc.documentType}</Badge>}
                            {doc.sourceReference && <Badge variant="outline" className="text-xs">{doc.sourceReference}</Badge>}
                          </div>
                          {doc.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {highlightText(doc.summary, query)}
                            </p>
                          )}
                          {doc.documentDate && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {doc.documentDate}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {searchResults.documents.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Документы не найдены</p>
                        </motion.div>
                      )}
                    </motion.div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Persons Results */}
            <TabsContent value="persons">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Найденные участники
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96 [&>div]:!overflow-y-auto">
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                      {searchResults.persons.map((person) => (
                        <motion.div
                          key={person.id}
                          variants={resultVariants}
                          whileHover={{ scale: 1.01 }}
                          className="p-4 bg-muted/50 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-700 shrink-0">
                              <Users className="h-3.5 w-3.5 text-stone-200" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-sm block truncate">
                                {highlightText(person.fullName, query)}
                              </span>
                              {person.shortName && (
                                <span className="text-xs text-muted-foreground">{person.shortName}</span>
                              )}
                            </div>
                            {person.role && <Badge className="bg-stone-700 text-white text-xs">{person.role}</Badge>}
                            {person.isKolesnichenko && <Badge className="bg-red-700 text-white text-xs">Ключевой</Badge>}
                          </div>
                          {person.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {highlightText(person.description, query)}
                            </p>
                          )}
                          {person.occupation && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                              <TrendingUp className="w-3 h-3" />
                              {person.occupation}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {searchResults.persons.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                          <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Участники не найдены</p>
                        </motion.div>
                      )}
                    </motion.div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Episodes Results */}
            <TabsContent value="episodes">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Найденные эпизоды
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96 [&>div]:!overflow-y-auto">
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                      {searchResults.episodes.map((ep) => (
                        <motion.div
                          key={ep.id}
                          variants={resultVariants}
                          whileHover={{ scale: 1.01 }}
                          className="p-4 bg-muted/50 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <motion.div whileHover={{ rotate: 5 }}>
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                            <span className="font-medium text-sm">
                              {highlightText(ep.title, query)}
                            </span>
                            {ep.severity && (
                              <Badge className={
                                ep.severity === 'особо тяжкое' ? 'bg-red-700 text-white text-xs'
                                : ep.severity === 'тяжкое' ? 'bg-orange-600 text-white text-xs'
                                : 'bg-amber-600 text-white text-xs'
                              }>
                                {ep.severity}
                              </Badge>
                            )}
                            {ep.status && <Badge variant="outline" className="text-xs">{ep.status}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {highlightText(ep.description, query)}
                          </p>
                          {ep.date && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {ep.date}
                            </div>
                          )}
                          {ep.persons && ep.persons.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              {ep.persons.map(p => (
                                <Badge variant="outline" className="text-xs gap-1" key={p.personId}>
                                  <Users className="w-2.5 h-2.5" />
                                  {p.person.shortName || p.person.fullName}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {searchResults.episodes.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Эпизоды не найдены</p>
                        </motion.div>
                      )}
                    </motion.div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Articles tab */}
            <TabsContent value="articles">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Найденные статьи УК РФ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                    <Scale className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Статьи отображаются в результатах эпизодов</p>
                  </motion.div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cross References */}
            <TabsContent value="references">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Перекрёстные ссылки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96 [&>div]:!overflow-y-auto">
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                      {searchResults.crossReferences.map((ref) => (
                        <motion.div
                          key={ref.id}
                          variants={resultVariants}
                          whileHover={{ scale: 1.01 }}
                          className="p-4 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                            <Badge className="bg-stone-700 text-white text-xs">{ref.referenceType || 'ссылка'}</Badge>
                          </div>
                          <p className="text-sm font-medium mb-2">
                            {highlightText(ref.referenceText, query)}
                          </p>
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-stone-500" />
                              <span className="text-muted-foreground">{ref.sourceDocument.originalName}</span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-orange-600" />
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <span className="text-muted-foreground">{ref.targetDocument.originalName}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {searchResults.crossReferences.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                          <Link2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Перекрёстные ссылки не найдены</p>
                        </motion.div>
                      )}
                    </motion.div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Results - Faceted view */}
            <TabsContent value="all">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Все результаты поиска
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Фасеттированный обзор — группировка по типам объектов
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96 [&>div]:!overflow-y-auto">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                      {/* Facet counts */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-stone-700 text-white text-xs gap-1">
                          <FileText className="w-2.5 h-2.5" />
                          Документы: {searchResults.documents.length}
                        </Badge>
                        <Badge className="bg-stone-700 text-white text-xs gap-1">
                          <Users className="w-2.5 h-2.5" />
                          Участники: {searchResults.persons.length}
                        </Badge>
                        <Badge className="bg-stone-700 text-white text-xs gap-1">
                          <BookOpen className="w-2.5 h-2.5" />
                          Эпизоды: {searchResults.episodes.length}
                        </Badge>
                        <Badge className="bg-stone-700 text-white text-xs gap-1">
                          <Link2 className="w-2.5 h-2.5" />
                          Ссылки: {searchResults.crossReferences.length}
                        </Badge>
                      </div>

                      {/* Documents section */}
                      {searchResults.documents.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Документы ({searchResults.documents.length})
                          </h4>
                          <div className="space-y-1.5">
                            {searchResults.documents.slice(0, 5).map((doc) => (
                              <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-2 bg-muted/50 rounded text-sm flex items-center gap-2"
                              >
                                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{highlightText(doc.originalName, query)}</span>
                                {doc.documentType && <Badge variant="outline" className="text-xs">{doc.documentType}</Badge>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Separator />

                      {/* Persons section */}
                      {searchResults.persons.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Участники ({searchResults.persons.length})
                          </h4>
                          <div className="space-y-1.5">
                            {searchResults.persons.slice(0, 5).map((person) => (
                              <motion.div
                                key={person.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-2 bg-muted/50 rounded text-sm flex items-center gap-2"
                              >
                                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{highlightText(person.fullName, query)}</span>
                                {person.role && <Badge className="bg-stone-700 text-white text-xs">{person.role}</Badge>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Separator />

                      {/* Episodes section */}
                      {searchResults.episodes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Эпизоды ({searchResults.episodes.length})
                          </h4>
                          <div className="space-y-1.5">
                            {searchResults.episodes.slice(0, 5).map((ep) => (
                              <motion.div
                                key={ep.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-2 bg-muted/50 rounded text-sm flex items-center gap-2"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{highlightText(ep.title, query)}</span>
                                {ep.severity && <Badge variant="outline" className="text-xs">{ep.severity}</Badge>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Separator />

                      {/* Cross References section */}
                      {searchResults.crossReferences.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Link2 className="h-4 w-4" />
                            Перекрёстные ссылки ({searchResults.crossReferences.length})
                          </h4>
                          <div className="space-y-1.5">
                            {searchResults.crossReferences.slice(0, 5).map((ref) => (
                              <motion.div
                                key={ref.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-2 bg-muted/50 rounded text-sm flex items-center gap-2"
                              >
                                <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{highlightText(ref.referenceText, query)}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}

      {/* Empty State */}
      {!searchResults && !searchMutation.isPending && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                  <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                </motion.div>
                <h3 className="text-lg font-medium mb-2">Начните поиск</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Введите запрос для поиска по документам, участникам, эпизодам и перекрёстным ссылкам в материалах уголовного дела.
                  Поддерживается неточный поиск и фасеттированная навигация.
                </p>
                {/* Suggested searches */}
                <div className="flex flex-wrap gap-2 mt-6 max-w-lg">
                  {['Колесниченко', 'мошенничество', 'процессуальные нарушения', 'ст. 159'].map(suggestion => (
                    <motion.button
                      key={suggestion}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setQuery(suggestion); handleSearch() }}
                      className="px-3 py-1.5 bg-muted/50 rounded-lg text-xs hover:bg-muted transition-colors"
                    >
                      <Sparkles className="w-3 h-3 mr-1 inline" />
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
