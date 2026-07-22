'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { MessageSquare, Send, Loader2, Sparkles, Users, FileText, BookOpen } from 'lucide-react'
import { mockChatMessages } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { ChatMessageData } from '@/lib/case-store'

const CONTEXTS = [
  { value: 'general', label: 'Общий' },
  { value: 'person_specific', label: 'По участнику' },
  { value: 'episode_specific', label: 'По эпизоду' },
  { value: 'article_specific', label: 'По статье' },
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
      // Fallback mock response
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
    // Add user question immediately
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

  return (
    <div className="space-y-4">
      {/* Context Selector */}
      <div className="flex items-center gap-2">
        <Select value={contextType} onValueChange={setContextType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTEXTS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge className="bg-stone-600 text-white">{messages.length} сообщений</Badge>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />Вопросы и ответы
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div ref={scrollRef} className="space-y-3 max-h-[500px] overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className="space-y-2">
                {/* User question */}
                <div className="flex justify-end">
                  <div className="bg-stone-700 text-white rounded-lg px-3 py-2 max-w-[80%] text-sm">
                    {msg.question}
                  </div>
                </div>
                {/* AI answer */}
                {msg.answer && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 max-w-[80%] text-sm">
                      <div className="whitespace-pre-wrap">{msg.answer}</div>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(msg.createdAt).toLocaleString('ru')}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {askMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
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
            <Button key={q} size="sm" variant="outline" onClick={() => { setQuestion(q) }}>
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
          className="flex-1"
          disabled={askMutation.isPending}
        />
        <Button onClick={handleSend} disabled={askMutation.isPending || !question.trim()}>
          {askMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
