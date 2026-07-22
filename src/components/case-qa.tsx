'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  MessageSquare, Send, Loader2, Scale, Users, FileText, BookOpen,
  Sparkles, ThumbsUp, ThumbsDown, Download, History, Zap,
  ChevronDown, X, Clock, Brain, Eye, LinkIcon, ArrowRight,
  StickyNote, BookmarkPlus, RefreshCw
} from 'lucide-react'
import { mockChatMessages } from '@/lib/mock-data'
import * as caseApi from '@/lib/case-api'
import type { ChatMessageData } from '@/lib/case-store'

interface MessageReaction {
  type: 'helpful' | 'not_helpful'
  messageId: string
}

interface ChatMessageExtended extends ChatMessageData {
  reactions?: MessageReaction[]
  isTyping?: boolean
  followUpQuestions?: string[]
}

const CONTEXT_OPTIONS = [
  { value: 'general', label: 'Общий контекст', icon: Sparkles, color: 'bg-stone-600 text-white' },
  { value: 'person_specific', label: 'По участнику', icon: Users, color: 'bg-orange-600 text-white' },
  { value: 'episode_specific', label: 'По эпизоду', icon: BookOpen, color: 'bg-amber-600 text-white' },
  { value: 'article_specific', label: 'По статье УК', icon: Scale, color: 'bg-red-700 text-white' },
]

const SUGGESTED_QUESTIONS = [
  { category: 'Статьи УК', icon: Scale, questions: [
    'Какие статьи УК РФ применены к Колесниченко?',
    'Можно ли переквалифицировать ст. 159 ч.3?',
    'Что предусматривает ст. 327 ч.2 УК РФ?',
  ]},
  { category: 'Процессуальные нарушения', icon: FileText, questions: [
    'Есть ли процессуальные нарушения в деле?',
    'Какие нарушения сроков расследования?',
    'Было ли нарушено право на защиту?',
  ]},
  { category: 'Участники', icon: Users, questions: [
    'Какова роль Сидорова в деле?',
    'Что показал Петров как свидетель?',
    'Кто является потерпевшей стороной?',
  ]},
  { category: 'Эпизоды', icon: BookOpen, questions: [
    'Опишите основные эпизоды обвинения',
    'Есть ли связь между эпизодами?',
    'Какова вероятность доказанности каждого эпизода?',
  ]},
  { category: 'Линия защиты', icon: Brain, questions: [
    'Какова вероятность осуждения Колесниченко?',
    'Какие смягчающие обстоятельства?',
    'Какие стратегии защиты наиболее перспективны?',
  ]},
]

function getContextBadge(contextType: string | null) {
  if (!contextType) return null
  const contextMap: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    'general': { icon: <Sparkles className="w-3 h-3" />, label: 'Общий', className: 'bg-stone-600 text-white' },
    'article_specific': { icon: <Scale className="w-3 h-3" />, label: 'Статья', className: 'bg-red-700 text-white' },
    'person_specific': { icon: <Users className="w-3 h-3" />, label: 'Участник', className: 'bg-orange-600 text-white' },
    'episode_specific': { icon: <BookOpen className="w-3 h-3" />, label: 'Эпизод', className: 'bg-amber-600 text-white' },
  }
  const info = contextMap[contextType]
  if (!info) return <Badge variant="outline">{contextType}</Badge>
  return <Badge className={info.className}>{info.icon} {info.label}</Badge>
}

