'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Gavel, AlertOctagon, Search, Filter, X, ChevronRight, FileText, Scale, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, Clock, ClipboardList, ListChecks, Sparkles, Eye, History, Ban, ScrollText, RotateCcw, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { sevBadge, GRID2, GRID3, GRID4, PALETTE } from '@/lib/shared-ui'

// ─── Types ───

type Severity = 'critical' | 'serious' | 'moderate'
type ViolStatus = 'excludable' | 'fixed' | 'disputed' | 'taken-by-court'
type SortKey = 'date-desc' | 'date-asc' | 'severity' | 'article'

interface StatusHist { date: string; label: string; color: 'red'|'amber'|'emerald'|'stone'|'purple' }
interface Violation { id:string; date:string; article:string; articleKey:string; type:string; description:string; evidence:string; severity:Severity; status:ViolStatus; impactScore:number; legalBasis:string; remediation:string; relatedDocs:string[]; statusHistory:StatusHist[] }

// ─── Mock data (compact) ───

const V: Violation[] = [
  { id:'v1', date:'2023-05-15', article:'ст. 170 УПК РФ', articleKey:'170', type:'Отсутствие понятых при обыске', description:'При обыске в офисе ООО «ТехноПром» подписи понятых в протоколе отсутствуют, нет информации об их приглашении. Нарушение ч. 1 ст. 170 УПК РФ.', evidence:'Протокол обыска №3 от 15.05.2023', severity:'critical', status:'excludable', impactScore:95, legalBasis:'ч. 1 ст. 170 УПК РФ — обязательное участие понятых; ч. 1 ст. 75 УПК РФ — недопустимые доказательства.', remediation:'Ходатайство об исключении протокола обыска (ст. 75 УПК РФ).', relatedDocs:['Протокол обыска №3','Рапорт следователя Сидорова'], statusHistory:[{date:'2023-05-16',label:'Выявлено',color:'stone'}, {date:'2023-06-20',label:'Ходатайство заявлено',color:'amber'}, {date:'2024-01-15',label:'Подлежит исключению',color:'red'}] },
  { id:'v2', date:'2023-05-15', article:'ст. 182 УПК РФ', articleKey:'182', type:'Обыск вне рабочего времени', description:'Обыск начат в 22:30, продолжался до 02:15. Отдельного постановления о ночном обыске нет. Нарушение ч. 2 ст. 164 УПК РФ.', evidence:'Протокол обыска №3, Журнал доступа', severity:'serious', status:'disputed', impactScore:65, legalBasis:'ч. 1,2 ст. 164 УПК РФ — ночное время; ч. 2 ст. 182 УПК РФ.', remediation:'Доп. ходатайство об исключении протокола, ссылка на отсутствие постановления.', relatedDocs:['Протокол обыска №3','Журнал доступа'], statusHistory:[{date:'2023-05-16',label:'Выявлено',color:'stone'}, {date:'2023-07-10',label:'Оспаривается',color:'amber'}] },
  { id:'v3', date:'2023-06-05', article:'ст. 189 УПК РФ', articleKey:'189', type:'Допрос подозреваемого без адвоката', description:'Допрос Колесниченко без защитника, письменный отказ отсутствует. Нарушение ч. 2 ст. 46, ч. 1 ст. 189 УПК РФ.', evidence:'Протокол допроса №5 от 05.06.2023', severity:'critical', status:'excludable', impactScore:90, legalBasis:'ч. 1 ст. 189, ч. 2 ст. 46 УПК РФ; п. 1 ч. 2 ст. 75 — показания без защитника недопустимы.', remediation:'Ходатайство об исключении допроса. Заявление о недопустимости производных доказательств.', relatedDocs:['Протокол допроса №5','Повестка о вызове'], statusHistory:[{date:'2023-06-06',label:'Выявлено',color:'stone'}, {date:'2023-07-15',label:'Ходатайство',color:'amber'}, {date:'2024-01-15',label:'Подлежит исключению',color:'red'}] },
  { id:'v4', date:'2023-07-18', article:'ст. 195 УПК РФ', articleKey:'195', type:'Нарушение порядка назначения экспертизы', description:'Постановление о назначении экспертизы датировано задним числом (25.07 вместо 18.07), подтверждено экспертизой давности. Нарушен порядок ознакомления обвиняемого.', evidence:'Постановление №2/2023 от 25.07.2023', severity:'serious', status:'excludable', impactScore:75, legalBasis:'ч. 1,3 ст. 195 УПК РФ; ст. 196, 198 УПК РФ.', remediation:'Ходатайство об исключении заключения эксперта. Просьба о повторной экспертизе (ст. 207).', relatedDocs:['Постановление №2/2023','Заключение №12','Экспертиза давности'], statusHistory:[{date:'2023-07-26',label:'Выявлено',color:'stone'}, {date:'2023-09-15',label:'Ходатайство',color:'amber'}, {date:'2024-01-20',label:'Подлежит исключению',color:'red'}] },
  { id:'v5', date:'2023-07-25', article:'ст. 195 УПК РФ', articleKey:'195', type:'Экспертиза без ознакомления с постановлением', description:'Обвиняемый не ознакомлен с постановлением до начала экспертизы, лишён прав ст. 198 УПК РФ. Постановление вручено после.', evidence:'Уведомление от 12.09.2023 (после заключения)', severity:'serious', status:'disputed', impactScore:60, legalBasis:'ч. 3 ст. 195, п. 1,2 ч. 1 ст. 198 УПК РФ.', remediation:'Доп. ходатайство об исключении, ходатайство о допросе эксперта.', relatedDocs:['Уведомление','Заключение №12'], statusHistory:[{date:'2023-09-15',label:'Выявлено',color:'stone'}, {date:'2023-11-20',label:'Оспаривается',color:'amber'}] },
  { id:'v6', date:'2024-01-10', article:'ст. 217 УПК РФ', articleKey:'217', type:'Отказ в ознакомлении с материалами дела', description:'Следователь отказал в ознакомлении с томами 6-8, мотивировав «служебной необходимостью», что не предусмотрено законом. Нарушение ч. 1 ст. 217 УПК РФ.', evidence:'Заявление защитника от 10.01.2024', severity:'critical', status:'excludable', impactScore:85, legalBasis:'ч. 1 ст. 217, ст. 215, ч. 2 ст. 219 УПК РФ.', remediation:'Жалоба руководителю СО (ст. 124), жалоба в суд (ст. 125), ходатайство о возвращении дела прокурору (ст. 237).', relatedDocs:['Заявление защитника','Ответ следователя','Опись дела'], statusHistory:[{date:'2024-01-12',label:'Выявлено',color:'stone'}, {date:'2024-01-25',label:'Жалоба в суд',color:'amber'}, {date:'2024-02-10',label:'Подлежит исключению',color:'red'}] },
  { id:'v7', date:'2023-12-01', article:'ст. 164 УПК РФ', articleKey:'164', type:'Нарушение сроков предварительного следствия', description:'Срок продлевался 3 раза без обоснования. Нарушение устранено подписанием соглашения.', evidence:'Постановления о продлении (3 шт.)', severity:'moderate', status:'fixed', impactScore:30, legalBasis:'ч. 1,4,5 ст. 162, ч. 1 ст. 164 УПК РФ.', remediation:'Нарушение устранено. Доп. аргумент в состязательной части.', relatedDocs:['Постановления о продлении (3 шт.)'], statusHistory:[{date:'2023-12-05',label:'Выявлено',color:'stone'}, {date:'2024-01-05',label:'Устранено',color:'emerald'}] },
  { id:'v8', date:'2023-06-12', article:'ст. 170 УПК РФ', articleKey:'170', type:'Подмена понятых при осмотре', description:'Понятые по данным видеозаписи отсутствовали на месте, подмена выявлена опросом очевидцев.', evidence:'Протокол осмотра №2, видеозапись', severity:'moderate', status:'disputed', impactScore:45, legalBasis:'ч. 1 ст. 170, ч. 5 ст. 164, ст. 75 УПК РФ; ст. 303 УК РФ.', remediation:'Ходатайство о приобщении видеозаписи и допросе очевидцев.', relatedDocs:['Протокол осмотра №2','Видеозапись','Объяснения сотрудников'], statusHistory:[{date:'2023-06-15',label:'Выявлено',color:'stone'}, {date:'2023-08-20',label:'Оспаривается',color:'amber'}] },
  { id:'v9', date:'2023-05-15', article:'ст. 182 УПК РФ', articleKey:'182', type:'Изъятие предметов без описи', description:'Изъяты 7 дисков, 3 системных блока и документы без описи. Нарушение ч. 13 ст. 182 УПК РФ.', evidence:'Протокол обыска №3, Заявление защитника', severity:'serious', status:'taken-by-court', impactScore:55, legalBasis:'ч. 13 ст. 182, ч. 3 ст. 166, ст. 81,82 УПК РФ.', remediation:'Суд отказал в исключении, подана апелляция. Заявление о недопустимости производных доказательств.', relatedDocs:['Протокол №3','Заявление защитника','Постановление суда'], statusHistory:[{date:'2023-05-20',label:'Выявлено',color:'stone'}, {date:'2023-08-10',label:'Ходатайство',color:'amber'}, {date:'2024-02-10',label:'Принято судом',color:'purple'}] },
]

