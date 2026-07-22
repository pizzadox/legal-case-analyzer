'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { FileText, Shield, Swords, Scale, Link2, AlertTriangle, TrendingUp, Eye, Filter, CheckCircle2, XCircle, Activity, Zap, ChevronRight } from 'lucide-react'
import { sevBadge, sideBadge, sideHex, GRID2, GRID3, GRID4 } from '@/lib/shared-ui'

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

// ─── Mock data (compact) ───
const P_E: EItem[] = [
  {id:'pe-1',name:'Обвинительное заключение',shortName:'Обвин. заключение',date:'2024-04-25',type:'документ',side:'prosecution',strength:78,source:'СК России по г. Москве',summary:'Сводный документ с обвинением по ст. 159 ч.3, ст. 160 ч.2. Систематизированы все эпизоды, 4 экспертизы, 45 томов.',strengths:['Систематизированы эпизоды','Подкреплено 4 экспертизами','45 томов дела'],weaknesses:['Не учтены показания Козлова','Экспертиза по копиям','Не отражена хронология обысков']},
  {id:'pe-2',name:'Показания Петрова И.В.',shortName:'Петров',date:'2024-02-05',type:'показание',side:'prosecution',strength:55,source:'Протокол допроса от 05.02.2024',summary:'Бывший сотрудник ООО «ТехноПром» дал показания о причастности Колесниченко к хищению.',strengths:['Участник операций','Согласуется с документами'],weaknesses:['Противоречия с Козловым','Изменение показаний','Личная заинтересованность']},
  {id:'pe-3',name:'Протокол обыска от 20.02.2024',shortName:'Протокол обыска',date:'2024-02-20',type:'протокол',side:'prosecution',strength:62,source:'Протокол № 14/2024',summary:'Обыск в офисе ООО «ТехноПром». Изъяты 45 листов, ноутбук, 3 флеш-накопителя.',strengths:['2 понятых','Документы опечатаны'],weaknesses:['Без адвоката','Нет видеофиксации','Задержка передачи']},
  {id:'pe-4',name:'Заключение фин.-экон. экспертизы',shortName:'Экспертиза',date:'2024-04-10',type:'экспертиза',side:'prosecution',strength:72,source:'Заключение № 128-Э от 10.04.2024',summary:'Эксперт Кузнецова установила хищение 4,7 млн руб. через фиктивные договоры.',strengths:['12-летний стаж','Стандартные методики','Согласуется с документами'],weaknesses:['По копиям документов','Не исследована оборотная сторона','Не давала показаний в суде']},
  {id:'pe-5',name:'Финансовые документы ООО',shortName:'Фин. документы',date:'2024-03-05',type:'документ',side:'prosecution',strength:68,source:'Изъято при обыске',summary:'Договоры, счета, платёжные поручения, акты. Подтверждают операции с подставными контрагентами.',strengths:['Подлинность подписей подтверждена','Непрерывная цепочка'],weaknesses:['Часть утрачена','Нет оригиналов поручений','Не все контрагенты идентифицированы']},
  {id:'pe-6',name:'Показания Ивановой А.С.',shortName:'Иванова',date:'2024-03-20',type:'показание',side:'prosecution',strength:48,source:'Протокол от 20.03.2024',summary:'Главный бухгалтер о порядке согласования операций с Колесниченко. Подтвердила подписи.',strengths:['Подписывала документы','Согласуется с экспертизой'],weaknesses:['Собственный интерес','На слухах','Не помнит детали']},
]
const D_E: EItem[] = [
  {id:'de-1',name:'Показания Козлова В.Н. — алиби',shortName:'Козлов — алиби',date:'2024-02-28',type:'показание',side:'defense',strength:74,source:'Протокол от 28.02.2024',summary:'Сосед подтвердил: в день обыска Колесниченко был у него дома (14:00–18:00).',strengths:['Не связан служебными отношениями','Согласуется с видео','Подтверждено 3 лицом'],weaknesses:['Давний знакомый','Не помнит точное время']},
  {id:'de-2',name:'Видеозапись с камер ТЦ «Город»',shortName:'Видео камер',date:'2024-03-12',type:'документ',side:'defense',strength:81,source:'DVD от администратора ТЦ',summary:'Видео за 20.02.2024: Колесниченко в ТЦ 14:30–17:45, противоречит версии следствия.',strengths:['Непрерывная запись без монтажа','Подлинность подтверждена','Синхронизировано с сервером'],weaknesses:['Получено вне процессуального порядка','Часть перекрыта конструкцией']},
  {id:'de-3',name:'Билеты на поезд Мск—Казань',shortName:'Билеты',date:'2024-02-15',type:'документ',side:'defense',strength:65,source:'Электронные билеты РЖД',summary:'Билеты на 19.02.2024 вечерний рейс — обвиняемый покинул Москву накануне обыска.',strengths:['Официальная система РЖД','Подтверждены бронированием','Согласуются с Козловым'],weaknesses:['Не подтверждено использование','Нет посадочного талона']},
  {id:'de-4',name:'Характеристика с работы',shortName:'Характеристика',date:'2024-04-05',type:'документ',side:'defense',strength:45,source:'ООО «ТехноПром» от 05.04.2024',summary:'Положительная производственная характеристика Колесниченко.',strengths:['Подписана руководителем','Конкретные достижения'],weaknesses:['Не независимый подписант','К личности, не к делу']},
  {id:'de-5',name:'Справка об отсутствии судимости',shortName:'Справка',date:'2024-04-22',type:'документ',side:'defense',strength:38,source:'МВД России № 77-АА-123456',summary:'Официальная справка об отсутствии судимости на момент возбуждения УД.',strengths:['Государственный орган','Неопровержимый характер'],weaknesses:['К личности, не к делу','Не опровергает деяние']},
]
const LINKS: ELink[] = [
  {id:'l1',sourceId:'pe-3',targetId:'de-1',type:'contradiction',strength:'strong',description:'Обыск фиксирует Колесниченко в офисе 14-18ч, Козлов — дома. Прямое противоречие.'},
  {id:'l2',sourceId:'pe-2',targetId:'de-1',type:'contradiction',strength:'strong',description:'Петров видел Колесниченко в офисе, Козлов — дома. Взаимоисключающие показания.'},
  {id:'l3',sourceId:'pe-4',targetId:'de-2',type:'contradiction',strength:'moderate',description:'Экспертиза предполагает сделки в офисе, видео фиксирует в ТЦ. Альтернативный сценарий.'},
  {id:'l4',sourceId:'pe-2',targetId:'de-2',type:'contradiction',strength:'moderate',description:'Петров опровергается видео с камер ТЦ «Город».'},
  {id:'l5',sourceId:'pe-1',targetId:'de-5',type:'corroboration',strength:'weak',description:'Обвин. заключение и справка характеризуют личность, но справка не опровергает обвинение.'},
  {id:'l6',sourceId:'pe-6',targetId:'de-4',type:'partial',strength:'weak',description:'Иванова о деловых качествах частично согласуется с характеристикой.'},
  {id:'l7',sourceId:'pe-3',targetId:'de-3',type:'contradiction',strength:'strong',description:'Обыск предполагает нахождение в Москве, билеты подтверждают отъезд 19.02.'},
]

