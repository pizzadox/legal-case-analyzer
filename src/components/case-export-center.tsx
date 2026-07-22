'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Package, FileText, Braces, Table as TableIcon, Code, Sparkles, Lock, Download, Loader2, Eye, CheckCircle2, XCircle, Clock, AlertTriangle, Languages, Shield, ListChecks, Users, Files, Link2, Scale, ShieldCheck, Calendar, HardDrive, ArrowRight, RefreshCw, Printer } from 'lucide-react'
import { fmtSize, GRID2, GRID3, GRID4 } from '@/lib/shared-ui'

// ─── Types ───
type ExportFormat = 'pdf'|'json'|'csv'|'html'
type ExportStatus = 'ready'|'processing'|'error'
interface RecentExport { id:string; date:string; format:string; elementsCount:number; size:number; status:ExportStatus }
interface ExportOptions { language:'ru'|'en'|'both'; includeAI:boolean; includeCharts:boolean; pageFormat:'a4'|'a3'|'letter'; orientation:'portrait'|'landscape'; watermark:boolean; encrypt:boolean }

const CASE_NUM = '2024-00145'
const F_CFG: Record<ExportFormat, {label:string;short:string;desc:string;icon:React.ElementType;color:string;bg:string;perItem:number;ext:string;sizeNote:string}> = {
  pdf:{label:'PDF Отчёт',short:'PDF',desc:'Полный отчёт для печати',icon:FileText,color:'red-700',bg:'bg-red-700/15 dark:bg-red-950/40',perItem:153600,ext:'pdf',sizeNote:'С богатой вёрсткой'},
  json:{label:'JSON Данные',short:'JSON',desc:'Полная выгрузка данных',icon:Braces,color:'emerald-700',bg:'bg-emerald-700/15 dark:bg-emerald-950/40',perItem:51200,ext:'json',sizeNote:'Машинно-читаемый'},
  csv:{label:'CSV Таблицы',short:'CSV',desc:'Таблицы для Excel',icon:TableIcon,color:'amber-600',bg:'bg-amber-600/15 dark:bg-amber-950/40',perItem:20480,ext:'csv',sizeNote:'Совместим с Excel'},
  html:{label:'HTML Справка',short:'HTML',desc:'Веб-страница для просмотра',icon:Code,color:'orange-600',bg:'bg-orange-600/15 dark:bg-orange-950/40',perItem:81920,ext:'html',sizeNote:'Для браузера'},
}
const S_CFG: Record<ExportStatus, {label:string;badge:string;dot:string;icon:React.ElementType}> = {
  ready:{label:'Готово',badge:'bg-emerald-700 text-white',dot:'bg-emerald-600',icon:CheckCircle2},
  processing:{label:'В процессе',badge:'bg-amber-600 text-white',dot:'bg-amber-500',icon:Clock},
  error:{label:'Ошибка',badge:'bg-red-700 text-white',dot:'bg-red-600',icon:XCircle},
}

const GROUPS = [
  {id:'core',title:'Основная информация',icon:FileText,color:'purple',items:[
    {id:'brief',label:'Краткое изложение',desc:'ИИ-резюме',meta:'~12 КБ'},
    {id:'dashboard',label:'Статистика',desc:'Сводные показатели',meta:'~8 КБ'},
    {id:'timeline',label:'Хронология',desc:'Лента событий',meta:'~24 КБ'},
    {id:'risk',label:'Оценка рисков',desc:'Матрица рисков',meta:'~18 КБ'},
  ]},
  {id:'persons',title:'Участники и эпизоды',icon:Users,color:'red',items:[
    {id:'persons-list',label:'Участники (5)',desc:'Все участники дела',meta:'~22 КБ'},
    {id:'episodes',label:'Эпизоды (3)',desc:'Описание эпизодов',meta:'~30 КБ'},
    {id:'guilt',label:'Виновность',desc:'Оценка вины и доказательств',meta:'~14 КБ'},
    {id:'defense',label:'Линии защиты',desc:'Стратегии защиты',meta:'~16 КБ'},
  ]},
  {id:'documents',title:'Документы и доказательства',icon:Files,color:'amber',items:[
    {id:'documents-registry',label:'Реестр документов',desc:'Полный перечень',meta:'~28 КБ'},
    {id:'evidence-chain',label:'Цепочка доказательств',desc:'Граф связей',meta:'~32 КБ'},
    {id:'witness-matrix',label:'Матрица показаний',desc:'Согласованность',meta:'~26 КБ'},
    {id:'cross-refs',label:'Перекрёстные ссылки',desc:'Ссылки документов',meta:'~12 КБ'},
  ]},
  {id:'legal',title:'Правовой анализ',icon:Scale,color:'emerald',items:[
    {id:'compliance',label:'Проверки соответствия',desc:'Правовые проверки',meta:'~18 КБ'},
    {id:'deadlines',label:'Процессуальные сроки',desc:'Сроки УПК РФ',meta:'~10 КБ'},
    {id:'sentence-calc',label:'Калькулятор наказания',desc:'Расчёт наказания',meta:'~20 КБ'},
    {id:'recommendations',label:'Рекомендации защиты',desc:'ИИ-рекомендации',meta:'~15 КБ'},
  ]},
]