function generateMockResponse(question: string): { answer: string; contextType: string; followUpQuestions: string[] } {
  if (question.toLowerCase().includes('статьи') || question.toLowerCase().includes('ук')) {
    return {
      answer: 'К Колесниченко Д.А. применены следующие статьи УК РФ:\n\n1. **Ст. 159 ч.3 УК РФ** — Мошенничество с использованием служебного положения (тяжкое, до 10 лет)\n2. **Ст. 160 ч.2 УК РФ** — Присвоение группой лиц (средней тяжести, до 5 лет)\n3. **Ст. 327 ч.2 УК РФ** — Подделка документов (средней тяжести, до 4 лет)\n\n⚠️ Применение ст. 159 ч.3 может быть оспорено — использование служебного положения не полностью доказано.\n\n📎 *Ссылки: Обвинительное заключение (том 1, л.д. 1-45), Показания Колесниченко (том 2, л.д. 10-18)*',
      contextType: 'article_specific',
      followUpQuestions: ['Можно ли переквалифицировать ст. 159 ч.3?', 'Какова практика по ст. 159 ч.3?', 'Что предусматривает ст. 327 ч.2?'],
    }
  }
  if (question.toLowerCase().includes('нарушения') || question.toLowerCase().includes('процессуальные')) {
    return {
      answer: 'Анализ выявил следующие процессуальные нарушения:\n\n1. **Нарушение сроков расследования** — превышение на 45 дней (ст. 6.1 УПК РФ)\n2. **Нарушение права на защиту** — ограничение доступа адвоката (ст. 49 УПК РФ)\n3. **Незаконное задержание** — без достаточных оснований (ст. 91 УПК РФ)\n\n✅ Рекомендация: ходатайство о возвращении дела прокурору (ст. 237 УПК РФ).\n\n📎 *Ссылки: Протокол осмотра (том 3, л.д. 5-12)*',
      contextType: 'general',
      followUpQuestions: ['Как использовать нарушения в линии защиты?', 'Что предусматривает ст. 237 УПК РФ?', 'Было ли нарушено право на защиту?'],
    }
  }
  if (question.toLowerCase().includes('вероятность') || question.toLowerCase().includes('осуждение') || question.toLowerCase().includes('прогноз')) {
    return {
      answer: 'Прогноз по делу Колесниченко Д.А.:\n\n📊 **Вероятность осуждения по ст. 159 ч.3**: ~85%\n📊 **Вероятность переквалификации**: ~35%\n📊 **Вероятность освобождения**: ~15%\n\nКлючевые факторы:\n• Сильные доказательства обвинения по основному эпизоду\n• Процессуальные нарушения, которые могут быть использованы в защите\n• Смягчающие обстоятельства (отсутствие судимостей, несовершеннолетний ребёнок)\n\n📎 *Ссылки: Анализ guilt assessment, Линия защиты (стратегии)*',
      contextType: 'person_specific',
      followUpQuestions: ['Какие смягчающие обстоятельства?', 'Какие стратегии защиты наиболее перспективны?', 'Какова вероятность переквалификации?'],
    }
  }
  return {
    answer: `По вашему вопросу проведён анализ материалов дела.\n\nНа основании изучения документов, показаний участников и применённых статей УК РФ, можно отметить следующее:\n\n1. Основные обвинения относятся к ст. 159 ч.3 и ст. 160 ч.2 УК РФ\n2. Есть процессуальные нарушения, которые могут быть использованы в линии защиты\n3. Доказательная база обвинения является умеренно сильной\n\nДля более детального анализа рекомендуется обратиться к разделам "Линия защиты" и "Правовая проверка".\n\n📎 *Ссылки: Обвинительное заключение, Показания Колесниченко*`,
    contextType: 'general',
    followUpQuestions: ['Есть ли процессуальные нарушения?', 'Какие стратегии защиты перспективны?', 'Какова вероятность осуждения?'],
  }
}

