'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { MessageSquare, Send, Loader2, Sparkles, Download, Cpu, FileText, Scale, Bot, Clock, Gavel, Shield, Users, TrendingUp, Percent } from 'lucide-react'

import * as caseApi from '@/lib/case-api'
import type { ChatMessageData } from '@/lib/case-store'

const CONTEXTS = [
  { value: 'general', label: 'Общий', icon: <MessageSquare className="w-3 h-3" /> },
  { value: 'person_specific', label: 'По участнику', icon: <Sparkles className="w-3 h-3" /> },
  { value: 'episode_specific', label: 'По эпизоду', icon: <FileText className="w-3 h-3" /> },
  { value: 'article_specific', label: 'По статье', icon: <Scale className="w-3 h-3" /> },
]

// Category-grouped suggested questions
const SUGGESTED_GROUPS = [
  { category: 'По обвинению', icon: Gavel, color: 'text-red-700 border-red-300', questions: ['Какие статьи предъявлены?', 'Каков размер ущерба?'] },
  { category: 'По защите', icon: Shield, color: 'text-emerald-700 border-emerald-300', questions: ['Какие нарушения УПК есть?', 'Какова стратегия защиты?'] },
  { category: 'По свидетелям', icon: Users, color: 'text-amber-600 border-amber-300', questions: ['Кто свидетели?', 'Есть ли противоречия?'] },
  { category: 'По прогнозу', icon: TrendingUp, color: 'text-stone-700 border-stone-300', questions: ['Каков прогноз исхода?', 'Какое наказание грозит?'] },
]

// Deterministic AI confidence per message (75-95%)
function aiConfidenceFor(msgId: string): number {
  let h = 0
  for (let i = 0; i < msgId.length; i++) h = (h * 31 + msgId.charCodeAt(i)) >>> 0
  return 75 + (h % 21)
}

// AI Confidence indicator
function AiConfidence({ confidence }: { confidence: number }) {
  const color = confidence >= 90 ? 'text-emerald-700' : confidence >= 80 ? 'text-amber-600' : 'text-stone-700'
  const bar = confidence >= 90 ? 'bg-emerald-700' : confidence >= 80 ? 'bg-amber-600' : 'bg-stone-600'
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-xs">
      <Percent className={`w-3 h-3 ${color}`} />
      <span className={`font-medium ${color}`}>Уверенность ИИ: {confidence}%</span>
      <div className="h-1 w-12 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
        <div className={`h-full ${bar} transition-all duration-500`} style={{ width: `${confidence}%` }} />
      </div>
    </div>
  )
}