const ALL_IDS = GROUPS.flatMap(g=>g.items.map(i=>i.id))
const RECENT: RecentExport[] = [
  {id:'exp1',date:'2024-03-20T14:30:00',format:'PDF',elementsCount:16,size:2458000,status:'ready'},
  {id:'exp2',date:'2024-03-19T10:15:00',format:'JSON',elementsCount:12,size:850000,status:'ready'},
  {id:'exp3',date:'2024-03-18T16:45:00',format:'CSV',elementsCount:4,size:124000,status:'ready'},
  {id:'exp4',date:'2024-03-17T09:20:00',format:'PDF',elementsCount:8,size:1180000,status:'error'},
  {id:'exp5',date:'2024-03-16T11:00:00',format:'HTML',elementsCount:16,size:540000,status:'ready'},
]

const estimate = (items:Set<string>,fmt:ExportFormat,opt:ExportOptions) => {
  let b=items.size*F_CFG[fmt].perItem; if(opt.includeAI)b=Math.round(b*1.2);if(opt.includeCharts&&(fmt==='pdf'||fmt==='html'))b=Math.round(b*1.15);if(opt.language==='both')b*=2;if(opt.encrypt)b+=4096;return b
}
const buildName = (fmt:ExportFormat,opt:ExportOptions) => {
  const d=new Date(),ymd=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,ls=opt.language==='both'?'-ru-en':opt.language==='en'?'-en':'-ru';return`delo-${CASE_NUM}-${ymd}${ls}.${F_CFG[fmt].ext}`
}
const fmtDateRu = (iso:string) => {try{return new Date(iso).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return iso}}

// ─── Main ───

