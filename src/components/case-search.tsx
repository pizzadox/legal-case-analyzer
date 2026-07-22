'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Search, FileText, Users, BookOpen, Link2, Loader2, SearchX, Network, Download, Bookmark, Clock, BarChart3, Scale } from 'lucide-react'
import { mockSearchResults, mockDocuments, mockPersons, mockEpisodes, mockCrossRefNodes, mockBookmarks } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { SearchResultData, CrossRefNode, BookmarkData } from '@/lib/case-store'

const RESULT_ICON: Record<string, React.ReactNode> = {
  documents: <FileText className="w-3 h-3" />,
  persons: <Users className="w-3 h-3" />,
  episodes: <BookOpen className="w-3 h-3" />,
  crossReferences: <Link2 className="w-3 h-3" />,
}

const TYPE_BADGE: Record<string, string> = {
  document: 'bg-red-700 text-white',
  person: 'bg-orange-600 text-white',
  episode: 'bg-amber-600 text-white',
  article: 'bg-stone-600 text-white',
}

const NODE_TYPE_BADGE: Record<string, string> = {
  обвинение: 'bg-red-700 text-white',
  показание: 'bg-orange-600 text-white',
  протокол: 'bg-amber-600 text-white',
  экспертиза: 'bg-stone-600 text-white',
}

const LINK_TYPE_COLOR: Record<string, string> = {
  доказательство: 'border-emerald-600 text-emerald-700',
  подтверждение: 'border-amber-600 text-amber-700',
  цитата: 'border-amber-600 text-amber-700',
  упоминание: 'border-stone-500 text-stone-600',
}

const BOOKMARK_STYLE: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  red: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-l-red-700', icon: <FileText className="w-3.5 h-3.5 text-red-700" /> },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-l-amber-600', icon: <FileText className="w-3.5 h-3.5 text-amber-700" /> },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-l-emerald-700', icon: <FileText className="w-3.5 h-3.5 text-emerald-700" /> },
  stone: { bg: 'bg-stone-50 dark:bg-stone-900/30', border: 'border-l-stone-600', icon: <FileText className="w-3.5 h-3.5 text-stone-700" /> },
}

const ENTITY_ICON: Record<string, React.ReactNode> = {
  document: <FileText className="w-3.5 h-3.5" />,
  person: <Users className="w-3.5 h-3.5" />,
  episode: <BookOpen className="w-3.5 h-3.5" />,
  article: <Scale className="w-3.5 h-3.5" />,
  search: <Search className="w-3.5 h-3.5" />,
}

const FILTER_LABEL: Record<string, string> = {
  all: 'Все',
  documents: 'Документы',
  persons: 'Участники',
  episodes: 'Эпизоды',
  articles: 'Статьи',
  'cross-references': 'Ссылки',
}

interface HistoryEntry { query: string; filterType: string; timestamp: string }
function formatRussianDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  } catch { return iso }
}

// Export helper
function exportSearchCSV(results: SearchResultData) {
  const rows: string[] = ['Category,Name,Type,Status']
  results.documents.forEach(d => rows.push(`Document,"${d.originalName}",${d.documentType ?? ''},${d.processingStatus}`))
  results.persons.forEach(p => rows.push(`Person,"${p.fullName}",${p.role ?? ''},${p.status ?? ''}`))
  results.episodes.forEach(e => rows.push(`Episode,"${e.title}",${e.severity ?? ''},${e.status ?? ''}`))
  results.crossReferences.forEach(cr => rows.push(`CrossRef,"${cr.referenceText}",${cr.referenceType ?? ''},"${cr.sourceDocument.originalName} → ${cr.targetDocument.originalName}"`))
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'search_results.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV экспорт выполнен')
}

