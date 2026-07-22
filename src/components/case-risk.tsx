'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Scale, Gavel, Plus, Minus, Calculator, CheckCircle2, XCircle, Percent, Coins, Clock, FileText, Sparkles, BrainCircuit, Zap, ChevronRight, Award, AlertCircle, Info, Download } from 'lucide-react'
import { mockRiskAssessment, mockSentencing, PLEA_ARTICLES, PLEA_MITIGATING, PLEA_AGGRAVATING, PLEA_SCENARIOS, DEFENSE_RADAR } from '@/lib/mock-data'
import type { RiskAssessmentData, SentencingData } from '@/lib/case-store'
import type { PleaRec, ArticleCategory, PleaArticle, RadarAxis } from '@/lib/mock-data'
import { getRiskAssessment, getSentencing } from '@/lib/case-api'

const REC_CFG: Record<PleaRec, { label: string; cls: string; icon: typeof CheckCircle2 }> = { recommended: { label: 'Рекомендуется', cls: 'bg-emerald-700 text-white', icon: CheckCircle2 }, possible: { label: 'Возможно', cls: 'bg-amber-600 text-white', icon: AlertCircle }, 'not-recommended': { label: 'Не рекомендуется', cls: 'bg-red-700 text-white', icon: XCircle } }
const CAT_BADGE: Record<ArticleCategory, string> = { 'особо тяжкое': 'bg-red-800 text-white', 'тяжкое': 'bg-orange-600 text-white', 'средней тяжести': 'bg-amber-600 text-white' }
const RISK_LEVEL_CFG: Record<string, { cls: string; bg: string }> = { low: { cls: 'bg-emerald-700 text-white', bg: 'bg-emerald-700/15' }, moderate: { cls: 'bg-amber-600 text-white', bg: 'bg-amber-600/15' }, high: { cls: 'bg-orange-600 text-white', bg: 'bg-orange-600/15' }, critical: { cls: 'bg-red-700 text-white', bg: 'bg-red-700/15' } }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
function fmtRub(v: number) { return v.toLocaleString('ru-RU') + ' ₽' }

function CircularProgress({ value, size = 80, sw = 7, color, label, sub }: { value: number; size?: number; sw?: number; color: string; label: string; sub: string }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, off = c - (clamp(value, 0, 100) / 100) * c
  return (<div className="flex flex-col items-center text-center"><div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
    <svg width={size} height={size} className="transform -rotate-90"><circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={sw} fill="none" className="text-stone-200 dark:text-stone-700" /><circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={sw} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" className="transition-all duration-500" /></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-base font-bold tabular-nums" style={{ color }}>{Math.round(value)}%</span></div></div><p className="text-xs font-semibold mt-1.5">{label}</p><p className="text-[10px] text-muted-foreground">{sub}</p></div>)
}

function radarPt(i: number, v: number, n = 6, cx = 120, cy = 120, r = 88) { const a = (i / n) * 2 * Math.PI - Math.PI / 2; return { x: cx + (clamp(v, 0, 100) / 100) * r * Math.cos(a), y: cy + (clamp(v, 0, 100) / 100) * r * Math.sin(a) } }
function radarPoly(vals: number[]) { return vals.map((v, i) => { const p = radarPt(i, v); return `${p.x.toFixed(2)},${p.y.toFixed(2)}` }).join(' ') }

