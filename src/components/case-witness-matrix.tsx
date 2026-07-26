'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, CheckCircle2, XCircle, HelpCircle, Minus, AlertTriangle, Star, Filter, ArrowUpDown, Activity, MessageSquare, FileText, Shield, Eye, TrendingDown, Flame } from 'lucide-react'
import { mockFacts, mockWitnesses } from '@/lib/mock-data'
import type { WitnessData, FactData, WitnessPosition, WitnessRole, WitnessPositionData } from '@/lib/mock-data'

type SortKey = 'name' | 'reliability' | 'contradictions'

const POS_CFG: Record<WitnessPosition, { label: string; short: string; icon: React.ReactNode; cell: string; badge: string }> = {
  confirm: { label: 'Подтверждает', short: 'Подтв.', icon: <CheckCircle2 className="w-3.5 h-3.5" />, cell: 'bg-emerald-700 text-white', badge: 'bg-emerald-700 text-white' },
  deny: { label: 'Опровергает', short: 'Опров.', icon: <XCircle className="w-3.5 h-3.5" />, cell: 'bg-red-700 text-white', badge: 'bg-red-700 text-white' },
  'dont-remember': { label: 'Не помнит', short: 'Не помнит', icon: <HelpCircle className="w-3.5 h-3.5" />, cell: 'bg-amber-600 text-white', badge: 'bg-amber-600 text-white' },
  'no-data': { label: 'Нет данных', short: '—', icon: <Minus className="w-3.5 h-3.5" />, cell: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300', badge: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200' },
}

const ROLE_TONE: Record<WitnessRole, string> = {
  обвиняемый: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  соучастник: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200',
  свидетель: 'bg-stone-100 text-stone-800 dark:bg-stone-800/50 dark:text-stone-200',
  'свидетель алиби': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  потерпевшая: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
  эксперт: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
}

function countContradictions(w: WitnessData): number { return mockFacts.reduce((s, f) => s + (w.positions[f.id]?.contradictsOthers ? 1 : 0), 0) }
function reliabilityStars(c: number): number { return c <= 1 ? 5 : c <= 3 ? 4 : c <= 5 ? 3 : c <= 7 ? 2 : 1 }
function confidenceColor(c: number): string { return c >= 85 ? 'text-emerald-700' : c >= 60 ? 'text-amber-600' : c > 0 ? 'text-orange-600' : 'text-stone-400' }
function fmtDate(iso: string): string { try { return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return iso } }

function StarRating({ stars, size = 'sm' }: { stars: number; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  return <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(n => <Star key={n} className={`${sz} ${n <= stars ? 'fill-amber-400 text-amber-500' : 'fill-stone-200 text-stone-300 dark:fill-stone-700 dark:text-stone-600'}`} />)}</div>
}

