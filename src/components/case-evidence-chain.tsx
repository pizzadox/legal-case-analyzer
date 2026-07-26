'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { FileText, Shield, Swords, Scale, Link2, AlertTriangle, TrendingUp, Eye, Filter, CheckCircle2, XCircle, Activity, Zap, Loader2 } from 'lucide-react'
import { sevBadge, sideBadge, sideHex, GRID4 } from '@/lib/shared-ui'
import * as caseApi from '@/lib/case-api'
import type { DocumentData, PersonData, EvidenceChainData, EpisodeData } from '@/lib/case-store'

// ─── Types ───
type ESide = 'prosecution'|'defense'
type EType = 'документ'|'показание'|'экспертиза'|'протокол'
type LType = 'contradiction'|'corroboration'|'partial'
type LStr = 'strong'|'moderate'|'weak'
type FKey = 'all'|'prosecution'|'defense'|'strong'

interface EItem { id:string; name:string; shortName:string; date:string; type:EType; side:ESide; strength:number; source:string; summary:string; strengths:string[]; weaknesses:string[] }
interface ELink { id:string; sourceId:string; targetId:string; type:LType; strength:LStr; description:string }

// ─── Config ───
const T_CFG:Record<EType,{label:string;icon:React.ElementType;tone:string}>={документ:{label:'Документ',icon:FileText,tone:'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200'},показание:{label:'Показание',icon:Eye,tone:'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'},экспертиза:{label:'Экспертиза',icon:Activity,tone:'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200'},протокол:{label:'Протокол',icon:Scale,tone:'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200'}}
const L_CFG:Record<LType,{label:string;color:string;dashed:boolean}>={contradiction:{label:'Противоречие',color:'#b91c1c',dashed:false},corroboration:{label:'Подтверждение',color:'#047857',dashed:false},partial:{label:'Частичное',color:'#d97706',dashed:true}}
const LS_CFG:Record<LStr,{label:string;width:number;opacity:number}>={strong:{label:'Сильная',width:2.5,opacity:0.95},moderate:{label:'Средняя',width:1.8,opacity:0.75},weak:{label:'Слабая',width:1.2,opacity:0.55}}
const F_OPTS:{key:FKey;label:string;icon:React.ElementType}[]=[{key:'all',label:'Все',icon:Filter},{key:'prosecution',label:'Обвинение',icon:Swords},{key:'defense',label:'Защита',icon:Shield},{key:'strong',label:'Сильные связи',icon:Zap}]
const strBadge=(s:number,side:ESide)=>s>=70?(side==='prosecution'?'bg-red-700':'bg-emerald-700')+' text-white':s>=40?'bg-amber-600 text-white':'bg-stone-500 text-white'
const strHex=(s:number,side:ESide)=>s>=70?(side==='prosecution'?'#b91c1c':'#047857'):s>=40?'#d97706':'#78716c'
const strLabel=(s:number)=>s>=70?'Сильное':s>=40?'Умеренное':'Слабое'

// ─── Helpers: determine side and type from real data ───

// Map document types to prosecution/defense side
function docSide(doc: DocumentData): ESide {
  const t = (doc.documentType || '').toLowerCase()
  // Prosecution-sided document types
  if (t.includes('обвинительное') || t.includes('заключение') || t.includes('постановление о возбуждении') ||
      t.includes('протокол обыска') || t.includes('протокол выемки') || t.includes('протокол допроса свидетеля обвинения') ||
      t.includes('экспертиза') || t.includes('заключение эксперта') || t.includes('финансовый') ||
      t.includes('обвинительный') || t.includes('допрос')) return 'prosecution'
  // Defense-sided document types
  if (t.includes('характеристика') || t.includes('справка') || t.includes('алиби') ||
      t.includes('видеозапись') || t.includes('билеты') || t.includes('независимая экспертиза') ||
      t.includes('ходатайство') || t.includes('защита') || t.includes('показания защиты')) return 'defense'
  // Default: check summary for hints
  const s = (doc.summary || '').toLowerCase()
  if (s.includes('обвинение') || s.includes('хищение') || s.includes('мошенничество')) return 'prosecution'
  if (s.includes('защита') || s.includes('алиби') || s.includes('характеристика')) return 'defense'
  // Fallback: neutral → prosecution (most documents are prosecution-sided)
  return 'prosecution'
}