function DefenseRadar() {
  const cur = DEFENSE_RADAR.map(a => a.current), tgt = DEFENSE_RADAR.map(a => a.target)
  return (<div className="flex flex-col items-center gap-3">
    <svg viewBox="0 0 240 240" width="240" height="240" className="max-w-full h-auto">
      {[20,40,60,80,100].map(r => { const pts = DEFENSE_RADAR.map((_, i) => { const p = radarPt(i, r); return `${p.x.toFixed(2)},${p.y.toFixed(2)}` }).join(' '); return <polygon key={r} points={pts} fill="none" className="stroke-stone-200 dark:stroke-stone-700" strokeWidth={1} /> })}
      {DEFENSE_RADAR.map((_, i) => { const p = radarPt(i, 100); return <line key={i} x1="120" y1="120" x2={p.x} y2={p.y} className="stroke-stone-200 dark:stroke-stone-700" strokeWidth={1} /> })}
      <polygon points={radarPoly(tgt)} fill="rgba(4,120,87,0.18)" stroke="#047857" strokeWidth={2} className="transition-all duration-500" />
      {tgt.map((v, i) => { const p = radarPt(i, v); return <circle key={`t-${i}`} cx={p.x} cy={p.y} r={3} fill="#047857" /> })}
      <polygon points={radarPoly(cur)} fill="rgba(185,28,28,0.22)" stroke="#b91c1c" strokeWidth={2} className="transition-all duration-500" />
      {cur.map((v, i) => { const p = radarPt(i, v); return <circle key={`c-${i}`} cx={p.x} cy={p.y} r={3} fill="#b91c1c" /> })}
      {DEFENSE_RADAR.map((axis, i) => { const lP = radarPt(i, 122); let anch: 'start'|'middle'|'end' = 'middle'; if (lP.x < 110) anch = 'end'; else if (lP.x > 130) anch = 'start'; return <text key={axis.key} x={lP.x} y={lP.y} fontSize={8} fontWeight={600} textAnchor={anch} dominantBaseline="middle" className="fill-stone-600 dark:fill-stone-300">{axis.label}</text> })}
    </svg>
    <div className="grid grid-cols-2 gap-2 w-full max-w-md text-xs">{DEFENSE_RADAR.map(a => <div key={a.key} className="flex items-center gap-1.5 p-1.5 rounded bg-muted/40"><span className="flex-1 truncate text-[11px] text-muted-foreground">{a.label}</span><Badge variant="outline" className="text-[10px] border-red-700 text-red-700 tabular-nums">{a.current}</Badge><ChevronRight className="w-3 h-3 text-muted-foreground" /><Badge variant="outline" className="text-[10px] border-emerald-700 text-emerald-700 tabular-nums">{a.target}</Badge></div>)}</div>
    <div className="flex items-center gap-4 mt-1 text-xs"><div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(185,28,28,0.45)', border: '1px solid #b91c1c' }} /><span className="text-muted-foreground">Текущее</span></div><div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(4,120,87,0.45)', border: '1px solid #047857' }} /><span className="text-muted-foreground">Целевое</span></div></div>
  </div>)
}