function ConflictsSummary({ witnesses, facts }: { witnesses: WitnessData[]; facts: FactData[] }) {
  const totalConflicts = useMemo(() => witnesses.reduce((s, w) => s + countContradictions(w), 0), [witnesses])
  const worst = useMemo(() => [...witnesses].sort((a, b) => countContradictions(b) - countContradictions(a) || a.name.localeCompare(b.name, 'ru'))[0], [witnesses])
  const mostDisputed = useMemo(() => {
    let best: { fact: FactData; count: number } | null = null
    for (const f of facts) { const c = witnesses.filter(w => w.positions[f.id]?.contradictsOthers).length; if (!best || c > best.count) best = { fact: f, count: c } }
    return best
  }, [witnesses, facts])
  const stats = [
    { icon: <Flame className="w-5 h-5 text-red-700" />, bg: 'bg-red-100 dark:bg-red-950/40', label: 'Всего противоречий', value: totalConflicts, hint: 'Сумма конфликтующих ячеек', tone: 'text-red-700' },
    ...(worst ? [{ icon: <TrendingDown className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-100 dark:bg-orange-950/40', label: 'Худший свидетель', value: worst.name, hint: `${countContradictions(worst)} противоречий`, tone: 'text-orange-700' }] : []),
    ...(mostDisputed ? [{ icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100 dark:bg-amber-950/40', label: 'Самый спорный факт', value: mostDisputed.fact.text, hint: `${mostDisputed.count} свидетелей в конфликте`, tone: 'text-amber-700' }] : []),
  ]
  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-red-700 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-700" /> Сводка противоречий</CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-3 gap-3">{stats.map((s, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${s.bg}`}>{s.icon}</div>
            <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`font-bold break-words leading-snug ${s.tone}`} title={String(s.value)}>{s.value}</p><p className="text-xs text-muted-foreground mt-0.5">{s.hint}</p></div>
          </div>
        ))}</div>
      </CardContent>
    </Card>
  )
}

function MatrixCell({ witness, fact, isSelected, conflictsOnly, onClick }: { witness: WitnessData; fact: FactData; isSelected: boolean; conflictsOnly: boolean; onClick: () => void }) {
  const pos = witness.positions[fact.id]
  if (!pos) return null
  const cfg = POS_CFG[pos.position]
  const isConflict = pos.contradictsOthers
  const dimmed = conflictsOnly && !isConflict
  const bg = dimmed ? 'bg-stone-50 text-stone-400 dark:bg-stone-900 dark:text-stone-600' : isConflict && pos.position !== 'no-data' ? 'bg-red-700 text-white' : cfg.cell
  const ring = isSelected ? 'ring-2 ring-purple-700 ring-offset-1' : isConflict && !dimmed ? 'ring-1 ring-red-900/40' : ''
  const pulse = isConflict && !dimmed && pos.position === 'deny' ? 'animate-pulse' : ''
  return (
    <button type="button" onClick={onClick} title={`${witness.name} — ${fact.text}: ${cfg.label}${isConflict ? ' (противоречит другим)' : ''}`}
      className={`relative h-12 min-w-[64px] flex items-center justify-center transition-all duration-150 ${bg} ${ring} ${pulse} hover:brightness-110 hover:z-10 cursor-pointer`}>
      {pos.position === 'no-data' ? <Minus className="w-3.5 h-3.5 opacity-60" /> : <span className="flex items-center justify-center">{cfg.icon}</span>}
      {isConflict && !dimmed && pos.position !== 'no-data' && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm" />}
      {isSelected && <span className="absolute inset-0 ring-2 ring-purple-700 rounded-sm pointer-events-none" />}
    </button>
  )
}

function MatrixTable({ witnesses, facts, selectedCell, onSelectCell, conflictsOnly }: { witnesses: WitnessData[]; facts: FactData[]; selectedCell: { witnessId: string; factId: string } | null; onSelectCell: (w: string, f: string) => void; conflictsOnly: boolean }) {
  const LEGEND = [
    { bg: 'bg-emerald-700', icon: <CheckCircle2 className="w-2.5 h-2.5 text-white" />, label: 'Подтверждает' },
    { bg: 'bg-red-700', icon: <XCircle className="w-2.5 h-2.5 text-white" />, label: 'Опровергает' },
    { bg: 'bg-amber-600', icon: <HelpCircle className="w-2.5 h-2.5 text-white" />, label: 'Не помнит' },
    { bg: 'bg-stone-200 dark:bg-stone-700', icon: <Minus className="w-2.5 h-2.5 text-stone-600 dark:text-stone-300" />, label: 'Нет данных' },
    { bg: 'bg-red-700 ring-1 ring-red-900 animate-pulse', icon: null, label: 'Противоречит другим (пульсация)' },
  ]
  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-purple-700" /> Матрица согласованности показаний</CardTitle></CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
          <table className="border-collapse w-full">
            <thead><tr>
              <th className="sticky left-0 top-0 z-30 bg-stone-800 text-white px-3 py-2 text-xs font-semibold text-left min-w-[180px] max-w-[220px] border-b border-r border-stone-700"><div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /><span>Свидетель</span></div></th>
              {facts.map(f => (<th key={f.id} className="sticky top-0 z-20 bg-stone-800 text-white px-2 py-2 text-[11px] font-medium text-center min-w-[120px] max-w-[160px] border-b border-r border-stone-700 last:border-r-0">
                <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><div className="flex flex-col items-center gap-0.5 cursor-help"><span className="text-[10px] uppercase tracking-wide text-stone-400">{f.id}</span><span className="whitespace-normal leading-tight text-white text-[10px] line-clamp-2">{f.text}</span></div></TooltipTrigger><TooltipContent side="bottom" className="max-w-[240px] text-xs"><span className="font-semibold text-stone-300">{f.id}:</span> <span>{f.text}</span></TooltipContent></Tooltip></TooltipProvider>
              </th>))}
            </tr></thead>
            <tbody>{witnesses.map((w, idx) => {
              const contrad = countContradictions(w), stars = reliabilityStars(contrad)
              return (<tr key={w.id} className={`group ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors`}>
                <td className={`sticky left-0 z-10 px-3 py-2 text-xs font-medium border-b border-r border-border min-w-[180px] max-w-[220px] ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} group-hover:bg-amber-50/80 dark:group-hover:bg-amber-950/20`}>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold truncate" title={w.name}>{w.name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_TONE[w.role]} border-0`}>{w.role}</Badge>
                      {contrad > 0 && <Badge className="text-[10px] px-1.5 py-0 bg-red-700 text-white"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{contrad}</Badge>}
                    </div>
                    <StarRating stars={stars} size="sm" />
                  </div>
                </td>
                {facts.map(f => (<td key={f.id} className="p-0 border-b border-r border-border last:border-r-0"><MatrixCell witness={w} fact={f} isSelected={selectedCell?.witnessId === w.id && selectedCell?.factId === f.id} conflictsOnly={conflictsOnly} onClick={() => onSelectCell(w.id, f.id)} /></td>))}
              </tr>)
            })}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
          <span className="font-medium">Легенда:</span>
          {LEGEND.map((l, i) => <div key={i} className="flex items-center gap-1"><span className={`w-4 h-4 rounded-sm ${l.bg} inline-flex items-center justify-center`}>{l.icon}</span><span>{l.label}</span></div>)}
        </div>
      </CardContent>
    </Card>
  )
}

function DetailPanel({ witness, fact, onClose }: { witness: WitnessData | undefined; fact: FactData | undefined; onClose: () => void }) {
  if (!witness || !fact) return (
    <Card className="rounded-xl shadow-sm border-dashed"><CardContent className="p-6 text-center"><Eye className="w-8 h-8 mx-auto text-muted-foreground/60" /><p className="text-sm text-muted-foreground mt-2">Выберите ячейку матрицы, чтобы увидеть подробные показания свидетеля по выбранному факту.</p></CardContent></Card>
  )
  const pos = witness.positions[fact.id]
  if (!pos) return null
  const cfg = POS_CFG[pos.position]
  const contrad = countContradictions(witness), stars = reliabilityStars(contrad)
  const reliabilityLabel = stars >= 5 ? 'Высокая' : stars >= 4 ? 'Хорошая' : stars >= 3 ? 'Средняя' : stars >= 2 ? 'Низкая' : 'Очень низкая'
  const barColor = pos.confidence >= 85 ? 'bg-emerald-700' : pos.confidence >= 60 ? 'bg-amber-600' : pos.confidence > 0 ? 'bg-orange-600' : 'bg-stone-400'
  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-purple-700 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <CardHeader className="pb-2"><div className="flex items-start justify-between gap-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-purple-700" /> Детали показаний</CardTitle><Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClose}>Закрыть</Button></div></CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/40"><p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Свидетель</p><p className="font-semibold text-sm mt-0.5">{witness.name}</p><Badge variant="outline" className={`text-[10px] mt-1 border-0 ${ROLE_TONE[witness.role]}`}>{witness.role}</Badge><p className="text-xs text-muted-foreground mt-1.5">Дата показаний: {fmtDate(witness.statementDate)}</p></div>
          <div className="p-3 rounded-lg bg-muted/40"><p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Факт</p><p className="font-semibold text-sm mt-0.5" title={fact.text}>{fact.id}. {fact.text}</p><div className="flex items-center gap-2 mt-1.5"><Badge className={`text-[10px] ${cfg.badge}`}>{cfg.icon}<span className="ml-1">{cfg.label}</span></Badge>{pos.contradictsOthers && <Badge className="text-[10px] bg-red-700 text-white"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Противоречит другим</Badge>}</div></div>
        </div>
        <div className="p-3 rounded-lg border border-border bg-background"><p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Показания свидетеля</p><p className="text-sm italic leading-relaxed">«{pos.statement}»</p></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/40"><p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Activity className="w-3 h-3" /> Уверенность</p><p className={`text-2xl font-bold ${confidenceColor(pos.confidence)}`}>{pos.confidence}%</p><div className="mt-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.max(pos.confidence, 4)}%` }} /></div></div>
          <div className="p-3 rounded-lg bg-muted/40"><p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" /> Противоречий у свидетеля</p><p className="text-2xl font-bold text-red-700">{contrad}</p><p className="text-xs text-muted-foreground mt-1">из {mockFacts.length} рассматриваемых фактов</p></div>
          <div className="p-3 rounded-lg bg-muted/40"><p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Shield className="w-3 h-3" /> Надёжность свидетеля</p><StarRating stars={stars} size="md" /><p className="text-xs text-muted-foreground mt-1">{reliabilityLabel} надёжность</p></div>
        </div>
        {pos.relatedDocuments.length > 0 && (<div className="p-3 rounded-lg bg-muted/40"><p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3" /> Связанные документы</p><div className="flex flex-wrap gap-1.5">{pos.relatedDocuments.map((d, i) => <Badge key={i} variant="outline" className="text-[11px] gap-1 bg-background"><FileText className="w-2.5 h-2.5 text-purple-700" />{d}</Badge>)}</div></div>)}
      </CardContent>
    </Card>
  )
}

function AgreementAnalysis({ witnesses, facts }: { witnesses: WitnessData[]; facts: FactData[] }) {
  const analysis = useMemo(() => facts.map(f => {
    const counts: Record<WitnessPosition, number> = { confirm: 0, deny: 0, 'dont-remember': 0, 'no-data': 0 }
    for (const w of witnesses) { const p = w.positions[f.id]?.position; if (p) counts[p]++ }
    const total = counts.confirm + counts.deny + counts['dont-remember']
    const consensus = total > 0 ? Math.max(counts.confirm, counts.deny, counts['dont-remember']) / total : 0
    return { fact: f, counts, consensus, total }
  }), [witnesses, facts])
  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-700" /> Анализ согласия</CardTitle></CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2 max-h-[640px] overflow-y-auto scrollbar-thin">
        {analysis.map(a => (<div key={a.fact.id} className="p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-2 mb-1.5"><Badge variant="outline" className="text-[10px] shrink-0">{a.fact.id}</Badge><p className="text-xs font-medium leading-tight flex-1" title={a.fact.text}>{a.fact.text}</p></div>
          <div className="flex h-2 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700">
            {(['confirm', 'deny', 'dont-remember', 'no-data'] as WitnessPosition[]).map(p => { const cnt = a.counts[p]; if (!cnt) return null; return <div key={p} className={POS_CFG[p].cell} style={{ width: `${(cnt / Math.max(witnesses.length, 1)) * 100}%` }} title={`${POS_CFG[p].label}: ${cnt}`} /> })}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
            <span className="inline-flex items-center gap-0.5 text-emerald-700"><CheckCircle2 className="w-2.5 h-2.5" />{a.counts.confirm}</span>
            <span className="inline-flex items-center gap-0.5 text-red-700"><XCircle className="w-2.5 h-2.5" />{a.counts.deny}</span>
            <span className="inline-flex items-center gap-0.5 text-amber-600"><HelpCircle className="w-2.5 h-2.5" />{a.counts['dont-remember']}</span>
            <span className="inline-flex items-center gap-0.5 text-stone-500"><Minus className="w-2.5 h-2.5" />{a.counts['no-data']}</span>
            <span className="ml-auto text-muted-foreground">Согласие: {Math.round(a.consensus * 100)}%</span>
          </div>
        </div>))}
      </CardContent>
    </Card>
  )
}

export function CaseWitnessMatrix() {
  const [selectedCell, setSelectedCell] = useState<{ witnessId: string; factId: string } | null>(null)
  const [conflictsOnly, setConflictsOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const sortedWitnesses = useMemo(() => {
    const arr = [...mockWitnesses]
    if (sortKey === 'name') arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    else arr.sort((a, b) => countContradictions(b) - countContradictions(a) || a.name.localeCompare(b.name, 'ru'))
    return arr
  }, [sortKey])
  const selW = selectedCell ? mockWitnesses.find(w => w.id === selectedCell.witnessId) : undefined
  const selF = selectedCell ? mockFacts.find(f => f.id === selectedCell.factId) : undefined
  const handleSelect = (wId: string, fId: string) => setSelectedCell(selectedCell?.witnessId === wId && selectedCell?.factId === fId ? null : { witnessId: wId, factId: fId })

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-900/30 to-stone-900/20 border-l-4 border-purple-700 rounded-xl shadow-sm">
        <CardContent className="p-6"><div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-700/20"><MessageSquare className="w-6 h-6 text-purple-700" /></div>
          <div className="flex-1 min-w-0"><h2 className="text-lg font-bold">Матрица согласованности показаний</h2><p className="text-sm text-muted-foreground">Сравнение показаний свидетелей по ключевым фактам дела, выявление противоречий и оценка надёжности</p></div>
          <div className="hidden sm:flex flex-col items-end gap-1 text-right"><span className="text-xs text-muted-foreground">Свидетелей</span><span className="text-xl font-bold text-purple-700">{mockWitnesses.length}</span></div>
          <Separator orientation="vertical" className="hidden sm:block h-12" />
          <div className="hidden sm:flex flex-col items-end gap-1 text-right"><span className="text-xs text-muted-foreground">Фактов</span><span className="text-xl font-bold text-amber-600">{mockFacts.length}</span></div>
        </div></CardContent>
      </Card>
      <ConflictsSummary witnesses={mockWitnesses} facts={mockFacts} />
      <Card className="rounded-xl shadow-sm"><CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3 flex-wrap"><div className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium">Сортировка:</span></div>
          <Select value={sortKey} onValueChange={v => setSortKey(v as SortKey)}><SelectTrigger className="w-56 rounded-xl h-8 text-xs"><SelectValue placeholder="Выберите сортировку" /></SelectTrigger><SelectContent><SelectItem value="name">По имени (А→Я)</SelectItem><SelectItem value="reliability">По надёжности (худшие первыми)</SelectItem><SelectItem value="contradictions">По противоречиям (больше первыми)</SelectItem></SelectContent></Select>
        </div>
        <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium">Только противоречия:</span><Switch checked={conflictsOnly} onCheckedChange={setConflictsOnly} aria-label="Показать только противоречия" />{conflictsOnly && <Badge className="bg-red-700 text-white text-[10px] ml-1"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Фильтр активен</Badge>}</div>
      </CardContent></Card>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4"><MatrixTable witnesses={sortedWitnesses} facts={mockFacts} selectedCell={selectedCell} onSelectCell={handleSelect} conflictsOnly={conflictsOnly} /><AgreementAnalysis witnesses={mockWitnesses} facts={mockFacts} /></div>
      <DetailPanel witness={selW} fact={selF} onClose={() => setSelectedCell(null)} />
      <Separator /><p className="text-xs text-muted-foreground">Матрица согласованности показаний • Дело № 2024-00145 • Колесниченко Д.А. и другие • Не является юридической консультацией</p>
    </div>
  )
}