export function CaseExportCenter() {
  const [selFmt,setSelFmt]=useState<ExportFormat>('pdf')
  const [selItems,setSelItems]=useState<Set<string>>(()=>new Set(ALL_IDS.slice(0,12)))
  const [opt,setOpt]=useState<ExportOptions>({language:'ru',includeAI:true,includeCharts:true,pageFormat:'a4',orientation:'portrait',watermark:true,encrypt:false})
  const [isGen,setIsGen]=useState(false)
  const [prog,setProg]=useState(0)
  const [recent,setRecent]=useState<RecentExport[]>(RECENT)
  const [previewOpen,setPreviewOpen]=useState(false)
  const [resultOpen,setResultOpen]=useState(false)
  const [genName,setGenName]=useState('')
  const [genSize,setGenSize]=useState(0)

  const estSize=useMemo(()=>estimate(selItems,selFmt,opt),[selItems,selFmt,opt])
  const toggle=useCallback((id:string)=>setSelItems(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n}),[])
  const selectAll=useCallback(()=>{setSelItems(new Set(ALL_IDS));toast.success(`Выбрано: ${ALL_IDS.length}`)},[])
  const clearAll=useCallback(()=>{setSelItems(new Set());toast.info('Выбор очищен')},[])
  const updOpt=useCallback(<K extends keyof ExportOptions>(k:K,v:ExportOptions[K])=>setOpt(p=>({...p,[k]:v})),[])

  const generate=useCallback(async()=>{
    if(selItems.size===0){toast.error('Выберите элементы');return}
    setIsGen(true);setProg(0);const name=buildName(selFmt,opt),size=estimate(selItems,selFmt,opt);setGenName(name);setGenSize(size)
    for(const p of [15,35,55,75,90,100]){setProg(p);await new Promise(r=>setTimeout(r,250))}
    setIsGen(false);setProg(0)
    setRecent(p=>[{id:`exp-${Date.now()}`,date:new Date().toISOString(),format:F_CFG[selFmt].short,elementsCount:selItems.size,size,status:'ready'},...p].slice(0,8))
    toast.success('Экспорт сформирован',{description:`${F_CFG[selFmt].short} · ${selItems.size} элем. · ${fmtSize(size)}`,duration:4000})
    setTimeout(()=>setResultOpen(true),900)
  },[selItems,selFmt,opt])

  const download=useCallback(()=>{
    const h=`% Дело № ${CASE_NUM}\n% Формат: ${F_CFG[selFmt].short}\n% Элементов: ${selItems.size}\n\n`,b=Array.from(selItems).map(id=>`## ${id}\n[содержимое]\n`).join('\n')
    const blob=new Blob([h+b],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=genName||`delo-${CASE_NUM}.txt`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url)
    toast.success('Файл сохранён',{description:genName})
  },[selFmt,selItems,genName])

  const reDownload=useCallback((e:RecentExport)=>{
    if(e.status==='error'){toast.error('Ошибка — повторите генерацию');return}
    const blob=new Blob([`Дело № ${CASE_NUM} · ${e.format} · ${e.elementsCount} элем.\nЗаглушка.`],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`delo-${CASE_NUM}-${e.id}.${e.format.toLowerCase()}`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url)
    toast.success('Повторное скачивание',{description:`${e.format}`})
  },[])

  const fc=F_CFG[selFmt],FIcon=fc.icon

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 pb-28">
        {/* Header */}
        <Card className="rounded-xl shadow-sm border-l-4 border-purple-700 bg-gradient-to-r from-purple-900/30 via-stone-900/20 to-stone-900/20 overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-purple-700/20 shrink-0"><Package className="w-7 h-7 text-purple-700 dark:text-purple-400"/></div>
              <div className="flex-1 min-w-0"><h2 className="text-xl font-bold tracking-tight">Центр экспорта материалов дела</h2><p className="text-sm text-muted-foreground mt-0.5">Дело № {CASE_NUM} · Подготовка материалов для печати и архивирования</p></div>
              <Badge className="bg-purple-700 text-white gap-1 shrink-0"><Sparkles className="w-3 h-3"/>ИИ-помощник</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Format selector */}
        <Card className="rounded-xl shadow-sm"><CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">1. Выберите формат экспорта</p>
          <div className={GRID4}>
            {(Object.entries(F_CFG) as [ExportFormat,typeof fc][]).map(([k,f])=>{
              const active=selFmt===k,FIcon2=f.icon
              return <button key={k} onClick={()=>setSelFmt(k)} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all border-2 ${active?`border-${f.color} ${f.bg}`:'border-transparent bg-muted/30 hover:bg-muted/50'}`}>
                <FIcon2 className={`w-7 h-7 ${active?`text-${f.color} dark:text-${f.color.replace('700','400')}`:'text-muted-foreground'}`}/>
                <span className={`text-sm font-semibold ${active?'':'text-muted-foreground'}`}>{f.short}</span>
                <span className="text-[11px] text-muted-foreground">{f.desc}</span>
              </button>
            })}
          </div>
        </CardContent></Card>

        {/* Content selection */}
        <Card className="rounded-xl shadow-sm"><CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold">2. Выберите содержимое ({selItems.size}/{ALL_IDS.length})</p>
            <div className="flex gap-2"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectAll}>Все</Button><Button size="sm" variant="outline" className="h-7 text-xs" onClick={clearAll}>Очистить</Button></div>
          </div>
          <div className="space-y-4">
            {GROUPS.map(g=>{
              const GIcon=g.icon,gAcc=g.color==='purple'?'bg-purple-700/15 border-purple-700/30':g.color==='red'?'bg-red-700/15 border-red-700/30':g.color==='amber'?'bg-amber-600/15 border-amber-600/30':'bg-emerald-700/15 border-emerald-700/30'
              const gTxt=g.color==='purple'?'text-purple-700 dark:text-purple-400':g.color==='red'?'text-red-700 dark:text-red-400':g.color==='amber'?'text-amber-600 dark:text-amber-400':'text-emerald-700 dark:text-emerald-400'
              return <div key={g.id} className={`rounded-xl p-3 border ${gAcc}`}>
                <p className={`text-xs font-semibold flex items-center gap-1.5 mb-2 ${gTxt}`}><GIcon className="w-3.5 h-3.5"/>{g.title}</p>
                <div className={GRID2}>
                  {g.items.map(it=>{const on=selItems.has(it.id);return <label key={it.id} className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-all ${on?'bg-muted/50':'bg-transparent opacity-70'}`}>
                    <Checkbox checked={on} onCheckedChange={()=>toggle(it.id)} className="mt-0.5"/>
                    <div className="min-w-0"><p className="text-xs font-medium">{it.label}</p><p className="text-[11px] text-muted-foreground">{it.desc}</p><Badge variant="outline" className="text-[10px] h-4 mt-1">{it.meta}</Badge></div>
                  </label>})}
                </div>
              </div>
            })}
          </div>
        </CardContent></Card>

        {/* Export options */}
        <Card className="rounded-xl shadow-sm"><CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">3. Настройки экспорта</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><Label className="text-xs mb-1">Язык</Label><Select value={opt.language} onValueChange={v=>updOpt('language',v as ExportOptions['language'])}><SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ru">Русский</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="both">Оба</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs mb-1">Формат страницы</Label><Select value={opt.pageFormat} onValueChange={v=>updOpt('pageFormat',v as ExportOptions['pageFormat'])}><SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="a4">A4</SelectItem><SelectItem value="a3">A3</SelectItem><SelectItem value="letter">Letter</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs mb-1">Ориентация</Label><Select value={opt.orientation} onValueChange={v=>updOpt('orientation',v as ExportOptions['orientation'])}><SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="portrait">Вертикальная</SelectItem><SelectItem value="landscape">Горизонтальная</SelectItem></SelectContent></Select></div>
            <div className="flex items-center gap-3"><Switch checked={opt.includeAI} onCheckedChange={v=>updOpt('includeAI',v)}/><Label className="text-xs">ИИ-анализ</Label></div>
            <div className="flex items-center gap-3"><Switch checked={opt.includeCharts} onCheckedChange={v=>updOpt('includeCharts',v)}/><Label className="text-xs">Графики</Label></div>
            <div className="flex items-center gap-3"><Switch checked={opt.watermark} onCheckedChange={v=>updOpt('watermark',v)}/><Label className="text-xs">Водяной знак</Label></div>
            <div className="flex items-center gap-3"><Switch checked={opt.encrypt} onCheckedChange={v=>updOpt('encrypt',v)}/><Label className="text-xs"><Lock className="w-3 h-3 mr-1"/>Шифрование</Label></div>
          </div>
        </CardContent></Card>

        {/* Preview & Generate */}
        <div className={GRID2}>
          <Card className="rounded-xl shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4"/>Предпросмотр</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Формат:</span><Badge className={`${fc.bg} text-xs`}><FIcon className="w-3 h-3 mr-1"/>{fc.short}</Badge></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Элементов:</span><span className="font-bold tabular-nums">{selItems.size}</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Размер:</span><span className="font-bold tabular-nums">{fmtSize(estSize)}</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Язык:</span><span>{opt.language==='ru'?'Русский':opt.language==='en'?'English':'Оба'}</span></div>
                <Separator/>
                <div className="space-y-1.5 text-xs">{opt.includeAI&&<div className="flex items-center gap-1 text-purple-700"><Sparkles className="w-3 h-3"/>ИИ-анализ включён</div>}{opt.includeCharts&&<div className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3"/>Графики включены</div>}{opt.watermark&&<div className="flex items-center gap-1 text-stone-500"><Calendar className="w-3 h-3"/>Водяной знак</div>}{opt.encrypt&&<div className="flex items-center gap-1 text-red-700"><Lock className="w-3 h-3"/>Шифрование</div>}</div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 gap-1" onClick={()=>setPreviewOpen(true)}><Eye className="w-3.5 h-3.5"/>Полный предпросмотр</Button>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-l-4 border-purple-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-end justify-between gap-2"><div><p className="text-[11px] text-muted-foreground">Размер файла</p><p className="text-3xl font-bold tabular-nums">{fmtSize(estSize)}</p></div><Badge className="bg-purple-700 text-white gap-1"><FIcon className="w-3 h-3"/>{fc.short}</Badge></div>
              <Progress value={prog} className="h-3"/>
              {isGen && <p className="text-xs text-muted-foreground animate-pulse"><Loader2 className="w-3 h-3 inline mr-1"/>Формирование файла...</p>}
              <Button className={`w-full gap-2 bg-purple-700 hover:bg-purple-800 text-white`} size="lg" disabled={isGen||selItems.size===0} onClick={generate}>
                <Download className="w-4 h-4"/>{isGen?'Формирование...':'Сформировать и скачать'}
              </Button>
              <div className="flex gap-2"><Button variant="outline" size="sm" className="gap-1" onClick={download} disabled={isGen}><Printer className="w-3.5 h-3.5"/>Скачать</Button><Button variant="outline" size="sm" className="gap-1" onClick={()=>{toast.info('Открытие редактора...')}}><Sparkles className="w-3.5 h-3.5"/>Редактор</Button></div>
            </CardContent>
          </Card>
        </div>

        {/* Recent exports */}
        <Card className="rounded-xl shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><HardDrive className="w-4 h-4"/>Последние экспорты ({recent.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead className="text-xs">Дата</TableHead><TableHead className="text-xs">Формат</TableHead><TableHead className="text-xs">Элементов</TableHead><TableHead className="text-xs">Размер</TableHead><TableHead className="text-xs">Статус</TableHead><TableHead className="text-xs text-right">Действия</TableHead></TableRow></TableHeader>
              <TableBody>{recent.map(e=>{const sc=S_CFG[e.status],SIcon=sc.icon;return(
                <TableRow key={e.id} className={e.status==='error'?'bg-red-50/50 dark:bg-red-950/20':''}>
                  <TableCell className="text-xs tabular-nums">{fmtDateRu(e.date)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{e.format}</Badge></TableCell>
                  <TableCell className="text-xs tabular-nums">{e.elementsCount}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fmtSize(e.size)}</TableCell>
                  <TableCell><Badge className={`${sc.badge} text-xs gap-1`}><SIcon className="w-3 h-3"/>{sc.label}</Badge></TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>reDownload(e)} disabled={e.status!=='ready'}><Download className="w-3.5 h-3.5"/></Button></TooltipTrigger><TooltipContent>Скачать</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>setPreviewOpen(true)}><Eye className="w-3.5 h-3.5"/></Button></TooltipTrigger><TooltipContent>Просмотр</TooltipContent></Tooltip></TooltipProvider>
                  </TableCell>
                </TableRow>
              )})}</TableBody>
            </Table></div>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Предпросмотр экспорта — {fc.short}</DialogTitle><DialogDescription>Дело № {CASE_NUM} · {selItems.size} элементов</DialogDescription></DialogHeader>
            <div className="space-y-4 p-2">
              <div className="p-4 rounded-lg bg-muted/40 border text-xs">
                <p className="font-semibold mb-2">{fc.label} · Дело № {CASE_NUM}</p>
                <p>Формат: {opt.pageFormat} · {opt.orientation==='portrait'?'Вертикальная':'Горизонтальная'} · Язык: {opt.language==='ru'?'RU':opt.language==='en'?'EN':'RU+EN'}</p>
                <p>Элементов: {selItems.size} · Размер: {fmtSize(estSize)}</p>
                {opt.includeAI&&<p className="mt-1 text-purple-700">✓ ИИ-анализ</p>}{opt.watermark&&<p className="text-stone-500">✓ Водяной знак «Дело № {CASE_NUM}»</p>}{opt.encrypt&&<p className="text-red-700">✓ AES-256 шифрование</p>}
              </div>
              <div className="space-y-2">{GROUPS.map(g=>{const items=g.items.filter(i=>selItems.has(i.id));if(!items.length)return null;return <div key={g.id}><p className="text-xs font-semibold">{g.title}</p><div className="space-y-1">{items.map(it=><p key={it.id} className="text-[11px] text-muted-foreground pl-3">• {it.label} ({it.meta})</p>)}</div></div>})}</div>
            </div>
            <DialogFooter><Button className="bg-purple-700 hover:bg-purple-800 text-white gap-1" onClick={()=>{setPreviewOpen(false);generate()}}><Download className="w-4 h-4"/>Сформировать</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Result Sheet */}
        <Sheet open={resultOpen} onOpenChange={setResultOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="bg-gradient-to-r from-purple-900/30 via-card border-l-purple-700 border-l-4 rounded-r-lg">
              <SheetTitle className="text-base">Экспорт сформирован</SheetTitle>
              <SheetDescription className="sr-only">Результат экспорта дела</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 mt-1"><Badge className={`${fc.bg} text-xs`}><FIcon className="w-3 h-3 mr-1"/>{fc.short}</Badge><Badge variant="outline" className="text-xs tabular-nums">{selItems.size} элем.</Badge><Badge variant="outline" className="text-xs tabular-nums">{fmtSize(genSize)}</Badge></div>
            </SheetHeader>
            <div className="px-4 pb-6 space-y-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40"><p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>Файл успешно сформирован и готов к скачиванию.</p></div>
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1 text-xs">
                <p><strong>Файл:</strong> {genName}</p><p><strong>Размер:</strong> {fmtSize(genSize)}</p><p><strong>Элементов:</strong> {selItems.size}</p>
                {opt.includeAI&&<p className="text-purple-700">✓ ИИ-анализ</p>}{opt.encrypt&&<p className="text-red-700">✓ Шифрование AES-256</p>}
              </div>
            </div>
            <SheetFooter className="border-t bg-muted/30"><Button className="bg-purple-700 hover:bg-purple-800 text-white gap-2" onClick={download}><Download className="w-4 h-4"/>Скачать файл</Button></SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
