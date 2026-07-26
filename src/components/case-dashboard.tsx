'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis } from 'recharts'
import { FileText, Users, BookOpen, AlertTriangle, Clock, CheckCircle, CheckCircle2, Circle, Zap, Shield, Scale, ArrowRight, RefreshCw, XCircle, Gavel, Activity, MapPin, UploadCloud, FileSearch, Bookmark, Swords, History, CalendarClock, TrendingUp, FileUp, MessageCircle, ShieldCheck, Download, BrainCircuit, Eye, PenLine } from 'lucide-react'
// Standard stages of Russian criminal procedure (legal reference constants — not mock data)
const PROCEDURE_STAGES = [
  { id: 'investigation', short: 'Следствие', full: 'Предварительное следствие', lawRef: 'ст. 162 УПК РФ', description: 'Срок следствия до 2 месяцев' },
  { id: 'familiarization', short: 'Ознакомление', full: 'Ознакомление с материалами дела', lawRef: 'ст. 217 УПК РФ', description: 'Право обвиняемого изучить дело' },
  { id: 'indictment', short: 'Обвинение', full: 'Передача дела в суд', lawRef: 'ст. 222 УПК РФ', description: 'Прокурор утверждает обвинение' },
  { id: 'pretrial-hearing', short: 'Слушание', full: 'Предварительное слушание', lawRef: 'ст. 234 УПК РФ', description: 'Решение ходатайств до суда' },
  { id: 'trial', short: 'Суд', full: 'Судебное разбирательство', lawRef: 'ст. 240 УПК РФ', description: 'Основной судебный процесс' },
  { id: 'verdict', short: 'Приговор', full: 'Вынесение приговора', lawRef: 'ст. 299 УПК РФ', description: 'Решение суда по делу' },
]
// Derive current procedure stage from case status
function getProcedureIndex(status: string | null): number {
  if (!status) return 0
  const s = status.toLowerCase()
  if (s.includes('investigation') || s.includes('следствие') || s.includes('расслед') || s === 'active') return 0
  if (s.includes('familiariz') || s.includes('ознаком')) return 1
  if (s.includes('indictment') || s.includes('обвинен') || s.includes('передан') || s.includes('суд')) return 2
  if (s.includes('pretrial') || s.includes('слушан')) return 3
  if (s.includes('trial') || s.includes('разбират') || s.includes('судебн')) return 4
  if (s.includes('verdict') || s.includes('приговор') || s.includes('closed') || s.includes('закрыт') || s.includes('archived') || s.includes('архив')) return 5
  return 0 // default to first stage
}
import { getDashboardStats, getCaseHealthScore, getEvidenceTimeline, getCaseBrief, getBookmarks, getCaseTimeline, getAuditLog } from '@/lib/case-api'
import { useCaseStore } from '@/lib/case-store'
import { toast } from '@/hooks/use-toast'
import type { DashboardStats, CaseBriefData, CaseHealthScore, EvidenceTimelineEvent, BookmarkData, CaseTimelineEvent, SectionId, AuditLogEntry } from '@/lib/case-store'

const BK_BORDER: Record<string, string> = { red: 'border-l-red-700', amber: 'border-l-amber-600', emerald: 'border-l-emerald-700', stone: 'border-l-stone-500' }
const BK_BADGE: Record<string, string> = { red: 'bg-red-700 text-white', amber: 'bg-amber-600 text-white', emerald: 'bg-emerald-700 text-white', stone: 'bg-stone-500 text-white' }
const TL_COLOR: Record<string, string> = { crime: 'bg-red-600', investigation: 'bg-amber-500', legal: 'bg-stone-500', defense: 'bg-emerald-600', evidence: 'bg-orange-500', hearing: 'bg-red-700' }
const GUILT_C: Record<string, string> = { high: '#dc2626', moderate: '#ea580c', low: '#ca8a04', none: '#525252' }
const GUILT_L: Record<string, string> = { high: 'Высокая', moderate: 'Средняя', low: 'Низкая', none: 'Нет' }
const DOC_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#78716c']
const guiltChartConfig = Object.fromEntries(Object.entries(GUILT_L).map(([k, v]) => [v, { label: v, color: GUILT_C[k] }]))
const docTypeChartConfig = { 'Обвинение': { label: 'Обвинение', color: '#dc2626' }, 'Показание': { label: 'Показание', color: '#ea580c' }, 'Протокол': { label: 'Протокол', color: '#ca8a04' }, 'Экспертиза': { label: 'Экспертиза', color: '#78716c' } }
const STATUS_ICON: Record<string, React.ReactNode> = { completed: <CheckCircle className="w-3 h-3 text-emerald-600" />, processing: <Clock className="w-3 h-3 text-amber-500 animate-spin" />, pending: <Clock className="w-3 h-3 text-stone-400" />, failed: <XCircle className="w-3 h-3 text-red-600" /> }
const EV_CFG: Record<string, { icon: React.ReactNode; dot: string }> = { document_upload: { icon: <UploadCloud className="w-3 h-3 text-amber-600" />, dot: 'bg-amber-500' }, analysis_complete: { icon: <CheckCircle className="w-3 h-3 text-emerald-600" />, dot: 'bg-emerald-500' }, compliance_check: { icon: <Scale className="w-3 h-3 text-orange-600" />, dot: 'bg-orange-500' }, defense_update: { icon: <Shield className="w-3 h-3 text-stone-500" />, dot: 'bg-stone-500' }, episode_found: { icon: <BookOpen className="w-3 h-3 text-red-600" />, dot: 'bg-red-500' } }
const DL_IMP: Record<string, { color: string; badge: string; label: string }> = { critical: { color: 'border-l-red-700 bg-red-700/5', badge: 'bg-red-700 text-white', label: 'Критический' }, high: { color: 'border-l-orange-600 bg-orange-600/5', badge: 'bg-orange-600 text-white', label: 'Высокий' }, medium: { color: 'border-l-amber-600 bg-amber-600/5', badge: 'bg-amber-600 text-white', label: 'Средний' }, low: { color: 'border-l-stone-500 bg-stone-500/5', badge: 'bg-stone-500 text-white', label: 'Низкий' } }
const DL_STS: Record<string, { badge: string; label: string }> = { upcoming: { badge: 'bg-emerald-700 text-white', label: 'Запланировано' }, urgent: { badge: 'bg-amber-600 text-white', label: 'Срочно' }, warning: { badge: 'bg-orange-600 text-white', label: 'Предупреждение' }, overdue: { badge: 'bg-red-800 text-white', label: 'Просрочено' } }
const ACT_CFG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = { upload: { icon: <UploadCloud className="w-3 h-3" />, color: 'text-amber-700', bg: 'bg-amber-700/15' }, analysis: { icon: <BrainCircuit className="w-3 h-3" />, color: 'text-emerald-700', bg: 'bg-emerald-700/15' }, edit: { icon: <PenLine className="w-3 h-3" />, color: 'text-stone-600', bg: 'bg-stone-600/15' }, delete: { icon: <XCircle className="w-3 h-3" />, color: 'text-red-700', bg: 'bg-red-700/15' }, search: { icon: <FileSearch className="w-3 h-3" />, color: 'text-orange-600', bg: 'bg-orange-600/15' }, export: { icon: <Download className="w-3 h-3" />, color: 'text-stone-500', bg: 'bg-stone-500/15' }, login: { icon: <Eye className="w-3 h-3" />, color: 'text-stone-400', bg: 'bg-stone-400/15' }, system: { icon: <Activity className="w-3 h-3" />, color: 'text-stone-500', bg: 'bg-stone-500/15' } }
const SEV_BADGE: Record<string, string> = { info: 'bg-stone-600 text-white', warning: 'bg-amber-600 text-white', critical: 'bg-red-700 text-white' }