export function CaseQa() {
  const [messages, setMessages] = useState<ChatMessageExtended[]>(mockChatMessages.map(m => ({ ...m, reactions: [], followUpQuestions: [] })))
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [selectedContext, setSelectedContext] = useState<string>('general')
  const [isTyping, setIsTyping] = useState(false)
  const [reactions, setReactions] = useState<Record<string, 'helpful' | 'not_helpful' | null>>({})
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // TanStack Query - Q&A mutation
  const qaMutation = useMutation({
    mutationFn: caseApi.askQuestion,
    onSuccess: (data) => {
      const mockFollowUp = generateMockResponse(currentQuestion)
      const aiMessage: ChatMessageExtended = {
        ...data,
        reactions: [],
        followUpQuestions: mockFollowUp.followUpQuestions,
      }
      setMessages(prev => [...prev.slice(0, -1), aiMessage])
      setIsTyping(false)
    },
    onError: (error: Error) => {
      // Fallback to mock response on error
      const mockResult = generateMockResponse(currentQuestion)
      const aiMessage: ChatMessageExtended = {
        id: `ai-${Date.now()}`,
        question: currentQuestion,
        answer: mockResult.answer,
        contextType: mockResult.contextType,
        contextId: null,
        createdAt: new Date().toISOString(),
        reactions: [],
        followUpQuestions: mockResult.followUpQuestions,
      }
      setMessages(prev => [...prev.slice(0, -1), aiMessage])
      setIsTyping(false)
    },
  })

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSendQuestion = useCallback(async () => {
    if (!currentQuestion.trim()) return

    // Add user message
    const tempId = `temp-${Date.now()}`
    const userMessage: ChatMessageExtended = {
      id: tempId,
      question: currentQuestion,
      answer: '',
      contextType: selectedContext,
      contextId: null,
      createdAt: new Date().toISOString(),
      reactions: [],
      followUpQuestions: [],
    }
    setMessages(prev => [...prev, userMessage])
    setCurrentQuestion('')
    setIsTyping(true)

    // Try API first
    qaMutation.mutate({
      question: currentQuestion,
      contextType: selectedContext,
      contextId: null,
    })
  }, [currentQuestion, selectedContext, qaMutation])

  const handleFollowUp = (question: string) => {
    setCurrentQuestion(question)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleReaction = (messageId: string, type: 'helpful' | 'not_helpful') => {
    setReactions(prev => ({
      ...prev,
      [messageId]: prev[messageId] === type ? null : type,
    }))
  }

  const handleExportChat = () => {
    const text = messages
      .filter(m => m.answer)
      .map(m => `Вопрос: ${m.question}\nОтвет: ${m.answer}\n---`)
      .join('\n\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Чат экспортирован в файл')
  }

  const handleSuggestedQuestion = (question: string) => {
    setCurrentQuestion(question)
    setShowSuggestions(false)
    handleSendQuestion()
  }

  // Animated variants
  const messageVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, type: 'spring' } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
  }

  const typingBubbleVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { repeat: Infinity, repeatType: 'reverse', duration: 0.4 } },
  }

  return (
    <div className="space-y-4 h-full">
      {/* Chat Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  ИИ-аналитик по делу
                </CardTitle>
                <CardDescription className="mt-1">
                  Задайте вопрос об уголовном деле — ИИ ответит с ссылками на статьи и данные
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">
                  {messages.length} сообщений
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExportChat}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Экспорт чата</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(!showHistory)}>
                        <History className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>История</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Context selector */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Контекст вопроса:</span>
          {CONTEXT_OPTIONS.map(opt => {
            const Icon = opt.icon
            return (
              <motion.button
                key={opt.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedContext(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                  selectedContext === opt.value
                    ? opt.color + ' shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3 h-3" />
                {opt.label}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Chat Messages */}
      <Card className="flex flex-col">
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[450px] [&>div]:!overflow-y-auto px-6">
            <div ref={scrollRef} className="space-y-4 py-4">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="space-y-3"
                  >
                    {/* Question bubble */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 justify-end"
                    >
                      <div className="flex-1 min-w-0 max-w-[80%]">
                        <div className="flex items-center gap-2 mb-1 justify-end">
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleString('ru-RU')}
                          </span>
                          <span className="text-sm font-medium">Вы</span>
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className="p-3 bg-stone-700 dark:bg-stone-700 text-stone-100 rounded-xl rounded-tr-none"
                        >
                          <p className="text-sm">{msg.question}</p>
                          {msg.contextType && msg.contextType !== 'general' && (
                            <div className="mt-1.5">
                              {getContextBadge(msg.contextType)}
                            </div>
                          )}
                        </motion.div>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-600">
                        <MessageSquare className="h-4 w-4 text-stone-200" />
                      </div>
                    </motion.div>

                    {/* Answer bubble */}
                    {msg.answer && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-start gap-3"
                      >
                        <motion.div
                          animate={isTyping ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                          transition={{ repeat: isTyping ? Infinity : 0, duration: 1.5 }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950"
                        >
                          <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </motion.div>
                        <div className="flex-1 min-w-0 max-w-[80%]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">ИИ-аналитик</span>
                            {getContextBadge(msg.contextType)}
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          <motion.div
                            whileHover={{ scale: 1.01 }}
                            className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl rounded-tl-none border border-red-200 dark:border-red-900"
                          >
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.answer}
                            </div>

                            {/* Reference links */}
                            <div className="mt-3 pt-2 border-t border-red-200/30 dark:border-red-900/30">
                              <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                                <LinkIcon className="w-3 h-3" />
                                <span className="font-medium">Ссылки на материалы дела:</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <Badge variant="outline" className="text-xs gap-1 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400">
                                  <FileText className="w-2.5 h-2.5" />
                                  Обвинительное заключение
                                </Badge>
                                <Badge variant="outline" className="text-xs gap-1 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400">
                                  <Scale className="w-2.5 h-2.5" />
                                  ст. 159 ч.3 УК РФ
                                </Badge>
                              </div>
                            </div>
                          </motion.div>

                          {/* Reactions */}
                          <div className="flex items-center gap-2 mt-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleReaction(msg.id, 'helpful')}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                                reactions[msg.id] === 'helpful'
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              Полезно
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleReaction(msg.id, 'not_helpful')}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                                reactions[msg.id] === 'not_helpful'
                                  ? 'bg-red-700 text-white'
                                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                              Не точно
                            </motion.button>
                          </div>

                          {/* Follow-up questions */}
                          {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="mt-2"
                            >
                              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" />
                                Продолжить тему:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.followUpQuestions.map((fq, i) => (
                                  <motion.button
                                    key={fq}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 + 0.4 }}
                                    onClick={() => handleFollowUp(fq)}
                                    className="px-2.5 py-1 bg-muted/50 rounded-lg text-xs hover:bg-muted transition-colors"
                                  >
                                    {fq}
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                    <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">ИИ-аналитик</span>
                      <Badge className="bg-orange-600 text-white text-xs animate-pulse">
                        <Brain className="w-2.5 h-2.5 mr-1" />
                        Анализ...
                      </Badge>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl rounded-tl-none border border-red-200 dark:border-red-900">
                      <div className="flex items-center gap-1.5">
                        <motion.div
                          variants={typingBubbleVariants}
                          initial="initial"
                          animate="animate"
                          className="w-2 h-2 rounded-full bg-red-400"
                        />
                        <motion.div
                          variants={typingBubbleVariants}
                          initial="initial"
                          animate="animate"
                          transition={{ delay: 0.2 }}
                          className="w-2 h-2 rounded-full bg-red-400"
                        />
                        <motion.div
                          variants={typingBubbleVariants}
                          initial="initial"
                          animate="animate"
                          transition={{ delay: 0.4 }}
                          className="w-2 h-2 rounded-full bg-red-400"
                        />
                        <span className="text-xs text-muted-foreground ml-2">Анализирую материалы дела...</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      <AnimatePresence>
        {showSuggestions && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Предлагаемые вопросы
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowSuggestions(false)}>
                    <X className="h-3 w-3 mr-1" />
                    Скрыть
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SUGGESTED_QUESTIONS.map((category) => {
                    const Icon = category.icon
                    return (
                      <div key={category.category}>
                        <h4 className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                          <Icon className="w-3 h-3" />
                          {category.category}
                        </h4>
                        <div className="space-y-1">
                          {category.questions.map((q) => (
                            <motion.button
                              key={q}
                              whileHover={{ scale: 1.02, backgroundColor: 'rgba(0,0,0,0.06)' }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSuggestedQuestion(q)}
                              className="w-full text-left p-2 bg-muted/30 rounded-lg text-xs hover:bg-muted/50 transition-colors"
                            >
                              {q}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!showSuggestions && !isTyping && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setShowSuggestions(true)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Zap className="w-3 h-3" />
          Показать предлагаемые вопросы
        </motion.button>
      )}

      {/* Input Area */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Задайте вопрос по делу, например: Какие нарушения в процессе расследования?"
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSendQuestion()}
                  disabled={isTyping}
                  className="h-10 pl-10"
                />
                <Brain className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={handleSendQuestion} disabled={isTyping || !currentQuestion.trim()} className="gap-2 shrink-0 h-10">
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isTyping ? 'Анализ...' : 'Отправить'}
                </Button>
              </motion.div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground">Контекст:</span>
              <Select value={selectedContext} onValueChange={setSelectedContext}>
                <SelectTrigger className="w-[160px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Общий контекст</SelectItem>
                  <SelectItem value="person_specific">По участнику</SelectItem>
                  <SelectItem value="episode_specific">По эпизоду</SelectItem>
                  <SelectItem value="article_specific">По статье УК</SelectItem>
                </SelectContent>
              </Select>
              <Separator orientation="vertical" className="h-5" />
              <span className="text-xs text-muted-foreground">Быстрые:</span>
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => { setCurrentQuestion('Какие статьи УК РФ применены к Колесниченко?'); handleSendQuestion() }}>
                <Scale className="w-3 h-3" />Статьи УК
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => { setCurrentQuestion('Есть ли процессуальные нарушения в деле?'); handleSendQuestion() }}>
                <FileText className="w-3 h-3" />Нарушения
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => { setCurrentQuestion('Какова вероятность осуждения Колесниченко?'); handleSendQuestion() }}>
                <Users className="w-3 h-3" />Прогноз
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