// Map document type string to EType
function docEType(doc: DocumentData): EType {
  const t = (doc.documentType || '').toLowerCase()
  if (t.includes('экспертиза') || t.includes('заключение эксперта')) return 'экспертиза'
  if (t.includes('протокол')) return 'протокол'
  if (t.includes('показание') || t.includes('допрос')) return 'показание'
  return 'документ'
}

// Map person role to side
function personSide(person: PersonData): ESide {
  if (person.isKolesnichenko) return 'defense' // defendant
  const r = (person.role || '').toLowerCase()
  if (r.includes('обвиняемый') || r.includes('подозреваемый') || r.includes('подсудимый')) return 'defense'
  if (r.includes('свидетель защиты') || r.includes('защита') || r.includes('адвокат')) return 'defense'
  if (r.includes('свидетель') || r.includes('потерпевший') || r.includes('обвинение')) return 'prosecution'
  // Default: if role is not clearly defense → prosecution witness
  return 'prosecution'
}

// Compute strength score for a document
function docStrength(doc: DocumentData, side: ESide): number {
  let s = 50 // baseline
  // Has extracted text → stronger
  if (doc.extractedText && doc.extractedText.length > 100) s += 10
  if (doc.extractedText && doc.extractedText.length > 500) s += 5
  // Has summary → stronger
  if (doc.summary) s += 10
  // Has source reference → stronger
  if (doc.sourceReference) s += 5
  // Document type affects strength
  const t = (doc.documentType || '').toLowerCase()
  if (t.includes('экспертиза')) s += 10
  if (t.includes('протокол')) s += 5
  if (t.includes('обвинительное заключение')) s += 15
  if (t.includes('характеристика') || t.includes('справка')) s -= 15
  // Clamp between 20 and 95
  return Math.max(20, Math.min(95, s))
}

// Compute strength score for a person
function personStrength(person: PersonData, side: ESide): number {
  let s = 50
  const r = (person.role || '').toLowerCase()
  if (person.isKolesnichenko) s = 30 // defendant's own statements are weak evidence for defense
  if (r.includes('свидетель')) s += 10
  if (r.includes('обвиняемый') || r.includes('подозреваемый')) s -= 10
  if (person.description) s += 5
  return Math.max(20, Math.min(90, s))
}

// ─── Build evidence items and links from real data ───

