'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Package, FileText, Braces, Table as TableIcon, Code, Sparkles, Lock, Download, Loader2, Eye, CheckCircle2, XCircle, Clock, AlertTriangle, Shield, Users, Files, Link2, Scale, ShieldCheck, Calendar, HardDrive, RefreshCw, Printer } from 'lucide-react'
import { fmtSize, GRID2, GRID3, GRID4 } from '@/lib/shared-ui'
import * as caseApi from '@/lib/case-api'

// ─── Types ───
type ExportFormat = 'pdf'|'json'|'csv'|'html'
type ExportStatus = 'ready'|'processing'|'error'
interface RecentExport { id:string; date:string; format:string; elementsCount:number; size:number; status:ExportStatus }
interface ExportOptions { language:'ru'|'en'|'both'; includeAI:boolean; includeCharts:boolean; pageFormat:'a4'|'a3'|'letter'; orientation:'portrait'|'landscape'; watermark:boolean; encrypt:boolean }

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
    {id:'persons-list',label:'Участники',desc:'Все участники дела',meta:'~22 КБ'},
    {id:'episodes',label:'Эпизоды',desc:'Описание эпизодов',meta:'~30 КБ'},
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

// Item ID sets that map to export data sections
const DOCUMENT_IDS = ['documents-registry', 'evidence-chain', 'witness-matrix', 'cross-refs']
const PERSON_IDS = ['persons-list', 'episodes', 'guilt', 'defense']
const CORE_IDS = ['brief', 'dashboard', 'timeline', 'risk']

const estimate = (items:Set<string>,fmt:ExportFormat,opt:ExportOptions) => {
  let b=items.size*F_CFG[fmt].perItem; if(opt.includeAI)b=Math.round(b*1.2);if(opt.includeCharts&&(fmt==='pdf'||fmt==='html'))b=Math.round(b*1.15);if(opt.language==='both')b*=2;if(opt.encrypt)b+=4096;return b
}
const fmtDateRu = (iso:string) => {try{return new Date(iso).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return iso}}

// ─── Export Helpers ───

function exportAsCSV(data: { documents: any[], persons: any[], episodes: any[], dashboard: any }, caseNumber: string, selItems: Set<string>): void {
  const sections: string[] = []
  const hasDocs = DOCUMENT_IDS.some(id => selItems.has(id))
  const hasPersons = PERSON_IDS.some(id => selItems.has(id))
  const hasEpisodes = PERSON_IDS.some(id => selItems.has(id))

  // Documents section
  if (hasDocs && data.documents.length > 0) {
    sections.push('=== Документы ===')
    const headers = ['Название', 'Тип', 'Статус', 'Дата документа', 'Размер (КБ)', 'Дата загрузки', 'Описание']
    const rows = data.documents.map(d => [
      d.originalName, d.documentType ?? '', d.processingStatus,
      d.documentDate ?? '', Math.round(d.fileSize / 1024),
      new Date(d.uploadedAt).toLocaleDateString('ru-RU'), (d.summary ?? '').substring(0, 200)
    ].join(';'))
    sections.push(headers.join(';'))
    sections.push(...rows)
  }

  // Persons section
  if (hasPersons && data.persons.length > 0) {
    sections.push('')
    sections.push('=== Участники ===')
    const headers = ['ФИО', 'Роль', 'Статус', 'Описание']
    const rows = data.persons.map(p => [
      p.fullName, p.role ?? '', p.status ?? '', (p.description ?? '').substring(0, 200)
    ].join(';'))
    sections.push(headers.join(';'))
    sections.push(...rows)
  }

  // Episodes section
  if (hasEpisodes && data.episodes.length > 0) {
    sections.push('')
    sections.push('=== Эпизоды ===')
    const headers = ['Название', 'Описание', 'Дата', 'Тяжесть', 'Статус']
    const rows = data.episodes.map(e => [
      e.title, (e.description ?? '').substring(0, 200), e.date ?? '',
      e.severity ?? '', e.status ?? ''
    ].join(';'))
    sections.push(headers.join(';'))
    sections.push(...rows)
  }

  const csv = sections.join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `delo-${caseNumber}-export-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV экспорт выполнен')
}

function exportAsJSON(data: { documents: any[], persons: any[], episodes: any[], dashboard: any }, caseNumber: string, selItems: Set<string>): void {
  const hasDocs = DOCUMENT_IDS.some(id => selItems.has(id))
  const hasPersons = PERSON_IDS.some(id => selItems.has(id))
  const hasEpisodes = PERSON_IDS.some(id => selItems.has(id))
  const hasDashboard = CORE_IDS.some(id => selItems.has(id))
  const exportData: Record<string, any> = {
    caseNumber,
    exportedAt: new Date().toISOString(),
  }
  if (hasDocs) exportData.documents = data.documents
  if (hasPersons) exportData.persons = data.persons
  if (hasEpisodes) exportData.episodes = data.episodes
  if (hasDashboard) exportData.dashboard = data.dashboard
  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `delo-${caseNumber}-export-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('JSON экспорт выполнен')
}