function PleaCalc() {
  const [artCode, setArtCode] = useState(PLEA_ARTICLES[0]!.code)
  const [mitS, setMitS] = useState<Record<string, boolean>>({})
  const [aggS, setAggS] = useState<Record<string, boolean>>({})
  const art = PLEA_ARTICLES.find(a => a.code === artCode) ?? PLEA_ARTICLES[0]!
  const calc = useMemo(() => {
    const mitT = PLEA_MITIGATING.reduce((s, f) => s + (mitS[f.id] ? f.reduction : 0), 0), aggT = PLEA_AGGRAVATING.reduce((s, f) => s + (aggS[f.id] ? f.increase : 0), 0)
    const raw = art.baseSentence - mitT + aggT, sentence = Math.round(clamp(raw, art.punishmentMin, art.punishmentMax) * 10) / 10
    const mitCnt = PLEA_MITIGATING.filter(f => mitS[f.id]).length, aggCnt = PLEA_AGGRAVATING.filter(f => aggS[f.id]).length
    const sr = sentence / Math.max(art.punishmentMax, 0.001)
    let iR = 45 + sr * 50 - mitT * 6 + aggT * 6, sR = 25 + mitT * 8 - aggT * 5 - Math.max(0, sentence - 3) * 6, fR = 30 - sr * 25 + (mitCnt > aggCnt ? 10 : 0)
    const tR = iR + sR + fR; if (tR > 0) { iR = (iR / tR) * 100; sR = (sR / tR) * 100; fR = (fR / tR) * 100 }
    const imprisonment = clamp(iR, 1, 99), suspended = clamp(sR, 1, 99), finePct = clamp(fR, 1, 99)
    const fRatio = clamp(1 - mitT * 0.15 + aggT * 0.1, 0, 1), fineAmt = Math.round((art.fineMin + (art.fineMax - art.fineMin) * fRatio) / 1000) * 1000
    const cat = sentence < 1 && finePct > imprisonment && finePct > suspended ? { label: 'Обязательные работы', cls: 'bg-purple-700 text-white', icon: Zap }
      : imprisonment >= suspended && imprisonment >= finePct ? { label: 'Лишение свободы', cls: 'bg-red-700 text-white', icon: Gavel }
      : suspended >= finePct ? { label: 'Условный срок', cls: 'bg-amber-600 text-white', icon: Clock }
      : { label: 'Штраф', cls: 'bg-emerald-700 text-white', icon: Coins }
    return { sentence, fineAmt, imprisonment, suspended, finePct, mitT: Math.round(mitT * 10) / 10, aggT: Math.round(aggT * 10) / 10, cat, mitCnt, aggCnt }
  }, [art, mitS, aggS])
  const toggleMit = (id: string, v: boolean) => setMitS(s => ({ ...s, [id]: v }))
  const toggleAgg = (id: string, v: boolean) => setAggS(s => ({ ...s, [id]: v }))
  const resetAll = () => { setMitS({}); setAggS({}) }
  const recSc = PLEA_SCENARIOS.find(s => s.recommendation === 'recommended') ?? PLEA_SCENARIOS[2]!

  return (<div className="space-y-4">
    <Card className="bg-gradient-to-r from-red-900/30 via-orange-900/20 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"><CardContent className="p-5"><div className="flex items-start gap-4"><div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20 shrink-0"><BrainCircuit className="w-6 h-6 text-red-700" /></div><div className="flex-1 min-w-0"><h2 className="text-lg font-bold flex items-center gap-2 flex-wrap">Калькулятор наказания и сделок с правосудием<Badge className="bg-red-700 text-white text-[10px] gap-1"><Sparkles className="w-3 h-3" /> AI-анализ</Badge></h2><p className="text-sm text-muted-foreground mt-0.5">Интерактивный расчёт прогноза наказания, сравнение стратегий и радар силы защиты по делу № 2024-00145</p></div></div></CardContent></Card>

    <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-orange-700"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calculator className="w-4 h-4 text-orange-600" /> Калькулятор наказания<Badge variant="outline" className="text-[10px] gap-1"><Gavel className="w-3 h-3" />{art.code}</Badge></CardTitle></CardHeader>
    <CardContent className="p-4 space-y-4">
      <div className="flex items-center gap-2"><Select value={artCode} onValueChange={setArtCode}><SelectTrigger className="w-64 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PLEA_ARTICLES.map(a => <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>)}</SelectContent></Select><Badge className={CAT_BADGE[art.category]}>{art.category}</Badge></div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2"><p className="text-xs font-semibold flex items-center gap-1"><Plus className="w-3 h-3 text-emerald-600" /> Смягчающие ({calc.mitCnt})</p><div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1">{PLEA_MITIGATING.map(f => (<div key={f.id} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors"><Checkbox checked={mitS[f.id] ?? false} onCheckedChange={v => toggleMit(f.id, v as boolean)} /><span className="text-xs flex-1">{f.label}</span><Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">−{f.reduction} лет</Badge></div>))}</div></div>
        <div className="space-y-2"><p className="text-xs font-semibold flex items-center gap-1"><Minus className="w-3 h-3 text-red-600" /> Отягчающие ({calc.aggCnt})</p><div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1">{PLEA_AGGRAVATING.map(f => (<div key={f.id} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors"><Checkbox checked={aggS[f.id] ?? false} onCheckedChange={v => toggleAgg(f.id, v as boolean)} /><span className="text-xs flex-1">{f.label}</span><Badge variant="outline" className="text-[10px] text-red-700 border-red-300">+{f.increase} лет</Badge></div>))}</div></div>
      </div>

      <Separator />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <CircularProgress value={calc.imprisonment} color="#b91c1c" label="Лишение свободы" sub={`${calc.imprisonment}% вероятность`} />
        <CircularProgress value={calc.suspended} color="#d97706" label="Условный срок" sub={`${calc.suspended}% вероятность`} />
        <CircularProgress value={calc.finePct} color="#047857" label="Штраф" sub={`${calc.finePct}% вероятность`} />
        <div className="flex flex-col items-center text-center justify-center"><Badge className={`${calc.cat.cls} text-xs mb-1 gap-1`}><calc.cat.icon className="w-3 h-3" />{calc.cat.label}</Badge><p className="text-2xl font-bold">{calc.sentence} лет</p><p className="text-[10px] text-muted-foreground">Прогноз наказания</p><Separator className="my-2" /><p className="text-xs font-semibold">{fmtRub(calc.fineAmt)}</p><p className="text-[10px] text-muted-foreground">Прогноз штрафа</p></div>
      </div>
      <div className="flex items-center gap-3 justify-center"><Button size="sm" variant="outline" onClick={resetAll} className="text-xs gap-1"><Minus className="w-3 h-3" /> Сбросить</Button><Badge variant="outline" className="text-[10px] gap-1"><Plus className="w-3 h-3 text-emerald-600" />Смягч: −{calc.mitT} лет</Badge><Badge variant="outline" className="text-[10px] gap-1"><Minus className="w-3 h-3 text-red-600" />Отягч: +{calc.aggT} лет</Badge></div>
    </CardContent></Card>

    <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-amber-700"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="w-4 h-4 text-amber-600" /> Сравнение стратегий сделок<Badge className="bg-emerald-700 text-white text-[10px] ml-2">{recSc.title} — рекомендуется</Badge></CardTitle></CardHeader>
    <CardContent className="p-4"><div className="space-y-3">{PLEA_SCENARIOS.map(sc => { const rc = REC_CFG[sc.recommendation]; return (<Card key={sc.id} className={`rounded-lg shadow-sm transition-all duration-300 hover:shadow-md border-l-4 ${sc.recommendation === 'recommended' ? 'border-l-emerald-700' : sc.recommendation === 'possible' ? 'border-l-amber-600' : 'border-l-red-700'}`}>
      <CardContent className="p-4"><div className="flex items-start justify-between gap-2 mb-2"><div className="min-w-0"><p className="text-sm font-bold">{sc.title}</p><p className="text-xs text-muted-foreground">{sc.subtitle} • {sc.lawRef}</p></div><Badge className={`text-[10px] ${rc.cls}`}>{rc.label}</Badge></div>
      <div className="grid grid-cols-4 gap-3 text-xs mb-2"><div className="p-2 rounded-md bg-muted/40"><p className="text-muted-foreground">Минимум</p><p className="font-bold mt-0.5">{sc.sentenceMin} лет</p></div><div className="p-2 rounded-md bg-muted/40"><p className="text-muted-foreground">Максимум</p><p className="font-bold mt-0.5">{sc.sentenceMax} лет</p></div><div className="p-2 rounded-md bg-muted/40"><p className="text-muted-foreground">Снижение от макс.</p><p className="font-bold mt-0.5 text-emerald-700">−{sc.reductionFromMax}%</p></div><div className="p-2 rounded-md bg-muted/40"><p className="text-muted-foreground">Оправдание</p><p className="font-bold mt-0.5">{sc.acquittalProbability}%</p></div></div>
      <div className="grid grid-cols-2 gap-3 text-xs"><div className="space-y-1"><p className="font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Плюсы</p>{sc.pros.map(p => <p key={p} className="text-muted-foreground">• {p}</p>)}</div><div className="space-y-1"><p className="font-semibold text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Минусы</p>{sc.cons.map(c => <p key={c} className="text-muted-foreground">• {c}</p>)}</div></div>
    </CardContent></Card>) })}</div></CardContent></Card>

    <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-purple-700"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-purple-700" /> Радар силы защиты<Badge variant="outline" className="text-[10px] ml-2">6 параметров</Badge></CardTitle></CardHeader><CardContent className="p-4"><DefenseRadar /></CardContent></Card>
  </div>)
}

