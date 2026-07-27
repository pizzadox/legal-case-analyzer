'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Scale, CheckCircle, AlertTriangle, Info, XCircle, Loader2, Zap, Shield, BarChart3, Download, FileText, Clock, History, Flame, TrendingUp, Search, Filter, ArrowUpDown, BookOpen, Eye, Gavel, FileCheck, AlertOctagon, Target, ListChecks, ArrowRight, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

import { checkCompliance, getComplianceResults, getDocuments, getAuditLog } from '@/lib/case-api'
import type { LegalComplianceData, AuditLogEntry } from '@/lib/case-store'

const ST_CFG: Record<string, { icon: React.ReactNode; badge: string; label: string; dot: string; sev: string }> = {
  compliant: { icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, badge: 'bg-emerald-700 text-white', label: 'Соответствует', dot: 'bg-emerald-500', sev: 'low' },
  warning: { icon: <AlertTriangle className="w-4 h-4 text-amber-600" />, badge: 'bg-amber-600 text-white', label: 'Предупреждение', dot: 'bg-amber-500', sev: 'medium' },
  violation: { icon: <XCircle className="w-4 h-4 text-red-600" />, badge: 'bg-red-700 text-white', label: 'Нарушение', dot: 'bg-red-500', sev: 'high' },
}
const CHK_TYPE: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  article_applicability: { icon: <BookOpen className="w-4 h-4 text-emerald-600" />, label: 'Применимость статьи', color: 'text-emerald-600' },
  procedure_compliance: { icon: <Shield className="w-4 h-4 text-red-600" />, label: 'Процессуальное соответствие', color: 'text-red-600' },
  evidence_admissibility: { icon: <Eye className="w-4 h-4 text-amber-600" />, label: 'Допустимость доказательств', color: 'text-amber-600' },
  statute_limitations: { icon: <Clock className="w-4 h-4 text-stone-600" />, label: 'Срок давности', color: 'text-stone-600' },
}
const CAT_SEV: Record<string, string> = { upload: 'bg-amber-700/15', analysis: 'bg-emerald-700/15', edit: 'bg-stone-600/15', delete: 'bg-red-700/15', search: 'bg-orange-600/15', export: 'bg-stone-500/15', login: 'bg-stone-400/15', system: 'bg-stone-500/15' }
const SEV_B: Record<string, string> = { info: 'bg-stone-600 text-white', warning: 'bg-amber-600 text-white', critical: 'bg-red-700 text-white' }

