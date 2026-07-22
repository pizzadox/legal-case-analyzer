'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Scale, CheckCircle, AlertTriangle, Info, XCircle, Loader2, Zap, Shield, BarChart3, Download, FileText, Clock, History, Flame, TrendingUp
} from 'lucide-react'
import { mockComplianceChecks, mockDocuments, mockAuditLog } from '@/lib/mock-data'
import { checkCompliance, getComplianceResults, getDocuments, getAuditLog } from '@/lib/case-api'
import type { LegalComplianceData, AuditLogEntry } from '@/lib/case-store'

const STATUS: Record<string, { icon: React.ReactNode; badge: string; label: string; severityIcon: React.ReactNode; dotColor: string }> = {
  compliant: { icon: <CheckCircle className="w-3 h-3 text-emerald-600" />, badge: 'bg-emerald-700 text-white', label: 'Соответствует', severityIcon: <CheckCircle className="w-4 h-4 text-emerald-600" />, dotColor: 'bg-emerald-500' },
  warning: { icon: <AlertTriangle className="w-3 h-3 text-amber-500" />, badge: 'bg-amber-600 text-white', label: 'Предупреждение', severityIcon: <AlertTriangle className="w-4 h-4 text-amber-500" />, dotColor: 'bg-amber-500' },
  violation: { icon: <XCircle className="w-3 h-3 text-red-600" />, badge: 'bg-red-700 text-white', label: 'Нарушение', severityIcon: <XCircle className="w-4 h-4 text-red-600" />, dotColor: 'bg-red-500' },
  needs_review: { icon: <Info className="w-3 h-3 text-stone-500" />, badge: 'bg-stone-600 text-white', label: 'Требует проверки', severityIcon: <Info className="w-4 h-4 text-stone-500" />, dotColor: 'bg-stone-400' },
}

const TYPE_LABEL: Record<string, string> = {
  article_applicability: 'Применимость статей',
  procedure_compliance: 'Процессуальное соблюдение',
  evidence_admissibility: 'Допустимость доказательств',
  statute_limitations: 'Сроки давности',
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  article_applicability: <Scale className="w-3 h-3" />,
  procedure_compliance: <Shield className="w-3 h-3" />,
  evidence_admissibility: <CheckCircle className="w-3 h-3" />,
  statute_limitations: <AlertTriangle className="w-3 h-3" />,
}

const AUDIT_SEV_DOT: Record<string, string> = { info: 'bg-stone-400', warning: 'bg-amber-500', critical: 'bg-red-600' }
const AUDIT_CAT_BADGE: Record<string, string> = {
  upload: 'bg-red-700 text-white', analysis: 'bg-amber-600 text-white', edit: 'bg-stone-600 text-white',
  delete: 'bg-red-800 text-white', search: 'bg-emerald-700 text-white', export: 'bg-stone-500 text-white',
  login: 'bg-stone-700 text-white', system: 'bg-stone-600 text-white',
}

// Mock compliance score trend (6 monthly data points)
const COMPLIANCE_TREND = [
  { month: 'Янв', value: 88 },
  { month: 'Фев', value: 82 },
  { month: 'Мар', value: 75 },
  { month: 'Апр', value: 70 },
  { month: 'Май', value: 68 },
  { month: 'Июн', value: 72 },
]

