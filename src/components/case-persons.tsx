'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Pie, PieChart } from 'recharts'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Users, Shield, Star, ChevronDown, ChevronUp, AlertTriangle, Gavel, Download, FileText, Link2, MessageSquare, Target, ArrowRight, MapPin, Cake, CheckCircle, XCircle, GitCompare, Plus, X, RefreshCw, Share2, Network, Minus, RotateCcw, ZoomIn, ZoomOut, Eye, Heart, Search } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { mockPersons, mockPersonRelationships, mockWitnessStatements, mockGuiltAssessments, mockDefenseLines, mockEpisodes } from '@/lib/mock-data'
import { getPersons, getPersonRelationships, getWitnessStatements } from '@/lib/case-api'
import type { PersonData, PersonRelationship, WitnessStatementData } from '@/lib/case-store'
import { toast } from 'sonner'
import { sevBadge, GRID2, GRID3, GRID4, PALETTE } from '@/lib/shared-ui'

// ─── Compact Color/Label Maps ───

const GUILT: Record<string, { badge: string; color: string; pct: number; label: string }> = {
  high: { badge: 'bg-red-700 text-white', color: '#dc2626', pct: 85, label: 'Высокая' },
  moderate: { badge: 'bg-orange-600 text-white', color: '#ea580c', pct: 55, label: 'Средняя' },
  low: { badge: 'bg-amber-600 text-white', color: '#ca8a04', pct: 25, label: 'Низкая' },
  none: { badge: 'bg-stone-500 text-white', color: '#78716c', pct: 0, label: 'Нет' },
}

const ROLE: Record<string, { badge: string; label: string; icon: React.ElementType; color: string }> = {
  обвиняемый: { badge: 'bg-red-700 text-white', label: 'Обвиняемый', icon: Gavel, color: '#b91c1c' },
  соучастник: { badge: 'bg-orange-600 text-white', label: 'Соучастник', icon: Users, color: '#ea580c' },
  свидетель: { badge: 'bg-amber-600 text-white', label: 'Свидетель', icon: Eye, color: '#57534e' },
  потерпевшая: { badge: 'bg-emerald-700 text-white', label: 'Потерпевшая', icon: Heart, color: '#047857' },
  потерпевший: { badge: 'bg-emerald-700 text-white', label: 'Потерпевший', icon: Heart, color: '#047857' },
  следователь: { badge: 'bg-stone-600 text-white', label: 'Следователь', icon: Shield, color: '#78716c' },
}

const REL_TYPE: Record<string, string> = { 'соучастники':'bg-orange-600 text-white','обвиняемый-потерпевшая':'bg-red-700 text-white','обвиняемый-свидетель':'bg-amber-600 text-white','соучастник-потерпевшая':'bg-orange-500 text-white','организатор-соучастник':'bg-red-600 text-white' }
const STMT_T: Record<string, string> = { initial:'bg-emerald-700 text-white','follow-up':'bg-amber-600 text-white',clarification:'bg-stone-600 text-white',contradiction:'bg-red-700 text-white' }
const STMT_L: Record<string, string> = { initial:'Первичные','follow-up':'Доп.',clarification:'Уточнение',contradiction:'Противоречие' }
const REL_L: Record<string, string> = { high:'Высокая',moderate:'Средняя',low:'Низкая' }
const REL_B: Record<string, string> = { high:'bg-emerald-700 text-white',moderate:'bg-amber-600 text-white',low:'bg-red-700 text-white' }

const RADAR_DIMS = ['Доказательства','Процес.','Защита','Свидетели','Соотв.']
const RADAR_V: Record<string, number[]> = { high:[80,30,40,50,60], moderate:[60,50,60,60,70], low:[40,70,70,70,80], none:[20,90,90,80,90] }

// Graph role type & data
type GRole = 'обвиняемый'|'соучастник'|'свидетель'|'потерпевшая'|'следователь'
interface GNode { id:string; name:string; role:GRole; status:string; occupation:string; desc:string; isKol?:boolean }
interface GEdge { source:string; target:string; label:string }

const G_NODES: GNode[] = [
  { id:'kolesnichenko', name:'Колесниченко Д.А.', role:'обвиняемый', status:'задержанный', occupation:'Бывший директор ООО "ТехноПром"', desc:'Главный обвиняемый', isKol:true },
  { id:'sidorov', name:'Сидоров А.П.', role:'соучастник', status:'под подпиской', occupation:'Бухгалтер ООО', desc:'Соучастник, финансовое оформление' },
  { id:'petrov', name:'Петров И.С.', role:'свидетель', status:'допрошен', occupation:'Бывший менеджер', desc:'Свидетель обвинения' },
  { id:'kozlova', name:'Козлова Е.М.', role:'свидетель', status:'допрошена', occupation:'Коллега', desc:'Свидетель защиты, алиби' },
  { id:'morozova', name:'Морозова А.В.', role:'потерпевшая', status:'признана', occupation:'Представитель ООО', desc:'Представитель потерпевшей организации' },
]
const G_EDGES: GEdge[] = [
  { source:'kolesnichenko', target:'sidorov', label:'соучастники' },
  { source:'kolesnichenko', target:'petrov', label:'давал показания' },
  { source:'kolesnichenko', target:'kozlova', label:'алиби-свидетель' },
  { source:'kolesnichenko', target:'morozova', label:'потерпевшая сторона' },
  { source:'kozlova', target:'petrov', label:'коллеги' },
  { source:'morozova', target:'sidorov', label:'финансовая связь' },
]