// ─── Config maps ───

const SEV_CFG: Record<Severity, {badge:string;label:string;icon:LucideIcon}> = {
  critical:{badge:'bg-red-700 text-white gap-1',label:'Критическая',icon:AlertOctagon},
  serious:{badge:'bg-amber-600 text-white gap-1',label:'Серьёзная',icon:AlertTriangle},
  moderate:{badge:'bg-stone-600 text-white gap-1',label:'Умеренная',icon:Clock},
}
const STAT_CFG: Record<ViolStatus, {badge:string;label:string;icon:LucideIcon}> = {
  excludable:{badge:'bg-red-700 text-white gap-1',label:'Подлежит исключению',icon:Ban},
  fixed:{badge:'bg-emerald-700 text-white gap-1',label:'Исправлено',icon:CheckCircle2},
  disputed:{badge:'bg-amber-600 text-white gap-1',label:'Оспаривается',icon:ShieldAlert},
  'taken-by-court':{badge:'bg-stone-600 text-white gap-1',label:'Принято судом',icon:Gavel},
}
const ART_CFG: Record<string,{bg:string;text:string;hex:string}> = {
  '170':{bg:'bg-stone-600',text:'text-white',hex:'#57534e'},'182':{bg:'bg-red-700',text:'text-white',hex:'#b91c1c'},
  '189':{bg:'bg-amber-600',text:'text-white',hex:'#d97706'},'195':{bg:'bg-purple-700',text:'text-white',hex:'#7e22ce'},
  '217':{bg:'bg-orange-600',text:'text-white',hex:'#ea580c'},'164':{bg:'bg-red-900',text:'text-white',hex:'#7f1d1d'},
}
const HIST_DOT: Record<string,string> = {red:'bg-red-600',amber:'bg-amber-500',emerald:'bg-emerald-600',stone:'bg-stone-400',purple:'bg-purple-700'}
const HIST_BADGE: Record<string,string> = {red:'bg-red-700 text-white',amber:'bg-amber-600 text-white',emerald:'bg-emerald-700 text-white',stone:'bg-stone-600 text-white',purple:'bg-purple-700 text-white'}
const SEV_CHART = [{severity:'Критические',short:'Крит.',count:3,color:'#991b1b'},{severity:'Серьёзные',short:'Серьёз.',count:4,color:'#d97706'},{severity:'Умеренные',short:'Умер.',count:2,color:'#a8a29e'}]
const ART_CHART = [{article:'ст.170',key:'170',count:2,color:'#57534e'},{article:'ст.182',key:'182',count:2,color:'#b91c1c'},{article:'ст.189',key:'189',count:1,color:'#d97706'},{article:'ст.195',key:'195',count:2,color:'#7e22ce'},{article:'ст.217',key:'217',count:1,color:'#ea580c'},{article:'ст.164',key:'164',count:1,color:'#7f1d1d'}]