// ─── SVG layout constants ───
const SW=1400,SH=460,NW=132,NH=92,PX=80,PROS_Y=100,DEF_Y=380,AX_Y=230
const ALL=[...P_E,...D_E],ALL_MAP=Object.fromEntries(ALL.map(e=>[e.id,e]))
const dtX=(d:string)=>{const dates=ALL.map(e=>+new Date(e.date)),mn=Math.min(...dates),mx=Math.max(...dates);return PX+((+new Date(d)-mn)/(mx-mn||1))*(SW-2*PX)}

const nodePos:(()=>Record<string,{x:number;y:number}>)=()=>{const p:Record<string,{x:number;y:number}>={};const sp=NW+24;const dodge=(arr:EItem[],y:number)=>{const cs=arr.map(e=>({id:e.id,x:dtX(e.date)}));for(let i=1;i<cs.length;i++)if(cs[i].x-cs[i-1].x<sp)cs[i].x=cs[i-1].x+sp;const mx=SW-PX;for(let i=cs.length-1;i>=0;i--)if(cs[i].x>mx)cs[i].x=mx;cs.forEach(c=>p[c.id]={x:c.x,y})};dodge([...P_E].sort((a,b)=>+new Date(a.date)-+new Date(b.date)),PROS_Y);dodge([...D_E].sort((a,b)=>+new Date(a.date)-+new Date(b.date)),DEF_Y);return p}
const POS=nodePos()
const GAPS=(()=>{const linked=new Set(LINKS.flatMap(l=>l.sourceId.startsWith('pe-')?[l.sourceId]:l.targetId.startsWith('pe-')?[l.targetId]:[]));return P_E.filter(e=>!linked.has(e.id)).map(e=>e.id)})()