function exportAsHTML(data: { documents: any[], persons: any[], episodes: any[], dashboard: any }, caseNumber: string, selItems: Set<string>): void {
  const rows = (items: any[], cols: string[]) => items.map(d =>
    `<tr>${cols.map(c => `<td>${d[c] ?? '—'}</td>`).join('')}</tr>`
  ).join('')

  const hasDocs = DOCUMENT_IDS.some(id => selItems.has(id))
  const hasPersons = PERSON_IDS.some(id => selItems.has(id))
  const hasEpisodes = PERSON_IDS.some(id => selItems.has(id))

  let sectionsHtml = ''
  if (hasDocs) {
    sectionsHtml += `
<h2>Документы (${data.documents.length})</h2>
<table><tr><th>Название</th><th>Тип</th><th>Статус</th><th>Размер</th><th>Описание</th></tr>
${data.documents.map(d => `<tr><td>${d.originalName}</td><td>${d.documentType ?? '—'}</td><td>${d.processingStatus}</td><td>${fmtSize(d.fileSize)}</td><td>${(d.summary ?? '—').substring(0, 300)}</td></tr>`).join('')}</table>`
  }
  if (hasPersons) {
    sectionsHtml += `
<h2>Участники (${data.persons.length})</h2>
<table><tr><th>ФИО</th><th>Роль</th><th>Статус</th><th>Описание</th></tr>
${data.persons.map(p => `<tr><td>${p.fullName}</td><td>${p.role ?? '—'}</td><td>${p.status ?? '—'}</td><td>${(p.description ?? '—').substring(0, 200)}</td></tr>`).join('')}</table>`
  }
  if (hasEpisodes) {
    sectionsHtml += `
<h2>Эпизоды (${data.episodes.length})</h2>
<table><tr><th>Название</th><th>Дата</th><th>Тяжесть</th><th>Статус</th><th>Описание</th></tr>
${data.episodes.map(e => `<tr><td>${e.title}</td><td>${e.date ?? '—'}</td><td>${e.severity ?? '—'}</td><td>${e.status ?? '—'}</td><td>${(e.description ?? '').substring(0, 200)}</td></tr>`).join('')}</table>`
  }

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Экспорт дела ${caseNumber}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#333;background:#fff}h1{color:#2c3e50;border-bottom:2px solid #c0392b;padding-bottom:10px}h2{color:#34495e;margin-top:25px}table{border-collapse:collapse;width:100%;margin:15px 0}th{background:#ecf0f1;padding:10px;text-align:left;font-weight:600}td{border:1px solid #ddd;padding:8px}tr:nth-child(even){background:#f9f9f9}.badge{padding:3px 8px;border-radius:4px;font-size:11px;color:#fff}.badge-green{background:#27ae60}.badge-yellow{background:#f39c12}.badge-red{background:#c0392b}</style></head><body>
<h1>Экспорт материалов уголовного дела № ${caseNumber}</h1>
<p>Дата экспорта: ${new Date().toLocaleDateString('ru-RU')}</p>
${sectionsHtml}
</body></html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close(); toast.success('HTML отчёт открыт') }
  else { toast.error('Не удалось открыть окно') }
}