const REL_EDGE: Record<string,string> = { 'соучастники':'#ea580c','обвиняемый-потерпевшая':'#dc2626','обвиняемый-свидетель':'#dc2626','соучастник-потерпевшая':'#dc2626','организатор-соучастник':'#ea580c','алиби-свидетель':'#ca8a04','давал показания':'#dc2626','потерпевшая сторона':'#dc2626','коллеги':'#047857','финансовая связь':'#78716c' }
const REL_CAT: Record<string,'conflict'|'cooperation'|'family'|'professional'> = { 'соучастники':'cooperation','обвиняемый-потерпевшая':'conflict','обвиняемый-свидетель':'conflict','соучастник-потерпевшая':'conflict','организатор-соучастник':'cooperation','алиби-свидетель':'cooperation','давал показания':'conflict','потерпевшая сторона':'conflict','коллеги':'professional','финансовая связь':'professional' }
const REL_CAT_COLOR: Record<string,{color:string;label:string}> = { conflict:{color:'#dc2626',label:'Конфликт'}, cooperation:{color:'#ea580c',label:'Сотрудничество'}, family:{color:'#047857',label:'Родство'}, professional:{color:'#78716c',label:'Профессиональная'} }

const ROLE_CONFLICT: Record<string,Record<string,string>> = {
  обвиняемый:{ свидетель:'Свидетель против обвиняемого', потерпевшая:'Потерпевшая против обвиняемого', соучастник:'Соучастник может свидетельствовать' },
  соучастник:{ обвиняемый:'Конфликт интересов', потерпевшая:'Соучастник против потерпевшей', свидетель:'Показания против соучастника' },
  свидетель:{ обвиняемый:'Свидетельские показания против', соучастник:'Показания о соучастии' },
  потерпевшая:{ обвиняемый:'Прямой конфликт интересов', соучастник:'Соучастник в преступлении' },
  следователь:{ обвиняемый:'Процессуальный конфликт' },
}

const guiltChartCfg = Object.fromEntries(Object.entries(GUILT).map(([k,v]) => [v.label, { label: v.label, color: v.color }]))

const fmtDate = (iso: string) => { try { return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(iso)) } catch { return iso } }

function exportCSV(persons: PersonData[]) {
  const rows = ['Name,Role,Status,GuiltLevel,Occupation']
  persons.forEach(p => rows.push(`"${p.fullName}",${p.role??''},${p.status??''},${p.guiltLevel??'none'},${p.occupation??''}`))
  const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download='persons.csv'; a.click(); URL.revokeObjectURL(url)
  toast.success('CSV экспорт выполнен')
}

// ─── GuiltRadarChart ───

function GuiltRadarChart({ guiltLevel }: { guiltLevel: string }) {
  const values = RADAR_V[guiltLevel] ?? RADAR_V.none, color = GUILT[guiltLevel]?.color ?? '#78716c'
  const data = RADAR_DIMS.map((d,i) => ({ dimension:d, value:values[i] }))
  return (
    <ChartContainer config={{ value:{label:'Уровень',color} }} className="h-[200px] w-full">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#e7e5e4" />
        <PolarAngleAxis dataKey="dimension" tick={{fontSize:11,fill:'#57534e'}} />
        <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fontSize:9}} />
        <Radar name="Виновность" dataKey="value" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />
        <ChartTooltip content={<ChartTooltipContent />} />
      </RadarChart>
    </ChartContainer>
  )
}

// ─── PersonSummaryStats ───