function RiskMatrix({ data }: { data: RiskAssessmentData }) {
  const riskLvl = data.riskLevel, rCfg = RISK_LEVEL_CFG[riskLvl]
  const factorKeys = Object.keys(data.factors) as Array<keyof typeof data.factors>
  return (<div className="space-y-4">
    <Card className="bg-gradient-to-r from-red-900/30 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20 shrink-0"><AlertTriangle className="w-6 h-6 text-red-700" /></div><div className="flex-1 min-w-0"><h2 className="text-lg font-bold">Матрица оценки рисков</h2><p className="text-sm text-muted-foreground">Анализ угроз по делу № 2024-00145 • Колесниченко Д.А.</p></div><Badge className={rCfg.cls}>{riskLvl}</Badge></div></CardContent></Card>

    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center gap-4 mb-4"><div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${rCfg.bg}`}><AlertTriangle className="w-6 h-6 text-red-700" /></div><div><p className="text-2xl font-bold">{data.overallRisk}/100</p><p className="text-xs text-muted-foreground">Общий уровень риска</p></div><Progress value={data.overallRisk} className="h-3 flex-1 [&>div]:bg-red-700" /></div>
    <Separator className="my-3" />
    <div className="grid sm:grid-cols-2 gap-3">{factorKeys.map(k => { const f = data.factors[k]; const color = f.score >= 70 ? 'text-emerald-700' : f.score >= 50 ? 'text-amber-600' : 'text-red-700'; const bg = f.score >= 70 ? 'bg-emerald-700/15' : f.score >= 50 ? 'bg-amber-600/15' : 'bg-red-700/15'; const progCls = f.score >= 70 ? '[&>div]:bg-emerald-700' : f.score >= 50 ? '[&>div]:bg-amber-600' : '[&>div]:bg-red-700'; return (<div key={k} className="p-3 rounded-lg bg-muted/40"><div className="flex items-center gap-2 mb-1.5"><div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${bg}`}><AlertTriangle className={`w-3.5 h-3.5 ${color}`} /></div><div className="flex-1 min-w-0"><p className="text-xs font-semibold">{f.label}</p></div><Badge className={color === 'text-emerald-700' ? 'bg-emerald-700 text-white' : color === 'text-amber-600' ? 'bg-amber-600 text-white' : 'bg-red-700 text-white'}>{f.score}</Badge></div><Progress value={f.score} className={`h-2 ${progCls}`} /><p className="text-[10px] text-muted-foreground mt-1">{f.description}</p></div>) })}</div></CardContent></Card>

    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="w-4 h-4 text-red-700" /> Матрица «вероятность × последствия»</CardTitle></CardHeader>
    <CardContent className="p-4"><Table><TableHeader><TableRow><TableHead className="text-xs">Категория</TableHead><TableHead className="text-xs text-center">Вероятность</TableHead><TableHead className="text-xs text-center">Последствия</TableHead><TableHead className="text-xs text-center">Риск</TableHead></TableRow></TableHeader>
    <TableBody>{data.matrix.map(m => { const risk = m.likelihood * m.impact / 100; const cls = risk >= 60 ? 'bg-red-700 text-white' : risk >= 30 ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white'; return <TableRow key={m.category}><TableCell className="text-xs font-medium">{m.category}</TableCell><TableCell className="text-xs text-center">{m.likelihood}%</TableCell><TableCell className="text-xs text-center">{m.impact}%</TableCell><TableCell className="text-center"><Badge className={cls}>{Math.round(risk)}</Badge></TableCell></TableRow> })}</TableBody></Table></CardContent></Card>

    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-emerald-700"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-700" /> Стратегии снижения рисков</CardTitle></CardHeader>
    <CardContent className="p-4"><div className="space-y-2">{data.mitigationStrategies.map(ms => { const pCls = ms.priority === 'high' ? 'bg-red-700 text-white' : ms.priority === 'medium' ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white'; return (<div key={ms.strategy} className="p-3 rounded-lg bg-muted/40 flex items-start gap-3"><div className="flex-1 min-w-0"><p className="text-xs font-semibold">{ms.strategy}</p><p className="text-[10px] text-muted-foreground">Снижение риска: −{ms.riskReduction}%</p></div><Badge className={`text-[10px] ${pCls}`}>{ms.priority}</Badge></div>) })}</div></CardContent></Card>
  </div>)
}

function SentencingTable({ data }: { data: SentencingData[] }) {
  return (<div className="space-y-4">
    <Card className="bg-gradient-to-r from-orange-900/30 to-stone-900/20 border-l-4 border-orange-700 rounded-xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-4"><div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-700/20 shrink-0"><Gavel className="w-6 h-6 text-orange-700" /></div><div className="flex-1 min-w-0"><h2 className="text-lg font-bold">Калькулятор наказания по статьям</h2><p className="text-sm text-muted-foreground">Расчёт прогноза наказания по каждой статье обвинения</p></div></div></CardContent></Card>
    {data.map(d => (<Card key={d.articleCode} className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-orange-700"><CardContent className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold">{d.articleCode}</p><p className="text-xs text-muted-foreground">{d.description}</p></div><Badge className="bg-orange-600 text-white">{d.punishmentMin}–{d.punishmentMax} лет</Badge></div>
      <div className="grid grid-cols-3 gap-3 text-xs"><div className="p-2 rounded-md bg-muted/40"><p className="text-muted-foreground">Базовый срок</p><p className="font-bold mt-0.5">{d.baseSentence} лет</p></div><div className="p-2 rounded-md bg-muted/40"><p className="text-muted-foreground">Прогноз</p><p className="font-bold mt-0.5 text-red-700">{d.estimatedSentence} лет</p></div><div className="p-2 rounded-md bg-muted/40"><p className="text-muted-foreground">Штраф</p><p className="font-bold mt-0.5">{fmtRub(d.estimatedFine)}</p></div></div>
      <div className="grid grid-cols-2 gap-3 text-xs"><div className="space-y-1"><p className="font-semibold text-emerald-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Смягчающие</p>{d.mitigatingFactors.filter(f => f.applies).map(f => <p key={f.factor} className="text-muted-foreground">• {f.factor} (−{f.reduction} лет)</p>)}{d.mitigatingFactors.filter(f => !f.applies).length === 0 && <p className="text-muted-foreground italic">Все применены</p>}</div><div className="space-y-1"><p className="font-semibold text-red-700 flex items-center gap-1"><Minus className="w-3 h-3" /> Отягчающие</p>{d.aggravatingFactors.filter(f => f.applies).map(f => <p key={f.factor} className="text-muted-foreground">• {f.factor} (+{f.increase} лет)</p>)}{d.aggravatingFactors.filter(f => !f.applies).length === 0 && <p className="text-muted-foreground italic">Все применены</p>}</div></div>
    </CardContent></Card>))}
  </div>)
}

export function CaseRisk() {
  const [tab, setTab] = useState<'plea' | 'risk' | 'sentencing'>('plea')
  const { data: riskData } = useQuery({ queryKey: ['risk-assessment'], queryFn: getRiskAssessment, retry: 1 })
  const { data: sentData } = useQuery({ queryKey: ['sentencing'], queryFn: getSentencing, retry: 1 })
  const risk = riskData ?? mockRiskAssessment, sent = sentData ?? mockSentencing

  return (<div className="space-y-4">
    <div className="flex items-center gap-2 flex-wrap">
      {(['plea', 'risk', 'sentencing'] as const).map(t => (<Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" className="rounded-lg text-xs" onClick={() => setTab(t)}>{t === 'plea' ? <Scale className="w-3 h-3 mr-1" /> : t === 'risk' ? <AlertTriangle className="w-3 h-3 mr-1" /> : <Gavel className="w-3 h-3 mr-1" />}{t === 'plea' ? 'Калькулятор сделок' : t === 'risk' ? 'Матрица рисков' : 'Наказание по статьям'}</Button>))}
    </div>
    {tab === 'plea' && <PleaCalc />}
    {tab === 'risk' && <RiskMatrix data={risk} />}
    {tab === 'sentencing' && <SentencingTable data={sent} />}
  </div>)
}