// Compliance Trend Sparkline (SVG)
function ComplianceTrendSparkline() {
  const w = 240, h = 60, pad = 6
  const max = 100, min = 50
  const pts = COMPLIANCE_TREND.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / (COMPLIANCE_TREND.length - 1)
    const y = h - pad - ((d.value - min) / (max - min)) * (h - pad * 2)
    return { x, y, ...d }
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${path} L ${pts[pts.length - 1].x.toFixed(1)} ${h - pad} L ${pts[0].x.toFixed(1)} ${h - pad} Z`
  const lastVal = COMPLIANCE_TREND[COMPLIANCE_TREND.length - 1].value
  const trend = lastVal >= COMPLIANCE_TREND[COMPLIANCE_TREND.length - 2].value
  return (
    <div className="flex items-center gap-3">
      <svg width={w} height={h} className="shrink-0">
        <defs><linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity="0.35" /><stop offset="100%" stopColor="#059669" stopOpacity="0" /></linearGradient></defs>
        <path d={areaPath} fill="url(#compGrad)" />
        <path d={path} stroke="#059669" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#059669" />)}
      </svg>
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">Текущий: <span className="font-bold text-emerald-700">{lastVal}%</span></p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend ? <TrendingUp className="w-3 h-3 text-emerald-700" /> : <TrendingUp className="w-3 h-3 text-red-700 rotate-180" />}
          <span className={trend ? 'text-emerald-700' : 'text-red-700'}>{trend ? '↑ Растёт' : '↓ Снижается'}</span>
        </p>
        <p className="text-xs text-muted-foreground">6 мес. динамика</p>
      </div>
    </div>
  )
}

// Audit Log Section
function AuditLogSection({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card className="rounded-xl shadow-sm border-l-4 border-stone-500">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-amber-600" /> Журнал аудита <Badge variant="outline" className="text-xs">{entries.length} записей</Badge></CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="relative pl-6 space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
          {entries.map((entry, i) => (
            <div key={entry.id} className="relative group">
              <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${AUDIT_SEV_DOT[entry.severity] ?? 'bg-stone-400'} ring-2 ring-background transition-transform group-hover:scale-125`} />
              {i < entries.length - 1 && <div className="absolute -left-[21px] top-3 w-0.5 h-full bg-stone-300 dark:bg-stone-600" />}
              <div className="flex items-start gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge className={`${AUDIT_CAT_BADGE[entry.category] ?? 'bg-stone-600 text-white'} text-xs capitalize`}>{entry.category}</Badge>
                    {entry.severity === 'critical' && <Badge className="bg-red-700 text-white text-xs">Критично</Badge>}
                    {entry.severity === 'warning' && <Badge className="bg-amber-600 text-white text-xs">Предупр.</Badge>}
                    <span className="text-xs font-medium">{entry.action}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                  <p className="text-xs text-muted-foreground">{entry.actor} • {new Date(entry.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Export CSV helper
function exportComplianceCSV(items: LegalComplianceData[]) {
  const rows = ['Document,CheckType,Status,Description,Recommendation,LegalBasis,CheckedAt']
  items.forEach(c => {
    rows.push(`"${c.documentId}",${TYPE_LABEL[c.checkType] ?? c.checkType},${c.label ?? c.status},"${c.description}",${c.recommendation ?? ''},${c.legalBasis ?? ''},${c.checkedAt}`)
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'compliance.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV экспорт выполнен')
}

// Compliance Timeline component
function ComplianceTimeline({ items }: { items: LegalComplianceData[] }) {
  const sorted = [...items]
    .filter(i => i && i.checkedAt)
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" /> Хронология проверок</CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="relative pl-6 space-y-3 max-h-80 overflow-y-auto">
          {sorted.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Нет данных о проверках</p>
          )}
          {sorted.map((item, i) => {
            const statusConfig = STATUS[item.status] ?? STATUS.needs_review
            const dateObj = new Date(item.checkedAt)
            const dateStr = isNaN(dateObj.getTime())
              ? '—'
              : dateObj.toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
            return (
              <div key={item.id} className="relative group">
                <div className={`absolute -left-6 w-3 h-3 rounded-full ${statusConfig.dotColor} ring-2 ring-background transition-transform group-hover:scale-125`} />
                {i < sorted.length - 1 && <div className="absolute -left-[21px] top-3 w-0.5 h-full bg-stone-300 dark:bg-stone-600" />}
                <div className="flex items-start gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <Badge className={statusConfig.badge}>{statusConfig.label}</Badge>
                      <span className="text-xs font-medium">{TYPE_LABEL[item.checkType] ?? item.checkType}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{dateStr}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function CaseLegalCheck() {
  const [filterStatus, setFilterStatus] = useState('all')
  const [checkDocId, setCheckDocId] = useState('')

  const { data: complianceData, isLoading: compLoading } = useQuery({ queryKey: ['compliance'], queryFn: getComplianceResults, retry: 1 })
  const { data: docsData } = useQuery({ queryKey: ['documents'], queryFn: getDocuments, retry: 1 })
  const { data: auditData } = useQuery({ queryKey: ['audit-log'], queryFn: () => getAuditLog(10), retry: 1 })

  const compliance = complianceData ?? mockComplianceChecks
  const documents = docsData ?? mockDocuments
  const auditLog = auditData ?? mockAuditLog.slice(0, 10)

  const checkMutation = useMutation({
    mutationFn: () => checkCompliance(checkDocId || undefined),
    onSuccess: () => toast.success('Проверка выполнена'),
    onError: () => toast.error('Ошибка проверки'),
  })

  const filtered = useMemo(() =>
    filterStatus === 'all' ? compliance : compliance.filter(c => c.status === filterStatus),
    [compliance, filterStatus]
  )

  const summary = useMemo(() => ({
    violations: compliance.filter(c => c.status === 'violation').length,
    warnings: compliance.filter(c => c.status === 'warning').length,
    compliant: compliance.filter(c => c.status === 'compliant').length,
    needsReview: compliance.filter(c => c.status === 'needs_review').length,
  }), [compliance])

  if (compLoading) return <div className="grid grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}</div>

  const complianceScore = compliance.length > 0 ? Math.round((summary.compliant / compliance.length) * 100) : 0
  const criticalCount = summary.violations
  const majorCount = summary.warnings

  return (
    <div className="space-y-6">
      {/* Critical Violations Alert */}
      {(criticalCount > 0 || majorCount > 0) && (
        <Card className="bg-gradient-to-r from-red-900/30 to-stone-900/10 border-l-4 border-red-700 rounded-xl shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-700/20 shrink-0 animate-pulse"><Flame className="w-5 h-5 text-red-600" /></div>
              <div className="flex-1">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <span className="text-red-700">Критические нарушения</span>
                  <Badge className="bg-red-700 text-white">{criticalCount} критич.</Badge>
                  {majorCount > 0 && <Badge className="bg-amber-600 text-white">{majorCount} major</Badge>}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Требуется немедленное внимание — возможны основания для исключения доказательств или прекращения дела</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl border-red-300 text-red-700 hover:bg-red-50" onClick={() => setFilterStatus('violation')}>Подробнее</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Нарушения', value: summary.violations, icon: XCircle, severityIcon: STATUS.violation.severityIcon, gradient: 'from-red-900/20 to-stone-900/10', border: 'border-red-700' },
          { label: 'Предупреждения', value: summary.warnings, icon: AlertTriangle, severityIcon: STATUS.warning.severityIcon, gradient: 'from-amber-900/20 to-stone-900/10', border: 'border-amber-600' },
          { label: 'Соответствует', value: summary.compliant, icon: CheckCircle, severityIcon: STATUS.compliant.severityIcon, gradient: 'from-emerald-900/20 to-stone-900/10', border: 'border-emerald-700' },
          { label: 'Требует проверки', value: summary.needsReview, icon: Info, severityIcon: STATUS.needs_review.severityIcon, gradient: 'from-stone-800/20 to-stone-900/10', border: 'border-stone-600' },
        ].map(({ label, value, icon: Icon, gradient, border }) => (
          <Card key={label} className={`border-l-4 ${border} bg-gradient-to-r ${gradient} rounded-xl shadow-sm`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><span className="text-xl font-bold">{value}</span></div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Score Progress Bar + Trend */}
      <Card className="bg-gradient-to-r from-emerald-900/20 to-stone-900/10 border-l-4 border-emerald-700 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-700/20 shrink-0"><BarChart3 className="w-5 h-5 text-emerald-700" /></div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold text-sm">Соответствие нормам РФ</p>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={complianceScore} className="h-2 flex-1" />
                <Badge className={complianceScore >= 70 ? 'bg-emerald-700 text-white' : complianceScore >= 40 ? 'bg-amber-600 text-white' : 'bg-red-700 text-white'}>{complianceScore}%</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Процесс соблюдения правовых норм: {summary.compliant} из {compliance.length} проверок</p>
            </div>
            <Separator orientation="vertical" className="h-12 hidden md:block" />
            <div className="shrink-0"><ComplianceTrendSparkline /></div>
            <div className="flex items-center gap-2">
              <Select value={checkDocId} onValueChange={setCheckDocId}>
                <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Документ для проверки" /></SelectTrigger>
                <SelectContent>{documents.map(d => <SelectItem key={d.id} value={d.id}>{d.originalName}</SelectItem>)}</SelectContent>
              </Select>
              <Button className="rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-sm" onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending}>
                {checkMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}Проверить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Timeline */}
      <ComplianceTimeline items={compliance} />

      {/* Filter + Export */}
      <div className="flex items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="violation">Нарушения</SelectItem>
            <SelectItem value="warning">Предупреждения</SelectItem>
            <SelectItem value="compliant">Соответствует</SelectItem>
            <SelectItem value="needs_review">Требует проверки</SelectItem>
          </SelectContent>
        </Select>
        <Badge className="bg-stone-600 text-white">{filtered.length} проверок</Badge>
        <Separator orientation="vertical" className="h-4 mx-2" />
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => exportComplianceCSV(compliance)}><Download className="w-3 h-3" />Export CSV</Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => toast.info('PDF экспорт будет доступен в будущих версиях')}><FileText className="w-3 h-3" />Export PDF</Button>
      </div>

      {/* Results */}
      <Accordion type="multiple" className="space-y-2">
        {filtered.map(item => (
          <AccordionItem key={item.id} value={item.id} className="border rounded-xl px-4 shadow-sm">
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                {STATUS[item.status]?.severityIcon ?? STATUS[item.status]?.icon}
                <span className="truncate">{TYPE_LABEL[item.checkType] ?? item.checkType}</span>
                <Badge className={STATUS[item.status]?.badge ?? 'bg-stone-500 text-white'}>{STATUS[item.status]?.label ?? item.status}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{item.description}</p>
              {item.recommendation && (
                <div className="p-2 rounded-lg bg-muted">
                  <p className="font-medium text-xs flex items-center gap-1"><Shield className="w-3 h-3" />Рекомендация:</p>
                  <p className="text-xs">{item.recommendation}</p>
                </div>
              )}
              {item.legalBasis && (
                <div className="p-2 rounded-lg bg-muted">
                  <p className="font-medium text-xs flex items-center gap-1"><Scale className="w-3 h-3" />Правовая основа:</p>
                  <p className="text-xs">{item.legalBasis}</p>
                </div>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {(() => {
                  const d = new Date(item.checkedAt)
                  return isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                })()}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filtered.length === 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6 text-center">
            <Scale className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Нет результатов проверки</p>
            <p className="text-xs text-muted-foreground">Запустите правовую проверку для анализа</p>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <AuditLogSection entries={auditLog} />

      <Separator />
      <p className="text-xs text-muted-foreground">Правовая проверка по нормам РФ • Дело № 2024-00145</p>
    </div>
  )
}