function PersonSummaryStats({ persons }: { persons: PersonData[] }) {
  const stats = useMemo(() => {
    const total = persons.length
    const byRole: Record<string,number> = {}
    persons.forEach(p => { const r = p.role ?? 'не указана'; byRole[r] = (byRole[r]??0)+1 })
    const avgGuilt = total > 0 ? Math.round(persons.reduce((s,p) => s+GUILT[p.guiltLevel??'none'].pct,0)/total) : 0
    const defCov = total > 0 ? Math.round(persons.filter(p=>p.defenseStrategy).length/total*100) : 0
    return { total, byRole, avgGuilt, defCov }
  }, [persons])
  const pieData = Object.entries(stats.byRole).map(([role,count]) => ({ role:ROLE[role]?.label??role, count, color:ROLE[role]?.color??'#a8a29e' }))
  const pieCfg = Object.fromEntries(pieData.map(d => [d.role,{label:d.role,color:d.color}]))

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-amber-600">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-600/20"><Network className="w-4 h-4 text-amber-600" /></div>
          <p className="font-semibold text-sm">Сводка по участникам</p>
        </div>
        <div className={GRID4}>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/30 border"><Users className="w-5 h-5 text-amber-600 mb-1" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Участников</p></div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30 border">
            <ChartContainer config={pieCfg} className="h-[80px] w-[100px]">
              <PieChart><Pie data={pieData} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={35} innerRadius={18}>{pieData.map((d,i) => <Cell key={i} fill={d.color} />)}</Pie></PieChart>
            </ChartContainer><p className="text-xs text-muted-foreground mt-1">По ролям</p>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/30 border"><AlertTriangle className="w-5 h-5 text-red-600 mb-1" /><p className="text-2xl font-bold">{stats.avgGuilt}%</p><p className="text-xs text-muted-foreground">Средняя вина</p></div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/30 border"><Shield className="w-5 h-5 text-emerald-600 mb-1" /><p className="text-2xl font-bold">{stats.defCov}%</p><p className="text-xs text-muted-foreground">Защита覆盖</p></div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── WitnessStatements ───

function WitnessStatementsSection({ statements }: { statements: WitnessStatementData[] }) {
  if (!statements.length) return null
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-600" /> Показания свидетелей <Badge className="bg-stone-600 text-white">{statements.length}</Badge></CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto scrollbar-thin">
          {statements.map(s => (
            <Card key={s.id} className="rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium truncate">{s.witnessName}</p><Badge className={STMT_T[s.statementType]??'bg-stone-500 text-white'}>{STMT_L[s.statementType]??s.statementType}</Badge></div>
                <p className="text-xs text-muted-foreground">{fmtDate(s.statementDate)}</p>
                <p className="text-xs leading-relaxed">{s.summary}</p>
                {s.keyPoints.length > 0 && <div className="space-y-0.5">{s.keyPoints.map((kp,i) => <p key={i} className="text-xs flex items-start gap-1"><span className="text-amber-600 font-bold">•</span><span>{kp}</span></p>)}</div>}
                <div className="flex items-center gap-2 pt-1"><span className="text-xs text-muted-foreground">Надёжность:</span><Badge className={REL_B[s.reliability]??'bg-stone-500 text-white'}>{REL_L[s.reliability]??s.reliability}</Badge></div>
                {s.contradictions.length > 0 && <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"><p className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Противоречия:</p>{s.contradictions.map((c,i) => <p key={i} className="text-xs text-red-700 dark:text-red-400 mt-0.5">{c.description}</p>)}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── RelationshipMap ───

function RelationshipMap({ relationships, persons }: { relationships: PersonRelationship[]; persons: PersonData[] }) {
  const personRels = useMemo(() => { const m: Record<string,PersonRelationship[]> = {}; relationships.forEach(r => { if(!m[r.sourcePersonId]) m[r.sourcePersonId]=[]; m[r.sourcePersonId].push(r) }); return m }, [relationships])
  const relCount = useMemo(() => { const c: Record<string,number> = {}; relationships.forEach(r => { c[r.sourcePersonId]=(c[r.sourcePersonId]??0)+1; c[r.targetPersonId]=(c[r.targetPersonId]??0)+1 }); return c }, [relationships])

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-amber-600" /> Связи между участниками <Badge variant="outline" className="text-xs">{relationships.length} связей</Badge></CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
          {persons.map(person => {
            const rels = personRels[person.id]??[], count = relCount[person.id]??0
            const heat = count>=3?'border-l-red-700 bg-red-50/40 dark:bg-red-950/20':count===2?'border-l-amber-600 bg-amber-50/40 dark:bg-amber-950/20':count===1?'border-l-stone-400 bg-stone-50/40 dark:bg-stone-900/20':'border-l-transparent'
            return (
              <Card key={person.id} className={`rounded-xl border border-l-4 ${heat} shadow-sm hover:shadow-md transition-all`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1"><Users className="w-4 h-4 text-muted-foreground shrink-0" /><p className="font-medium text-sm truncate">{person.shortName??person.fullName}</p></div>
                    <Badge className={`${ROLE[person.role??'']?.badge??'bg-stone-500 text-white'} text-xs shrink-0`}>{ROLE[person.role??'']?.label??person.role}</Badge>
                  </div>
                  {rels.length > 0 ? <div className="space-y-1.5">{rels.map(rel => {
                    const ec = REL_EDGE[rel.relationshipType]??'#78716c', cat = REL_CAT[rel.relationshipType]??'professional'
                    return (
                      <TooltipProvider key={rel.id}><Tooltip><TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-md px-2 py-1.5 cursor-help">
                          <ArrowRight className="w-3 h-3 shrink-0" style={{color:ec}} /><span className="font-medium truncate flex-1 min-w-0">{rel.targetPersonName}</span>
                          <Badge className={`${REL_TYPE[rel.relationshipType]??'bg-stone-500 text-white'} text-[10px] shrink-0`}>{rel.relationshipType}</Badge>
                        </div>
                      </TooltipTrigger><TooltipContent className="max-w-[250px]"><p className="font-medium">{rel.sourcePersonName} → {rel.targetPersonName}</p><p className="text-xs">{rel.description}</p><p className="text-xs mt-1">Тип: {REL_CAT_COLOR[cat]?.label??cat}</p></TooltipContent></Tooltip></TooltipProvider>
                    )
                  })}</div> : <p className="text-xs text-muted-foreground italic">Нет исходящих связей</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 mt-3 rounded-lg bg-muted/30 border">
          <span className="text-xs font-semibold text-muted-foreground">Типы связей:</span>
          {Object.entries(REL_CAT_COLOR).map(([cat,cfg]) => <div key={cat} className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor:cfg.color}} /><span className="text-xs">{cfg.label}</span></div>)}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── PersonRelationshipGraph (SVG) ───

const GW=600, GH=500, GCX=GW/2, GCY=GH/2, GR=175

function PersonRelationshipGraph() {
  const [hovNode, setHovNode] = useState<string|null>(null)
  const [selNode, setSelNode] = useState<string|null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [hovEdge, setHovEdge] = useState<number|null>(null)
  const [vb, setVb] = useState({x:0,y:0,w:GW,h:GH})
  const DVB = {x:0,y:0,w:GW,h:GH}

  const positions = useMemo(() => {
    const pos: Record<string,{x:number;y:number}> = {}
    const outer = G_NODES.filter(n=>!n.isKol)
    G_NODES.forEach(n => {
      if(n.isKol) pos[n.id]={x:GCX,y:GCY}
      else { const i=outer.findIndex(o=>o.id===n.id), a=(-90+i*(360/outer.length))*Math.PI/180; pos[n.id]={x:GCX+GR*Math.cos(a),y:GCY+GR*Math.sin(a)} }
    })
    return pos
  },[])

  const hovConn = useMemo(() => {
    if(!hovNode) return null; const ids=new Set<string>(); G_EDGES.forEach(e=>{if(e.source===hovNode)ids.add(e.target);if(e.target===hovNode)ids.add(e.source)}); return ids
  },[hovNode])

  const isDim = (id:string) => hovNode ? id!==hovNode && !hovConn?.has(id) : false
  const zoomIn = () => setVb(v => {const nw=Math.max(200,v.w/1.25),nh=Math.max(200*(GH/GW),v.h/1.25);return{x:v.x+(v.w-nw)/2,y:v.y+(v.h-nh)/2,w:nw,h:nh}})
  const zoomOut = () => setVb(v => {const nw=Math.min(1500,v.w*1.25),nh=Math.min(1500*(GH/GW),v.h*1.25);return{x:v.x-(nw-v.w)/2,y:v.y-(nh-v.h)/2,w:nw,h:nh}})
  const resetZoom = () => setVb(DVB)

  const selected = selNode ? G_NODES.find(n=>n.id===selNode) ?? null : null

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-amber-600">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2"><Share2 className="w-4 h-4 text-amber-600" />Граф связей <Badge variant="outline" className="text-xs">{G_NODES.length} узлов · {G_EDGES.length} связей</Badge></CardTitle>
          <Button size="sm" variant="ghost" className="h-7 rounded-lg gap-1" onClick={()=>setCollapsed(c=>!c)}>{collapsed?<ChevronDown className="w-4 h-4"/>:<ChevronUp className="w-4 h-4"/>}{collapsed?'Развернуть':'Свернуть'}</Button>
        </div>
      </CardHeader>
      {!collapsed && <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-1 flex-wrap">
          <TooltipProvider>
            <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg" onClick={zoomIn}><ZoomIn className="w-3.5 h-3.5"/></Button></TooltipTrigger><TooltipContent>Увеличить</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg" onClick={zoomOut}><ZoomOut className="w-3.5 h-3.5"/></Button></TooltipTrigger><TooltipContent>Уменьшить</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" className="h-7 px-2 rounded-lg gap-1" onClick={resetZoom}><RotateCcw className="w-3.5 h-3.5"/>Сброс</Button></TooltipTrigger><TooltipContent>Сбросить масштаб</TooltipContent></Tooltip>
          </TooltipProvider>
          <Separator orientation="vertical" className="h-5 mx-2"/>
          <span className="text-xs text-muted-foreground">Наведите для подсветки, нажмите для деталей</span>
        </div>
        <div className="relative w-full max-w-2xl mx-auto rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border overflow-hidden">
          <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" className="w-full block" style={{height:'420px'}}>
            <defs>
              <marker id="arr-d" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#a8a29e"/></marker>
              <marker id="arr-a" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#ea580c"/></marker>
              {Object.entries(REL_EDGE).map(([t,c]) => <marker key={t} id={`arr-${t}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill={c}/></marker>)}
            </defs>
            {G_EDGES.map((e,i) => {
              const src=positions[e.source], tgt=positions[e.target]; if(!src||!tgt) return null
              const hl = hovNode && (e.source===hovNode||e.target===hovNode), dm = hovNode && !hl
              const dx=tgt.x-src.x, dy=tgt.y-src.y, d=Math.max(1,Math.sqrt(dx*dx+dy*dy))
              const sR=G_NODES.find(n=>n.id===e.source)?.isKol?30:24, tR=G_NODES.find(n=>n.id===e.target)?.isKol?30:24
              const x1=src.x+(dx/d)*sR, y1=src.y+(dy/d)*sR, x2=tgt.x-(dx/d)*(tR+6), y2=tgt.y-(dy/d)*(tR+6)
              const mx=(x1+x2)/2, my=(y1+y2)/2
              const ec=hl?'#ea580c':REL_EDGE[e.label]??'#a8a29e', mid=`arr-${e.label}`??'arr-d'
              const lw=Math.max(80,e.label.length*6+18), lh=20
              return (
                <g key={`e${i}`} style={{opacity:dm?0.2:1,transition:'opacity 200ms'}} onMouseEnter={()=>setHovEdge(i)} onMouseLeave={()=>setHovEdge(null)}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ec} strokeWidth={hl||hovEdge===i?2.5:1.5} markerEnd={`url(#${mid})`}/>
                  <rect x={mx-lw/2} y={my-lh/2} width={lw} height={lh} rx={4} fill={hl?'#fef3c7':'#fafaf9'} stroke={ec} strokeWidth={0.5}/>
                  <text x={mx} y={my+4} fontSize={9} fill={ec} textAnchor="middle" fontWeight={600}>{e.label}</text>
                </g>
              )
            })}
            {G_NODES.map(n => {
              const pos=positions[n.id], dim=isDim(n.id), sel=selNode===n.id, hov=hovNode===n.id
              const rc=ROLE[n.role]?.color??'#78716c', rl=ROLE[n.role]?.label??n.role
              const r=n.isKol?30:24
              return (
                <g key={n.id} style={{opacity:dim?0.3:1,transition:'opacity 200ms'}} onMouseEnter={()=>setHovNode(n.id)} onMouseLeave={()=>setHovNode(null)} onClick={()=>setSelNode(sel?null:n.id)} className="cursor-pointer">
                  <circle cx={pos.x} cy={pos.y} r={r+4} fill={sel?'#fef3c7':hov?'#f5f5f4':'transparent'} opacity={0.5}/>
                  <circle cx={pos.x} cy={pos.y} r={r} fill={rc} stroke={sel?'#ea580c':'#ffffff'} strokeWidth={sel?3:2}/>
                  <text x={pos.x} y={pos.y-r-8} fontSize={10} fontWeight={700} fill="#1c1917" textAnchor="middle">{n.name.split(' ')[0]}</text>
                  <text x={pos.x} y={pos.y+r+14} fontSize={9} fill="#57534e" textAnchor="middle">{rl}</text>
                  {n.isKol && <circle cx={pos.x} cy={pos.y} r={r+8} fill="none" stroke="#ca8a04" strokeWidth={1.5} strokeDasharray="3 3"/>}
                </g>
              )
            })}
          </svg>
        </div>
        {/* Selected node details */}
        {selected && <Card className="rounded-xl border-l-4 border-amber-600"><CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2"><span className="w-3 h-3 rounded-full" style={{backgroundColor:ROLE[selected.role]?.color}}/><p className="text-sm font-semibold">{selected.name}</p><Badge className={ROLE[selected.role]?.badge??'bg-stone-500 text-white'}>{ROLE[selected.role]?.label??selected.role}</Badge></div>
          <p className="text-xs text-muted-foreground">{selected.desc}</p>
          <p className="text-xs text-muted-foreground mt-1">Статус: {selected.status} · {selected.occupation}</p>
        </CardContent></Card>}
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-lg bg-muted/30 border">
          <span className="text-xs font-semibold text-muted-foreground">Роли:</span>
          {Object.entries(ROLE).map(([r,c]) => <span key={r} className="flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor:c.color}}/>{c.label}</span>)}
          <Separator orientation="vertical" className="h-4 mx-2"/>
          <span className="text-xs font-semibold text-muted-foreground">Связи:</span>
          {Object.entries(REL_CAT_COLOR).map(([c,cfg]) => <span key={c} className="flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor:cfg.color}}/>{cfg.label}</span>)}
        </div>
      </CardContent>}
    </Card>
  )
}

// ─── Main Component ───

export function CasePersons() {
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])

  const { data: persons = [], isLoading } = useQuery({ queryKey: ['persons'], queryFn: getPersons })
  const { data: relationships = [] } = useQuery({ queryKey: ['personRelationships'], queryFn: getPersonRelationships })
  const { data: statements = [] } = useQuery({ queryKey: ['witnessStatements'], queryFn: getWitnessStatements })

  const filtered = useMemo(() => {
    let result = persons
    if (roleFilter !== 'all') result = result.filter(p => p.role === roleFilter)
    if (selectedRoles.length > 0) result = result.filter(p => selectedRoles.includes(p.role ?? ''))
    if (searchQuery) result = result.filter(p => p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || (p.occupation?.toLowerCase().includes(searchQuery.toLowerCase())))
    return result
  }, [persons, roleFilter, selectedRoles, searchQuery])

  const kolesnichenko = persons.find(p => p.isKolesnichenko)

  if (isLoading) return <div className={GRID3}>{[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>

  const roles = ['all','обвиняемый','соучастник','свидетель','потерпевшая','следователь']

  return (
    <div className="space-y-6 pb-8">
      <PersonSummaryStats persons={persons} />

      {/* Filter bar */}
      <Card className="rounded-xl shadow-sm"><CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]"><Search className="w-4 h-4 text-muted-foreground" /><Input placeholder="Поиск участников..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="h-8" /></div>
          <div className="flex flex-wrap items-center gap-2">
            {roles.map(r => <button key={r} onClick={()=>{setRoleFilter(r);setSelectedRoles(r==='all'?[]:[r])}} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${roleFilter===r?'bg-red-700 text-white':'bg-muted/60 text-stone-700 dark:text-stone-300 hover:bg-muted'}`}>{r==='all'?'Все':(ROLE[r]?.label??r)}</button>)}
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={()=>exportCSV(filtered)}><Download className="w-3.5 h-3.5"/>CSV</Button>
        </div>
      </CardContent></Card>

      <RelationshipMap relationships={relationships} persons={persons} />
      <PersonRelationshipGraph />

      {/* Person cards */}
      <div className={GRID2}>
        {filtered.filter(p=>!p.isKolesnichenko||roleFilter!=='all'||selectedRoles.length>0).map(person => {
          const rCfg=ROLE[person.role??''], gCfg=GUILT[person.guiltLevel??'none'], isExp=expandedId===person.id
          return (
            <Card key={person.id} className={`rounded-xl shadow-sm hover:shadow-md transition-all ${person.isKolesnichenko?'border-2 border-amber-500':''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${person.role==='обвиняемый'?'bg-red-700/20 border border-red-700/30':person.role==='соучастник'?'bg-orange-600/20 border border-orange-600/30':'bg-muted/50'}`}>
                    {(rCfg?.icon??Users)({className:"w-4 h-4",style:{color:rCfg?.color??'#78716c'}})}
                  </div>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{person.fullName}</p></div>
                  {person.isKolesnichenko && <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 shrink-0"><Star className="w-3 h-3 text-amber-500 fill-amber-500"/><span className="text-[9px] font-bold text-amber-600">Главный</span></div>}
                </div>
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <Badge className={`${rCfg?.badge??'bg-stone-500 text-white'} text-xs flex items-center gap-1`}>{rCfg?.label??person.role}</Badge>
                  <Badge className={`${gCfg.badge} text-xs`}>{gCfg.label}</Badge>
                  <Badge variant="outline" className="text-xs">{person.status??'—'}</Badge>
                </div>
                {person.guiltLevel && person.guiltLevel !== 'none' && (
                  <div className="mt-2 flex items-center gap-2"><span className="text-xs text-muted-foreground shrink-0">Виновность:</span><Progress value={gCfg.pct} className="h-2 flex-1"/><span className="text-xs font-bold" style={{color:gCfg.color}}>{gCfg.pct}%</span></div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {person.birthDate && <div className="p-1.5 rounded-md bg-muted/30 flex items-center gap-1"><Cake className="w-3 h-3 text-muted-foreground shrink-0"/><span className="text-[10px] font-medium truncate">{fmtDate(person.birthDate)}</span></div>}
                  {person.occupation && <div className="p-1.5 rounded-md bg-muted/30 flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground shrink-0"/><span className="text-[10px] font-medium truncate">{person.occupation}</span></div>}
                  {person.alias && <div className="p-1.5 rounded-md bg-muted/30 flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground shrink-0"/><span className="text-[10px] font-medium truncate">{person.alias}</span></div>}
                </div>
                {person.defenseStrategy && (
                  <Accordion type="single" collapsible className="mt-2"><AccordionItem value="d" className="border-none"><AccordionTrigger className="text-xs py-2 hover:no-underline flex items-center gap-1"><Shield className="w-3 h-3 text-amber-600"/>Стратегия защиты</AccordionTrigger><AccordionContent className="text-xs pb-2"><div className="p-2 rounded-lg bg-muted">{person.defenseStrategy}</div></AccordionContent></AccordionItem></Accordion>
                )}
                <Separator className="mt-3"/>
                <Button size="sm" variant="ghost" className="mt-2 w-full rounded-lg" onClick={()=>setExpandedId(isExp?null:person.id)}>
                  {isExp ? <ChevronUp className="w-3 h-3 mr-1"/> : <ChevronDown className="w-3 h-3 mr-1"/>}
                  {isExp ? 'Свернуть' : 'Подробнее'}
                </Button>
                {isExp && <div className="mt-2 space-y-2 text-xs">
                  {person.description && <p>{person.description}</p>}
                  {person.guiltAssessments?.[0] && <div className="p-2 rounded-lg bg-muted"><p className="font-medium flex items-center gap-1"><Gavel className="w-3 h-3"/>Оценка виновности:</p><p>Доказательства: {person.guiltAssessments[0].evidenceStrength}</p>{person.guiltAssessments[0].forecast && <p>Прогноз: {person.guiltAssessments[0].forecast}</p>}</div>}
                  <div className="p-2 rounded-lg bg-muted/50"><p className="font-medium flex items-center gap-1 mb-1"><Target className="w-3 h-3"/>Радар виновности:</p><GuiltRadarChart guiltLevel={person.guiltLevel??'none'}/></div>
                </div>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length===0 && persons.length>0 && (
        <Card className="rounded-xl shadow-sm border-t-2 border-t-emerald-500"><CardContent className="p-8 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mx-auto mb-4 ring-4 ring-emerald-500/5"><Users className="w-10 h-10 text-emerald-600"/></div>
          <p className="text-base font-semibold">Участники не найдены</p>
          <p className="text-sm text-muted-foreground mt-1">Измените фильтр для просмотра всех участников.</p>
          <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={()=>{setRoleFilter('all');setSelectedRoles([]);setSearchQuery('')}}><RefreshCw className="w-3 h-3 mr-1"/>Сбросить фильтр</Button>
        </CardContent></Card>
      )}

      <WitnessStatementsSection statements={statements} />

      {/* Alibi Verification */}
      {kolesnichenko && (
        <Card className="rounded-xl shadow-sm border-l-4 border-amber-600">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-amber-600"/>Проверка алиби <Badge variant="outline" className="text-xs">Колесниченко Д.А.</Badge></CardTitle></CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Заявленное алиби</p>
                <p className="text-xs text-muted-foreground">Командировка в г. Санкт-Петербург, 10-14.03.2024</p>
                <Badge className="bg-emerald-700 text-white text-xs mt-2">Подтверждено документами</Badge>
              </div>
              <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Опровержение</p>
                <p className="text-xs text-muted-foreground">Сидорова видела обвиняемого 12.03.2024 в Москве</p>
                <Badge className="bg-red-700 text-white text-xs mt-2">Противоречие</Badge>
              </div>
            </div>
            <Separator/>
            <div>
              <p className="text-xs font-semibold mb-2">Статус проверки:</p>
              <div className="space-y-1.5">
                {[{src:'Билеты на поезд',st:'verified',n:'Куплены, но не использованы'},{src:'Свидетель Сидорова',st:'contradicts',n:'Видела в Москве 12.03'},{src:'Отель "Невский"',st:'unverified',n:'Бронь была, заселение не подтверждено'},{src:'GPS-трекинг',st:'verified',n:'Находился в СПб 10-11.03'}].map((v,i)=>(
                  <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-muted/30">
                    {v.st==='verified'&&<CheckCircle className="w-3 h-3 text-emerald-600 shrink-0"/>}{v.st==='contradicts'&&<XCircle className="w-3 h-3 text-red-600 shrink-0"/>}{v.st==='unverified'&&<AlertTriangle className="w-3 h-3 text-amber-600 shrink-0"/>}
                    <span className="font-medium flex-1 min-w-0 truncate">{v.src}</span><span className="text-muted-foreground truncate">{v.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator/>
      <p className="text-xs text-muted-foreground">Показано {filtered.length} из {persons.length} участников</p>

      <ComparisonView persons={persons} compareIds={compareIds} setCompareIds={setCompareIds} />
    </div>
  )
}

// ─── ComparisonView ───

function ComparisonView({ persons, compareIds, setCompareIds }: { persons: PersonData[]; compareIds: string[]; setCompareIds: (ids:string[])=>void }) {
  const selected = compareIds.map(id=>persons.find(p=>p.id===id)).filter((p):p is PersonData => !!p)
  const avail = persons.filter(p=>!compareIds.includes(p.id))

  const addP = (id:string) => { if(compareIds.length>=3){toast.info('Максимум 3');return} setCompareIds([...compareIds,id]) }
  const removeP = (id:string) => setCompareIds(compareIds.filter(x=>x!==id))

  const dims = [
    {key:'role',label:'Роль',get:(p:PersonData)=>ROLE[p.role??'']?.label??p.role??'—'},
    {key:'guilt',label:'Виновность',get:(p:PersonData)=>GUILT[p.guiltLevel??'none'].label},
    {key:'guiltPct',label:'Уровень вины',get:(p:PersonData)=>`${GUILT[p.guiltLevel??'none'].pct}%`},
    {key:'defense',label:'Стратегия защиты',get:(p:PersonData)=>p.defenseStrategy??'Не определена'},
    {key:'occupation',label:'Должность',get:(p:PersonData)=>p.occupation??'—'},
    {key:'alias',label:'Псевдоним',get:(p:PersonData)=>p.alias??'—'},
    {key:'birthDate',label:'Дата рождения',get:(p:PersonData)=>p.birthDate?fmtDate(p.birthDate):'—'},
    {key:'status',label:'Статус',get:(p:PersonData)=>p.status??'—'},
  ]

  const conflicts = useMemo(() => {
    if(selected.length<2) return []
    const res:{pair:[string,string];desc:string}[] = []
    for(let i=0;i<selected.length;i++) for(let j=i+1;j<selected.length;j++){
      const c=ROLE_CONFLICT[selected[i].role??'']?.[selected[j].role??'']??ROLE_CONFLICT[selected[j].role??'']?.[selected[i].role??'']
      if(c) res.push({pair:[selected[i].id,selected[j].id],desc:c})
    }
    return res
  },[selected])

  const epCounts = useMemo(() => { const c:Record<string,number>={}; persons.forEach(p=>{c[p.id]=0}); mockEpisodes.forEach(ep=>ep.persons.forEach(pe=>{c[pe.personId]=(c[pe.personId]??0)+1})); return c },[persons])

  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-red-700">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GitCompare className="w-4 h-4 text-red-600"/>Сравнение участников <Badge variant="outline" className="text-xs">{selected.length}/3</Badge></CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        {selected.length===0 ? (
          <div className="p-8 text-center rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-dashed border-red-300/50 dark:border-red-700/40">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mx-auto mb-3 ring-4 ring-red-500/5"><GitCompare className="w-10 h-10 text-red-600"/></div>
            <p className="text-sm font-semibold">Выберите участников для сравнения</p>
            <p className="text-xs text-muted-foreground mt-1">Сравнение по: роль, виновность, стратегия защиты и др. (до 3 участников)</p>
          </div>
        ) : (<>
          {conflicts.length>0 && <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1 mb-2"><AlertTriangle className="w-3 h-3"/>Конфликты интересов:</p>
            <div className="space-y-1">{conflicts.map((c,i)=>{
              const p1=selected.find(p=>p.id===c.pair[0]),p2=selected.find(p=>p.id===c.pair[1])
              return <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-red-100/40 dark:bg-red-950/30">
                <Badge className={`${ROLE[p1?.role??'']?.badge??'bg-stone-500 text-white'} text-[10px]`}>{p1?.shortName??p1?.fullName}</Badge>
                <span className="text-red-600 font-bold">VS</span>
                <Badge className={`${ROLE[p2?.role??'']?.badge??'bg-stone-500 text-white'} text-[10px]`}>{p2?.shortName??p2?.fullName}</Badge>
                <span className="text-red-700 dark:text-red-400 flex-1">— {c.desc}</span>
              </div>
            })}</div>
          </div>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="border-b"><th className="text-left p-2 font-medium text-muted-foreground w-28">Параметр</th>
                {selected.map(p => <th key={p.id} className="text-left p-2 font-semibold min-w-[160px]">
                  <div className="flex items-start gap-2"><div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      {(ROLE[p.role??'']?.icon??Users)({className:"w-3 h-3",style:{color:ROLE[p.role??'']?.color??'#78716c'}})}
                      <p className="truncate text-sm">{p.shortName??p.fullName}</p>
                    </div>
                    <div className="flex items-center gap-1"><Badge className={`${ROLE[p.role??'']?.badge??'bg-stone-500 text-white'} text-[10px]`}>{ROLE[p.role??'']?.label??p.role}</Badge><Badge className={`${GUILT[p.guiltLevel??'none'].badge} text-[10px]`}>{GUILT[p.guiltLevel??'none'].label}</Badge></div>
                  </div><Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={()=>removeP(p.id)}><X className="w-3 h-3"/></Button></div>
                </th>)}
              </tr></thead>
              <tbody>
                {dims.map((dim,i)=> <tr key={dim.key} className={i%2===0?'bg-muted/20':''}><td className="p-2 font-medium text-muted-foreground">{dim.label}</td>{selected.map(p=> <td key={p.id} className="p-2 align-top">{dim.key==='guilt'?<Badge className={`${GUILT[p.guiltLevel??'none'].badge} text-xs`}>{dim.get(p)}</Badge>:<span className="text-xs">{dim.get(p)}</span>}</td>)}</tr>)}
                <tr className="bg-muted/20"><td className="p-2 font-medium text-muted-foreground">Эпизоды</td>{selected.map(p=> <td key={p.id} className="p-2"><Badge variant="outline" className="text-xs">{epCounts[p.id]??0}</Badge></td>)}</tr>
                <tr><td className="p-2 font-medium text-muted-foreground">Документы</td>{selected.map(p=> <td key={p.id} className="p-2"><Badge variant="outline" className="text-xs">1</Badge></td>)}</tr>
              </tbody>
            </table>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1"><Target className="w-3 h-3"/>Сравнение уровней виновности</p>
            <div className="space-y-2">{selected.map(p => {
              const pct=GUILT[p.guiltLevel??'none'].pct, col=GUILT[p.guiltLevel??'none'].color
              return <div key={p.id} className="flex items-center gap-2"><span className="text-xs w-20 truncate text-muted-foreground">{p.shortName??p.fullName}</span><div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,backgroundColor:col}}/></div><span className="text-xs font-bold w-10 text-right" style={{color:col}}>{pct}%</span></div>
            })}</div>
          </div>
        </>)}
        {avail.length>0 && compareIds.length<3 && <div className="flex items-center gap-2"><Select onValueChange={addP}><SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="+ Добавить участника"/></SelectTrigger><SelectContent>{avail.map(p=> <SelectItem key={p.id} value={p.id} className="text-xs">{p.shortName??p.fullName} ({ROLE[p.role??'']?.label??p.role})</SelectItem>)}</SelectContent></Select></div>}
      </CardContent>
    </Card>
  )
}