const fmtD = (iso:string) => {const [y,m,d]=iso.split('-');return d&&m&&y?`${d}.${m}.${y}`:iso}
const impactBg = (s:number) => s>=80?'bg-red-700':s>=50?'bg-amber-600':'bg-stone-500'
const impactText = (s:number) => s>=80?'text-red-700 dark:text-red-400':s>=50?'text-amber-600 dark:text-amber-400':'text-stone-500 dark:text-stone-400'
const impactLbl = (s:number) => s>=80?'Высокое':s>=50?'Среднее':'Низкое'

// ─── StatTile ───

function StatTile({label,value,color,icon:Icon}:{label:string;value:string|number;color:'red'|'amber'|'emerald'|'purple';icon:LucideIcon}) {
  const P:Record<string,{bg:string;ring:string;text:string}> = {red:{bg:'bg-red-700/15 dark:bg-red-950/30',ring:'ring-red-700/20',text:'text-red-700 dark:text-red-400'},amber:{bg:'bg-amber-600/15 dark:bg-amber-950/30',ring:'ring-amber-600/20',text:'text-amber-600 dark:text-amber-400'},emerald:{bg:'bg-emerald-700/15 dark:bg-emerald-950/30',ring:'ring-emerald-700/20',text:'text-emerald-700 dark:text-emerald-400'},purple:{bg:'bg-purple-700/15 dark:bg-purple-950/30',ring:'ring-purple-700/20',text:'text-purple-700 dark:text-purple-400'}}
  const c=P[color]
  return <div className={`rounded-xl ${c.bg} ring-1 ${c.ring} p-3 min-w-0`}><div className="flex items-center gap-2 mb-1"><Icon className={`w-4 h-4 ${c.text} shrink-0`}/><span className="text-[11px] text-muted-foreground truncate">{label}</span></div><p className={`text-2xl font-bold tabular-nums ${c.text}`}>{value}</p></div>
}

