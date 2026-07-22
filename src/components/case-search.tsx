'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Search, FileText, Users, BookOpen, Link2, Loader2, Network, Download, Bookmark, Clock, ChevronDown, ChevronUp, Filter, X, Calendar, HardDrive, AlertTriangle, CheckCircle2, ArrowRight, Sparkles, Eye, TrendingUp, Hash, Shield, UserCircle, Zap, Scale } from 'lucide-react'
import { mockSearchResults, mockDocuments, mockPersons, mockEpisodes, mockCrossRefNodes, mockBookmarks } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { SearchResultData, CrossRefNode, BookmarkData, DocumentData, PersonData, EpisodeData } from '@/lib/case-store'

const TYPE_B: Record<string, string> = { document: 'bg-red-700 text-white', person: 'bg-amber-600 text-white', episode: 'bg-emerald-700 text-white', article: 'bg-stone-600 text-white', обвинение: 'bg-red-700 text-white', показание: 'bg-amber-600 text-white', протокол: 'bg-emerald-700 text-white', экспертиза: 'bg-stone-600 text-white' }
const TYPE_C: Record<string, string> = { обвинение: '#dc2626', показание: '#d97706', протокол: '#047857', экспертиза: '#78716c' }
const LINK_C: Record<string, string> = { доказательство: '#047857', подтверждение: '#d97706', цитата: '#b45309', упоминание: '#78716c' }
const LINK_B: Record<string, string> = { доказательство: 'border-emerald-600 text-emerald-700 bg-emerald-50', подтверждение: 'border-amber-600 text-amber-700 bg-amber-50', цитата: 'border-amber-500 text-amber-600 bg-amber-50', упоминание: 'border-stone-500 text-stone-600 bg-stone-50' }
const SEV_B: Record<string, string> = { 'особо тяжкое': 'bg-red-700 text-white', тяжкое: 'bg-red-600 text-white', 'средней тяжести': 'bg-amber-600 text-white', небольшой: 'bg-stone-500 text-white' }
const STS_B: Record<string, string> = { доказано: 'bg-emerald-700 text-white', расследуется: 'bg-amber-600 text-white', сомнительно: 'bg-stone-500 text-white' }
const PROC_B: Record<string, string> = { completed: 'bg-emerald-700 text-white', processing: 'bg-amber-600 text-white', pending: 'bg-stone-400 text-white', failed: 'bg-red-700 text-white' }
const ROLE_B: Record<string, string> = { обвиняемый: 'bg-red-700 text-white', соучастник: 'bg-amber-600 text-white', свидетель: 'bg-stone-500 text-white', потерпевшая: 'bg-emerald-700 text-white' }
const ROLE_I: Record<string, React.ReactNode> = { обвиняемый: <Shield className="w-3.5 h-3.5 text-red-700" />, соучастник: <UserCircle className="w-3.5 h-3.5 text-amber-600" />, свидетель: <Eye className="w-3.5 h-3.5 text-stone-600" />, потерпевшая: <AlertTriangle className="w-3.5 h-3.5 text-emerald-700" /> }
const GUILT: Record<string, { color: string; width: number; label: string }> = { high: { color: 'bg-red-600', width: 90, label: 'Высокая' }, moderate: { color: 'bg-amber-500', width: 60, label: 'Средняя' }, low: { color: 'bg-stone-400', width: 30, label: 'Низкая' }, none: { color: 'bg-emerald-500', width: 10, label: 'Нет' } }
const BK_S: Record<string, { bg: string; border: string }> = { red: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-l-red-700' }, amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-l-amber-600' }, emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-l-emerald-700' }, stone: { bg: 'bg-stone-50 dark:bg-stone-900/30', border: 'border-l-stone-600' } }
const ENT_I: Record<string, React.ReactNode> = { document: <FileText className="w-3.5 h-3.5" />, person: <Users className="w-3.5 h-3.5" />, episode: <BookOpen className="w-3.5 h-3.5" />, article: <Scale className="w-3.5 h-3.5" />, search: <Search className="w-3.5 h-3.5" /> }
const F_LABEL: Record<string, string> = { all: 'Все', documents: 'Документы', persons: 'Участники', episodes: 'Эпизоды', articles: 'Статьи', 'cross-references': 'Ссылки' }
const PROC_ICON: Record<string, React.ReactNode> = { completed: <CheckCircle2 className="w-3 h-3 mr-0.5" />, processing: <Loader2 className="w-3 h-3 mr-0.5 animate-spin" />, pending: <Clock className="w-3 h-3 mr-0.5" />, failed: <AlertTriangle className="w-3 h-3 mr-0.5" /> }