function buildItems(docs: DocumentData[], persons: PersonData[]): EItem[] {
  const items: EItem[] = []

  // Documents become evidence items
  docs.forEach(doc => {
    if (doc.processingStatus !== 'completed') return
    const side = docSide(doc)
    const type = docEType(doc)
    const strength = docStrength(doc, side)
    const name = doc.originalName || doc.fileName
    const shortName = name.length > 30 ? name.slice(0, 28) + '…' : name
    const date = doc.documentDate || doc.uploadedAt

    // Build strengths/weaknesses from summary
    const strengths: string[] = []
    const weaknesses: string[] = []
    if (doc.summary) {
      // Simple heuristic: split summary into sentences, classify
      const sentences = doc.summary.split(/[.!?]/).filter(s => s.trim().length > 5)
      sentences.forEach(sent => {
        const lower = sent.toLowerCase()
        if (lower.includes('подтверждает') || lower.includes('согласуется') || lower.includes('подлинность') ||
            lower.includes('установлено') || lower.includes('доказано')) strengths.push(sent.trim())
        if (lower.includes('противоречие') || lower.includes('нарушение') || lower.includes('отсутствие') ||
            lower.includes('не подтверждено') || lower.includes('копия') || lower.includes('сомнение')) weaknesses.push(sent.trim())
      })
    }
    // Add default if empty
    if (strengths.length === 0) strengths.push('Документ приобщён к материалам дела')
    if (weaknesses.length === 0) weaknesses.push('Требуется дополнительный анализ')

    items.push({
      id: `doc-${doc.id}`,
      name, shortName, date, type, side, strength,
      source: doc.sourceReference || 'Загружено в систему',
      summary: doc.summary || 'Документ обработан, описание отсутствует',
      strengths, weaknesses,
    })
  })

  // Persons become evidence items (testimony type)
  persons.forEach(person => {
    const side = personSide(person)
    const strength = personStrength(person, side)
    const name = person.fullName
    const shortName = person.shortName || (name.length > 20 ? name.slice(0, 18) + '…' : name)
    const date = person.birthDate || ''

    const strengths: string[] = []
    const weaknesses: string[] = []
    if (person.description) {
      strengths.push(person.description.slice(0, 80))
    }
    if (person.role) {
      if (person.isKolesnichenko) {
        strengths.push('Обвиняемый — знает обстоятельства дела')
        weaknesses.push('Заинтересованное лицо')
      } else if (person.role.toLowerCase().includes('свидетель')) {
        strengths.push('Независимый свидетель')
        if (person.role.toLowerCase().includes('обвинения')) weaknesses.push('Может быть заинтересован')
      }
    }
    if (strengths.length === 0) strengths.push('Участник уголовного дела')
    if (weaknesses.length === 0) weaknesses.push('Оценка показаний требует анализа')

    items.push({
      id: `pers-${person.id}`,
      name, shortName, date, type: 'показание', side, strength,
      source: person.role || 'Участник производства',
      summary: person.description || `Показания ${person.fullName} по делу`,
      strengths, weaknesses,
    })
  })

  return items
}

function buildLinks(items: EItem[], docs: DocumentData[], persons: PersonData[], chainData: EvidenceChainData[]): ELink[] {
  const links: ELink[] = []

  // Strategy: connect prosecution items to defense items they contradict
  const prosecution = items.filter(i => i.side === 'prosecution')
  const defense = items.filter(i => i.side === 'defense')

  // Create links between prosecution and defense items that share similar topics
  // Simple heuristic: link items with overlapping keywords in summaries
  prosecution.forEach(pItem => {
    defense.forEach(dItem => {
      const pSummary = pItem.summary.toLowerCase()
      const dSummary = dItem.summary.toLowerCase()
      // Check for keyword overlap indicating contradiction or corroboration
      const commonWords = ['алиби', 'обыск', 'экспертиза', 'показания', 'документ', 'подпись', 'договор', 'хищение']
      const overlap = commonWords.filter(w => pSummary.includes(w) && dSummary.includes(w))
      if (overlap.length > 0) {
        // Determine link type based on content
        let lType: LType = 'contradiction'
        let lStr: LStr = 'moderate'
        if (dSummary.includes('алиби') && pSummary.includes('обыск') || pSummary.includes('допрос')) {
          lType = 'contradiction'; lStr = 'strong'
        } else if (dSummary.includes('характеристика') && pSummary.includes('подпись')) {
          lType = 'partial'; lStr = 'weak'
        } else if (overlap.length >= 2) {
          lStr = 'strong'
        }
        links.push({
          id: `link-${pItem.id}-${dItem.id}`,
          sourceId: pItem.id,
          targetId: dItem.id,
          type: lType,
          strength: lStr,
          description: `Связь: ${pItem.shortName} ↔ ${dItem.shortName} (${overlap.join(', ')})`,
        })
      }
    })
  })

  // Also add corroboration links between items on the same side that reference similar content
  const allBySide = { prosecution, defense }
  Object.entries(allBySide).forEach(([side, sideItems]) => {
    for (let i = 0; i < sideItems.length; i++) {
      for (let j = i + 1; j < sideItems.length; j++) {
        const a = sideItems[i], b = sideItems[j]
        const aSum = a.summary.toLowerCase(), bSum = b.summary.toLowerCase()
        const overlap = ['договор', 'подпись', 'подтверждает', 'согласуется', 'экспертиза', 'финансовый'].filter(w => aSum.includes(w) && bSum.includes(w))
        if (overlap.length >= 2 && links.length < 30) { // Limit total links
          links.push({
            id: `corr-${a.id}-${b.id}`,
            sourceId: a.id,
            targetId: b.id,
            type: 'corroboration',
            strength: overlap.length >= 3 ? 'strong' : 'moderate',
            description: `Подтверждение: ${a.shortName} ↔ ${b.shortName} (${overlap.join(', ')})`,
          })
        }
      }
    }
  })

  // Limit to max 20 links for readability
  return links.slice(0, 20)
}

