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
import { toast } from 'sonner'
import {
  Scale, CheckCircle, AlertTriangle, Info, XCircle, Loader2, Zap, Shield
} from 'lucide-react'
import { mockComplianceChecks, mockDocuments } from '@/lib/mock-data'
import { checkCompliance, getComplianceResults, getDocuments } from '@/lib/case-api'
import type { LegalComplianceData } from '@/lib/case-store'

const STATUS: Record<string, { icon: React.ReactNode; badge: string; label: string; color: string }> = {
  compliant: { icon: <CheckCircle className="w-3 h-3 text-emerald-600" />, badge: 'bg-emerald-700 text-white', label: 'Соответствует', color: '#16a34a' },
  warning: { icon: <AlertTriangle className="w-3 h-3 text-amber-500" />, badge: 'bg-amber-600 text-white', label: 'Предупреждение', color: '#d97706' },
  violation: { icon: <XCircle className="w-3 h-3 text-red-600" />, badge: 'bg-red-700 text-white', label: 'Нарушение', color: '#dc2626' },
  needs_review: { icon: <Info className="w-3 h-3 text-stone-500" />, badge: 'bg-stone-600 text-white', label: 'Требует проверки', color: '#57534e' },
}

const TYPE_LABEL: Record<string, string> = {
  article_applicability: 'Применимость статей',
  procedure_compliance: 'Процессуальное соблюдение',
  evidence_admissibility: 'Допустимость доказательств',
  statute_limitations: 'Сроки давности',
}

export function CaseLegalCheck() {
  const [filterStatus, setFilterStatus] = useState('all')
  const [checkDocId, setCheckDocId] = useState('')

  const { data: complianceData, isLoading: compLoading } = useQuery({ queryKey: ['compliance'], queryFn: getComplianceResults, retry: 1 })
  const { data: docsData } = useQuery({ queryKey: ['documents'], queryFn: getDocuments, retry: 1 })

  const compliance = complianceData ?? mockComplianceChecks
  const documents = docsData ?? mockDocuments

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

  const complianceScore = Math.round((summary.compliant / compliance.length) * 100)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Нарушения', value: summary.violations, icon: XCircle, color: 'border-red-700' },
          { label: 'Предупреждения', value: summary.warnings, icon: AlertTriangle, color: 'border-amber-600' },
          { label: 'Соответствует', value: summary.compliant, icon: CheckCircle, color: 'border-emerald-700' },
          { label: 'Требует проверки', value: summary.needsReview, icon: Info, color: 'border-stone-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className={`border-l-4 ${color}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><span className="text-xl font-bold">{value}</span></div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Score + Trigger Check */}
      <Card className="border-l-4 border-emerald-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-semibold text-sm">Соответствие нормам РФ</p>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={complianceScore} className="h-2 w-24" />
                <Badge className={complianceScore >= 70 ? 'bg-emerald-700 text-white' : complianceScore >= 40 ? 'bg-amber-600 text-white' : 'bg-red-700 text-white'}>
                  {complianceScore}%
                </Badge>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select value={checkDocId} onValueChange={setCheckDocId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Документ для проверки" /></SelectTrigger>
                <SelectContent>
                  {documents.map(d => <SelectItem key={d.id} value={d.id}>{d.originalName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending}>
                {checkMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                Проверить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Статус" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="violation">Нарушения</SelectItem>
          <SelectItem value="warning">Предупреждения</SelectItem>
          <SelectItem value="compliant">Соответствует</SelectItem>
          <SelectItem value="needs_review">Требует проверки</SelectItem>
        </SelectContent>
      </Select>

      {/* Results */}
      <Accordion type="multiple" className="space-y-2">
        {filtered.map(item => (
          <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4">
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                {STATUS[item.status]?.icon}
                <span className="truncate">{TYPE_LABEL[item.checkType] ?? item.checkType}</span>
                <Badge className={STATUS[item.status]?.badge ?? 'bg-stone-500 text-white'}>{STATUS[item.status]?.label ?? item.status}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{item.description}</p>
              {item.recommendation && (
                <div className="p-2 rounded bg-muted">
                  <p className="font-medium text-xs flex items-center gap-1"><Shield className="w-3 h-3" />Рекомендация:</p>
                  <p className="text-xs">{item.recommendation}</p>
                </div>
              )}
              {item.legalBasis && (
                <div className="p-2 rounded bg-muted">
                  <p className="font-medium text-xs flex items-center gap-1"><Scale className="w-3 h-3" />Правовая основа:</p>
                  <p className="text-xs">{item.legalBasis}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{new Date(item.checkedAt).toLocaleString('ru')}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