function hasValue(v: unknown): boolean { return v != null && v !== '' && v !== undefined }
function hasItems<T>(arr: T[] | undefined | null): boolean { return Array.isArray(arr) && arr.length > 0 }
function hasRecord(obj: Record<string, number>): boolean { return obj != null && Object.values(obj).some(v => v > 0) }

function useAnimatedCounter(target: number, ms = 700) {
  const [val, setVal] = useState(0), raf = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now(), delta = target - val
    if (!delta) return
    const tick = (now: number) => { const t = Math.min(1, (now - start) / ms), eased = 1 - Math.pow(1 - t, 3); setVal(Math.round(val + delta * eased)); if (t < 1) raf.current = requestAnimationFrame(tick) }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, ms])
  return val
}

function HealthGauge({ score }: { score: number }) {
  const anim = useAnimatedCounter(score, 900), cx = 80, cy = 80, oR = 70, iR = 50, startA = -210, sweep = 240
  const col = score >= 60 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626'
  const segs = [{ s: 0, e: 40, c: '#dc2626' }, { s: 40, e: 60, c: '#d97706' }, { s: 60, e: 100, c: '#059669' }]
  const arc = (s: number, e: number) => { const sa = startA + (s / 100) * sweep, ea = startA + (e / 100) * sweep, sR = (sa * Math.PI) / 180, eR = (ea * Math.PI) / 180, la = ea - sa > 180 ? 1 : 0
    const sx = cx + oR * Math.cos(sR), sy = cy + oR * Math.sin(sR), ex = cx + oR * Math.cos(eR), ey = cy + oR * Math.sin(eR), six = cx + iR * Math.cos(sR), siy = cy + iR * Math.sin(sR), eix = cx + iR * Math.cos(eR), eiy = cy + iR * Math.sin(eR)
    return `M ${sx} ${sy} A ${oR} ${oR} 0 ${la} 1 ${ex} ${ey} L ${eix} ${eiy} A ${iR} ${iR} 0 ${la} 0 ${six} ${siy} Z` }
  const nA = startA + (anim / 100) * sweep, nR = (nA * Math.PI) / 180, nX = cx + 42 * Math.cos(nR), nY = cy + 42 * Math.sin(nR)
  const bgSR = (startA * Math.PI) / 180, bgER = ((startA + sweep) * Math.PI) / 180, la = sweep > 180 ? 1 : 0
  const bgSX = cx + oR * Math.cos(bgSR), bgSY = cy + oR * Math.sin(bgSR), bgEX = cx + oR * Math.cos(bgER), bgEY = cy + oR * Math.sin(bgER), bISX = cx + iR * Math.cos(bgSR), bISY = cy + iR * Math.sin(bgSR), bIEX = cx + iR * Math.cos(bgER), bIEY = cy + iR * Math.sin(bgER)
  return (
    <div className={`flex items-center justify-center ${score < 40 ? 'animate-pulse' : ''}`}>
      <svg width="160" height="120" viewBox="0 0 160 120">
        <path d={`M ${bgSX} ${bgSY} A ${oR} ${oR} 0 ${la} 1 ${bgEX} ${bgEY} L ${bIEX} ${bIEY} A ${iR} ${iR} 0 ${la} 0 ${bISX} ${bISY} Z`} fill="#e7e5e4" className="dark:fill-stone-700" />
        {segs.map(s => <path key={s.c} d={arc(s.s, s.e)} fill={s.c} opacity={0.25} />)}
        <path d={arc(0, anim)} fill={col} opacity={0.8} className="transition-all duration-700" />
        <line x1={cx} y1={cy} x2={nX} y2={nY} stroke={col} strokeWidth="3" strokeLinecap="round" className="transition-all duration-700" />
        <circle cx={cx} cy={cy} r="6" fill={col} className="transition-all duration-700" />
        <text x={cx} y={cy + 28} textAnchor="middle" className="text-sm font-bold fill-foreground" style={{ fontSize: '14px' }}>{anim}</text>
        <text x={cx} y={cy + 40} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '10px' }}>из 100</text>
        <text x={bgSX - 2} y={bgSY + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '9px' }}>0</text>
        <text x={bgEX + 2} y={bgEY + 4} textAnchor="start" className="fill-muted-foreground" style={{ fontSize: '9px' }}>100</text>
        <text x={cx - 52} y={cy + 52} textAnchor="middle" className="fill-red-600" style={{ fontSize: '8px', fontWeight: 'bold' }}>Крит.</text>
        <text x={cx - 8} y={cy + 52} textAnchor="middle" className="fill-amber-600" style={{ fontSize: '8px', fontWeight: 'bold' }}>Умер.</text>
        <text x={cx + 42} y={cy + 52} textAnchor="middle" className="fill-emerald-600" style={{ fontSize: '8px', fontWeight: 'bold' }}>Хорошо</text>
      </svg>
    </div>
  )
}