// ─── Detail Sheet ───

function DetailSheet({item,allItems,links,open,onOpenChange}:{item:EItem|null;allItems:EItem[];links:ELink[];open:boolean;onOpenChange:(o:boolean)=>void}) {
  if(!item)return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full sm:max-w-lg"/></Sheet>
  const tc=T_CFG[item.type],TIcon=tc.icon,sC=item.side==='prosecution'?'#b91c1c':'#047857'
  const sideBg=item.side==='prosecution'?'from-red-900/30 border-l-red-700':'from-emerald-900/30 border-l-emerald-700'
  const allMap=Object.fromEntries(allItems.map(e=>[e.id,e]))
  const related=links.filter(l=>l.sourceId===item.id||l.targetId===item.id)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className={`bg-gradient-to-r ${sideBg} via-card border-l-4 rounded-r-lg`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">{item.side==='prosecution'?<Swords className="w-4 h-4" style={{color:sC}}/>:<Shield className="w-4 h-4" style={{color:sC}}/>}<span>{item.id.toUpperCase()}</span></div>
          <SheetTitle className="text-base">{item.name}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={`${tc.tone} text-xs gap-1`}><TIcon className="w-3 h-3"/>{tc.label}</Badge>
            <Badge className={`${strBadge(item.strength,item.side)} text-xs`}>{strLabel(item.strength)}</Badge>
            <Badge className={sideBadge(item.side)}>{item.side==='prosecution'?'Обвинение':'Защита'}</Badge>
          </div>
        </SheetHeader>
        <div className="px-4 pb-6 space-y-4">
          <div><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3"/>Описание</p><p className="text-sm leading-relaxed">{item.summary}</p></div>
          <Separator/>
          <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
            <div className="flex items-end justify-between gap-2"><div><p className="text-[11px] text-muted-foreground">Сила доказательства</p><p className={`text-3xl font-bold tabular-nums ${item.strength>=70?'text-emerald-700 dark:text-emerald-400':item.strength>=40?'text-amber-600':'text-stone-500'}`}>{item.strength}<span className="text-lg text-muted-foreground">/100</span></p></div><Badge variant="outline" className="text-xs">{strLabel(item.strength)}</Badge></div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${item.strength>=70?item.side==='prosecution'?'bg-red-700':'bg-emerald-700':item.strength>=40?'bg-amber-600':'bg-stone-500'}`} style={{width:`${item.strength}%`}}/></div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5"><CheckCircle2 className="w-3 h-3 mr-1"/>Сильные стороны</p><ul className="space-y-0.5">{item.strengths.map((s,i)=><li key={i} className="text-xs">• {s}</li>)}</ul></div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/60"><p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5"><XCircle className="w-3 h-3 mr-1"/>Слабые стороны</p><ul className="space-y-0.5">{item.weaknesses.map((s,i)=><li key={i} className="text-xs">• {s}</li>)}</ul></div>
          {related.length>0 && <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Link2 className="w-3 h-3"/>Связи ({related.length})</p>
            {related.map(l=>{const lc=L_CFG[l.type],otherId=l.sourceId===item.id?l.targetId:l.sourceId,other=allMap[otherId];return <div key={l.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/40 border"><span className="w-2 h-2 rounded-full" style={{backgroundColor:lc.color}}/><Badge className={`${lc.color==='#b91c1c'?'bg-red-700':lc.color==='#047857'?'bg-emerald-700':'bg-amber-600'} text-white text-[10px]`}>{lc.label}</Badge><span className="truncate">{other?.shortName??otherId}</span><span className="text-muted-foreground truncate ml-auto">{l.description.slice(0,60)}…</span></div>})}
          </div>}
          <div className="p-2 rounded-md bg-muted/40 border text-xs"><span className="text-muted-foreground">Источник: </span>{item.source}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main ───

export function CaseEvidenceChain({ caseId }: { caseId?: string }) {
  const [filter,setFilter]=useState<FKey>('all')
  const [hovId,setHovId]=useState<string|null>(null)
  const [selId,setSelId]=useState<string|null>(null)
  const [sheetOpen,setSheetOpen]=useState(false)

  // Fetch real data from API
  const { data: docs = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['documents', caseId],
    queryFn: () => caseApi.getDocuments(caseId),
    enabled: !!caseId,
  })

  const { data: persons = [], isLoading: isLoadingPersons } = useQuery({
    queryKey: ['persons', caseId],
    queryFn: () => caseApi.getPersons(caseId),
    enabled: !!caseId,
  })

  const { data: chainData = [] } = useQuery({
    queryKey: ['evidence-chain', caseId],
    queryFn: () => caseApi.getEvidenceChain(caseId),
    enabled: !!caseId,
  })

  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes', caseId],
    queryFn: () => caseApi.getEpisodes(caseId),
    enabled: !!caseId,
  })

  const isLoading = isLoadingDocs || isLoadingPersons

  // Build items and links from real data
  const allItems = useMemo(() => buildItems(docs, persons), [docs, persons])
  const links = useMemo(() => buildLinks(allItems, docs, persons, chainData), [allItems, docs, persons, chainData])

  // Filter logic
  const visible=useMemo(()=>{let arr=allItems;if(filter==='prosecution')arr=arr.filter(e=>e.side==='prosecution');if(filter==='defense')arr=arr.filter(e=>e.side==='defense');if(filter==='strong')arr=arr.filter(e=>links.some(l=>(l.sourceId===e.id||l.targetId===e.id)&&l.strength==='strong'));return arr},[filter,allItems,links])

  const prosecutionItems = useMemo(() => allItems.filter(i => i.side === 'prosecution'), [allItems])
  const defenseItems = useMemo(() => allItems.filter(i => i.side === 'defense'), [allItems])

  // Gaps: prosecution items not linked to any defense item
  const gaps = useMemo(() => {
    const linkedProsIds = new Set(links.flatMap(l => l.sourceId))
    return prosecutionItems.filter(e => !linkedProsIds.has(e.id)).map(e => e.id)
  }, [prosecutionItems, links])

  const linkedIds=useMemo(()=>new Set(links.flatMap(l=>[l.sourceId,l.targetId])),[links])
  const connectedTo=useCallback((id:string)=>new Set(links.filter(l=>l.sourceId===id||l.targetId===id).flatMap(l=>[l.sourceId,l.targetId])),[links])

  const handleClick=useCallback((id:string)=>{setSelId(id);setSheetOpen(true)},[])
  const handleHov=useCallback((id:string|null)=>setHovId(id),[])

  const connSet=useMemo(()=>hovId?connectedTo(hovId):null,[hovId,connectedTo])

  // ─── SVG layout ───
  const SW=1400,SH=460,NW=132,NH=92,PX=80,PROS_Y=100,DEF_Y=380,AX_Y=230

  // Compute node positions dynamically
  const posMap = useMemo(() => {
    const p: Record<string, {x:number;y:number}> = {}
    const sp = NW + 24

    const dodge = (arr: EItem[], y: number) => {
      const sorted = [...arr].sort((a, b) => +new Date(a.date) - +new Date(b.date))
      const dates = allItems.map(e => +new Date(e.date))
      const mn = Math.min(...dates), mx = Math.max(...dates)
      const range = mx - mn || 1

      const cs = sorted.map(e => ({
        id: e.id,
        x: PX + ((+new Date(e.date) - mn) / range) * (SW - 2 * PX)
      }))
      // Dodge overlapping nodes
      for (let i = 1; i < cs.length; i++) {
        if (cs[i].x - cs[i-1].x < sp) cs[i].x = cs[i-1].x + sp
      }
      const mxX = SW - PX
      for (let i = cs.length - 1; i >= 0; i--) {
        if (cs[i].x > mxX) cs[i].x = mxX
      }
      cs.forEach(c => { p[c.id] = ({ x: c.x, y }) })
    }

    dodge(prosecutionItems, PROS_Y)
    dodge(defenseItems, DEF_Y)
    return p
  }, [prosecutionItems, defenseItems, allItems])

  // Empty state
  if (!caseId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Выберите дело для просмотра цепочки доказательств</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Link2 className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Нет данных по цепочке доказательств для данного дела</p>
        <p className="text-xs text-muted-foreground">Загрузите и обработайте документы для формирования цепочки доказательств</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <Card className="rounded-xl shadow-sm border-l-4 border-red-700 bg-gradient-to-r from-red-900/20 via-emerald-900/20 to-stone-900/20 overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-700/20 flex items-center justify-center shrink-0 ring-1 ring-red-700/30"><Link2 className="w-7 h-7 text-red-700 dark:text-red-400"/></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1"><h2 className="text-xl font-bold tracking-tight">Цепочка доказательств</h2><Badge className="bg-red-700 text-white gap-1"><Swords className="w-3 h-3"/>Обвинение</Badge><Badge className="bg-emerald-700 text-white gap-1"><Shield className="w-3 h-3"/>Защита</Badge></div>
              <p className="text-sm text-muted-foreground">Визуализация связей между доказательствами обвинения и защиты ({prosecutionItems.length} обвинение, {defenseItems.length} защита, {links.length} связей)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className={GRID4}>
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3 flex flex-col items-center"><p className="text-2xl font-bold">{prosecutionItems.length}</p><p className="text-xs text-muted-foreground">Обвинение</p></CardContent></Card>
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3 flex flex-col items-center"><p className="text-2xl font-bold">{defenseItems.length}</p><p className="text-xs text-muted-foreground">Защита</p></CardContent></Card>
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3 flex flex-col items-center"><p className="text-2xl font-bold">{links.length}</p><p className="text-xs text-muted-foreground">Связей</p></CardContent></Card>
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3 flex flex-col items-center"><p className="text-2xl font-bold">{gaps.length}</p><p className="text-xs text-muted-foreground">Разрывов цепи</p></CardContent></Card>
      </div>

      {/* Filter */}
      <Card className="rounded-xl shadow-sm"><CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1"><Filter className="w-3.5 h-3.5"/>Фильтр:</span>
          {F_OPTS.map(o=>{const Icon=o.icon;const active=filter===o.key;return <button key={o.key} onClick={()=>setFilter(o.key)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${active?'bg-red-700 text-white shadow-sm':'bg-muted/60 text-stone-700 dark:text-stone-300 hover:bg-muted'}`}><Icon className="w-3 h-3"/>{o.label}</button>})}
          <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3"/>Наведите для подсветки, клик — детали</span>
        </div>
      </CardContent></Card>

      {/* SVG visualization */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-700"/>Визуализация цепочки</CardTitle></CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto scrollbar-thin"><div className="min-w-[900px]">
            <div className="relative" style={{height:'460px'}}>
              {/* Prosecution label */}
              <div className="absolute top-0 left-0 text-xs font-bold text-red-700 dark:text-red-400 z-0">ОБВИНЕНИЕ</div>
              <div className="absolute bottom-0 left-0 text-xs font-bold text-emerald-700 dark:text-emerald-400 z-0">ЗАЩИТА</div>
              {/* Axis */}
              <div className="absolute left-[80px] right-[80px] top-[230px] h-0.5 bg-stone-300 dark:bg-stone-700 z-0"/>
              {/* Links */}
              {links.map(l=>{
                const src=posMap[l.sourceId],tgt=posMap[l.targetId];if(!src||!tgt)return null
                const lc=L_CFG[l.type],lsc=LS_CFG[l.strength],hl=hovId&&(l.sourceId===hovId||l.targetId===hovId),dm=hovId&&!hl
                return <div key={l.id} className={`absolute z-5 transition-opacity duration-200 ${dm?'opacity-20':'opacity-100'}`} style={{top:0,left:0,width:SW+'px',height:SH+'px',pointerEvents:'none'}}>
                  <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full h-auto" style={{position:'absolute',top:0,left:0}}>
                    <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke={hl?'#ea580c':lc.color} strokeWidth={hl?3:lsc.width} opacity={hl?1:lsc.opacity} strokeDasharray={lc.dashed?'6 4':'none'}/>
                  </svg>
                </div>
              })}
              {/* Nodes */}
              {visible.map(item=>{
                const pos=posMap[item.id];if(!pos)return null
                const tc=T_CFG[item.type],TIcon=tc.icon
                const isHov=hovId===item.id,isHL=connSet?.has(item.id),isDim=hovId&&!isHov&&!isHL,isGap=gaps.includes(item.id)
                const sideBg=item.side==='prosecution'?'from-card via-card to-red-500/5':'from-card via-card to-emerald-500/5'
                const topBdr=item.side==='prosecution'?'border-t-red-700':'border-t-emerald-700'
                return (
                  <button key={item.id} type="button" onClick={()=>handleClick(item.id)} onMouseEnter={()=>handleHov(item.id)} onMouseLeave={()=>handleHov(null)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 text-left rounded-xl shadow-sm transition-all duration-200 hover:shadow-md border-t-4 ${topBdr} bg-gradient-to-br ${sideBg} ${isDim?'opacity-30':'opacity-100'} ${isHL?'ring-2 ring-amber-500 scale-105 z-20':'z-10'} ${isGap?'outline outline-2 outline-dashed outline-red-700':''}`}
                    style={{left:`${(pos.x/SW)*100}%`,top:`${(pos.y/SH)*100}%`,width:`${(NW/SW)*100}%`,maxWidth:NW+'px',minWidth:'110px'}} title={item.name}>
                    <div className="p-2 space-y-1">
                      <div className="flex items-center justify-between gap-1"><Badge className={`${tc.tone} text-[10px] gap-0.5 px-1.5 py-0`}><TIcon className="w-2.5 h-2.5"/>{tc.label}</Badge><Badge className={`${strBadge(item.strength,item.side)} text-[10px]`}>{item.strength}</Badge></div>
                      <p className="text-xs font-semibold leading-tight line-clamp-2">{item.shortName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.date ? new Date(item.date).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—'}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div></div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3 mt-3 rounded-lg bg-muted/30 border text-xs">
            <span className="font-semibold text-muted-foreground">Связи:</span>
            {Object.entries(L_CFG).map(([k,c])=><span key={k} className="flex items-center gap-1.5"><span className={`w-4 h-0.5 ${c.dashed?'border-t border-dashed':'bg-current'}`} style={{backgroundColor:c.color}}/><span>{c.label}</span></span>)}
            <Separator orientation="vertical" className="h-3 mx-2"/>
            <span className="font-semibold">Сила:</span>
            {Object.entries(LS_CFG).map(([k,s])=><span key={k} className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-current opacity-[var(--op)]" style={{opacity:s.opacity}}/><span>{s.label}</span></span>)}
          </div>
        </CardContent>
      </Card>

      <DetailSheet item={selId?allItems.find(i=>i.id===selId):null} allItems={allItems} links={links} open={sheetOpen} onOpenChange={setSheetOpen}/>
    </div>
  )
}