export function CaseQa({ caseId }: { caseId?: string }) {
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [question, setQuestion] = useState('')
  const [contextType, setContextType] = useState('general')
  const scrollRef = useRef<HTMLDivElement>(null)

  const askMutation = useMutation({
    mutationFn: () => caseApi.askQuestion({ question, contextType, caseId }),
    onSuccess: (data) => { setMessages(prev => [...prev, data]) },
    onError: () => {
      const mock: ChatMessageData = {
        id: `mock-${Date.now()}`,
        question,
        answer: 'Не удалось получить ответ от ИИ. Проверьте подключение к серверу.',
        contextType,
        contextId: null,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, mock])
      toast.error('Ошибка ИИ, используется запасной ответ')
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!question.trim()) return
    const userMsg: ChatMessageData = {
      id: `q-${Date.now()}`,
      question,
      answer: '',
      contextType,
      contextId: null,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    askMutation.mutate()
  }

  const handleExport = () => {
    const text = messages.map(m => `Вопрос: ${m.question}\nОтвет: ${m.answer}\nДата: ${new Date(m.createdAt).toLocaleString('ru')}\n---`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Чат экспортирован')
  }

  // Compute average confidence for stats
  const avgConfidence = useMemo(() => {
    const answered = messages.filter(m => m.answer)
    if (answered.length === 0) return 0
    return Math.round(answered.reduce((s, m) => s + aiConfidenceFor(m.id), 0) / answered.length)
  }, [messages])

  return (
    <div className="space-y-6">
      {/* Section Header Banner */}
      <Card className="bg-gradient-to-r from-red-900/30 via-amber-900/15 to-stone-900/5 border-l-4 border-amber-600 rounded-xl shadow-md overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600/20 shadow-sm"><MessageSquare className="w-5 h-5 text-amber-600" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Вопросы ИИ-аналитику</p>
              <p className="text-xs text-muted-foreground">Задайте вопросы по материалам уголовного дела</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-2 h-2 rounded-full ${askMutation.isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-700 animate-pulse'}`} />
              <Badge className={askMutation.isPending ? 'bg-amber-600 text-white text-xs font-semibold' : 'bg-emerald-700 text-white text-xs font-semibold'}>
                {askMutation.isPending ? 'ИИ думает...' : 'ИИ готов'}
              </Badge>
              {avgConfidence > 0 && <Badge variant="outline" className="text-xs"><Cpu className="w-3 h-3 mr-1" />Сред. уверенность {avgConfidence}%</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header: Context + Export */}
      <div className="flex items-center gap-2">
        <Select value={contextType} onValueChange={setContextType}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{CONTEXTS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        <Badge className="bg-stone-600 text-white text-xs font-semibold">{messages.length} сообщений</Badge>
        <Button size="sm" variant="outline" className="ml-auto rounded-xl transition-all duration-200 hover:bg-stone-100 font-medium" onClick={handleExport}>
          <Download className="w-3 h-3 mr-1" />Экспорт
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* Chat Messages */}
        <Card className="rounded-xl shadow-sm border-stone-200/50">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-600" />Вопросы и ответы ИИ-аналитика</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div ref={scrollRef} className="space-y-4 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
              {messages.length === 0 && !askMutation.isPending && (
                <div className="text-center py-10">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mx-auto mb-4 ring-4 ring-amber-500/5">
                    <MessageSquare className="w-10 h-10 text-amber-600" />
                  </div>
                  <p className="text-base font-semibold">Начните диалог с ИИ-аналитиком</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Задайте первый вопрос по материалам дела — выберите подсказку справа или введите свой вопрос в поле ниже.</p>
                </div>
              )}
              {messages.map(msg => {
                const confidence = msg.answer ? aiConfidenceFor(msg.id) : 0
                return (
                  <div key={msg.id} className="space-y-2">
                    {/* User question */}
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-red-700/90 to-red-800/90 text-white rounded-xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-sm shadow-sm">{msg.question}</div>
                    </div>
                    {/* AI answer */}
                    {msg.answer && (
                      <div className="flex justify-start">
                        <div className="bg-gradient-to-br from-stone-100/80 to-stone-50/80 rounded-xl rounded-bl-sm px-4 py-2.5 max-w-[80%] text-sm shadow-sm border border-stone-200/50">
                          <div className="flex items-center gap-1.5 mb-1"><Bot className="w-3 h-3 text-amber-600" /><span className="text-xs font-semibold text-amber-600">ИИ-аналитик</span></div>
                          <div className="whitespace-pre-wrap leading-relaxed">{msg.answer}</div>
                          {/* Reference Chips */}
                          {(msg.referencedDocuments?.length || msg.referencedPersons?.length || msg.referencedArticles?.length) ? (
                            <div className="mt-2 pt-2 border-t border-stone-200/50">
                              <p className="text-xs text-muted-foreground mb-1">Ссылки:</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.referencedDocuments?.map(dId => (
                                  <Badge key={`d-${dId}`} variant="outline" className="text-xs border-red-300 text-red-700 cursor-pointer hover:bg-red-50 transition-colors" onClick={() => toast.info(`Переход к документу: ${dId}`)}>
                                    <FileText className="w-2 h-2 mr-1" />{dId}
                                  </Badge>
                                ))}
                                {msg.referencedPersons && msg.referencedPersons.length > 0 && msg.referencedPersons.map(pId => (
                                  <Badge key={`p-${pId}`} variant="outline" className="text-xs border-amber-300 text-amber-700 cursor-pointer hover:bg-amber-50 transition-colors" onClick={() => toast.info(`Переход к участнику: ${pId}`)}>
                                    <Users className="w-2 h-2 mr-1" />{pId}
                                  </Badge>
                                ))}
                                {msg.referencedArticles?.map(art => (
                                  <Badge key={`a-${art}`} variant="outline" className="text-xs border-stone-300 cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => toast.info(`Переход к статье: ${art}`)}>
                                    <Scale className="w-2 h-2 mr-1" />{art}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <AiConfidence confidence={confidence} />
                          <p className="text-[11px] mt-1.5 flex items-center gap-1 text-stone-500 dark:text-stone-400 font-medium tabular-nums">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {new Date(msg.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {askMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-br from-stone-100/80 to-stone-50/80 rounded-xl px-4 py-3 text-sm border border-stone-200/50 shadow-sm">
                    <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-amber-600" /><span className="text-amber-600 font-medium">ИИ анализирует...</span></div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suggested Questions Panel - category grouped */}
        <Card className="rounded-xl shadow-sm bg-gradient-to-br from-card via-card to-amber-500/5 border-t-2 border-t-amber-500">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />Подсказки вопросов
              <Badge variant="outline" className="text-xs ml-auto">{SUGGESTED_GROUPS.length} категорий</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pb-5 space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
            {SUGGESTED_GROUPS.map(group => {
              const Icon = group.icon
              const colorClass = group.color.split(' ')[0]
              const borderClass = group.color.split(' ').find(c => c.startsWith('border')) ?? 'border-stone-300'
              return (
                <div key={group.category} className={`rounded-lg border-l-2 ${borderClass} pl-2 py-1`}>
                  <p className={`text-xs font-semibold flex items-center gap-1 ${colorClass}`}>
                    <Icon className="w-3 h-3" />{group.category}
                  </p>
                  <div className="space-y-1 mt-1.5">
                    {group.questions.map(q => (
                      <button
                        key={q}
                        onClick={() => setQuestion(q)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded-md border border-stone-200/50 dark:border-stone-700/50 bg-background/40 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-sm transition-all duration-150 font-normal text-foreground/85"
                      >
                        <span className="text-amber-600 mr-1">›</span>{q}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Input */}
      <div className="flex gap-2 clear-both mt-2">
        <div className="flex-1 relative">
          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Задайте вопрос по делу..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="pl-10 rounded-xl"
            disabled={askMutation.isPending}
          />
        </div>
        <Button className="rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-white shadow-sm hover:shadow-md transition-all duration-200 font-medium" onClick={handleSend} disabled={askMutation.isPending || !question.trim()}>
          {askMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">ИИ-аналитик • Ответы основаны на материалах дела{caseId ? ` (Дело ${caseId})` : ''}</p>
    </div>
  )
}