function fmtDT(iso: string) { try { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) } catch { return iso } }
function fmtSize(b: number) { return b < 1024 ? `${b} Б` : b < 1048576 ? `${(b/1024).toFixed(1)} КБ` : `${(b/1048576).toFixed(1)} МБ` }
function trunc(t: string | null, n = 100) { return t ? (t.length > n ? t.slice(0, n) + '…' : t) : '' }
function exportCSV(r: SearchResultData) { const rows = ['Category,Name,Type,Status']; r.documents.forEach(d => rows.push(`Document,"${d.originalName}",${d.documentType ?? ''},${d.processingStatus}`)); r.persons.forEach(p => rows.push(`Person,"${p.fullName}",${p.role ?? ''},${p.status ?? ''}`)); r.episodes.forEach(e => rows.push(`Episode,"${e.title}",${e.severity ?? ''},${e.status ?? ''}`)); r.crossReferences.forEach(cr => rows.push(`CrossRef,"${cr.referenceText}",${cr.referenceType ?? ''},"${cr.sourceDocument.originalName}"`)); const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'search_results.csv'; a.click(); URL.revokeObjectURL(url) }

function CrossRefGraph({ nodes, hlId, onClick }: { nodes: CrossRefNode[]; hlId: string | null; onClick: (id: string) => void }) {
  const W = 420, H = 280, cx = W/2, cy = H/2, R = Math.min(W,H)*0.35
  const pos = useMemo(() => { const p: Record<string, {x:number;y:number}> = {}; nodes.forEach((n,i) => { const a = (2*Math.PI*i)/nodes.length - Math.PI/2; p[n.documentId] = { x: cx+R*Math.cos(a), y: cy+R*Math.sin(a) } }); return p }, [nodes])
  const edges = useMemo(() => { const e: {s:string;t:string;rt:string|null}[] = []; nodes.forEach(n => n.linkedDocuments.forEach(l => { if (!e.some(x => (x.s===n.documentId&&x.t===l.id)||(x.s===l.id&&x.t===n.documentId))) e.push({s:n.documentId,t:l.id,rt:l.refType}) })); return e }, [nodes])
  const rel = useMemo(() => { if (!hlId) return new Set<string>(); const s = new Set([hlId]); edges.forEach(e => { if (e.s===hlId) s.add(e.t); if (e.t===hlId) s.add(e.s) }); return s }, [hlId, edges])
  return (<Card className="rounded-xl shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Network className="w-4 h-4 text-amber-600" /> Граф перекрёстных ссылок<Badge className="bg-stone-600 text-white text-xs">{nodes.length} документов</Badge></CardTitle></CardHeader>
    <CardContent className="p-4"><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {edges.map((e,i) => { const s=pos[e.s],t=pos[e.t]; if (!s||!t) return null; const hl=rel.has(e.s)&&rel.has(e.t); return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={hl?(LINK_C[e.rt??'']??'#78716c'):'#d6d3d1'} strokeWidth={hl?2.5:1.5} strokeDasharray={hl?'':'4 2'} opacity={hl?1:0.5} /> })}
      {nodes.map(n => { const p=pos[n.documentId]; if (!p) return null; const hl=rel.has(n.documentId), c=TYPE_C[n.documentType??'']??'#78716c'; return <g key={n.documentId} onClick={() => onClick(n.documentId)} className="cursor-pointer"><circle cx={p.x} cy={p.y} r={hl?18:14} fill={hl?c:'#f5f5f4'} stroke={c} strokeWidth={hl?3:2} opacity={hl?1:0.8} /><text x={p.x} y={p.y+4} textAnchor="middle" fontSize={hl?10:8} fill={hl?'#ffffff':c} fontWeight={hl?'bold':'normal'}>{n.documentName.slice(0,12)}</text></g> })}
    </svg>
    <div className="flex flex-wrap gap-3 mt-3">{Object.entries(LINK_C).map(([t,c]) => <div key={t} className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{backgroundColor:c}} /><span className="text-xs text-muted-foreground">{t}</span></div>)}</div>
    {hlId && <div className="mt-2 flex items-center gap-2 text-xs"><Sparkles className="w-3 h-3 text-amber-600" /><span className="text-amber-700 font-medium">Выделен: {nodes.find(n=>n.documentId===hlId)?.documentName??'—'}</span><Button size="sm" variant="ghost" className="h-5 px-2 text-xs" onClick={() => onClick(hlId)}><X className="w-3 h-3" /> Сбросить</Button></div>}
  </CardContent></Card>)
}