function exportAsPDF(data: { documents: any[], persons: any[], episodes: any[], dashboard: any }, caseNumber: string, selItems: Set<string>): void {
  // Use printable HTML approach for PDF
  const hasDocs = DOCUMENT_IDS.some(id => selItems.has(id))
  const hasPersons = PERSON_IDS.some(id => selItems.has(id))
  const hasEpisodes = PERSON_IDS.some(id => selItems.has(id))

  let sectionsHtml = ''
  let sectionNum = 0
  if (hasDocs) {
    sectionNum++
    sectionsHtml += `
<h2>${sectionNum}. Документы (${data.documents.length})</h2>
<table><tr><th style="width:35%">Название</th><th style="width:15%">Тип</th><th style="width:10%">Статус</th><th style="width:10%">Размер</th><th style="width:30%">Описание</th></tr>
${data.documents.map(d => `<tr><td>${d.originalName}</td><td>${d.documentType ?? '—'}</td><td>${d.processingStatus}</td><td>${fmtSize(d.fileSize)}</td><td>${(d.summary ?? '—').substring(0, 150)}</td></tr>`).join('')}</table>`
  }
  if (hasPersons) {
    sectionNum++
    sectionsHtml += `
<h2>${sectionNum}. Участники (${data.persons.length})</h2>
<table><tr><th style="width:30%">ФИО</th><th style="width:20%">Роль</th><th style="width:15%">Статус</th><th style="width:35%">Описание</th></tr>
${data.persons.map(p => `<tr><td>${p.fullName}</td><td>${p.role ?? '—'}</td><td>${p.status ?? '—'}</td><td>${(p.description ?? '—').substring(0, 150)}</td></tr>`).join('')}</table>`
  }
  if (hasEpisodes) {
    sectionNum++
    sectionsHtml += `
<h2>${sectionNum}. Эпизоды (${data.episodes.length})</h2>
<table><tr><th style="width:25%">Название</th><th style="width:10%">Дата</th><th style="width:10%">Тяжесть</th><th style="width:10%">Статус</th><th style="width:45%">Описание</th></tr>
${data.episodes.map(e => `<tr><td>${e.title}</td><td>${e.date ?? '—'}</td><td>${e.severity ?? '—'}</td><td>${e.status ?? '—'}</td><td>${(e.description ?? '').substring(0, 200)}</td></tr>`).join('')}</table>`
  }

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>PDF Отчёт — Дело ${caseNumber}</title>
<style>@page{size:A4;margin:15mm}body{font-family:'Segoe UI',Arial,sans-serif;padding:0;color:#333}h1{color:#2c3e50;font-size:18pt;border-bottom:2pt solid #c0392b;padding-bottom:8pt}h2{color:#34495e;font-size:14pt;margin-top:20pt}table{border-collapse:collapse;width:100%;margin:10pt 0;font-size:9pt}th{background:#ecf0f1;padding:6pt;text-align:left;font-weight:600}td{border:0.5pt solid #ddd;padding:5pt}tr:nth-child(even){background:#f9f9f9}.header-bar{display:flex;justify-content:space-between;align-items:center;border-bottom:1pt solid #bdc3c7;padding:5pt 0;margin-bottom:15pt;font-size:8pt;color:#7f8c8d}</style></head><body>
<div class="header-bar"><span>Система Управления Уголовным Делом</span><span>Дело № ${caseNumber}</span></div>
<h1>Отчёт по материалам уголовного дела № ${caseNumber}</h1>
<p style="font-size:8pt;color:#7f8c8d">Дата формирования: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}</p>
${sectionsHtml}
</body></html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); toast.success('PDF отчёт подготовлен для печати') }
  else { toast.error('Не удалось открыть окно') }
}

// ─── Main ───

