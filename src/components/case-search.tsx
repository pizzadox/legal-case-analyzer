'use client'

import { useState } from 'react'
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
import { Search, FileText, Users, BookOpen, Link2, Loader2, SearchX } from 'lucide-react'
import { mockSearchResults, mockDocuments, mockPersons, mockEpisodes } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { SearchResultData } from '@/lib/case-store'

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

export function CaseSearch() {
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

  const searchMutation = useMutation({
    mutationFn: () => caseApi.search({ query, filterType }),
    onError: () => toast.error('Ошибка поиска'),
  })

  // Default to structured mock results
  const emptyResults: SearchResultData = { documents: [], persons: [], episodes: [], crossReferences: [] }
  const results = searchMutation.data ?? mockSearchResults
  const isSearching = searchMutation.isPending

  const handleSearch = () => {
    if (!query.trim()) return
    searchMutation.mutate()
  }

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
        </CardContent>
      </Card>

      {/* Empty state with illustration */}
      {!query.trim() && !searchMutation.data && totalCount === 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-8 text-center">
            <SearchX className="w-16 h-16 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Начните поиск по материалам дела</p>
            <p className="text-xs text-muted-foreground">Введите запрос или выберите предложенный вариант</p>
          </CardContent>
        </Card>
      )}

      {/* Suggested searches */}
      {!query.trim() && !searchMutation.data && (
        <div className="flex flex-wrap gap-2">
          {['Колесниченко', 'ст. 159 УК РФ', 'процессуальные нарушения', 'хищение'].map(s => (
            <Button key={s} size="sm" variant="outline" className="rounded-xl" onClick={() => { setQuery(s); handleSearch() }}>{s}</Button>
          ))}
        </div>
      )}

      {/* Result count badge */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge className="bg-stone-600 text-white">{totalCount} результатов</Badge>
          <Separator className="flex-1" />
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
            <Card className="rounded-xl"><CardContent className="p-4 text-center text-sm text-muted-foreground">Нет документов по запросу</CardContent></Card>
          ) : results.documents.map(d => (
            <Card key={d.id} className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-3"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium truncate">{d.originalName}</p></div>{d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="persons" className="space-y-2">
          {results.persons.length === 0 ? (
            <Card className="rounded-xl"><CardContent className="p-4 text-center text-sm text-muted-foreground">Нет участников по запросу</CardContent></Card>
          ) : results.persons.map(p => (
            <Card key={p.id} className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-3"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium">{p.fullName}</p><Badge variant="outline">{p.role ?? '—'}</Badge></div>{p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="episodes" className="space-y-2">
          {results.episodes.length === 0 ? (
            <Card className="rounded-xl"><CardContent className="p-4 text-center text-sm text-muted-foreground">Нет эпизодов по запросу</CardContent></Card>
          ) : results.episodes.map(e => (
            <Card key={e.id} className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-3"><div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium truncate">{e.title}</p><Badge variant="outline">{e.severity ?? '—'}</Badge></div><p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p></CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="references" className="space-y-2">
          {results.crossReferences.length === 0 ? (
            <Card className="rounded-xl"><CardContent className="p-4 text-center text-sm text-muted-foreground">Нет перекрёстных ссылок по запросу</CardContent></Card>
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