function AuditPanel({ entries }: { entries: AuditLogEntry[] }) {
  const fmtT = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) + ' ' + new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-emerald-500 hover:shadow-md transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-emerald-700" /> Журнал аудита<Badge variant="outline" className="text-xs ml-auto">{entries.length} записей</Badge></CardTitle></CardHeader><CardContent className="p-4"><div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">{entries.slice(0, 10).map((e, i) => <div key={e.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-all ${i===0?'ring-1 ring-emerald-500/30':''}`}><div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${CAT_SEV[e.category] ?? CAT_SEV.system}`}><Scale className="w-3 h-3 text-emerald-700" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 mb-0.5"><p className="text-xs font-semibold truncate">{e.action}</p><Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${SEV_B[e.severity] ?? SEV_B.info}`}>{e.severity === 'critical' ? 'Критич.' : e.severity === 'warning' ? 'Вним.' : 'Инфо'}</Badge></div><p className="text-xs text-muted-foreground line-clamp-1">{e.details}</p><p className="text-[10px] text-muted-foreground mt-0.5">{fmtT(e.timestamp)} · {e.actor}</p></div></div>)}</div></CardContent></Card>)
}

export function CaseLegalCheck({ caseId }: { caseId?: string }) {
  const [activeTab, setActiveTab] = useState('results')
  const [checkFilter, setCheckFilter] = useState<string>('all')
  const [selectedDoc, setSelectedDoc] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const checkMutation = useMutation({ mutationFn: (params: { documentId?: string; articleId?: string }) => checkCompliance(params.documentId, params.articleId), onSuccess: () => toast.success('Проверка завершена'), onError: () => toast.error('Ошибка проверки') })
  const { data: compData } = useQuery({ queryKey: ['compliance-results', caseId], queryFn: () => getComplianceResults(), retry: 1, refetchInterval: false })
  const { data: docData } = useQuery({ queryKey: ['documents', caseId], queryFn: () => getDocuments(caseId), retry: 1, enabled: !!caseId, refetchInterval: 60000, staleTime: 60000 })
  const { data: auditData } = useQuery({ queryKey: ['audit-log', caseId], queryFn: () => getAuditLog(caseId, 20), retry: 1, enabled: !!caseId, refetchInterval: false })

  const checks = compData ?? []
  const documents = docData ?? []
  const auditLog = auditData ?? []

  const filteredChecks = useMemo(() => {
    let fc = [...checks]
    if (checkFilter !== 'all') fc = fc.filter(c => c.status === checkFilter)
    if (selectedDoc) fc = fc.filter(c => c.documentId === selectedDoc)
    if (searchQuery) { const q = searchQuery.toLowerCase(); fc = fc.filter(c => c.description.toLowerCase().includes(q) || (c.recommendation ?? '').toLowerCase().includes(q) || (c.legalBasis ?? '').toLowerCase().includes(q)) }
    return fc
  }, [checks, checkFilter, selectedDoc, searchQuery])

  const stats = useMemo(() => {
    const total = checks.length
    const byStatus: Record<string, number> = {}
    checks.forEach(c => { byStatus[c.status] = (byStatus[c.status] ?? 0) + 1 })
    const compliantPct = total > 0 ? Math.round(((byStatus.compliant ?? 0) / total) * 100) : 0
    return { total, byStatus, compliantPct }
  }, [checks])

  return (<div className="space-y-6">
    <Card className="bg-gradient-to-r from-red-900/30 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-4"><div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20 shrink-0"><Scale className="w-6 h-6 text-red-600" /></div><div className="flex-1 min-w-0"><h2 className="text-lg font-bold">Правовая проверка</h2><p className="text-sm text-muted-foreground">Проверка соответствия материалов дела нормам УК и УПК РФ</p></div><Badge className="bg-emerald-700 text-white">{stats.compliantPct}% соответствует</Badge></div></CardContent></Card>

    <div className="grid sm:grid-cols-3 gap-3">
      {Object.entries(ST_CFG).map(([k, cfg]) => <Card key={k} className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setCheckFilter(k === checkFilter ? 'all' : k)}>
        <CardContent className="p-4"><div className="flex items-center gap-3"><div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${cfg.badge}`}>{cfg.icon}</div><div className="flex-1 min-w-0"><p className="text-xs font-semibold">{cfg.label}</p><p className="text-xl font-bold mt-0.5">{stats.byStatus[k] ?? 0}</p></div></div></CardContent>
      </Card>)}
    </div>

    <Card className="rounded-xl shadow-sm border-l-4 border-amber-600 hover:shadow-md transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-600" /> Запустить проверку</CardTitle></CardHeader>
    <CardContent className="p-4"><div className="flex items-center gap-3 flex-wrap"><Select value={selectedDoc} onValueChange={setSelectedDoc}><SelectTrigger className="w-64 h-8 text-xs rounded-xl"><SelectValue placeholder="Выберите документ" /></SelectTrigger><SelectContent>{documents.map(d => <SelectItem key={d.id} value={d.id}>{d.originalName}</SelectItem>)}</SelectContent></Select><Button onClick={() => checkMutation.mutate({ documentId: selectedDoc || undefined })} disabled={checkMutation.isPending} className="rounded-xl gap-1">{checkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}Проверить</Button>{checkMutation.isPending && <Progress value={66} className="h-2 w-32 [&>div]:bg-amber-600 animate-pulse" />}</div></CardContent></Card>

    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="results" className="text-xs">Результаты ({filteredChecks.length})</TabsTrigger><TabsTrigger value="audit" className="text-xs">Журнал аудита</TabsTrigger><TabsTrigger value="overview" className="text-xs">Обзор</TabsTrigger></TabsList>
      <TabsContent value="results" className="space-y-3 mt-3">
        <div className="flex items-center gap-2 mb-2"><Search className="w-4 h-4 text-muted-foreground" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Фильтр по описанию..." className="h-8 text-xs rounded-xl" /><Button variant="outline" size="sm" className="text-xs rounded-xl" onClick={() => { setCheckFilter('all'); setSearchQuery(''); setSelectedDoc('') }}><Filter className="w-3 h-3" />Сбросить</Button></div>
        {filteredChecks.length === 0 && <Card className="border-dashed"><CardContent className="p-6 text-center"><AlertOctagon className="w-8 h-8 mx-auto text-muted-foreground/60" /><p className="text-sm text-muted-foreground mt-2">Нет результатов для выбранных фильтров</p></CardContent></Card>}
        {filteredChecks.map(c => { const cfg = ST_CFG[c.status] ?? ST_CFG.warning; const tCfg = CHK_TYPE[c.checkType] ?? CHK_TYPE.procedure_compliance; return (
          <Card key={c.id} className="rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-red-700 hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3"><div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-muted/40">{tCfg.icon}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><Badge className={`${cfg.badge} text-xs shrink-0`}>{cfg.label}</Badge><Badge variant="outline" className="text-xs shrink-0">{tCfg.label}</Badge></div><p className="text-sm font-medium">{c.description}</p>{c.recommendation && <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Target className="w-3 h-3 text-amber-600" />{c.recommendation}</p>}{c.legalBasis && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.legalBasis}</p>}<p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(c.checkedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div></div>
            </CardContent>
          </Card>
        ) })}
      </TabsContent>
      <TabsContent value="audit" className="mt-3"><AuditPanel entries={auditLog} /></TabsContent>
      <TabsContent value="overview" className="mt-3">
        <Card className="rounded-xl shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-600" /> Статистика проверки</CardTitle></CardHeader><CardContent className="p-4">
          <div className="space-y-3">{Object.entries(ST_CFG).map(([k, cfg]) => { const cnt = stats.byStatus[k] ?? 0; const pct = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0; return (<div key={k} className="flex items-center gap-2"><div className={`flex items-center justify-center w-7 h-7 rounded shrink-0 ${cfg.badge}`}>{cfg.icon}</div><span className="text-xs font-medium min-w-[100px]">{cfg.label}</span><Progress value={pct} className="h-3 flex-1 [&>div]:bg-emerald-700 [&>div]:bg-amber-600 [&>div]:bg-red-700" /><Badge variant="outline" className="text-xs shrink-0">{cnt} ({pct}%)</Badge></div>) })}</div>
          <Separator className="mt-3" /><div className="grid sm:grid-cols-3 gap-3 text-xs mt-3"><div className="p-3 rounded-lg bg-muted/40"><p className="font-medium text-muted-foreground">Всего проверок</p><p className="text-lg font-bold mt-0.5">{stats.total}</p></div><div className="p-3 rounded-lg bg-muted/40"><p className="font-medium text-muted-foreground">Соответствие</p><p className="text-lg font-bold mt-0.5 text-emerald-700">{stats.compliantPct}%</p></div><div className="p-3 rounded-lg bg-muted/40"><p className="font-medium text-muted-foreground">Нарушений</p><p className="text-lg font-bold mt-0.5 text-red-700">{stats.byStatus.violation ?? 0}</p></div></div>
        </CardContent></Card>
      </TabsContent>
    </Tabs>

    <Separator /><p className="text-xs text-muted-foreground">Правовая проверка • {caseId ? `Дело ${caseId}` : 'Дело № ...'} • Нормы УК и УПК РФ</p>
  </div>)
}