// ─── ColoredProgress ───

function ColoredProgress({value,colorClass,height='h-2.5'}:{value:number;colorClass:string;height?:string}) {
  const s=Math.max(0,Math.min(100,value))
  return <div className={`relative ${height} w-full overflow-hidden rounded-full bg-muted`}><div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${colorClass}`} style={{width:`${s}%`}}/></div>
}

// ─── HeaderBanner ───

function HeaderBanner() {
  const total=V.length, critical=V.filter(v=>v.severity==='critical').length, excl=V.filter(v=>v.status==='excludable').length, fixed=V.filter(v=>v.status==='fixed').length
  return (
    <Card className="rounded-xl shadow-sm overflow-hidden border-l-4 border-l-red-700 bg-gradient-to-r from-red-900/30 via-orange-900/20 to-stone-900/20">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-red-700/20 flex items-center justify-center shrink-0 ring-1 ring-red-700/30"><Gavel className="w-7 h-7 text-red-700 dark:text-red-400"/></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap"><h2 className="text-xl sm:text-2xl font-bold tracking-tight">Реестр процессуальных нарушений</h2><Badge className="bg-red-700 text-white gap-1"><AlertOctagon className="w-3 h-3"/>УПК РФ</Badge></div>
              <p className="text-sm text-muted-foreground max-w-2xl">Выявленные нарушения УПК РФ, тяжесть и основания для исключения доказательств по делу № 2024-00145</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Scale className="w-3 h-3 text-red-700"/>ст. 159 ч.3 · ст. 160 ч.2</span>
                <span className="text-stone-400">•</span>
                <span className="flex items-center gap-1"><Gavel className="w-3 h-3 text-purple-700"/>Колесниченко Д.А.</span>
                <span className="text-stone-400">•</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-stone-500"/>ст. 75,164,170,182,189,195,217 УПК РФ</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatTile label="Всего" value={total} color="red" icon={AlertOctagon}/>
            <StatTile label="Критических" value={critical} color="red" icon={AlertTriangle}/>
            <StatTile label="Подлежит исключению" value={excl} color="amber" icon={Ban}/>
            <StatTile label="Исправлено" value={fixed} color="emerald" icon={CheckCircle2}/>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── ChartsSection ───

function ChartsSection() {
  const exclC=V.filter(v=>v.status==='excludable').length, totalImp=V.reduce((s,v)=>s+v.impactScore,0), defPot=Math.round(totalImp/(V.length*100)*100)
  return (
    <div className={GRID3}>
      <Card className="rounded-xl shadow-sm border-t-2 border-t-red-700">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-700"/>Распределение по тяжести</CardTitle></CardHeader>
        <CardContent className="p-4">
          <ChartContainer config={{count:{label:'Нарушений',color:'#dc2626'}}} className="h-[180px] w-full">
            <BarChart data={SEV_CHART} layout="vertical" margin={{top:5,right:20,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false}/>
              <XAxis type="number" tick={{fontSize:11}} tickLine={false} axisLine={false} allowDecimals={false}/>
              <YAxis type="category" dataKey="short" tick={{fontSize:11}} tickLine={false} axisLine={false} width={48}/>
              <ChartTooltip content={<ChartTooltipContent/>}/>
              <Bar dataKey="count" radius={[0,6,6,0]} barSize={26}>{SEV_CHART.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
            </BarChart>
          </ChartContainer>
          <div className="flex items-center justify-around mt-2 text-xs">{SEV_CHART.map((s,i)=><span key={i} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:s.color}}/><span className="text-muted-foreground">{s.severity}</span><Badge variant="outline" className="text-xs px-1.5 py-0 h-5 tabular-nums">{s.count}</Badge></span>)}</div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border-t-2 border-t-purple-700">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="w-4 h-4 text-purple-700"/>По статьям УПК РФ</CardTitle></CardHeader>
        <CardContent className="p-4">
          <ChartContainer config={{count:{label:'Нарушений',color:'#7e22ce'}}} className="h-[180px] w-full">
            <PieChart><Pie data={ART_CHART} dataKey="count" nameKey="article" cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={2}>{ART_CHART.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><ChartTooltip content={<ChartTooltipContent/>}/></PieChart>
          </ChartContainer>
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs">{ART_CHART.map((a,i)=><span key={i} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm shrink-0" style={{backgroundColor:a.color}}/><span className="font-mono truncate">{a.article}</span><Badge variant="outline" className="text-xs px-1.5 py-0 h-5 tabular-nums shrink-0 ml-auto">{a.count}</Badge></span>)}</div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border-t-2 border-t-amber-600">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-600"/>Потенциал защиты</CardTitle></CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div><p className="text-[11px] text-muted-foreground">Суммарный потенциал исключения</p><p className={`text-4xl font-bold tabular-nums ${impactText(defPot)}`}>{defPot}<span className="text-xl">/100</span></p></div>
            <Badge className="bg-purple-700 text-white gap-1"><ShieldCheck className="w-3 h-3"/>{defPot>60?'Высокий':defPot>30?'Средний':'Низкий'}</Badge>
          </div>
          <ColoredProgress value={defPot} colorClass={defPot>60?'bg-red-700':defPot>30?'bg-amber-600':'bg-stone-500'} height="h-3"/>
          <div className="rounded-lg bg-muted/40 border p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Ban className="w-3 h-3 text-red-700"/>Подлежит исключению</span><span className="font-bold text-red-700 tabular-nums">{exclC} наруш.</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-600"/>Ключевые доказательства</span><span className="font-bold text-amber-600 tabular-nums">3 шт.</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3 text-purple-700"/>Ходатайств</span><span className="font-bold text-purple-700 tabular-nums">5 шт.</span></div>
          </div>
          {defPot>60 && <div className="rounded-md bg-red-700/10 border border-red-700/30 p-2 text-[11px] text-red-700 dark:text-red-400"><AlertTriangle className="w-3 h-3 inline mr-1"/>Высокий потенциал для исключения ключевых доказательств обвинения.</div>}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── DetailSheet ───

function DetailSheet({violation,open,onOpenChange,onAddToPetition,inPetition}:{violation:Violation|null;open:boolean;onOpenChange:(o:boolean)=>void;onAddToPetition:(id:string)=>void;inPetition:boolean}) {
  if(!violation) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full sm:max-w-lg"/></Sheet>
  const sv=SEV_CFG[violation.severity], st=STAT_CFG[violation.status], SvIcon=sv.icon, StIcon=st.icon, ac=ART_CFG[violation.articleKey]??{bg:'bg-stone-600',text:'text-white',hex:'#57534e'}
  const hBg=violation.severity==='critical'?'from-red-900/40 via-card border-l-red-700':violation.severity==='serious'?'from-amber-900/30 via-card border-l-amber-600':'from-stone-700/30 via-card border-l-stone-600'
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className={`bg-gradient-to-r ${hBg} border-l-4 rounded-r-lg`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><SvIcon className="w-4 h-4"/><span>Нарушение {violation.id.toUpperCase()}</span><span className="text-stone-400">•</span><Clock className="w-3 h-3"/><span className="tabular-nums">{fmtD(violation.date)}</span></div>
          <SheetTitle className="text-base leading-tight">{violation.type}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={`${sv.badge} text-xs`}><SvIcon className="w-3 h-3"/>{sv.label}</Badge>
            <Badge className={`${st.badge} text-xs`}><StIcon className="w-3 h-3"/>{st.label}</Badge>
            <Badge className={`${ac.bg} ${ac.text} text-xs font-mono gap-1`}><Scale className="w-3 h-3"/>{violation.article}</Badge>
          </div>
          <SheetDescription className="sr-only">Детали нарушения по делу № 2024-00145</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6 space-y-4">
          <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3"/>Описание</p><p className="text-sm leading-relaxed">{violation.description}</p></div>
          <Separator/>
          <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Scale className="w-3 h-3"/>Правовая основа</p><div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40"><p className="text-xs text-purple-900 dark:text-purple-100">{violation.legalBasis}</p></div></div>
          <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3"/>Доказательство</p><div className="p-3 rounded-lg bg-muted/40 border border-border/50"><p className="text-xs">{violation.evidence}</p></div></div>
          <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Оценка влияния</p>
            <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
              <div className="flex items-end justify-between gap-2"><div><p className="text-[11px] text-muted-foreground">{impactLbl(violation.impactScore)} влияние</p><p className={`text-3xl font-bold tabular-nums ${impactText(violation.impactScore)}`}>{violation.impactScore}<span className="text-lg text-muted-foreground">/100</span></p></div><Badge variant="outline" className="text-xs tabular-nums">Влияние: {violation.impactScore}%</Badge></div>
              <ColoredProgress value={violation.impactScore} colorClass={impactBg(violation.impactScore)}/>
            </div>
          </div>
          <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>Рекомендуемые действия</p><div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40"><p className="text-xs text-emerald-900 dark:text-emerald-100">{violation.remediation}</p></div></div>
          <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><ClipboardList className="w-3 h-3"/>Документы ({violation.relatedDocs.length})</p>
            <ul className="space-y-1.5">{violation.relatedDocs.map((doc,i)=><li key={i} className="text-xs flex items-start gap-2 p-2 rounded-md bg-muted/40 border border-border/50 hover:bg-muted/70 cursor-pointer group" onClick={()=>toast.info(`Открытие: ${doc}`)}><FileText className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0 group-hover:text-foreground"/><span className="group-hover:text-foreground">{doc}</span><ChevronRight className="w-3 h-3 mt-0.5 ml-auto shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"/></li>)}</ul>
          </div>
          <Separator/>
          <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><History className="w-3 h-3"/>История статусов</p>
            <div className="relative pl-6 space-y-3 py-1">{violation.statusHistory.map((entry,i)=>(
              <div key={i} className="relative">
                <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${HIST_DOT[entry.color]} ring-2 ring-background`}/>
                {i<violation.statusHistory.length-1 && <div className="absolute -left-[19px] top-4 w-0.5 h-full bg-stone-300 dark:bg-stone-600"/>}
                <div className="flex items-center gap-2"><Badge className={`${HIST_BADGE[entry.color]} text-xs tabular-nums`}>{fmtD(entry.date)}</Badge><span className="text-xs">{entry.label}</span></div>
              </div>
            ))}</div>
          </div>
        </div>
        <SheetFooter className="border-t bg-muted/30">
          <Button className={`gap-1 ${inPetition?'bg-emerald-700 hover:bg-emerald-800':'bg-purple-700 hover:bg-purple-800'} text-white`} onClick={()=>onAddToPetition(violation.id)}>
            {inPetition ? <><CheckCircle2 className="w-4 h-4"/>В ходатайстве</> : <><ScrollText className="w-4 h-4"/>Добавить в ходатайство</>}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Component ───