function CrossRefGraph({ nodes }: { nodes: CrossRefNode[] }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Network className="w-4 h-4 text-amber-600" /> Граф перекрёстных ссылок
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {nodes.map(node => (
            <Card key={node.documentId} className="rounded-xl border-2 border-l-4 shadow-sm transition-shadow hover:shadow-md"
              style={{ borderLeftColor: node.documentType === 'обвинение' ? '#dc2626' : node.documentType === 'показание' ? '#ea580c' : node.documentType === 'протокол' ? '#ca8a04' : '#78716c' }}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-sm truncate">{node.documentName}</p>
                  {node.documentType && <Badge className={NODE_TYPE_BADGE[node.documentType] ?? 'bg-stone-500 text-white'}>{node.documentType}</Badge>}
                </div>
                {node.linkedDocuments.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Связи ({node.linkedDocuments.length}):
                    </p>
                    {node.linkedDocuments.map(link => (
                      <div key={link.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${LINK_TYPE_COLOR[link.refType ?? ''] ?? 'border-stone-300 text-stone-500'}`}>
                        <span className="truncate">{link.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{link.refType ?? '—'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {node.linkedDocuments.length === 0 && (
                  <p className="text-xs text-muted-foreground">Нет перекрёстных ссылок</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Bookmarks Panel
function BookmarksPanel({ bookmarks }: { bookmarks: BookmarkData[] }) {
  if (bookmarks.length === 0) return null
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-600" /> Сохранённые закладки
          <Badge className="bg-stone-600 text-white">{bookmarks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {bookmarks.map(bm => {
            const style = BOOKMARK_STYLE[bm.color] ?? BOOKMARK_STYLE.stone
            return (
              <button
                key={bm.id}
                onClick={() => toast.info(`Переход к: ${bm.entityName}`)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-l-4 ${style.bg} ${style.border} text-left transition-all hover:scale-[1.02] hover:shadow-sm max-w-xs`}
              >
                {ENTITY_ICON[bm.entityType] ?? <FileText className="w-3.5 h-3.5" />}
                <span className="text-xs font-medium truncate">{bm.entityName}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function CaseSearch() {
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [searchHistory, setSearchHistory] = useState<HistoryEntry[]>([])

  const searchMutation = useMutation({
    mutationFn: (vars: { query: string; filterType: string }) => caseApi.search(vars),
    onError: () => toast.error('Ошибка поиска'),
  })

  const { data: graphData } = useQuery({
    queryKey: ['cross-ref-graph'],
    queryFn: caseApi.getCrossRefGraph,
    retry: 1,
  })
  const { data: bookmarksData } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: caseApi.getBookmarks,
    retry: 1,
  })
  const crossRefNodes = graphData ?? mockCrossRefNodes
  const bookmarks = bookmarksData ?? mockBookmarks

  const emptyResults: SearchResultData = { documents: [], persons: [], episodes: [], crossReferences: [] }
  const results = searchMutation.data ?? mockSearchResults
  const isSearching = searchMutation.isPending

  const executeSearch = (q: string, ft: string) => {
    if (!q.trim()) return
    setQuery(q)
    setFilterType(ft)
    searchMutation.mutate({ query: q, filterType: ft })
    setSearchHistory(prev => {
      const entry: HistoryEntry = { query: q, filterType: ft, timestamp: new Date().toISOString() }
      const filtered = prev.filter(h => !(h.query === q && h.filterType === ft))
      return [entry, ...filtered].slice(0, 5)
    })
  }

  const handleSearch = () => executeSearch(query, filterType)

  // Search statistics
  const stats = useMemo(() => {
    const total = searchHistory.length
    const filterCounts: Record<string, number> = {}
    searchHistory.forEach(h => { filterCounts[h.filterType] = (filterCounts[h.filterType] ?? 0) + 1 })
    const mostCommon = Object.entries(filterCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const lastSearch = searchHistory[0]?.timestamp ?? null
    return { total, mostCommon, lastSearch }
  }, [searchHistory])

  const categories = [
    { key: 'all', label: 'Все', icon: <Search className="w-3 h-3" /> },
    { key: 'documents', label: 'Документы', icon: <FileText className="w-3 h-3" /> },
    { key: 'persons', label: 'Участники', icon: <Users className="w-3 h-3" /> },
    { key: 'episodes', label: 'Эпизоды', icon: <BookOpen className="w-3 h-3" /> },
    { key: 'references', label: 'Ссылки', icon: <Link2 className="w-3 h-3" /> },
  ]

  const counts = {
    documents: results.documents.length,
    persons: results.persons.length,
    episodes: results.episodes.length,
    references: results.crossReferences.length,
  }
  const totalCount = counts.documents + counts.persons + counts.episodes + counts.references

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Поиск по материалам дела..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 rounded-xl"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="documents">Документы</SelectItem>
                <SelectItem value="persons">Участники</SelectItem>
                <SelectItem value="episodes">Эпизоды</SelectItem>
                <SelectItem value="articles">Статьи</SelectItem>
                <SelectItem value="cross-references">Ссылки</SelectItem>
              </SelectContent>
            </Select>
            <Button className="rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-white" onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground shrink-0">Недавние:</span>
              {searchHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => executeSearch(h.query, h.filterType)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <span className="font-medium truncate max-w-[12rem]">{h.query}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">{FILTER_LABEL[h.filterType] ?? h.filterType}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Statistics */}
      {stats.total > 0 && (
        <Card className="rounded-xl shadow-sm bg-gradient-to-r from-amber-900/10 to-stone-900/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <p className="font-semibold text-sm">Статистика поиска</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-amber-700">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Всего запросов</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-sm font-bold text-amber-700 mt-1">{stats.mostCommon ? FILTER_LABEL[stats.mostCommon] ?? stats.mostCommon : '—'}</p>
                <p className="text-xs text-muted-foreground">Частый фильтр</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xs font-bold text-amber-700 mt-1.5">{stats.lastSearch ? formatRussianDateTime(stats.lastSearch) : '—'}</p>
                <p className="text-xs text-muted-foreground">Последний поиск</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookmarks Panel */}
      <BookmarksPanel bookmarks={bookmarks} />

      {/* Cross-Reference Graph */}
      <CrossRefGraph nodes={crossRefNodes} />

      {/* Empty state with illustration */}
      {!query.trim() && !searchMutation.data && totalCount === 0 && (
        <Card className="rounded-xl shadow-sm border-t-2 border-t-amber-500 bg-gradient-to-br from-card via-card to-amber-500/5">
          <CardContent className="p-10 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mx-auto mb-4 ring-4 ring-amber-500/5">
              <SearchX className="w-10 h-10 text-amber-600" />
            </div>
            <p className="mt-2 text-base font-semibold">Начните поиск по материалам дела</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Введите запрос или выберите предложенный вариант, чтобы найти документы, участников, эпизоды и перекрёстные ссылки.</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['Колесниченко', 'ст. 159 УК РФ', 'процессуальные нарушения', 'хищение'].map(s => (
                <Button key={s} size="sm" variant="outline" className="rounded-xl" onClick={() => executeSearch(s, filterType)}>{s}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested searches when results exist */}
      {!query.trim() && !searchMutation.data && totalCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {['Колесниченко', 'ст. 159 УК РФ', 'процессуальные нарушения', 'хищение'].map(s => (
            <Button key={s} size="sm" variant="outline" className="rounded-xl" onClick={() => executeSearch(s, filterType)}>{s}</Button>
          ))}
        </div>
      )}

      {/* Result count badge + Export */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge className="bg-stone-600 text-white">{totalCount} результатов</Badge>
          <Separator className="flex-1" />
          <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => exportSearchCSV(results)}>
            <Download className="w-3 h-3" />Export CSV
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => toast.info('PDF экспорт будет доступен в будущих версиях')}>
            <FileText className="w-3 h-3" />Export PDF
          </Button>
        </div>
      )}

      {/* Results Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          {categories.map(({ key, label, icon }) => (
            <TabsTrigger key={key} value={key} className="gap-1">
              {icon}{label}
              {key !== 'all' && counts[key as keyof typeof counts] > 0 && (
                <Badge variant="outline" className="text-xs ml-1">{counts[key as keyof typeof counts]}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {Object.entries(counts).filter(([, c]) => c > 0).map(([type, count]) => (
            <Card key={type} className="rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {RESULT_ICON[type]}{type === 'crossReferences' ? 'Перекрёстные ссылки' : type === 'documents' ? 'Документы' : type === 'persons' ? 'Участники' : 'Эпизоды'}
                  <Badge className="bg-stone-600 text-white">{count}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {type === 'documents' && results.documents.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                    <FileText className="w-3 h-3" /><span className="truncate flex-1">{d.originalName}</span>
                    <Badge variant="outline" className="text-xs">{d.processingStatus}</Badge>
                  </div>
                ))}
                {type === 'persons' && results.persons.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                    <Users className="w-3 h-3" /><span className="truncate flex-1">{p.fullName}</span>
                    <Badge variant="outline" className="text-xs">{p.role ?? '—'}</Badge>
                  </div>
                ))}
                {type === 'episodes' && results.episodes.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                    <BookOpen className="w-3 h-3" /><span className="truncate flex-1">{e.title}</span>
                    <Badge variant="outline" className="text-xs">{e.severity ?? '—'}</Badge>
                  </div>
                ))}
                {type === 'references' && results.crossReferences.map(cr => (
                  <div key={cr.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">
                    <Link2 className="w-3 h-3" /><span className="truncate flex-1">{cr.referenceText}</span>
                    <Badge variant="outline" className="text-xs">{cr.referenceType ?? '—'}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="space-y-2">
          {results.documents.length === 0 ? (
            <Card className="rounded-xl shadow-sm border-t-2 border-t-stone-500 bg-gradient-to-br from-card via-card to-stone-500/5">
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 mx-auto text-stone-500/60" />
                <p className="mt-2 text-sm font-semibold">Документы не найдены</p>
                <p className="text-xs text-muted-foreground mt-1">Попробуйте изменить запрос или сбросить фильтр</p>
              </CardContent>
            </Card>
          ) : results.documents.map(d => (
            <Card key={d.id} className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-3"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium truncate">{d.originalName}</p></div>{d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="persons" className="space-y-2">
          {results.persons.length === 0 ? (
            <Card className="rounded-xl shadow-sm border-t-2 border-t-emerald-500 bg-gradient-to-br from-card via-card to-emerald-500/5">
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto text-emerald-500/60" />
                <p className="mt-2 text-sm font-semibold">Участники не найдены</p>
                <p className="text-xs text-muted-foreground mt-1">Попробуйте изменить запрос или сбросить фильтр</p>
              </CardContent>
            </Card>
          ) : results.persons.map(p => (
            <Card key={p.id} className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-3"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium">{p.fullName}</p><Badge variant="outline">{p.role ?? '—'}</Badge></div>{p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="episodes" className="space-y-2">
          {results.episodes.length === 0 ? (
            <Card className="rounded-xl shadow-sm border-t-2 border-t-amber-500 bg-gradient-to-br from-card via-card to-amber-500/5">
              <CardContent className="p-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-amber-500/60" />
                <p className="mt-2 text-sm font-semibold">Эпизоды не найдены</p>
                <p className="text-xs text-muted-foreground mt-1">Попробуйте изменить запрос или сбросить фильтр</p>
              </CardContent>
            </Card>
          ) : results.episodes.map(e => (
            <Card key={e.id} className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-3"><div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium truncate">{e.title}</p><Badge variant="outline">{e.severity ?? '—'}</Badge></div><p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p></CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="references" className="space-y-2">
          {results.crossReferences.length === 0 ? (
            <Card className="rounded-xl shadow-sm border-t-2 border-t-stone-500 bg-gradient-to-br from-card via-card to-stone-500/5">
              <CardContent className="p-6 text-center">
                <Link2 className="w-12 h-12 mx-auto text-stone-500/60" />
                <p className="mt-2 text-sm font-semibold">Перекрёстные ссылки не найдены</p>
                <p className="text-xs text-muted-foreground mt-1">Попробуйте изменить запрос или сбросить фильтр</p>
              </CardContent>
            </Card>
          ) : results.crossReferences.map(cr => (
            <Card key={cr.id} className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-3"><div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-muted-foreground" /><p className="text-sm truncate">{cr.referenceText}</p></div><p className="text-xs text-muted-foreground mt-1">{cr.sourceDocument.originalName} → {cr.targetDocument.originalName}</p></CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Separator />
      <p className="text-xs text-muted-foreground">Результаты поиска по материалам уголовного дела № 2024-00145</p>
    </div>
  )
}