function DocCard({ doc }: { doc: DocumentData }) {
  const pv = trunc(doc.extractedText ?? doc.summary ?? '', 100)
  return (<Card className="rounded-xl shadow-sm transition-all hover:shadow-md group"><CardContent className="p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-red-700" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><p className="text-sm font-semibold truncate">{doc.originalName}</p>{doc.documentType && <Badge className={`${TYPE_B[doc.documentType] ?? 'bg-stone-500 text-white'} text-xs shrink-0`}>{doc.documentType}</Badge>}</div><div className="flex items-center gap-3 text-xs text-muted-foreground mb-2"><span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{fmtSize(doc.fileSize)}</span>{doc.documentDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDT(doc.documentDate)}</span>}<Badge className={`${PROC_B[doc.processingStatus] ?? 'bg-stone-400 text-white'} text-xs shrink-0`}>{PROC_ICON[doc.processingStatus]}{doc.processingStatus}</Badge></div>{pv && <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground/80">{pv}</p>}{doc.sourceReference && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Hash className="w-3 h-3" />{doc.sourceReference}</p>}</div></div></CardContent></Card>)
}

function PersonCard({ person }: { person: PersonData }) {
  const g = GUILT[person.guiltLevel ?? 'none'] ?? GUILT.none
  return (<Card className="rounded-xl shadow-sm transition-all hover:shadow-md group"><CardContent className="p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">{ROLE_I[person.role ?? ''] ?? <Users className="w-5 h-5 text-amber-600" />}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><p className="text-sm font-semibold truncate">{person.fullName}</p>{person.role && <Badge className={`${ROLE_B[person.role] ?? 'bg-stone-500 text-white'} text-xs shrink-0`}>{person.role}</Badge>}{person.isKolesnichenko && <Badge className="bg-red-700 text-white text-xs shrink-0"><Shield className="w-3 h-3 mr-0.5" />клиент</Badge>}</div><div className="flex items-center gap-2 mb-2"><span className="text-xs text-muted-foreground shrink-0">Виновность:</span><div className="flex-1 h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden"><div className={`${g.color} h-full rounded-full`} style={{width:`${g.width}%`}} /></div><span className="text-xs font-medium shrink-0">{g.label}</span></div>{person.description && <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground/80">{person.description}</p>}</div></div></CardContent></Card>)
}

function EpisodeCard({ episode }: { episode: EpisodeData }) {
  return (<Card className="rounded-xl shadow-sm transition-all hover:shadow-md group"><CardContent className="p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5 text-emerald-700" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><p className="text-sm font-semibold truncate">{episode.title}</p>{episode.severity && <Badge className={`${SEV_B[episode.severity] ?? 'bg-stone-500 text-white'} text-xs shrink-0`}>{episode.severity}</Badge>}{episode.status && <Badge className={`${STS_B[episode.status] ?? 'bg-stone-400 text-white'} text-xs shrink-0`}>{episode.status}</Badge>}</div><div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">{episode.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDT(episode.date)}</span>}{episode.episodeNumber && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />Эпизод №{episode.episodeNumber}</span>}</div><div className="flex items-center gap-3 text-xs mb-2"><span className="flex items-center gap-1 text-amber-700"><Users className="w-3 h-3" />{episode.persons.length} участников</span><span className="flex items-center gap-1 text-emerald-700"><Scale className="w-3 h-3" />{episode.articles.length} статей</span></div>{episode.description && <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground/80">{episode.description}</p>}</div></div></CardContent></Card>)
}

function CrossRefCard({ cr }: { cr: { id: string; referenceText: string; referenceType: string | null; sourceDocument: DocumentData; targetDocument: DocumentData } }) {
  return (<Card className="rounded-xl shadow-sm transition-all hover:shadow-md group"><CardContent className="p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-stone-50 dark:bg-stone-900/30 flex items-center justify-center shrink-0"><Link2 className="w-5 h-5 text-stone-600" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1.5"><Badge className={`${TYPE_B[cr.sourceDocument.documentType ?? ''] ?? 'bg-stone-500 text-white'} text-xs shrink-0`}>{cr.sourceDocument.documentType ?? '—'}</Badge><span className="text-xs font-medium truncate max-w-[10rem]">{cr.sourceDocument.originalName}</span><ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><Badge className={`${TYPE_B[cr.targetDocument.documentType ?? ''] ?? 'bg-stone-500 text-white'} text-xs shrink-0`}>{cr.targetDocument.documentType ?? '—'}</Badge><span className="text-xs font-medium truncate max-w-[10rem]">{cr.targetDocument.originalName}</span></div>{cr.referenceType && <Badge className={`${LINK_B[cr.referenceType] ?? 'border-stone-300 text-stone-500'} text-xs shrink-0 mb-1.5`}>{cr.referenceType}</Badge>}<p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground/80">{trunc(cr.referenceText, 120)}</p></div></div></CardContent></Card>)
}

function BookmarksPanel({ bookmarks }: { bookmarks: BookmarkData[] }) {
  if (!bookmarks.length) return null
  return (<Card className="rounded-xl shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bookmark className="w-4 h-4 text-amber-600" /> Сохранённые закладки<Badge className="bg-stone-600 text-white">{bookmarks.length}</Badge></CardTitle></CardHeader><CardContent className="p-4"><div className="flex flex-wrap gap-2">{bookmarks.map(bm => { const s = BK_S[bm.color] ?? BK_S.stone; return <button key={bm.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-l-4 ${s.bg} ${s.border} text-left transition-all hover:scale-[1.02] hover:shadow-sm max-w-xs`}>{ENT_I[bm.entityType] ?? <FileText className="w-3.5 h-3.5" />}<span className="text-xs font-medium truncate">{bm.entityName}</span></button> })}</div></CardContent></Card>)
}

const SUGGESTIONS = ['мошенничество', 'алиби Колесниченко', 'обыск без адвоката', 'ст. 159 ч.3', 'показания Сидорова', 'финансовые документы', 'процессуальные нарушения', 'срок следствия']
interface HistEntry { query: string; filterType: string; timestamp: string }

export function CaseSearch() {
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null)
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState<HistEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchMutation = useMutation({ mutationFn: (params: { query: string; filterType: string }) => caseApi.search(params) })
  const { data: bkData } = useQuery({ queryKey: ['bookmarks'], queryFn: caseApi.getBookmarks, retry: 1 })
  const { data: crData } = useQuery({ queryKey: ['cross-ref-graph'], queryFn: caseApi.getCrossRefGraph, retry: 1 })

  const results = searchMutation.data ?? mockSearchResults
  const bookmarks = bkData ?? mockBookmarks
  const crossRefNodes = crData ?? mockCrossRefNodes
  const isSearching = searchMutation.isPending

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    searchMutation.mutate({ query, filterType })
    setSearchHistory(prev => [...prev.slice(-9), { query, filterType, timestamp: new Date().toISOString() }])
    setShowSuggestions(false)
  }, [query, filterType, searchMutation])

  const filteredResults = useMemo(() => {
    let { documents: docs, persons, episodes, crossReferences: crossRefs } = results
    if (selectedDocTypes.length > 0) docs = docs.filter(d => selectedDocTypes.includes(d.documentType ?? ''))
    if (selectedRoles.length > 0) persons = persons.filter(p => selectedRoles.includes(p.role ?? ''))
    if (selectedSeverity.length > 0) episodes = episodes.filter(e => selectedSeverity.includes(e.severity ?? ''))
    if (dateFrom) docs = docs.filter(d => d.documentDate && d.documentDate >= dateFrom)
    if (dateTo) docs = docs.filter(d => d.documentDate && d.documentDate <= dateTo)
    return { documents: docs, persons, episodes, crossReferences: crossRefs }
  }, [results, selectedDocTypes, selectedRoles, selectedSeverity, dateFrom, dateTo])

  const counts = useMemo(() => ({ d: filteredResults.documents.length, p: filteredResults.persons.length, e: filteredResults.episodes.length, c: filteredResults.crossReferences.length }), [filteredResults])
  const total = counts.d + counts.p + counts.e + counts.c

  const toggleArr = (arr: string[], item: string) => arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]

  useEffect(() => { const h = (e: MouseEvent) => { if (inputRef.current && !inputRef.current.contains(e.target as Node)) setShowSuggestions(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])

  return (<div className="space-y-6">
    <Card className="bg-gradient-to-r from-red-900/30 via-stone-900/20 to-emerald-900/10 border-l-4 border-amber-600 rounded-xl shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-4"><div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-600/20 shrink-0"><Search className="w-6 h-6 text-amber-600" /></div><div className="flex-1 min-w-0"><h2 className="text-lg font-bold">Поиск по материалам дела</h2><p className="text-sm text-muted-foreground">Документы, участники, эпизоды и перекрёстные ссылки по делу № 2024-00145</p></div></div></CardContent></Card>

    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow"><CardContent className="p-4">
      <div className="relative mb-3"><div className="flex items-center gap-2"><div className="relative flex-1" ref={inputRef}><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={query} onChange={e => { setQuery(e.target.value); setShowSuggestions(true) }} placeholder="Введите запрос..." className="pl-9 rounded-xl h-9" onFocus={() => setShowSuggestions(true)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />{query && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2" onClick={() => { setQuery(''); setShowSuggestions(false) }}><X className="w-3 h-3" /></Button>}
        {showSuggestions && query.length < 3 && (<div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto">{SUGGESTIONS.map(s => <button key={s} className="w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors" onClick={() => { setQuery(s); setShowSuggestions(false) }}>{s}</button>)}</div>)}
      </div><Button onClick={handleSearch} disabled={isSearching} className="rounded-xl gap-1">{isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Найти</Button><Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => exportCSV(filteredResults)}><Download className="w-3 h-3" />CSV</Button></div></div>

      <div className="flex items-center gap-2 flex-wrap mb-3">{['all','documents','persons','episodes','articles','cross-references'].map(f => <Button key={f} variant={filterType===f?'default':'outline'} size="sm" className="rounded-lg text-xs" onClick={() => setFilterType(f)}>{F_LABEL[f]}</Button>)}</div>
      <Separator className="my-3" />
      <div className="flex flex-wrap gap-3 items-center text-xs">
        <Collapsible><CollapsibleTrigger asChild><Button variant="outline" size="sm" className="rounded-lg gap-1 text-xs"><Filter className="w-3 h-3" />Фильтры<ChevronDown className="w-3 h-3" /></Button></CollapsibleTrigger><CollapsibleContent><div className="grid sm:grid-cols-3 gap-3 mt-3 p-3 rounded-lg bg-muted/40">
          <div><p className="font-semibold mb-1">Тип документа</p>{['обвинение','показание','протокол','экспертиза'].map(t => <Button key={t} variant={selectedDocTypes.includes(t)?'default':'outline'} size="sm" className="rounded-lg text-xs mr-1 mb-1" onClick={() => setSelectedDocTypes(toggleArr(selectedDocTypes,t))}>{t}</Button>)}</div>
          <div><p className="font-semibold mb-1">Роль участника</p>{['обвиняемый','соучастник','свидетель','потерпевшая'].map(r => <Button key={r} variant={selectedRoles.includes(r)?'default':'outline'} size="sm" className="rounded-lg text-xs mr-1 mb-1" onClick={() => setSelectedRoles(toggleArr(selectedRoles,r))}>{r}</Button>)}</div>
          <div><p className="font-semibold mb-1">Тяжесть</p>{['особо тяжкое','тяжкое','средней тяжести','небольшой'].map(s => <Button key={s} variant={selectedSeverity.includes(s)?'default':'outline'} size="sm" className="rounded-lg text-xs mr-1 mb-1" onClick={() => setSelectedSeverity(toggleArr(selectedSeverity,s))}>{s}</Button>)}</div>
        </div></CollapsibleContent></Collapsible>
        <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-7 w-28 text-xs rounded-lg" /></div>
        <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-7 w-28 text-xs rounded-lg" /></div>
        {(selectedDocTypes.length||selectedRoles.length||selectedSeverity.length||dateFrom||dateTo) && <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelectedDocTypes([]); setSelectedRoles([]); setSelectedSeverity([]); setDateFrom(''); setDateTo('') }}><X className="w-3 h-3" />Сбросить</Button>}
      </div>
    </CardContent></Card>

    {isSearching && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>}

    {!isSearching && total > 0 && (<div className="grid sm:grid-cols-4 gap-2 text-xs">{[{l:'Документы',c:counts.d,b:'bg-red-700 text-white',i:<FileText className="w-3.5 h-3.5" />},{l:'Участники',c:counts.p,b:'bg-amber-600 text-white',i:<Users className="w-3.5 h-3.5" />},{l:'Эпизоды',c:counts.e,b:'bg-emerald-700 text-white',i:<BookOpen className="w-3.5 h-3.5" />},{l:'Ссылки',c:counts.c,b:'bg-stone-600 text-white',i:<Link2 className="w-3.5 h-3.5" />}].map(s => <div key={s.l} className="p-3 rounded-lg bg-muted/40 flex items-center gap-2"><div className={`flex items-center justify-center w-8 h-8 rounded-lg ${s.b}`}>{s.i}</div><div><p className="text-muted-foreground">{s.l}</p><p className="font-bold text-sm">{s.c}</p></div></div>)}</div>)}

    <Tabs defaultValue="documents" className="w-full">
      <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="documents" className="text-xs">Документы ({counts.d})</TabsTrigger><TabsTrigger value="persons" className="text-xs">Участники ({counts.p})</TabsTrigger><TabsTrigger value="episodes" className="text-xs">Эпизоды ({counts.e})</TabsTrigger><TabsTrigger value="cross-references" className="text-xs">Ссылки ({counts.c})</TabsTrigger></TabsList>
      <TabsContent value="documents" className="space-y-2 mt-2">{filteredResults.documents.map(d => <DocCard key={d.id} doc={d} />)}</TabsContent>
      <TabsContent value="persons" className="space-y-2 mt-2">{filteredResults.persons.map(p => <PersonCard key={p.id} person={p} />)}</TabsContent>
      <TabsContent value="episodes" className="space-y-2 mt-2">{filteredResults.episodes.map(e => <EpisodeCard key={e.id} episode={e} />)}</TabsContent>
      <TabsContent value="cross-references" className="space-y-2 mt-2">{filteredResults.crossReferences.map(cr => <CrossRefCard key={cr.id} cr={cr} />)}</TabsContent>
    </Tabs>

    <CrossRefGraph nodes={crossRefNodes} hlId={highlightedDocId} onClick={id => setHighlightedDocId(highlightedDocId===id?null:id)} />
    <BookmarksPanel bookmarks={bookmarks} />

    {searchHistory.length > 0 && (<Collapsible><CollapsibleTrigger asChild><Button variant="outline" size="sm" className="rounded-lg gap-1 text-xs"><Clock className="w-3 h-3" />История поиска ({searchHistory.length})<ChevronDown className="w-3 h-3" /></Button></CollapsibleTrigger><CollapsibleContent><div className="mt-2 max-h-40 overflow-y-auto space-y-1">{searchHistory.map((h,i) => <button key={i} className="w-full px-3 py-2 rounded-md bg-muted/40 text-xs text-left hover:bg-muted transition-colors" onClick={() => { setQuery(h.query); setFilterType(h.filterType) }}><span className="font-medium">{h.query}</span><span className="text-muted-foreground ml-2">— {F_LABEL[h.filterType]} · {fmtDT(h.timestamp)}</span></button>)}</div></CollapsibleContent></Collapsible>)}

    <Separator /><p className="text-xs text-muted-foreground">Поиск по материалам дела • Дело № 2024-00145 • Колесниченко Д.А. и другие</p>
  </div>)
}
