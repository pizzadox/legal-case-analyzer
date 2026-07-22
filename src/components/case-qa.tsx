'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { MessageSquare, Send, Loader2, Sparkles, Download, Cpu, FileText, Scale, Bot, Clock } from 'lucide-react'
import { mockChatMessages } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { ChatMessageData } from '@/lib/case-store'

const CONTEXTS = [
  { value: 'general', label: 'Общий', icon: <MessageSquare className="w-3 h-3" /> },
  { value: 'person_specific', label: 'По участнику', icon: <Sparkles className="w-3 h-3" /> },
  { value: 'episode_specific', label: 'По эпизоду', icon: <FileText className="w-3 h-3" /> },
  { value: 'article_specific', label: 'По статье', icon: <Scale className="w-3 h-3" /> },
]

const SUGGESTED = [
  'Какие статьи применены к Колесниченко?',
  'Есть ли процессуальные нарушения?',
  'Какова вероятность осуждения?',
  'Какие смягчающие обстоятельства?',
]

export function CaseQa() {
  const [messages, setMessages] = useState<ChatMessageData[]>(mockChatMessages)
  const [question, setQuestion] = useState('')
  const [contextType, setContextType] = useState('general')
  const scrollRef = useRef<HTMLDivElement>(null)

  const askMutation = useMutation({
    mutationFn: () => caseApi.askQuestion({ question, contextType }),
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

  return (
    <div className="space-y-6">
      {/* Section Header Banner */}
      <Card className="bg-gradient-to-r from-red-900/30 via-amber-900/15 to-stone-900/5 border-l-4 border-amber-600 rounded-xl shadow-md overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600/20 shadow-sm">
              <MessageSquare className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Вопросы ИИ-аналитику</p>
              <p className="text-xs text-muted-foreground">Задайте вопросы по материалам уголовного дела</p>
            </div>
            {/* AI Status indicator with pulsing dot */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-2 h-2 rounded-full ${askMutation.isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-700 animate-pulse'}`} />
              <Badge className={askMutation.isPending ? 'bg-amber-600 text-white text-xs font-semibold' : 'bg-emerald-700 text-white text-xs font-semibold'}>
                {askMutation.isPending ? 'ИИ думает...' : 'ИИ готов'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header: Context + Export */}
      <div className="flex items-center gap-2">
        <Select value={contextType} onValueChange={setContextType}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTEXTS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge className="bg-stone-600 text-white text-xs font-semibold">{messages.length} сообщений</Badge>
        <Button size="sm" variant="outline" className="ml-auto rounded-xl transition-all duration-200 hover:bg-stone-100 font-medium" onClick={handleExport}>
          <Download className="w-3 h-3 mr-1" />Экспорт
        </Button>
      </div>

      {/* Chat Messages */}
      <Card className="rounded-xl shadow-sm border-stone-200/50">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600" />Вопросы и ответы ИИ-аналитика
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div ref={scrollRef} className="space-y-4 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
            {messages.map(msg => (
              <div key={msg.id} className="space-y-2">
                {/* User question */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-red-700/90 to-red-800/90 text-white rounded-xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-sm shadow-sm">
                    {msg.question}
                  </div>
                </div>
                {/* AI answer */}
                {msg.answer && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-br from-stone-100/80 to-stone-50/80 rounded-xl rounded-bl-sm px-4 py-2.5 max-w-[80%] text-sm shadow-sm border border-stone-200/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="w-3 h-3 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-600">ИИ-аналитик</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.answer}</div>
                      {/* Referenced documents/persons */}
                      {msg.referencedDocuments?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {msg.referencedDocuments.map(dId => (
                            <Badge key={dId} variant="outline" className="text-xs border-red-300/50 font-medium"><FileText className="w-2 h-2 mr-1" />{dId}</Badge>
                          ))}
                        </div>
                      )}
                      {msg.referencedArticles?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.referencedArticles.map(art => (
                            <Badge key={art} variant="outline" className="text-xs border-stone-300/50 font-medium"><Scale className="w-2 h-2 mr-1" />{art}</Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Clock className="w-2 h-2" />
                        {new Date(msg.createdAt).toLocaleString('ru')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {askMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-br from-stone-100/80 to-stone-50/80 rounded-xl px-4 py-3 text-sm border border-stone-200/50 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span className="text-amber-600 font-medium">ИИ анализирует...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map(q => (
            <Button key={q} size="sm" variant="outline" className="rounded-xl transition-all duration-200 hover:bg-amber-50 hover:border-amber-300 font-medium" onClick={() => { setQuestion(q) }}>
              <Sparkles className="w-3 h-3 mr-1 text-amber-600" />{q}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
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
      <p className="text-xs text-muted-foreground">ИИ-аналитик по уголовному делу № 2024-00145 • Ответы основаны на материалах дела</p>
    </div>
  )
}
