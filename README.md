# Legal Case Analyzer — Юридический анализатор дел

> AI-powered система управления и анализа уголовных дел на Next.js 16 с извлечением лиц, эпизодов и рисков из документов

## Описание проекта

Система для юристов и адвокатов, позволяющая загружать документы по уголовным делам (PDF), автоматически извлекать ключевые данные (лица, эпизоды, статьи УК), анализировать риски и строить стратегию защиты. Использует AI (LLM, VLM) для обработки документов и генерации аналитики.

## Технологический стек

| Технология | Версия | Применение |
|---|---|---|
| **Next.js** | 16 | Фреймворк (App Router) |
| **TypeScript** | 5 | Язык |
| **Tailwind CSS** | 4 | Стили |
| **shadcn/ui** | New York | UI-компоненты |
| **Prisma** | SQLite | ORM / БД |
| **Zustand** | 5 | Клиентское состояние |
| **TanStack Query** | 5 | Серверное состояние |
| **z-ai-web-dev-sdk** | 0.0.18 | AI SDK (LLM, VLM) |
| **Recharts** | 2 | Графики |
| **Framer Motion** | 12 | Анимации |

## Архитектура

```
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Главная страница (8 вкладок)
│   │   └── api/case/                   # API маршруты (26 endpoints)
│   │       ├── upload/route.ts         # Загрузка документов
│   │       ├── process/route.ts        # AI-обработка документов
│   │       ├── processing-status/      # Статус обработки (WebSocket)
│   │       ├── dashboard/              # Дашборд статистики
│   │       ├── documents/              # CRUD документов
│   │       ├── persons/                # извлечённые лица
│   │       ├── episodes/               # Эпизоды дела
│   │       ├── qa/                     # Вопрос-ответ (LLM)
│   │       ├── search/                 # Поиск по документам
│   │       ├── risk-assessment/        # Оценка рисков
│   │       ├── evidence-chain/         # Цепочка доказательств
│   │       ├── timeline/               # Хронология дела
│   │       ├── defense/                # Стратегия защиты
│   │       ├── compliance/             # Проверка соответствия
│   │       ├── analytics/              # Аналитика
│   │       └── ...                     # Другие endpoints
│   ├── components/
│   │   ├── case-dashboard.tsx          # Дашборд с статистикой
│   │   ├── case-documents.tsx          # Управление документами
│   │   ├── case-persons.tsx            # Карточки лиц
│   │   ├── case-episodes.tsx           # Эпизоды дела
│   │   ├── case-timeline.tsx           # Хронология
│   │   ├── case-evidence-chain.tsx     # Цепочка доказательств
│   │   ├── case-risk.tsx              # Оценка рисков
│   │   ├── case-witness-matrix.tsx    # Матрица свидетелей
│   │   ├── case-brief.tsx             # Краткое резюме дела
│   │   ├── case-analytics.tsx         # Аналитика
│   │   ├── case-export-center.tsx     # Экспорт CSV/PDF
│   │   ├── case-battle-plan.tsx       # Боевой план защиты
│   │   ├── case-violations.tsx        # Нарушения
│   │   ├── case-search.tsx            # Поиск
│   │   ├── case-qa.tsx               # Вопрос-ответ
│   │   ├── case-defense.tsx           # Стратегия защиты
│   │   ├── case-legal-check.tsx       # Правовая проверка
│   │   ├── error-boundary.tsx         # Error Boundary
│   │   └ ui/                          # shadcn/ui компоненты
│   └── lib/
│       ├── case-api.ts                # API клиент
│       ├── case-store.ts              # Zustand store
│       ├── db.ts                      # Prisma клиент
│       ├── zai.ts                     # AI SDK wrapper
│       ├── query-provider.tsx         # TanStack Query Provider
│       ├── shared-ui.ts               # Общие UI функции
│       ├── mock-data.ts               # Мок данные для разработки
│       └── utils.ts                   # Утилиты
├── prisma/
│   └ schema.prisma                    # 15+ моделей БД
│   └ seed.ts                          # Seed данные
├── mini-services/
│   ├── doc-processor/                 # Сервис обработки документов
│   └── web-app/                       # Web-сервис
├── Caddyfile                          # Gateway конфигурация
└── db/                                # SQLite база данных
```

## Ключевые модели БД (Prisma)

- **CriminalCase** — Уголовное дело (номер, статус, статьи)
- **Document** — Загруженный документ (PDF, извлечённый текст, AI-сводка)
- **Person** — Лицо из дела (подозреваемый, свидетель, потерпевший)
- **Episode** — Эпизод дела (дата, описание, участники)
- **ProcessingQueue** — очередь обработки документов
- **LegalCompliance** — Проверка юридического соответствия
- **CrossReference** — перекрестные ссылки между документами
- **ChatMessage** — история Q&A диалогов

## Вкладки (Tabs)