function FactorRow({ factor }: { factor: { value: number; label: string; tooltip: string } }) {
  const color = factor.value >= 70 ? 'bg-emerald-700 text-white' : factor.value >= 50 ? 'bg-amber-600 text-white' : 'bg-red-700 text-white'
  const pColor = factor.value >= 70 ? '[&>div]:bg-emerald-600' : factor.value >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-600'
  return <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><div className="flex items-center gap-2 cursor-help"><span className="text-xs font-medium min-w-[120px]">{factor.label}</span><Progress value={factor.value} className={`h-2 flex-1 ${pColor}`} /><Badge className={color}>{factor.value}%</Badge></div></TooltipTrigger><TooltipContent side="right" className="max-w-[280px] text-xs"><p>{factor.tooltip}</p></TooltipContent></Tooltip></TooltipProvider>
}

function EvidenceTimeline({ events }: { events: EvidenceTimelineEvent[] }) {
  return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileSearch className="w-4 h-4 text-amber-600" /> Хронология событий</CardTitle></CardHeader>
    <CardContent className="p-4"><div className="relative pl-6 space-y-3 max-h-80 overflow-y-auto scrollbar-thin">{events.map((e, i) => { const cfg = EV_CFG[e.eventType] ?? { icon: <Clock className="w-3 h-3" />, dot: 'bg-stone-400' }; return (<div key={e.id} className="relative group"><div className={`absolute -left-6 w-3 h-3 rounded-full ${cfg.dot} ring-2 ring-background transition-transform group-hover:scale-125`} />{i < events.length - 1 && <div className="absolute -left-[21px] top-3 w-0.5 h-full bg-stone-300 dark:bg-stone-600" />}<div className="flex items-start gap-2 text-sm"><div className="flex items-center gap-1 shrink-0">{cfg.icon}</div><div className="flex-1 min-w-0"><p className="font-medium text-xs">{e.description}</p><p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div></div></div>) })}</div></CardContent>
  </Card>)
}