export function CaseExportCenter({ caseId }: { caseId: string }) {
  const [selFmt,setSelFmt]=useState<ExportFormat>('pdf')
  const [selItems,setSelItems]=useState<Set<string>>(()=>new Set(ALL_IDS.slice(0,12)))
  const [opt,setOpt]=useState<ExportOptions>({language:'ru',includeAI:true,includeCharts:true,pageFormat:'a4',orientation:'portrait',watermark:true,encrypt:false})
  const [isGen,setIsGen]=useState(false)
  const [prog,setProg]=useState(0)
  const [recent,setRecent]=useState<RecentExport[]>([])
  const [previewOpen,setPreviewOpen]=useState(false)
  const [resultOpen,setResultOpen]=useState(false)
  const [genName,setGenName]=useState('')
  const [genSize,setGenSize]=useState(0)

  // Fetch real case data for exports
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', caseId],
    queryFn: () => caseApi.getDocuments(caseId),
    enabled: !!caseId,
    refetchInterval: 60000,
    staleTime: 60000,
  })
  const { data: persons = [] } = useQuery({
    queryKey: ['persons', caseId],
    queryFn: () => caseApi.getPersons(caseId),
    enabled: !!caseId,
    refetchInterval: 60000,
    staleTime: 60000,
  })
  const { data: episodes = [] } = useQuery({
    queryKey: ['episodes', caseId],
    queryFn: () => caseApi.getEpisodes(caseId),
    enabled: !!caseId,
    refetchInterval: 60000,
    staleTime: 60000,
  })
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', caseId],
    queryFn: () => caseApi.getDashboardStats(caseId),
    enabled: !!caseId,
    refetchInterval: 60000,
    staleTime: 60000,
  })

  const exportData = { documents, persons, episodes, dashboard }
  const caseNumber = dashboard?.caseInfo?.caseNumber ?? caseId

  const estSize=useMemo(()=>estimate(selItems,selFmt,opt),[selItems,selFmt,opt])
  const toggle=useCallback((id:string)=>setSelItems(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n}),[])
  const selectAll=useCallback(()=>{setSelItems(new Set(ALL_IDS));toast.success(`Выбрано: ${ALL_IDS.length}`)},[])
  const clearAll=useCallback(()=>{setSelItems(new Set());toast.info('Выбор очищен')},[])
  const updOpt=useCallback(<K extends keyof ExportOptions>(k:K,v:ExportOptions[K])=>setOpt(p=>({...p,[k]:v})),[])

  const generate=useCallback(async()=>{
    if(selItems.size===0){toast.error('Выберите элементы');return}
    setIsGen(true);setProg(0)
    const name=`delo-${caseNumber}-${new Date().toISOString().slice(0,10)}.${F_CFG[selFmt].ext}`
    const size=estSize
    setGenName(name);setGenSize(size)

    // Simulate progress while actually generating the export
    for(const p of [10,30,60,80,95,100]){setProg(p);await new Promise(r=>setTimeout(r,200))}

    // Actually generate the export based on format
    const data = { documents, persons, episodes, dashboard }
    switch(selFmt) {
      case 'csv': exportAsCSV(data, caseNumber, selItems); break
      case 'json': exportAsJSON(data, caseNumber, selItems); break
      case 'html': exportAsHTML(data, caseNumber, selItems); break
      case 'pdf': exportAsPDF(data, caseNumber, selItems); break
    }

    setIsGen(false);setProg(0)
    setRecent(p=>[{id:`exp-${Date.now()}`,date:new Date().toISOString(),format:F_CFG[selFmt].short,elementsCount:selItems.size,size,status:'ready'},...p].slice(0,8))
    setTimeout(()=>setResultOpen(true),900)
  },[selItems,selFmt,opt,documents,persons,episodes,dashboard,caseNumber,estSize])

  const fc=F_CFG[selFmt],FIcon=fc.icon

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 pb-28">
        {/* Header */}
        <Card className="rounded-xl shadow-sm border-l-4 border-purple-700 bg-gradient-to-r from-purple-900/30 via-stone-900/20 to-stone-900/20 overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-purple-700/20 shrink-0"><Package className="w-7 h-7 text-purple-700 dark:text-purple-400"/></div>
              <div className="flex-1 min-w-0"><h2 className="text-xl font-bold tracking-tight">Центр экспорта материалов дела</h2><p className="text-sm text-muted-foreground mt-0.5">Дело № {caseNumber} · Подготовка материалов для печати и архивирования</p></div>
              <Badge className="bg-purple-700 text-white gap-1 shrink-0"><Sparkles className="w-3 h-3"/>ИИ-помощник</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Data summary */}
        <Card className="rounded-xl shadow-sm"><CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Доступные данные для экспорта</p>
          <div className={GRID4}>
            <div className="p-3 rounded-lg bg-muted/40 text-center"><p className="text-2xl font-bold">{documents.length}</p><p className="text-xs text-muted-foreground">Документов</p></div>
            <div className="p-3 rounded-lg bg-muted/40 text-center"><p className="text-2xl font-bold">{persons.length}</p><p className="text-xs text-muted-foreground">Участников</p></div>
            <div className="p-3 rounded-lg bg-muted/40 text-center"><p className="text-2xl font-bold">{episodes.length}</p><p className="text-xs text-muted-foreground">Эпизодов</p></div>
            <div className="p-3 rounded-lg bg-muted/40 text-center"><p className="text-2xl font-bold">{dashboard?.complianceChecks?.total ?? 0}</p><p className="text-xs text-muted-foreground">Проверок</p></div>
          </div>
        </CardContent></Card>

        {/* Format selector */}
        <Card className="rounded-xl shadow-sm"><CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">1. Выберите формат экспорта</p>
          <div className={GRID4}>
            {(Object.entries(F_CFG) as [ExportFormat,typeof fc][]).map(([k,f])=>{
              const active=selFmt===k,FIcon2=f.icon
              return <button key={k} onClick={()=>setSelFmt(k)} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all border-2 ${active?`border-purple-700 bg-purple-700/15`:'border-transparent bg-muted/30 hover:bg-muted/50'}`}>
                <FIcon2 className={`w-7 h-7 ${active?'text-purple-700 dark:text-purple-400':'text-muted-foreground'}`}/>
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
            <div className="flex items-center gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={opt.includeAI} onChange={e=>updOpt('includeAI',e.target.checked)} className="rounded"/><Label className="text-xs">ИИ-анализ</Label></label></div>
            <div className="flex items-center gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={opt.includeCharts} onChange={e=>updOpt('includeCharts',e.target.checked)} className="rounded"/><Label className="text-xs">Графики</Label></label></div>
            <div className="flex items-center gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={opt.watermark} onChange={e=>updOpt('watermark',e.target.checked)} className="rounded"/><Label className="text-xs">Водяной знак</Label></label></div>
          </div>
        </CardContent></Card>

        {/* Generate */}
        <div className={GRID2}>
          <Card className="rounded-xl shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4"/>Предпросмотр</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Формат:</span><Badge className={`${fc.bg} text-xs`}><FIcon className="w-3 h-3 mr-1"/>{fc.short}</Badge></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Элементов:</span><span className="font-bold tabular-nums">{selItems.size}</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Размер:</span><span className="font-bold tabular-nums">{fmtSize(estSize)}</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Язык:</span><span>{opt.language==='ru'?'Русский':opt.language==='en'?'English':'Оба'}</span></div>
                <Separator/>
                <div className="space-y-1.5 text-xs">{opt.includeAI&&<div className="flex items-center gap-1 text-purple-700"><Sparkles className="w-3 h-3"/>ИИ-анализ включён</div>}{opt.includeCharts&&<div className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3"/>Графики включены</div>}{opt.watermark&&<div className="flex items-center gap-1 text-stone-500"><Calendar className="w-3 h-3"/>Водяной знак</div>}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-l-4 border-purple-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-end justify-between gap-2"><div><p className="text-[11px] text-muted-foreground">Размер файла</p><p className="text-3xl font-bold tabular-nums">{fmtSize(estSize)}</p></div><Badge className="bg-purple-700 text-white gap-1"><FIcon className="w-3 h-3"/>{fc.short}</Badge></div>
              <Progress value={prog} className="h-3"/>
              {isGen && <p className="text-xs text-muted-foreground animate-pulse"><Loader2 className="w-3 h-3 inline mr-1"/>Формирование файла...</p>}
              <Button className="w-full gap-2 bg-purple-700 hover:bg-purple-800 text-white" size="lg" disabled={isGen||selItems.size===0} onClick={generate}>
                <Download className="w-4 h-4"/>{isGen?'Формирование...':'Сформировать и скачать'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent exports */}
        {recent.length > 0 && <Card className="rounded-xl shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><HardDrive className="w-4 h-4"/>Последние экспорты ({recent.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead className="text-xs">Дата</TableHead><TableHead className="text-xs">Формат</TableHead><TableHead className="text-xs">Элементов</TableHead><TableHead className="text-xs">Размер</TableHead><TableHead className="text-xs">Статус</TableHead></TableRow></TableHeader>
              <TableBody>{recent.map(e=>{const sc=S_CFG[e.status],SIcon=sc.icon;return(
                <TableRow key={e.id}>
                  <TableCell className="text-xs tabular-nums">{fmtDateRu(e.date)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{e.format}</Badge></TableCell>
                  <TableCell className="text-xs tabular-nums">{e.elementsCount}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fmtSize(e.size)}</TableCell>
                  <TableCell><Badge className={`${sc.badge} text-xs gap-1`}><SIcon className="w-3 h-3"/>{sc.label}</Badge></TableCell>
                </TableRow>
              )})}</TableBody>
            </Table></div>
          </CardContent>
        </Card>}
      </div>
    </TooltipProvider>
  )
}