// ─── Detail Sheet ───

function DetailSheet({item,open,onOpenChange}:{item:EItem|null;open:boolean;onOpenChange:(o:boolean)=>void}) {
  if(!item)return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full sm:max-w-lg"/></Sheet>
  const tc=T_CFG[item.type],TIcon=tc.icon,sC=item.side==='prosecution'?'#b91c1c':'#047857'
  const sideBg=item.side==='prosecution'?'from-red-900/30 border-l-red-700':'from-emerald-900/30 border-l-emerald-700'
  const related=LINKS.filter(l=>l.sourceId===item.id||l.targetId===item.id)
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
            {related.map(l=>{const lc=L_CFG[l.type],otherId=l.sourceId===item.id?l.targetId:l.sourceId,other=ALL_MAP[otherId];return <div key={l.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/40 border"><span className="w-2 h-2 rounded-full" style={{backgroundColor:lc.color}}/><Badge className={`${lc.color==='#b91c1c'?'bg-red-700':lc.color==='#047857'?'bg-emerald-700':'bg-amber-600'} text-white text-[10px]`}>{lc.label}</Badge><span className="truncate">{other?.shortName??otherId}</span><span className="text-muted-foreground truncate ml-auto">{l.description.slice(0,60)}…</span></div>})}
          </div>}
          <div className="p-2 rounded-md bg-muted/40 border text-xs"><span className="text-muted-foreground">Источник: </span>{item.source}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main ───

export function CaseEvidenceChain() {
  const [filter,setFilter]=useState<FKey>('all')
  const [hovId,setHovId]=useState<string|null>(null)
  const [selId,setSelId]=useState<string|null>(null)
  const [sheetOpen,setSheetOpen]=useState(false)

  const visible=useMemo(()=>{let arr=ALL;if(filter==='prosecution')arr=arr.filter(e=>e.side==='prosecution');if(filter==='defense')arr=arr.filter(e=>e.side==='defense');if(filter==='strong')arr=arr.filter(e=>LINKS.some(l=>(l.sourceId===e.id||l.targetId===e.id)&&l.strength==='strong'));return arr},[filter])
  const linkedIds=useMemo(()=>new Set(LINKS.flatMap(l=>[l.sourceId,l.targetId])),[])
  const connectedTo=useCallback((id:string)=>new Set(LINKS.filter(l=>l.sourceId===id||l.targetId===id).flatMap(l=>[l.sourceId,l.targetId])),[])

  const handleClick=useCallback((id:string)=>{setSelId(id);setSheetOpen(true)},[])
  const handleHov=useCallback((id:string|null)=>setHovId(id),[])

  const connSet=useMemo(()=>hovId?connectedTo(hovId):null,[hovId,connectedTo])

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <Card className="rounded-xl shadow-sm border-l-4 border-red-700 bg-gradient-to-r from-red-900/20 via-emerald-900/20 to-stone-900/20 overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-700/20 flex items-center justify-center shrink-0 ring-1 ring-red-700/30"><Link2 className="w-7 h-7 text-red-700 dark:text-red-400"/></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1"><h2 className="text-xl font-bold tracking-tight">Цепочка доказательств</h2><Badge className="bg-red-700 text-white gap-1"><Swords className="w-3 h-3"/>Обвинение</Badge><Badge className="bg-emerald-700 text-white gap-1"><Shield className="w-3 h-3"/>Защита</Badge></div>
              <p className="text-sm text-muted-foreground">Визуализация связей между доказательствами обвинения и защиты по делу № 2024-00145</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className={GRID4}>
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3 flex flex-col items-center"><p className="text-2xl font-bold">{P_E.length}</p><p className="text-xs text-muted-foreground">Обвинение</p></CardContent></Card>
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3 flex flex-col items-center"><p className="text-2xl font-bold">{D_E.length}</p><p className="text-xs text-muted-foreground">Защита</p></CardContent></Card>
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3 flex flex-col items-center"><p className="text-2xl font-bold">{LINKS.length}</p><p className="text-xs text-muted-foreground">Связей</p></CardContent></Card>
        <Card className="rounded-xl shadow-sm"><CardContent className="p-3 flex flex-col items-center"><p className="text-2xl font-bold">{GAPS.length}</p><p className="text-xs text-muted-foreground">Разрывов цепи</p></CardContent></Card>
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
              {LINKS.map(l=>{
                const src=POS[l.sourceId],tgt=POS[l.targetId];if(!src||!tgt)return null
                const lc=L_CFG[l.type],lsc=LS_CFG[l.strength],hl=hovId&&(l.sourceId===hovId||l.targetId===hovId),dm=hovId&&!hl
                return <div key={l.id} className={`absolute z-5 transition-opacity duration-200 ${dm?'opacity-20':'opacity-100'}`} style={{top:0,left:0,width:SW+'px',height:SH+'px',pointerEvents:'none'}}>
                  <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full h-auto" style={{position:'absolute',top:0,left:0}}>
                    <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke={hl?'#ea580c':lc.color} strokeWidth={hl?3:lsc.width} opacity={hl?1:lsc.opacity} strokeDasharray={lc.dashed?'6 4':'none'}/>
                  </svg>
                </div>
              })}
              {/* Nodes */}
              {visible.map(item=>{
                const pos=POS[item.id];if(!pos)return null
                const tc=T_CFG[item.type],TIcon=tc.icon
                const isHov=hovId===item.id,isHL=connSet?.has(item.id),isDim=hovId&&!isHov&&!isHL,isGap=GAPS.includes(item.id)
                const sideBg=item.side==='prosecution'?'from-card via-card to-red-500/5':'from-card via-card to-emerald-500/5'
                const topBdr=item.side==='prosecution'?'border-t-red-700':'border-t-emerald-700'
                return (
                  <button key={item.id} type="button" onClick={()=>handleClick(item.id)} onMouseEnter={()=>handleHov(item.id)} onMouseLeave={()=>handleHov(null)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 text-left rounded-xl shadow-sm transition-all duration-200 hover:shadow-md border-t-4 ${topBdr} bg-gradient-to-br ${sideBg} ${isDim?'opacity-30':'opacity-100'} ${isHL?'ring-2 ring-amber-500 scale-105 z-20':'z-10'} ${isGap?'outline outline-2 outline-dashed outline-red-700':''}`}
                    style={{left:`${(pos.x/SW)*100}%`,top:`${(pos.y/SH)*100}%`,width:`${(NW/SW)*100}%`,maxWidth:NW+'px',minWidth:'110px'}} title={item.name}>
                    <div className="p-2 space-y-1">
                      <div className="flex items-center justify-between gap-1"><Badge className={`${tc.tone} text-[10px] gap-0.5 px-1.5 py-0`}><TIcon className="w-2.5 h-2.5"/>{tc.label}</Badge><Badge className={`${strBadge(item.strength,item.side)} text-[10px]`}>{item.strength}</Badge></div>
                      <p className="text-xs font-semibold leading-tight line-clamp-2">{item.shortName}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'})}</p>
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

      <DetailSheet item={selId?ALL_MAP[selId]:null} open={sheetOpen} onOpenChange={setSheetOpen}/>
    </div>
  )
}