function StrengthMeter({ brief }: { brief: CaseBriefData }) {
  const pPct = brief.predictedOutcome.slice(0, 2).reduce((s, o) => s + o.probability, 0), dPct = Math.max(0, 100 - pPct)
  return (<Card className="rounded-xl shadow-sm border-l-4 border-amber-600 bg-gradient-to-br from-card via-card to-muted/20 transition-shadow hover:shadow-md">
    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Swords className="w-4 h-4 text-amber-600" /> Баланс сил дела</CardTitle></CardHeader>
    <CardContent className="p-4 space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-red-700 flex items-center gap-1"><Gavel className="w-3 h-3" />Обвинение</span><span className="font-bold text-red-700">{pPct}%</span></div>
        <div className="h-4 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden"><div className="h-full bg-gradient-to-r from-red-800 to-red-600 transition-all duration-700" style={{ width: `${pPct}%` }} /></div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-emerald-700 flex items-center gap-1"><Shield className="w-3 h-3" />Защита</span><span className="font-bold text-emerald-700">{dPct}%</span></div>
        <div className="h-4 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-800 to-emerald-600 transition-all duration-700" style={{ width: `${dPct}%` }} /></div>
      </div>
      <Separator />
      <div className="space-y-1.5">
        {brief.predictedOutcome.map(o => (
          <div key={o.scenario} className="flex items-center justify-between gap-2 text-xs p-1.5 rounded-md bg-muted/40">
            <span className="flex-1 min-w-0 leading-tight">{o.scenario}</span>
            <Badge variant="outline" className="text-xs shrink-0 font-semibold">{o.probability}%</Badge>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">ИИ-прогноз исхода • Уверенность {brief.aiConfidence}%</p>
    </CardContent>
  </Card>)
}

function QuickBookmarks({ bookmarks, onNavigate }: { bookmarks: BookmarkData[]; onNavigate: () => void }) {
  return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bookmark className="w-4 h-4 text-amber-600" /> Быстрые закладки <Button size="sm" variant="ghost" className="ml-auto rounded-lg" onClick={onNavigate}>Все <RefreshCw className="w-3 h-3 ml-1" /></Button></CardTitle></CardHeader>
    <CardContent className="p-4"><div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin">{bookmarks.map(bm => <div key={bm.id} className={`border-l-4 ${BK_BORDER[bm.color]} bg-muted/40 rounded-r-lg p-2 transition-all duration-200 hover:bg-muted hover:translate-x-0.5`}><div className="flex items-center gap-1.5"><Badge className={`${BK_BADGE[bm.color]} text-xs capitalize`}>{bm.entityType}</Badge><span className="text-xs font-medium truncate flex-1">{bm.entityName}</span></div><p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bm.note}</p></div>)}</div></CardContent>
  </Card>)
}

function QuickActions({ onNavigate }: { onNavigate: (s: SectionId) => void }) {
  const actions = [
    { label: 'Загрузить документ', icon: FileUp, grad: 'from-red-800/90 to-red-700/90', shadow: 'shadow-red-900/30', nav: 'documents', toast: ['Загрузка документа', 'Открыт раздел "Документы". Перетащите PDF для загрузки.'] },
    { label: 'Спросить ИИ', icon: MessageCircle, grad: 'from-amber-700/90 to-amber-600/90', shadow: 'shadow-amber-900/30', nav: 'qa', toast: ['Вопрос ИИ', 'Открыт раздел "Вопросы ИИ-аналитику".'] },
    { label: 'Проверить нормы', icon: ShieldCheck, grad: 'from-emerald-800/90 to-emerald-700/90', shadow: 'shadow-emerald-900/30', nav: 'legal-check', toast: ['Правовая проверка', 'Открыт раздел правовой проверки.'] },
    { label: 'Экспорт отчёта', icon: Download, grad: 'from-stone-700/90 to-stone-600/90', shadow: 'shadow-stone-900/30', nav: '' as SectionId | '', toast: ['Экспорт отчёта', 'Подготовка отчёта по делу № 2024-00145...'] },
  ]
  return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-600" /> Быстрые действия<Badge variant="outline" className="text-xs ml-auto">4 действия</Badge></CardTitle></CardHeader>
    <CardContent className="p-4"><div className="grid grid-cols-2 gap-3">{actions.map(({ label, icon: Ic, grad, shadow, nav, toast: t }) => (<button key={label} type="button" onClick={() => { if (nav) onNavigate(nav as SectionId); toast({ title: t[0], description: t[1] }) }}
      className={`group relative flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${grad} text-white text-left transition-all duration-300 hover:shadow-lg ${shadow} hover:-translate-y-1 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-500/40 overflow-hidden`}>
      <div className="absolute -right-2 -top-2 w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20 shrink-0 transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:rotate-3"><Ic className="w-5 h-5 drop-shadow-sm" /></span>
      <span className="text-sm font-semibold leading-tight drop-shadow-sm">{label}</span>
    </button>))}</div></CardContent>
  </Card>)
}

function ProcDonut({ percent }: { percent: number }) {
  const r = 30, c = 2 * Math.PI * r, off = c - (percent / 100) * c
  return (<div className="relative shrink-0" aria-label={`Прогресс производства ${percent}%`}><svg width="80" height="80" className="transform -rotate-90"><circle cx="40" cy="40" r={r} stroke="#e7e5e4" strokeWidth="8" fill="none" className="dark:stroke-stone-700" /><circle cx="40" cy="40" r={r} stroke="#9333ea" strokeWidth="8" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" className="transition-all duration-700" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-sm font-bold text-purple-600">{percent}%</span></div></div>)
}

function ProcStages({ caseStatus }: { caseStatus: string | null }) {
  const ci = getProcedureIndex(caseStatus), pct = Math.round((ci / PROCEDURE_STAGES.length) * 100), cur = PROCEDURE_STAGES[ci], next = PROCEDURE_STAGES[ci + 1] ?? PROCEDURE_STAGES[ci]
  return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-purple-500 transition-shadow hover:shadow-md">
    <CardHeader className="pb-2 relative"><CardTitle className="text-sm flex items-center gap-2"><Scale className="w-4 h-4 text-purple-600" /> Этапы производства по делу</CardTitle><p className="text-xs text-muted-foreground mt-1 pr-24">{cur.full} · {pct}% выполнено</p><div className="absolute top-3 right-4"><ProcDonut percent={pct} /></div></CardHeader>
    <CardContent className="p-4">
      <div className="flex items-start gap-0 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.400)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-400/60" aria-label="Этапы производства по делу">
        {PROCEDURE_STAGES.map((s, i) => { const done = i < ci, isCur = i === ci, last = i === PROCEDURE_STAGES.length - 1; return (<div key={s.id} className="flex items-start shrink-0"><div className="flex flex-col items-center text-center min-w-[110px] max-w-[120px]">
          <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all ${done ? 'bg-emerald-600 text-white' : ''} ${isCur ? 'bg-amber-500 text-white ring-4 ring-amber-500/30 animate-pulse' : ''} ${!done && !isCur ? 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400' : ''}`}>
            {done ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">{s.id}</span>}{isCur && <Circle className="w-9 h-9 absolute text-amber-500/30" />}
          </div>
          <span className={`text-[10px] mt-1.5 leading-tight font-medium line-clamp-2 ${done ? 'text-emerald-700 dark:text-emerald-500' : ''} ${isCur ? 'text-amber-700 dark:text-amber-500 font-bold' : ''} ${!done && !isCur ? 'text-muted-foreground' : ''}`}>{s.short}</span>
        </div>{!last && <div className="self-start mt-4 h-0.5 w-6 shrink-0" style={{ background: i < ci ? '#059669' : '#d6d3d1' }} aria-hidden />}</div>) })}
      </div>
      <Separator className="mt-3" /><div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-3">
        <div className="p-2 rounded-md bg-muted/40 flex items-start gap-1.5"><Clock className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" /><div className="min-w-0"><p className="font-medium text-muted-foreground">Текущая стадия</p><p className="text-sm font-bold mt-0.5 truncate">{cur.short}</p></div></div>
        <div className="p-2 rounded-md bg-muted/40 flex items-start gap-1.5"><CalendarClock className="w-3 h-3 text-purple-600 mt-0.5 shrink-0" /><div className="min-w-0"><p className="font-medium text-muted-foreground">Прогноз срока</p><p className="text-sm font-bold mt-0.5">~4 месяца</p></div></div>
        <div className="p-2 rounded-md bg-muted/40 flex items-start gap-1.5"><ArrowRight className="w-3 h-3 text-emerald-700 mt-0.5 shrink-0" /><div className="min-w-0 flex-1"><p className="font-medium text-muted-foreground">Следующий этап</p><p className="text-xs sm:text-sm font-bold mt-0.5 leading-tight">{next.short}</p><p className="text-[10px] font-normal text-muted-foreground mt-0.5">через ~30 дней</p></div></div>
      </div>
    </CardContent>
  </Card>)
}

function Deadlines({ episodes }: { episodes: Array<{ title: string; date: string | null; severity: string | null; status: string | null }> }) {
  const now = new Date()
  // Build deadlines from real episode dates
  const deadlines = episodes
    .filter(e => e.date)
    .map(e => {
      const days = Math.ceil((new Date(e.date!).getTime() - now.getTime()) / 86400000)
      const isOv = days < 0
      const isUr = days >= 0 && days <= 3
      const sev = e.severity?.toLowerCase() ?? 'medium'
      let importance: 'critical' | 'high' | 'medium' | 'low' = 'medium'
      if (sev.includes('тяжкое') || sev.includes('особо')) importance = 'critical'
      else if (sev.includes('средней')) importance = 'high'
      else if (sev.includes('небольш')) importance = 'low'
      let statusStr: 'overdue' | 'urgent' | 'upcoming' | 'warning' = 'upcoming'
      if (isOv) statusStr = 'overdue'
      else if (isUr) statusStr = 'urgent'
      else if (days <= 14) statusStr = 'warning'
      return { id: `dl-${e.title}`, deadline: e.date!, title: e.title, article: e.status ?? 'Этап производства', status: statusStr, importance, description: e.severity ?? 'Срок этапа производства', days }
    })
    .sort((a, b) => Math.abs(a.days) - Math.abs(b.days))

  if (deadlines.length === 0) {
    return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-red-500/5 border-t-2 border-t-red-500 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-700/15"><CalendarClock className="w-3.5 h-3.5 text-red-700" /></div>Процессуальные сроки</CardTitle></CardHeader>
      <CardContent className="p-4"><p className="text-sm text-muted-foreground text-center py-4">Нет этапов с датами для отображения сроков</p></CardContent>
    </Card>)
  }

  const upcoming = deadlines.filter(d => d.days >= 0), overdue = deadlines.filter(d => d.days < 0)
  const next = upcoming[0], daysN = next?.days ?? 0
  const fmtD = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  const daysTo = (d: number) => d < 0 ? `просрочено на ${Math.abs(d)} дн.` : d === 0 ? 'сегодня' : d === 1 ? 'завтра' : `через ${d} дн.`
  const pulse = (c: string) => <span className="relative flex h-2.5 w-2.5"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c} opacity-75`} /><span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.replace('/400', '/600')}`} /></span>
  return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-red-500/5 border-t-2 border-t-red-500 transition-shadow hover:shadow-md">
    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-700/15"><CalendarClock className="w-3.5 h-3.5 text-red-700" /></div>Процессуальные сроки<Badge variant="outline" className="text-xs ml-1">{deadlines.length} событий</Badge>{overdue.length > 0 && <Badge className="bg-red-800 text-white text-xs ml-auto gap-1"><AlertTriangle className="w-3 h-3" />{overdue.length} просрочено</Badge>}</CardTitle></CardHeader>
    <CardContent className="p-4 space-y-3">
      {next && (<div className={`p-3 rounded-xl border-l-4 ${DL_IMP[next.importance].color} flex items-center gap-3 transition-transform hover:scale-[1.01]`}>
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-background/70 shrink-0"><span className={`text-2xl font-black leading-none ${daysN <= 3 ? 'text-red-700' : daysN <= 14 ? 'text-orange-600' : 'text-stone-700 dark:text-stone-200'}`}>{daysN === 0 ? '!' : daysN}</span><span className="text-[10px] text-muted-foreground mt-0.5">дн.</span></div>
        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold leading-tight">{next.title}</p><Badge className={`text-[10px] ${DL_IMP[next.importance].badge}`}>{DL_IMP[next.importance].label}</Badge>{daysN <= 3 && pulse('bg-red-400')}</div>
          <div className="flex items-center gap-1.5 mt-1"><Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border-red-300 text-red-700" onClick={() => toast({ title: next.article, description: next.description })}>{next.article}</Badge><span className="text-xs text-muted-foreground">{fmtD(next.deadline)} • {daysTo(next.days)}</span></div><p className="text-xs mt-1 text-foreground/80 line-clamp-2">{next.description}</p></div>
      </div>)}
      <div className="grid sm:grid-cols-2 gap-2">{deadlines.slice(0, 6).map(d => { const isOv = d.days < 0, isUr = d.days >= 0 && d.days <= 3, sConf = DL_STS[d.status]; return (<TooltipProvider key={d.id} delayDuration={150}><Tooltip><TooltipTrigger asChild><div className={`p-2.5 rounded-lg border-l-4 ${DL_IMP[d.importance].color} cursor-help transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5`}><div className="flex items-center justify-between gap-2 mb-1"><div className="flex items-center gap-1.5"><Badge className={`text-[9px] px-1.5 py-0 ${sConf.badge}`}>{sConf.label}</Badge>{isOv && pulse('bg-red-400')}{isUr && !isOv && pulse('bg-amber-400')}</div><span className={`text-[11px] font-bold tabular-nums ${isOv ? 'text-red-700' : isUr ? 'text-orange-600' : 'text-muted-foreground'}`}>{daysTo(d.days)}</span></div><p className="text-xs font-medium leading-tight line-clamp-2">{d.title}</p><Badge variant="outline" className="text-[9px] mt-1 cursor-pointer hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); toast({ title: d.article, description: d.description }) }}>{d.article}</Badge></div></TooltipTrigger><TooltipContent side="top" className="text-xs max-w-[260px]"><p className="font-semibold">{d.title}</p><p className="text-muted-foreground mt-0.5">{d.article}</p><p className="mt-1">{fmtD(d.deadline)}</p><Separator className="my-1" /><p className="italic">{d.description}</p></TooltipContent></Tooltip></TooltipProvider>) })}</div>
      <Separator /><div className="flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1"><History className="w-3 h-3" /> Обновлено {now.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><span className="flex items-center gap-1.5">{pulse('bg-red-400')} просрочено {pulse('bg-amber-400')} срочно <span className="w-2 h-2 rounded-full bg-emerald-700 ml-1" /> запланировано</span></div>
    </CardContent>
  </Card>)
}

function ActivityFeed({ activities }: { activities: AuditLogEntry[] }) {
  const latest = activities.slice(0, 5)
  const fmtT = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
  return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-emerald-500 transition-shadow hover:shadow-md">
    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-700/15"><Activity className="w-3.5 h-3.5 text-emerald-700" /></div>Последние действия<Badge variant="outline" className="text-xs ml-auto">{latest.length} событий</Badge></CardTitle></CardHeader>
    <CardContent className="p-4"><div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">{latest.map((a, i) => { const cfg = ACT_CFG[a.category] ?? ACT_CFG.system; return (<div key={a.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 transition-all duration-200 hover:bg-muted/70 hover:-translate-y-0.5 ${i === 0 ? 'ring-1 ring-emerald-500/30' : ''}`}><div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${cfg.bg}`}><span className={cfg.color}>{cfg.icon}</span></div><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 mb-0.5"><p className="text-xs font-semibold leading-tight truncate">{a.action}</p><Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${SEV_BADGE[a.severity] ?? SEV_BADGE.info}`}>{a.severity === 'critical' ? 'Критич.' : a.severity === 'warning' ? 'Вним.' : 'Инфо'}</Badge></div><p className="text-xs text-muted-foreground line-clamp-1">{a.details}</p><p className="text-[10px] text-muted-foreground mt-0.5">{fmtT(a.timestamp)} · {a.actor}</p></div></div>) })}</div></CardContent>
  </Card>)
}

function AnimStat({ label, value, delta, deltaType, icon: Ic, iconBg, iconColor, border, gradient, progressValue, onClick }: { label: string; value: number; delta?: string; deltaType?: 'up' | 'down' | 'flat'; icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string; border: string; gradient: string; progressValue?: number; onClick?: () => void }) {
  const anim = useAnimatedCounter(value)
  const dC = deltaType === 'up' ? 'text-emerald-600' : deltaType === 'down' ? 'text-red-600' : 'text-muted-foreground'
  const DI = deltaType === 'up' ? TrendingUp : deltaType === 'down' ? AlertTriangle : Activity
  const pC = progressValue !== undefined ? progressValue >= 70 ? '[&>div]:bg-emerald-600' : progressValue >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-600' : '[&>div]:bg-stone-400'
  return (<Card className={`min-w-0 rounded-xl shadow-sm border-t-2 ${border} bg-gradient-to-br ${gradient} transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1 hover:scale-[1.02]' : ''}`} onClick={onClick}>
    <CardContent className="p-3 sm:p-4"><div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p><p className="text-xl sm:text-2xl font-bold tracking-tight mt-1 tabular-nums">{anim}</p>{delta && <div className={`flex items-center gap-1 text-[10px] mt-1 font-medium ${dC} truncate`}><DI className="w-3 h-3 shrink-0" /><span className="truncate">{delta}</span></div>}</div><div className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${iconBg} shrink-0`}><Ic className={`w-4 h-4 ${iconColor}`} /></div></div>{progressValue !== undefined && <div className="mt-2"><Progress value={progressValue} className={`h-1.5 ${pC}`} /></div>}</CardContent>
  </Card>)
}

function StatsBar({ stats, onNavigate }: { stats: DashboardStats; onNavigate: (s: SectionId) => void }) {
  const s = stats.summary
  const compR = stats.complianceChecks.total > 0 ? Math.round(((stats.complianceChecks.byStatus.compliant ?? 0) / stats.complianceChecks.total) * 100) : 0
  const procR = stats.documents.total > 0 ? Math.round(((stats.documents.byStatus.completed ?? 0) / stats.documents.total) * 100) : 0
  const defR = stats.defenseLines.total > 0 ? Math.round(((stats.defenseLines.byStrength.strong ?? 0) / stats.defenseLines.total) * 100) : 0
  const items = [
    { label: 'Документы', value: s.totalDocuments, delta: `${procR}% обработано`, deltaType: procR >= 70 ? 'up' as const : 'flat' as const, icon: FileText, iconBg: 'bg-red-700/15', iconColor: 'text-red-700', border: 'border-t-red-500', gradient: 'from-card via-card to-red-500/5', progressValue: procR, onClick: () => onNavigate('documents') },
    { label: 'Участники', value: s.totalPersons, delta: stats.persons.kolesnichenko ? '1 обвиняемый' : undefined, deltaType: stats.persons.kolesnichenko ? 'flat' as const : undefined, icon: Users, iconBg: 'bg-orange-600/15', iconColor: 'text-orange-600', border: 'border-t-orange-500', gradient: 'from-card via-card to-orange-500/5', progressValue: 20, onClick: () => onNavigate('persons') },
    { label: 'Эпизоды', value: s.totalEpisodes, delta: `${stats.episodes.byStatus['доказано'] ?? 0} доказано`, deltaType: 'up' as const, icon: BookOpen, iconBg: 'bg-amber-600/15', iconColor: 'text-amber-600', border: 'border-t-amber-500', gradient: 'from-card via-card to-amber-500/5', progressValue: 33, onClick: () => onNavigate('episodes') },
    { label: 'Статьи УК', value: s.totalArticles, delta: 'активные статьи', deltaType: 'flat' as const, icon: Scale, iconBg: 'bg-stone-600/15', iconColor: 'text-stone-600', border: 'border-t-stone-500', gradient: 'from-card via-card to-stone-500/5', progressValue: 100, onClick: () => onNavigate('legal-check') },
    { label: 'Соответствие', value: compR, delta: `${stats.complianceChecks.total} проверок`, deltaType: compR >= 70 ? 'up' as const : 'down' as const, icon: ShieldCheck, iconBg: 'bg-emerald-700/15', iconColor: 'text-emerald-700', border: 'border-t-emerald-500', gradient: 'from-card via-card to-emerald-500/5', progressValue: compR, onClick: () => onNavigate('legal-check') },
    { label: 'Линия защиты', value: s.totalDefenseLines, delta: `${defR}% сильных`, deltaType: defR >= 50 ? 'up' as const : 'flat' as const, icon: Swords, iconBg: 'bg-purple-700/15', iconColor: 'text-purple-700', border: 'border-t-purple-500', gradient: 'from-card via-card to-purple-500/5', progressValue: defR, onClick: () => onNavigate('defense') },
  ]
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-1">{items.map(i => <AnimStat key={i.label} {...i} />)}</div>
}

function MiniTimeline({ events, onNavigate }: { events: CaseTimelineEvent[]; onNavigate: () => void }) {
  const last5 = [...events].slice(-5)
  return (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 transition-shadow hover:shadow-md">
    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-amber-600" /> Мини-хронология дела <Button size="sm" variant="ghost" className="ml-auto rounded-lg" onClick={onNavigate}>Полная <RefreshCw className="w-3 h-3 ml-1" /></Button></CardTitle></CardHeader>
    <CardContent className="p-4"><div className="flex items-stretch gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:theme(colors.stone.400)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-400/60" aria-label="Мини-хронология дела">
      {last5.map((ev, i) => (<div key={ev.id} className="flex items-stretch shrink-0"><div className="flex flex-col items-center text-center min-w-[200px] max-w-[220px] p-2 rounded-lg bg-muted/30 transition-colors hover:bg-muted/60"><div className={`w-3 h-3 rounded-full ${TL_COLOR[ev.category] ?? 'bg-stone-400'} ring-2 ring-background shrink-0`} /><p className="text-xs font-medium mt-1.5 leading-tight line-clamp-3">{ev.title}</p><p className="text-xs text-muted-foreground mt-1 shrink-0">{new Date(ev.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</p></div>{i < last5.length - 1 && <div className="self-center mx-0.5 h-0.5 w-5 shrink-0 bg-stone-300 dark:bg-stone-600" />}</div>))}
    </div></CardContent>
  </Card>)
}

export function CaseDashboard({ caseId }: { caseId: string }) {
  const { setActiveSection } = useCaseStore()
  const { data, isLoading } = useQuery({ queryKey: ['dashboard', caseId], queryFn: () => getDashboardStats(caseId), retry: 1, enabled: !!caseId, refetchInterval: 30000 })
  const { data: healthData } = useQuery({ queryKey: ['health-score', caseId], queryFn: () => getCaseHealthScore(caseId), retry: 1, enabled: !!caseId, refetchInterval: 30000 })
  const { data: tlData } = useQuery({ queryKey: ['evidence-timeline', caseId], queryFn: () => getEvidenceTimeline(caseId), retry: 1, enabled: !!caseId, refetchInterval: 30000 })
  const { data: briefData } = useQuery({ queryKey: ['case-brief', caseId], queryFn: () => getCaseBrief(caseId), retry: 1, enabled: !!caseId, refetchInterval: 30000 })
  const { data: bkData } = useQuery({ queryKey: ['bookmarks', caseId], queryFn: () => getBookmarks(caseId), retry: 1, enabled: !!caseId, refetchInterval: 30000 })
  const { data: ctData } = useQuery({ queryKey: ['case-timeline', caseId], queryFn: () => getCaseTimeline(caseId), retry: 1, enabled: !!caseId, refetchInterval: 30000 })
  const { data: auData } = useQuery({ queryKey: ['audit-log', caseId], queryFn: () => getAuditLog(caseId, 10), retry: 1, enabled: !!caseId, refetchInterval: 30000 })
  const stats = data ?? { caseInfo: null, summary: { totalDocuments: 0, totalPersons: 0, totalEpisodes: 0, totalArticles: 0, totalLocations: 0, totalCrossReferences: 0, totalChatMessages: 0, totalComplianceChecks: 0, totalDefenseLines: 0, totalGuiltAssessments: 0 }, documents: { total: 0, byType: {}, byStatus: {}, recent: [] }, persons: { total: 0, kolesnichenko: null, byRole: {} }, episodes: { total: 0, bySeverity: {}, byStatus: {}, episodesWithDates: [] }, processingQueue: { inProgress: [], byStatus: {} }, guiltAssessments: { total: 0, byGuiltLevel: {}, byEvidenceStrength: {}, details: [] }, defenseLines: { total: 0, byType: {}, byStrength: {}, details: [] }, complianceChecks: { total: 0, byStatus: {}, byType: {}, details: [] } } as DashboardStats
  const hs = healthData ?? { score: 0, factors: { documentProcessing: { label: '', value: 0, tooltip: 'Нет данных' }, complianceRate: { label: '', value: 0, tooltip: 'Нет данных' }, evidenceStrength: { label: '', value: 0, tooltip: 'Нет данных' }, defenseCoverage: { label: '', value: 0, tooltip: 'Нет данных' } } } as CaseHealthScore
  const evs = tlData ?? []
  const brief = briefData ?? { aiConfidence: 0, predictedOutcome: [], keyDefendants: [], keyEpisodes: [], keyEvidence: [], keyViolations: [], prosecutionSummary: '', defenseSummary: '', caseNumber: '', caseTitle: '', summary: '', generatedAt: '' } as CaseBriefData
  const bks = bkData ?? []
  const ct = ctData ?? []
  const au = auData ?? []
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>

  const guiltCD = Object.entries(stats.guiltAssessments.byGuiltLevel).map(([l, c]) => ({ level: GUILT_L[l] ?? l, count: c, fill: GUILT_C[l] ?? '#525252' }))
  const docCD = Object.entries(stats.documents.byType).map(([t, c]) => ({ type: t, count: c }))
  const compAll = Object.values(stats.complianceChecks.byStatus).reduce((a, b) => a + b, 0), compScore = compAll > 0 ? Math.round(((stats.complianceChecks.byStatus.compliant ?? 0) / compAll) * 100) : 0

  return (<div className="space-y-6">
    {stats.caseInfo && (<Card className="bg-gradient-to-r from-red-900/30 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-6"><div className="flex items-center gap-4"><div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20"><Gavel className="w-6 h-6 text-red-600" /></div><div className="flex-1 min-w-0"><h2 className="text-lg font-bold">Дело {stats.caseInfo.caseNumber.startsWith('№') ? stats.caseInfo.caseNumber : `№ ${stats.caseInfo.caseNumber}`}</h2><p className="text-sm text-muted-foreground">{stats.persons.kolesnichenko && stats.caseInfo.defendantName ? `Уголовное дело в отношении ${stats.caseInfo.defendantName}` : `Уголовное дело ${stats.caseInfo.caseNumber.startsWith('№') ? stats.caseInfo.caseNumber : `№ ${stats.caseInfo.caseNumber}`}`}{stats.caseInfo.articles ? ` — ${stats.caseInfo.articles}` : ''}</p></div><div className="flex items-center gap-2">{stats.caseInfo.status && <Badge variant="outline" className="text-xs">{stats.caseInfo.status}</Badge>}<Badge variant="outline" className="text-xs">{stats.summary.totalDocuments} документов</Badge></div></div></CardContent>
    </Card>)}
    <StatsBar stats={stats} onNavigate={setActiveSection} />
    <QuickActions onNavigate={setActiveSection} />
    <ProcStages caseStatus={stats.caseInfo?.status} />
    <Deadlines episodes={stats.episodes.episodesWithDates} />
    <div className="grid lg:grid-cols-2 gap-4"><ActivityFeed activities={au} /><StrengthMeter brief={brief} /></div>
    <MiniTimeline events={ct} onNavigate={() => setActiveSection('timeline')} />
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-amber-600" /> Здоровье дела <Badge variant="outline" className="text-xs ml-auto">{hs.score}/100</Badge></CardTitle></CardHeader>
      <CardContent className="p-4"><div className="flex items-start gap-4"><div className="relative shrink-0"><HealthGauge score={hs.score} /></div><div className="flex-1 space-y-2 pt-1"><FactorRow factor={hs.factors.documentProcessing} /><FactorRow factor={hs.factors.complianceRate} /><FactorRow factor={hs.factors.evidenceStrength} /><FactorRow factor={hs.factors.defenseCoverage} /></div></div><Separator className="mt-3" /><div className="flex flex-wrap gap-2 text-xs mt-2"><Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{stats.summary.totalLocations} мест</Badge><Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />{stats.summary.totalCrossReferences} ссылок</Badge>{(hasItems(stats.defenseLines.details) || stats.defenseLines.total > 0) ? (<Badge variant="outline"><Shield className="w-3 h-3 mr-1" />{stats.defenseLines.total} стратегий</Badge>) : (<span className="text-xs text-muted-foreground italic">Нет данных о линии защиты</span>)}{(hasItems(stats.complianceChecks.details) || stats.complianceChecks.total > 0) ? (<Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />Соответствие {compScore}%</Badge>) : (<span className="text-xs text-muted-foreground italic">Нет данных о проверках</span>)}</div></CardContent>
    </Card>
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-emerald-500 transition-shadow hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Виновность участников</CardTitle></CardHeader><CardContent className="p-2">{hasRecord(stats.guiltAssessments.byGuiltLevel) ? (<ChartContainer config={guiltChartConfig} className="h-52 w-full"><PieChart><Pie data={guiltCD} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={80} label={({ level, count }) => `${level}: ${count}`}>{guiltCD.map((d, i) => <Cell key={i} fill={d.fill} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer>) : (<p className="text-sm text-muted-foreground text-center py-8">Нет данных об оценке виновности</p>)}</CardContent></Card>
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-stone-500 transition-shadow hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Типы документов</CardTitle></CardHeader><CardContent className="p-2">{hasRecord(stats.documents.byType) ? (<ChartContainer config={docTypeChartConfig} className="h-52 w-full"><BarChart data={docCD} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="type" width={80} tick={{ fontSize: 12 }} /><Bar dataKey="count" radius={4}>{docCD.map((_, i) => <Cell key={i} fill={DOC_COLORS[i % DOC_COLORS.length]} />)}</Bar><ChartTooltip content={<ChartTooltipContent />} /></BarChart></ChartContainer>) : (<p className="text-sm text-muted-foreground text-center py-8">Нет загруженных документов</p>)}</CardContent></Card>
    </div>
    {(stats.caseInfo || stats.summary.totalDocuments > 0) && (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-purple-900/10 via-card to-card border-t-2 border-t-purple-500 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-700/15"><BrainCircuit className="w-3.5 h-3.5 text-purple-700" /></div>ИИ-дайджест дела<Badge className="bg-purple-700 text-white text-xs ml-auto">Авто-сводка</Badge></CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        {stats.caseInfo && (<p className="text-sm leading-relaxed text-foreground/90"><span className="font-semibold">Краткое содержание:</span> Уголовное дело {stats.caseInfo.caseNumber.startsWith('№') ? stats.caseInfo.caseNumber : `№ ${stats.caseInfo.caseNumber}`} возбуждено{stats.caseInfo.defendantName ? ` в отношении ${stats.caseInfo.defendantName}` : ''}{stats.caseInfo.articles ? ` по признакам преступлений, предусмотренных ${stats.caseInfo.articles}` : ''}. В материалах дела <span className="font-semibold text-purple-700 dark:text-purple-400">{stats.summary.totalDocuments} документов</span>, <span className="font-semibold text-purple-700 dark:text-purple-400">{stats.summary.totalEpisodes} преступных эпизодов</span>.</p>)}
        {!stats.caseInfo && stats.summary.totalDocuments > 0 && (<p className="text-sm leading-relaxed text-foreground/90"><span className="font-semibold">Краткое содержание:</span> В материалах дела <span className="font-semibold text-purple-700 dark:text-purple-400">{stats.summary.totalDocuments} документов</span>, <span className="font-semibold text-purple-700 dark:text-purple-400">{stats.summary.totalEpisodes} преступных эпизодов</span>.</p>)}
        {(hasItems(stats.complianceChecks.details.filter(c => c.status === 'violation' || c.status === 'warning')) || hasItems(stats.defenseLines.details.filter(d => d.strength === 'strong')) || hasItems(stats.complianceChecks.details.filter(c => hasValue(c.recommendation)))) && (<Separator />)}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {hasItems(stats.complianceChecks.details.filter(c => c.status === 'violation' || c.status === 'warning')) ? (<div className="p-3 rounded-lg bg-muted/40 border-l-2 border-l-red-700"><p className="text-xs font-semibold flex items-center gap-1 text-red-700 dark:text-red-400"><AlertTriangle className="w-3 h-3" />Ключевые риски</p><ul className="text-xs mt-1.5 space-y-0.5 text-muted-foreground">{stats.complianceChecks.details.filter(c => c.status === 'violation' || c.status === 'warning').slice(0, 3).map(c => <li key={c.id}>• {c.description}</li>)}</ul></div>) : null}
          {hasItems(stats.defenseLines.details.filter(d => d.strength === 'strong')) ? (<div className="p-3 rounded-lg bg-muted/40 border-l-2 border-l-emerald-700"><p className="text-xs font-semibold flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><ShieldCheck className="w-3 h-3" />Сильные стороны защиты</p><ul className="text-xs mt-1.5 space-y-0.5 text-muted-foreground">{stats.defenseLines.details.filter(d => d.strength === 'strong').slice(0, 3).map(d => <li key={d.id}>• {d.title}</li>)}</ul></div>) : null}
          {hasItems(stats.complianceChecks.details.filter(c => hasValue(c.recommendation))) ? (<div className="p-3 rounded-lg bg-muted/40 border-l-2 border-l-amber-600"><p className="text-xs font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-400"><TrendingUp className="w-3 h-3" />Рекомендации</p><ul className="text-xs mt-1.5 space-y-0.5 text-muted-foreground">{stats.complianceChecks.details.filter(c => hasValue(c.recommendation)).slice(0, 3).map(c => <li key={c.id}>• {c.recommendation}</li>)}</ul></div>) : null}
        </div>
        <div className="flex items-center gap-2 pt-1"><Button size="sm" variant="outline" className="rounded-lg text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20" onClick={() => setActiveSection('qa')}><MessageCircle className="w-3 h-3" />Задать вопрос ИИ</Button><Button size="sm" variant="outline" className="rounded-lg text-xs gap-1" onClick={() => setActiveSection('brief')}><FileText className="w-3 h-3" />Полное изложение</Button><span className="text-[10px] text-muted-foreground ml-auto italic">Сгенерировано ИИ • обновлено {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</span></div>
      </CardContent>
    </Card>)}
    <EvidenceTimeline events={evs} />
    {stats.processingQueue.inProgress.length > 0 && (<Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />Очередь обработки<Badge className="bg-amber-600 text-white">{stats.processingQueue.byStatus.queued ?? 0} в очереди</Badge></CardTitle></CardHeader>
      <CardContent className="p-4"><div className="space-y-2 max-h-40 overflow-y-auto">{stats.processingQueue.inProgress.map(q => <div key={q.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted"><Clock className="w-3 h-3 text-amber-500 animate-spin" /><span className="truncate flex-1">{q.originalName}</span><Badge className="bg-amber-600 text-white text-xs">обработка</Badge></div>)}</div></CardContent>
    </Card>)}
    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-stone-500 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Последние документы<Button size="sm" variant="ghost" className="ml-auto rounded-lg" onClick={() => setActiveSection('documents')}>Все документы <RefreshCw className="w-3 h-3 ml-1" /></Button></CardTitle></CardHeader>
      <CardContent className="p-4">{hasItems(stats.documents.recent) ? (<Fragment><div className="space-y-2 max-h-48 overflow-y-auto">{stats.documents.recent.map(doc => <div key={doc.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 transition-colors hover:bg-muted">{STATUS_ICON[doc.processingStatus]}<span className="truncate flex-1">{doc.originalName}</span><Badge className={doc.processingStatus === 'completed' ? 'bg-emerald-700 text-white' : doc.processingStatus === 'processing' ? 'bg-amber-600 text-white' : 'bg-stone-500 text-white'}>{doc.processingStatus}</Badge></div>)}</div><Separator className="mt-3" /><p className="text-xs text-muted-foreground mt-2">Данные из {stats.documents.total} загруженных документов</p></Fragment>) : (<p className="text-sm text-muted-foreground text-center py-4">Нет загруженных документов</p>)}</CardContent>
    </Card>
    <QuickBookmarks bookmarks={bks} onNavigate={() => setActiveSection('search')} />
  </div>)
}
