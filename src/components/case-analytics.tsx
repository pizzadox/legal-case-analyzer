'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis } from 'recharts'
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, XCircle, Info, Sparkles, Activity, Layers, Award, Zap, Clock, ChevronDown, ChevronUp, FileText, Users, BookOpen, Shield, ArrowRight, Gauge, Flame, Target, Brain } from 'lucide-react'
import { mockAnalytics } from '@/lib/mock-data'
import { getAnalytics } from '@/lib/case-api'
import type { AnalyticsData } from '@/lib/case-store'

const SEV_C: Record<string, string> = { 'особо тяжкое': '#7f1d1d', 'тяжкое': '#dc2626', 'средней тяжести': '#ea580c', 'небольшой': '#ca8a04' }
const SEV_B: Record<string, string> = { 'особо тяжкое': 'bg-red-900/20', 'тяжкое': 'bg-red-700/20', 'средней тяжести': 'bg-orange-600/20', 'небольшой': 'bg-amber-600/20' }
const INS_CFG: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = { positive: { icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-700/15', label: 'Позитив' }, warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-600/15', label: 'Предупреждение' }, critical: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-700/15', label: 'Критическое' }, info: { icon: Info, color: 'text-stone-500', bg: 'bg-stone-500/15', label: 'Информация' } }
const COMP_R: Record<string, { color: string; bg: string; icon: typeof Activity }> = { low: { color: 'text-emerald-700', bg: 'bg-emerald-700/15', icon: Activity }, moderate: { color: 'text-amber-600', bg: 'bg-amber-600/15', icon: Zap }, high: { color: 'text-orange-600', bg: 'bg-orange-600/15', icon: Flame }, extreme: { color: 'text-red-700', bg: 'bg-red-700/15', icon: AlertTriangle } }
const DOC_C: Record<string, string> = { Обвинение: '#dc2626', Показание: '#ea580c', Протокол: '#ca8a04', Экспертиза: '#78716c' }
const DOC_CFG = { Обвинение: { label: 'Обвинение', color: '#dc2626' }, Показание: { label: 'Показание', color: '#ea580c' }, Протокол: { label: 'Протокол', color: '#ca8a04' }, Экспертиза: { label: 'Экспертиза', color: '#78716c' } }

export function CaseAnalytics() {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: getAnalytics, retry: 1, refetchInterval: 10000 })
  const a = data ?? mockAnalytics
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>

  const compCfg = COMP_R[a.complexity.rating] ?? COMP_R.moderate
  const procCfg = { processed: { label: 'Обработано', color: '#059669' }, pending: { label: 'В очереди', color: '#d97706' }, failed: { label: 'Ошибка', color: '#dc2626' } }

  return (<div className="space-y-6">
    <Card className="bg-gradient-to-r from-red-900/30 to-stone-900/20 border-l-4 border-red-700 rounded-xl shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-4"><div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-700/20 shrink-0"><BarChart3 className="w-6 h-6 text-red-700" /></div><div className="flex-1 min-w-0"><h2 className="text-lg font-bold">Аналитика дела</h2><p className="text-sm text-muted-foreground">Обработка, эпизоды, участники, статьи, прогнозы исхода • Дело № 2024-00145</p></div><Badge className={compCfg.color.includes('red') ? 'bg-red-700 text-white' : compCfg.color.includes('amber') ? 'bg-amber-600 text-white' : compCfg.color.includes('orange') ? 'bg-orange-600 text-white' : 'bg-emerald-700 text-white'}>Сложность: {a.complexity.rating}</Badge></div></CardContent></Card>

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="rounded-xl shadow-sm border-l-4 border-l-emerald-700 hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${compCfg.bg}`}><Gauge className={`w-5 h-5 ${compCfg.color}`} /></div><div><p className="text-xs text-muted-foreground">Сложность дела</p><p className="text-xl font-bold">{a.complexity.overallScore}/100</p></div></div></CardContent></Card>
      <Card className="rounded-xl shadow-sm border-l-4 border-l-amber-600 hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-amber-600/15"><Layers className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">Эпизоды</p><p className="text-xl font-bold">{a.episodeMatrix.reduce((s, e) => s + e.total, 0)}</p></div></div></CardContent></Card>
      <Card className="rounded-xl shadow-sm border-l-4 border-l-red-700 hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-red-700/15"><Award className="w-5 h-5 text-red-700" /></div><div><p className="text-xs text-muted-foreground">Статьи</p><p className="text-xl font-bold">{a.articleCharges.length}</p></div></div></CardContent></Card>
      <Card className="rounded-xl shadow-sm border-l-4 border-l-stone-600 hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-stone-600/15"><Brain className="w-5 h-5 text-stone-600" /></div><div><p className="text-xs text-muted-foreground">ИИ-инсайты</p><p className="text-xl font-bold">{a.insights.length}</p></div></div></CardContent></Card>
    </div>

    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-emerald-500"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-600" /> Тренд обработки</CardTitle></CardHeader><CardContent className="p-2"><ChartContainer config={procCfg} className="h-48 w-full"><AreaChart data={a.processingTrend}><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis hide /><Area type="monotone" dataKey="processed" stroke="#059669" fill="#059669" fillOpacity={0.3} /><Area type="monotone" dataKey="pending" stroke="#d97706" fill="#d97706" fillOpacity={0.2} /><Area type="monotone" dataKey="failed" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} /><ChartTooltip content={<ChartTooltipContent />} /></AreaChart></ChartContainer></CardContent></Card>
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-amber-500"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-amber-600" /> Статьи обвинения</CardTitle></CardHeader><CardContent className="p-2"><ChartContainer config={DOC_CFG} className="h-48 w-full"><BarChart data={a.articleCharges}><XAxis dataKey="code" tick={{ fontSize: 9 }} /><YAxis hide /><Bar dataKey="count" radius={4}>{a.articleCharges.map((_, i) => <Cell key={i} fill={SEV_C[a.articleCharges[i].severity] ?? '#78716c'} />)}</Bar><ChartTooltip content={<ChartTooltipContent />} /></BarChart></ChartContainer></CardContent></Card>
    </div>

    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-stone-500"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Типы документов</CardTitle></CardHeader><CardContent className="p-2"><ChartContainer config={DOC_CFG} className="h-48 w-full"><PieChart><Pie data={a.documentTypes} dataKey="percentage" nameKey="type" cx="50%" cy="50%" outerRadius={70} label={({ type, percentage }) => `${type}: ${percentage}%`}>{a.documentTypes.map((_, i) => <Cell key={i} fill={DOC_C[a.documentTypes[i].type] ?? '#78716c'} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer></CardContent></Card>
      <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-purple-500"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4 text-purple-600" /> Сложность дела</CardTitle></CardHeader><CardContent className="p-4 space-y-2">{a.complexity.factors.map(f => { const progCls = f.score >= 70 ? '[&>div]:bg-red-700' : f.score >= 50 ? '[&>div]:bg-amber-600' : '[&>div]:bg-emerald-700'; return (<div key={f.name} className="flex items-center gap-2"><span className="text-xs font-medium min-w-[100px]">{f.name}</span><Progress value={f.score} className={`h-2 flex-1 ${progCls}`} /><Badge variant="outline" className="text-xs shrink-0">{f.score}/{f.benchmark}</Badge></div>) })}</CardContent></Card>
    </div>

    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-red-500"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-red-600" /> Прогноз исхода дела</CardTitle></CardHeader>
    <CardContent className="p-4"><div className="space-y-2">{a.outcomePrediction.map(o => (<div key={o.scenario} className={`p-3 rounded-lg border-l-4 ${o.isMostLikely ? 'border-l-amber-600 bg-amber-50/50 dark:bg-amber-950/20' : 'border-l-stone-400 bg-muted/40'} transition-all hover:bg-muted/70`}>
      <div className="flex items-center justify-between gap-2 mb-1"><p className="text-xs font-semibold">{o.scenario}</p><Badge className={o.isMostLikely ? 'bg-amber-600 text-white text-xs' : 'bg-stone-500 text-white text-xs'}>{o.probability}%</Badge></div><p className="text-xs text-muted-foreground">{o.rationale}</p></div>))}</div></CardContent></Card>

    <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-muted/20 border-t-2 border-t-emerald-500"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600" /> ИИ-инсайты<Badge variant="outline" className="text-xs ml-auto">{a.insights.length} рекомендаций</Badge></CardTitle></CardHeader>
    <CardContent className="p-4"><div className="space-y-2 max-h-[640px] overflow-y-auto scrollbar-thin">{a.insights.map(ins => { const cfg = INS_CFG[ins.type] ?? INS_CFG.info; const Ic = cfg.icon; const isExp = expandedInsight === ins.title; return (<Collapsible key={ins.title} open={isExp} onOpenChange={() => setExpandedInsight(isExp ? null : ins.title)}>
      <Card className={`rounded-lg shadow-sm transition-all ${isExp ? 'ring-1 ring-emerald-500/30' : ''} border-l-4 ${ins.type === 'critical' ? 'border-l-red-700' : ins.type === 'warning' ? 'border-l-amber-600' : ins.type === 'positive' ? 'border-l-emerald-700' : 'border-l-stone-500'}`}>
      <CardContent className="p-3"><CollapsibleTrigger asChild><button className="w-full text-left"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge className={`${cfg.color === 'text-emerald-700' ? 'bg-emerald-700 text-white' : cfg.color === 'text-amber-600' ? 'bg-amber-600 text-white' : cfg.color === 'text-red-700' ? 'bg-red-700 text-white' : 'bg-stone-500 text-white'} text-xs shrink-0 gap-1`}><Ic className="w-3 h-3" />{cfg.label}</Badge><span className="text-xs font-semibold">{ins.title}</span></div><div className="flex items-center gap-1"><Badge variant="outline" className="text-[10px]">{ins.confidence}%</Badge>{isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</div></div></button></CollapsibleTrigger>
      <CollapsibleContent><div className="mt-2 space-y-1.5 text-xs"><p className="text-muted-foreground">{ins.description}</p><p className="font-medium text-amber-700 flex items-center gap-1"><ArrowRight className="w-3 h-3" />{ins.actionRecommendation}</p>{ins.relatedEntities.length > 0 && <div className="flex flex-wrap gap-1.5">{ins.relatedEntities.map(re => <Badge key={re.id} variant="outline" className="text-[10px]">{re.type}: {re.name}</Badge>)}</div>}</div></CollapsibleContent>
      </CardContent></Card>
    </Collapsible>) })}</div></CardContent></Card>

    <Separator /><p className="text-xs text-muted-foreground">Аналитика дела • Дело № 2024-00145 • Колесниченко Д.А. и другие</p>
  </div>)
}
