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
import { MessageSquare, Send, Loader2, Sparkles, Download, Cpu, FileText, Scale } from 'lucide-react'
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
      {/* Header: AI Status + Context + Export */}
      <div className="flex items-center gap-2">
        <Select value={contextType} onValueChange={setContextType}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTEXTS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-amber-500" />
          <Badge className={askMutation.isPending ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white'}>
            {askMutation.isPending ? 'ИИ думает...' : 'ИИ готов'}
          </Badge>
        </div>
        <Badge className="bg-stone-600 text-white">{messages.length} сообщений</Badge>
        <Button size="sm" variant="outline" className="ml-auto rounded-xl" onClick={handleExport}>
          <Download className="w-3 h-3 mr-1" />Экспорт
        </Button>
      </div>

      {/* Chat Messages */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />Вопросы и ответы ИИ-аналитика
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div ref={scrollRef} className="space-y-3 max-h-[500px] overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className="space-y-2">
                {/* User question */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-stone-700 to-stone-800 text-white rounded-xl px-3 py-2 max-w-[80%] text-sm shadow-sm">
                    {msg.question}
                  </div>
                </div>
                {/* AI answer */}
                {msg.answer && (
                  <div className="flex justify-start">
                    <div className="bg-muted/80 rounded-xl px-3 py-2 max-w-[80%] text-sm shadow-sm border">
                      <div className="whitespace-pre-wrap">{msg.answer}</div>
                      {/* Referenced documents/persons */}
                      {msg.referencedDocuments?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {msg.referencedDocuments.map(dId => (
                            <Badge key={dId} variant="outline" className="text-xs"><FileText className="w-2 h-2 mr-1" />{dId}</Badge>
                          ))}
                        </div>
                      )}
                      {msg.referencedArticles?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.referencedArticles.map(art => (
                            <Badge key={art} variant="outline" className="text-xs"><Scale className="w-2 h-2 mr-1" />{art}</Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(msg.createdAt).toLocaleString('ru')}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {askMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 text-sm border shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> ИИ анализирует...
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
            <Button key={q} size="sm" variant="outline" className="rounded-xl" onClick={() => { setQuestion(q) }}>
              <Sparkles className="w-3 h-3 mr-1" />{q}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Задайте вопрос по делу..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1 rounded-xl"
          disabled={askMutation.isPending}
        />
        <Button className="rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-white shadow-sm" onClick={handleSend} disabled={askMutation.isPending || !question.trim()}>
          {askMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">ИИ-аналитик по уголовному делу № 2024-00145 • Ответы основаны на материалах дела</p>
    </div>
  )
}