| ID | Название | Компонент | Описание |
|---|---|---|---|
| `dashboard` | Дашборд | `case-dashboard` | Статистика и обзор дела |
| `documents` | Документы | `case-documents` | Загрузка, просмотр, AI-сводка |
| `persons` | Лица | `case-persons` | Карточки всех лиц дела |
| `episodes` | Эпизоды | `case-episodes` | Эпизоды/события дела |
| `timeline` | Хронология | `case-timeline` | Временная шкала событий |
| `evidence-chain` | Доказательства | `case-evidence-chain` | Цепочка доказательств |
| `risk` | Риски | `case-risk` | Оценка юридических рисков |
| `witness-matrix` | Свидетели | `case-witness-matrix` | Матрица показаний свидетелей |
| `brief` | Резюме | `case-brief` | Краткое резюме дела |
| `analytics` | Аналитика | `case-analytics` | Графики и статистика |
| `export-center` | Экспорт | `case-export-center` | CSV/PDF экспорт |
| `battle-plan` | Боевой план | `case-battle-plan` | Стратегия защиты |
| `violations` | Нарушения | `case-violations` | Процессуальные нарушения |
| `search` | Поиск | `case-search` | Поиск по тексту документов |
| `qa` | Q&A | `case-qa` | AI вопрос-ответ |
| `defense` | Защита | `case-defense` | Анализ стратегии защиты |
| `legal-check` | Проверка | `case-legal-check` | Правовая проверка |

## Основные правки ( changelog )

### v3.9 — Стабилизация и исправление OOM
- **Критическое исправление**: переключение с Turbopack на webpack в dev-скрипте (`--turbopack` → `--webpack`). Turbopack потреблял 1.7GB RAM, вызывая OOM Kill на Linux. Webpack — ~740MB
- **Fix**: ошибка lint в SectionRenderer — setState внутри useEffect без правильного условия
- **Fix**: переполнение извлечённого текста (text overflow) — добавлен `overflow-hidden` с `max-height` и прокруткой
- **Fix**: кнопки в хедере (выбор дела, смена темы) — проверены через Agent Browser

### v3.5 — Управление делами и AI-аналитика
- **Новое**: диалог удаления дела (`AlertDialog`) с подтверждением
- **Новое**: dropdown выбора дела в хедере (`FolderOpen` icon)
- **Fix**: удаление дела — API 404 → исправлен routing
- **Fix**: AI Insights — переключение с мок-данных на реальные данные из БД
- **Fix**: цепочка доказательств — привязка к caseId

### v3.4 — Обработка документов
- **Fix**: VLM обработка — base64 data URLs вместо файловых путей
- **Fix**: привязка документов к caseId
- **Новое**: маршрут `/api/case/process/reprocess` для повторной обработки
- **Fix**: кнопки retry/reprocess на вкладке документов

### v3.3 — Оптимизация загрузки
- **Новое**: ленивая загрузка вкладок через `COMPONENT_REGISTRY` с dynamic imports
- **Новое**: прогресс обработки по каждому файлу (per-file progress)
- **Новое**: отображение ошибок обработки
- **Fix**: bump version до 3.3.0

### v3.2 — Управление памятью
- **Новое**: `--max-old-space-size=768` в dev-скрипте
- **Новое**: per-file processing progress, error display
- **Fix**: Export Center исправлен

### v3.0 — Рефакторинг архитектуры
- Переход на компонентный registry pattern для вкладок
- Zustand store для глобального состояния (`activeCaseId`)
- TanStack Query для серверного состояния
- Error Boundary для обработки ошибок

### v2.0 — AI-интеграция
- Интеграция z-ai-web-dev-sdk (LLM, VLM)
- AI-сводка документов
- извлечение лиц и эпизодов через LLM
- Q&A диалог с контекстом дела

### v1.0 — MVP
- Загрузка PDF документов
- Базовый дашборд
- Prisma схема (SQLite)
- shadcn/ui компоненты

## Запуск проекта

```bash
# Установка зависимостей
bun install

# Push схемы БД
bun run db:push

# Генерация Prisma Client
bun run db:generate

# Запуск dev-сервера (webpack mode — важно!)
bun run dev

# Проверка кода
bun run lint

# Production build
bun run build
bun run start
```

## Важно

- **Не используйте `--turbopack`** — вызывает OOM Kill (1.7GB RAM)
- Dev-сервер работает на **порт 3000**
- БД: **SQLite** (файл в `/db/`)
- AI SDK: **z-ai-web-dev-sdk** (backend only!)

## Известные проблемы

- Загрузка файлов: `uploadDocuments` может возвращать ошибку при определённых условиях
- Обработка документов: может зависать на 10% при больших файлах
- Переключение вкладок: все 17 вкладок не восстановлены (текущий набор — 8)

## Лицензия

Private — проект в разработке