export function CaseViolations() {
  const [search,setSearch]=useState('')
  const [sevF,setSevF]=useState<'all'|Severity>('all')
  const [artF,setArtF]=useState<'all'|string>('all')
  const [statF,setStatF]=useState<'all'|ViolStatus>('all')
  const [sortBy,setSortBy]=useState<SortKey>('date-desc')
  const [selV,setSelV]=useState<Violation|null>(null)
  const [sheetOpen,setSheetOpen]=useState(false)
  const [petition,setPetition]=useState<Set<string>>(()=>new Set(V.filter(v=>v.status==='excludable').map(v=>v.id)))

  const handleSelect=useCallback((v:Violation)=>{setSelV(v);setSheetOpen(true)},[])
  const handleToggle=useCallback((id:string)=>setPetition(p=>{const n=new Set(p);if(n.has(id)){n.delete(id)}else{n.add(id)}return n}),[])
  const handleAdd=useCallback((id:string)=>{const was=petition.has(id);handleToggle(id);if(was){toast.info('Удалено из ходатайства')}else{toast.success(`Добавлено в ходатайство`,{description:V.find(x=>x.id===id)?.type})}},[petition,handleToggle])
  const handleReset=useCallback(()=>{setSearch('');setSevF('all');setArtF('all');setStatF('all');setSortBy('date-desc')},[])
  const handleGenerate=useCallback(()=>toast.success('Ходатайство сформировано',{description:`Нарушений: ${petition.size}`,action:{label:'Открыть',onClick:()=>toast.info('Открытие редактора...')}}),[petition])
  const handleDownload=useCallback(()=>{
    const t=`ХОДАТАЙСТВО\nоб исключении доказательств\n\nУД № 2024-00145, ст. 159 ч.3, ст. 160 ч.2 УК РФ.\n\n${V.filter(v=>v.status==='excludable').map((v,i)=>`${i+1}. ${v.type} (${v.article})`).join('\n')}\n\nОснование: ч. 1 ст. 75 УПК РФ.\n\nЗащитник ___________________ /___________________/\nДата: «___» _______ 2024 г.`
    const blob=new Blob([t],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hodataystvo.txt';a.click();URL.revokeObjectURL(url);toast.success('Шаблон сохранён')
  },[])

  const activeCount=useMemo(()=>{let n=0;if(search.trim())n++;if(sevF!=='all')n++;if(artF!=='all')n++;if(statF!=='all')n++;if(sortBy!=='date-desc')n++;return n},[search,sevF,artF,statF,sortBy])
  const filtered=useMemo(()=>{
    const sevRank:Record<Severity,number>={critical:3,serious:2,moderate:1}
    let arr=V.filter(v=>{
      if(search.trim()){const q=search.toLowerCase();if(!(v.type.toLowerCase().includes(q)||v.description.toLowerCase().includes(q)||v.article.toLowerCase().includes(q)))return false}
      if(sevF!=='all'&&v.severity!==sevF)return false;if(artF!=='all'&&v.articleKey!==artF)return false;if(statF!=='all'&&v.status!==statF)return false;return true
    })
    arr=arr.sort((a,b)=>sortBy==='date-desc'?+new Date(b.date)-+new Date(a.date):sortBy==='date-asc'?+new Date(a.date)-+new Date(b.date):sortBy==='severity'?sevRank[b.severity]-sevRank[a.severity]:a.articleKey.localeCompare(b.articleKey))
    return arr
  },[search,sevF,artF,statF,sortBy])

  return (
    <div className="space-y-6 pb-8">
      <HeaderBanner/>
      <ChartsSection/>

      {/* Filters */}
      <Card className="rounded-xl shadow-sm"><CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]"><Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/><Input placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-8 h-9 text-sm"/>{search&&<button onClick={()=>setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-3.5 h-3.5"/></button>}</div>
          <Select value={sevF} onValueChange={v=>setSevF(v as 'all'|Severity)}><SelectTrigger className="h-9 w-full md:w-[160px] text-sm"><SelectValue placeholder="Тяжесть"/></SelectTrigger><SelectContent><SelectItem value="all">Все</SelectItem><SelectItem value="critical">Критические</SelectItem><SelectItem value="serious">Серьёзные</SelectItem><SelectItem value="moderate">Умеренные</SelectItem></SelectContent></Select>
          <Select value={artF} onValueChange={setArtF}><SelectTrigger className="h-9 w-full md:w-[150px] text-sm"><SelectValue placeholder="Статья"/></SelectTrigger><SelectContent><SelectItem value="all">Все статьи</SelectItem>{Object.keys(ART_CFG).map(k=><SelectItem key={k} value={k}>ст. {k} УПК РФ</SelectItem>)}</SelectContent></Select>
          <Select value={statF} onValueChange={v=>setStatF(v as 'all'|ViolStatus)}><SelectTrigger className="h-9 w-full md:w-[180px] text-sm"><SelectValue placeholder="Статус"/></SelectTrigger><SelectContent><SelectItem value="all">Все</SelectItem><SelectItem value="excludable">Подлежит исключению</SelectItem><SelectItem value="disputed">Оспаривается</SelectItem><SelectItem value="fixed">Исправлено</SelectItem><SelectItem value="taken-by-court">Принято судом</SelectItem></SelectContent></Select>
          <Select value={sortBy} onValueChange={v=>setSortBy(v as SortKey)}><SelectTrigger className="h-9 w-full md:w-[180px] text-sm"><SelectValue placeholder="Сортировка"/></SelectTrigger><SelectContent><SelectItem value="date-desc">По дате (новые)</SelectItem><SelectItem value="date-asc">По дате (старые)</SelectItem><SelectItem value="severity">По тяжести</SelectItem><SelectItem value="article">По статье</SelectItem></SelectContent></Select>
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={activeCount===0} className="h-9 text-sm gap-1"><RotateCcw className="w-3.5 h-3.5"/>Сбросить</Button>
        </div>
      </CardContent></Card>

      {/* Violations table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-red-700"/>Реестр нарушений <Badge variant="outline" className="text-xs tabular-nums">{filtered.length}/{V.length}</Badge></CardTitle></CardHeader>
        <CardContent className="p-0">
          {filtered.length===0 ? <div className="p-12 text-center"><AlertOctagon className="w-10 h-10 mx-auto text-muted-foreground mb-3"/><p className="text-sm font-medium text-muted-foreground">Нарушения не найдены</p><p className="text-xs text-muted-foreground mt-1">Измените параметры фильтрации</p></div> : (
            <div className="overflow-x-auto"><Table>
              <TableHeader className="sticky top-0 bg-card z-10"><TableRow className="hover:bg-transparent">
                <TableHead className="w-[44px] text-center">№</TableHead>
                <TableHead className="min-w-[100px]">Дата</TableHead>
                <TableHead className="min-w-[110px]">Статья</TableHead>
                <TableHead className="min-w-[180px]">Тип</TableHead>
                <TableHead className="min-w-[260px]">Описание</TableHead>
                <TableHead className="min-w-[110px]">Тяжесть</TableHead>
                <TableHead className="min-w-[150px]">Статус</TableHead>
                <TableHead className="min-w-[120px] text-right">Действия</TableHead>
              </TableRow></TableHeader>
              <TableBody>{filtered.map((v,idx)=>{
                const sv=SEV_CFG[v.severity], SvIcon=sv.icon, stc=STAT_CFG[v.status], StIcon=stc.icon, ac=ART_CFG[v.articleKey]??{bg:'bg-stone-600',text:'text-white',hex:'#57534e'}, inP=petition.has(v.id)
                return (
                  <TableRow key={v.id} className={`cursor-pointer transition-colors ${idx%2===1?'bg-muted/30':''} hover:bg-red-50/50 dark:hover:bg-red-950/20`} onClick={()=>handleSelect(v)}>
                    <TableCell className="font-mono text-xs text-muted-foreground text-center">{v.id.replace('v','')}</TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">{fmtD(v.date)}</TableCell>
                    <TableCell><Badge className={`${ac.bg} ${ac.text} text-xs font-mono gap-1`}><Scale className="w-3 h-3"/>{v.articleKey}</Badge></TableCell>
                    <TableCell className="text-xs font-medium"><div className="line-clamp-1 max-w-[220px]">{v.type}</div></TableCell>
                    <TableCell className="text-xs"><TooltipProvider><Tooltip><TooltipTrigger asChild><div className="line-clamp-1 max-w-[300px] text-muted-foreground cursor-help">{v.description}</div></TooltipTrigger><TooltipContent side="top" className="max-w-[400px] whitespace-normal"><p className="text-xs leading-relaxed">{v.description}</p></TooltipContent></Tooltip></TooltipProvider></TableCell>
                    <TableCell><Badge className={`${sv.badge} text-xs`}><SvIcon className="w-3 h-3"/>{sv.label}</Badge></TableCell>
                    <TableCell><Badge className={`${stc.badge} text-xs`}><StIcon className="w-3 h-3"/>{stc.label}</Badge></TableCell>
                    <TableCell className="text-right" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-end gap-1">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>handleSelect(v)}><Eye className="w-3.5 h-3.5"/></Button></TooltipTrigger><TooltipContent>Подробнее</TooltipContent></Tooltip></TooltipProvider>
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${inP?'text-purple-700 dark:text-purple-400':''}`} onClick={()=>handleToggle(v.id)}>{inP ? <CheckCircle2 className="w-3.5 h-3.5"/> : <ChevronRight className="w-3.5 h-3.5"/>}</Button></TooltipTrigger><TooltipContent>{inP?'В ходатайстве':'Добавить'}</TooltipContent></Tooltip></TooltipProvider>
                    </div></TableCell>
                  </TableRow>
                )
              })}</TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>

      {/* Petition builder */}
      <Card className="rounded-xl shadow-sm border-l-4 border-l-red-700 bg-gradient-to-r from-red-950/15 via-purple-950/10 to-card">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0"><CardTitle className="text-sm flex items-center gap-2"><ScrollText className="w-4 h-4 text-red-700"/>Конструктор ходатайства об исключении доказательств</CardTitle><p className="text-xs text-muted-foreground mt-1">Выбранные нарушения будут включены в ходатайство</p></div>
            <Badge className="bg-red-700 text-white gap-1 tabular-nums shrink-0"><Ban className="w-3 h-3"/>{petition.size||V.filter(v=>v.status==='excludable').length} подлежит исключению</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className={GRID2}>
            <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><ListChecks className="w-3 h-3"/>Нарушения для исключения</p>
              <div className="rounded-lg border bg-muted/30 p-2 max-h-44 overflow-y-auto"><ul className="space-y-1.5">
                {(petition.size>0?V.filter(v=>petition.has(v.id)):V.filter(v=>v.status==='excludable')).slice(0,5).map(v=>{const ac2=ART_CFG[v.articleKey]??{bg:'bg-stone-600',text:'text-white'};return<li key={v.id} className="text-xs flex items-start gap-2"><Badge className={`${ac2.bg} ${ac2.text} text-[10px] font-mono px-1.5 py-0 h-4 shrink-0`}>{v.articleKey}</Badge><span className="line-clamp-1">{v.type}</span></li>})}
              </ul></div>
            </div>
            <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3"/>Прогноз исключения</p>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">В ходатайстве:</span><span className="font-bold tabular-nums">{petition.size||V.filter(v=>v.status==='excludable').length}</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Ключевых:</span><span className="font-bold text-red-700 tabular-nums">{V.filter(v=>petition.has(v.id)&&v.impactScore>=75).length}</span></div>
                <Separator/>
                <p className="text-[11px] text-red-700 dark:text-red-400"><AlertTriangle className="w-3 h-3 inline mr-1"/>Потенциальное исключение ключевых доказательств обвинения</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex gap-2"><Button size="sm" className="bg-red-700 hover:bg-red-800 text-white gap-1" onClick={handleGenerate}><ScrollText className="w-4 h-4"/>Сформировать ходатайство</Button><Button size="sm" variant="outline" className="gap-1" onClick={handleDownload}><FileText className="w-4 h-4"/>Скачать шаблон</Button></div>
            {petition.size>0&&<Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={()=>{setPetition(new Set());toast.info('Выбор очищен')}}><X className="w-3.5 h-3.5"/>Очистить ({petition.size})</Button>}
          </div>
        </CardContent>
      </Card>

      <DetailSheet violation={selV} open={sheetOpen} onOpenChange={setSheetOpen} onAddToPetition={handleAdd} inPetition={selV?petition.has(selV.id):false}/>
    </div>
  )
}
