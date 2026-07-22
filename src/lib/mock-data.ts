import {
  DocumentData, PersonData, EpisodeData, DefenseLineData,
  LegalComplianceData, ChatMessageData, DashboardStats,
  ProcessingQueueData, SearchResultData, GuiltAssessmentData,
  EvidenceTimelineEvent, PersonRelationship, DefenseImprovementData,
  NotificationData, CaseHealthScore, CrossRefNode,
  CaseBriefData, RiskAssessmentData, SentencingData, EvidenceChainData,
  AuditLogEntry, CaseTimelineEvent, BookmarkData, WitnessStatementData,
  AnalyticsData,
} from './case-store'

export const mockDocuments: DocumentData[] = [
  { id: 'doc1', fileName: 'obvinenie_tom1.pdf', originalName: 'Обвинительное заключение - Том 1.pdf', fileSize: 2456000, mimeType: 'application/pdf', extractedText: 'Обвинительное заключение по делу № 2024-00145...', summary: 'Обвинительное заключение по делу о мошенничестве', documentDate: '2024-03-15', documentType: 'обвинение', sourceReference: 'том 1, л.д. 1-45', processingStatus: 'completed', processingError: null, uploadedAt: '2024-01-10T08:00:00Z', processedAt: '2024-01-10T08:15:00Z' },
  { id: 'doc2', fileName: 'pokazaniya_kolesnichenko.pdf', originalName: 'Показания Колесниченко Д.А.pdf', fileSize: 1560000, mimeType: 'application/pdf', extractedText: 'Показания подозреваемого Колесниченко Д.А...', summary: 'Показания Колесниченко Д.А.', documentDate: '2024-01-15', documentType: 'показание', sourceReference: 'том 2, л.д. 10-25', processingStatus: 'completed', processingError: null, uploadedAt: '2024-01-15T10:00:00Z', processedAt: '2024-01-15T10:20:00Z' },
  { id: 'doc3', fileName: 'protokol_obyaska.pdf', originalName: 'Протокол обыска.pdf', fileSize: 890000, mimeType: 'application/pdf', extractedText: 'Протокол обыска жилого помещения...', summary: 'Протокол обыска по месту жительства', documentDate: '2024-02-20', documentType: 'протокол', sourceReference: 'том 3, л.д. 30-35', processingStatus: 'completed', processingError: null, uploadedAt: '2024-02-20T14:00:00Z', processedAt: '2024-02-20T14:10:00Z' },
  { id: 'doc4', fileName: 'expertiza.pdf', originalName: 'Заключение эксперта.pdf', fileSize: 3200000, mimeType: 'application/pdf', extractedText: 'Заключение финансово-экономической экспертизы...', summary: 'Финансово-экономическая экспертиза', documentDate: '2024-04-10', documentType: 'экспертиза', sourceReference: 'том 4, л.д. 5-60', processingStatus: 'processing', processingError: null, uploadedAt: '2024-04-10T09:00:00Z', processedAt: null },
  { id: 'doc5', fileName: 'svidetel_petrov.pdf', originalName: 'Показания свидетеля Петрова.pdf', fileSize: 980000, mimeType: 'application/pdf', extractedText: 'Показания свидетеля Петрова И.В.', summary: 'Показания свидетеля', documentDate: '2024-02-05', documentType: 'показание', sourceReference: 'том 2, л.д. 40-50', processingStatus: 'pending', processingError: null, uploadedAt: '2024-05-01T11:00:00Z', processedAt: null },
]

export const mockPersons: PersonData[] = [
  { id: 'p1', fullName: 'Колесниченко Дмитрий Александрович', shortName: 'Колесниченко Д.А.', role: 'обвиняемый', status: 'задержанный', description: 'Главный обвиняемый, бывший директор ООО "ТехноПром"', birthDate: '1985-06-15', occupation: 'Директор ООО', alias: null, isKolesnichenko: true, defenseStrategy: 'Непризнание вины, алиби на период эпизода 1', guiltLevel: 'high' },
  { id: 'p2', fullName: 'Сидоров Андрей Петрович', shortName: 'Сидоров А.П.', role: 'соучастник', status: 'активный', description: 'Соучастник, бухгалтер ООО', birthDate: '1990-03-22', occupation: 'Бухгалтер', alias: null, isKolesnichenko: false, defenseStrategy: null, guiltLevel: 'moderate' },
  { id: 'p3', fullName: 'Петров Иван Васильевич', shortName: 'Петров И.В.', role: 'свидетель', status: 'активный', description: 'Свидетель, бывший сотрудник ООО', birthDate: '1978-11-08', occupation: 'Менеджер', alias: null, isKolesnichenko: false, defenseStrategy: null, guiltLevel: 'none' },
  { id: 'p4', fullName: 'Иванова Мария Сергеевна', shortName: 'Иванова М.С.', role: 'потерпевшая', status: 'активный', description: 'Потерпевшая, инвестор ООО', birthDate: '1982-07-30', occupation: 'Инвестор', alias: null, isKolesnichenko: false, defenseStrategy: null, guiltLevel: 'none' },
  { id: 'p5', fullName: 'Козлов Виктор Николаевич', shortName: 'Козлов В.Н.', role: 'свидетель', status: 'активный', description: 'Свидетель, сосед Колесниченко', birthDate: '1975-01-12', occupation: 'Пенсионер', alias: 'Козёл', isKolesnichenko: false, defenseStrategy: null, guiltLevel: 'low' },
]

export const mockEpisodes: EpisodeData[] = [
  {
    id: 'ep1', title: 'Мошенничество с инвестициями', description: 'Хищение денежных средств инвесторов путём обмана, совершённое группой лиц по предварительному сговору', date: '2023-06-01', episodeNumber: '1', severity: 'тяжкое', status: 'доказано',
    persons: [
      { personId: 'p1', involvement: 'организатор', person: mockPersons[0] },
      { personId: 'p2', involvement: 'соучастник', person: mockPersons[1] },
      { personId: 'p3', involvement: 'свидетель', person: mockPersons[2] },
      { personId: 'p4', involvement: 'потерпевшая', person: mockPersons[3] },
    ],
    articles: [
      { articleId: 'art1', article: { id: 'art1', code: 'ст. 159 ч.3 УК РФ', number: '159', codeType: 'УК РФ', description: 'Мошенничество, совершённое группой лиц по предварительному сговору', category: 'тяжкое', punishmentMin: 'до 2 лет', punishmentMax: 'до 6 лет', isCurrent: true } },
    ],
    locations: [
      { locationId: 'loc1', location: { id: 'loc1', name: 'ООО "ТехноПром"', address: 'г. Москва, ул. Ленина, д. 10', type: 'место работы', description: 'Офис компании', coordinates: null }, context: 'Место совершения преступления' },
    ],
  },
  {
    id: 'ep2', title: 'Присвоение имущества ООО', description: 'Присвоение имущества организации, совершённое с использованием служебного положения', date: '2023-09-15', episodeNumber: '2', severity: 'тяжкое', status: 'расследуется',
    persons: [
      { personId: 'p1', involvement: 'исполнитель', person: mockPersons[0] },
      { personId: 'p2', involvement: 'соучастник', person: mockPersons[1] },
    ],
    articles: [
      { articleId: 'art2', article: { id: 'art2', code: 'ст. 160 ч.2 УК РФ', number: '160', codeType: 'УК РФ', description: 'Присвоение с использованием служебного положения', category: 'тяжкое', punishmentMin: 'до 2 лет', punishmentMax: 'до 5 лет', isCurrent: true } },
    ],
    locations: [
      { locationId: 'loc2', location: { id: 'loc2', name: 'Квартира Колесниченко', address: 'г. Москва, ул. Пушкина, д. 5', type: 'место жительства', description: 'Место обыска', coordinates: null }, context: 'Место обнаружения улик' },
    ],
  },
  {
    id: 'ep3', title: 'Фальсификация документов', description: 'Подделка финансовых документов для сокрытия хищения', date: '2023-12-01', episodeNumber: '3', severity: 'средней тяжести', status: 'сомнительно',
    persons: [
      { personId: 'p1', involvement: 'организатор', person: mockPersons[0] },
    ],
    articles: [],
    locations: [],
  },
]

export const mockGuiltAssessments: GuiltAssessmentData[] = [
  { id: 'ga1', personId: 'p1', episodeId: 'ep1', guiltLevel: 'high', evidenceStrength: 'strong', forecast: 'Обвинение вероятно', confidence: 'high', mitigating: 'Отсутствие ранее судимости', aggravating: 'Руководящая роль, групповой сговор', analysisDate: '2024-03-20T10:00:00Z', notes: 'Основной организатор' },
  { id: 'ga2', personId: 'p1', episodeId: 'ep2', guiltLevel: 'high', evidenceStrength: 'moderate', forecast: 'Обвинение вероятно', confidence: 'moderate', mitigating: 'Сотрудничество со следствием', aggravating: 'Использование служебного положения', analysisDate: '2024-03-20T10:00:00Z', notes: null },
  { id: 'ga3', personId: 'p2', episodeId: 'ep1', guiltLevel: 'moderate', evidenceStrength: 'moderate', forecast: 'Частичное обвинение', confidence: 'moderate', mitigating: 'Второстепенная роль', aggravating: 'Осознанное участие', analysisDate: '2024-03-20T10:00:00Z', notes: null },
  { id: 'ga4', personId: 'p3', episodeId: 'ep1', guiltLevel: 'none', evidenceStrength: 'insufficient', forecast: 'Не причастен', confidence: 'low', mitigating: null, aggravating: null, analysisDate: '2024-03-20T10:00:00Z', notes: 'Свидетель' },
  { id: 'ga5', personId: 'p4', episodeId: 'ep1', guiltLevel: 'none', evidenceStrength: 'insufficient', forecast: 'Потерпевшая', confidence: 'low', mitigating: null, aggravating: null, analysisDate: '2024-03-20T10:00:00Z', notes: 'Потерпевшая сторона' },
]

export const mockDefenseLines: DefenseLineData[] = [
  { id: 'dl1', personId: 'p1', strategyType: 'alibi', title: 'Алиби на период эпизода 1', description: 'Доказать, что Колесниченко не мог совершить действия эпизода 1, так как находился в другом городе', evidence: 'Свидетельские показания Козлова, билеты на поезд', strength: 'moderate', probability: 'moderate', articleReferences: 'ст. 159 ч.3 УК РФ' },
  { id: 'dl2', personId: 'p1', strategyType: 'reclassification', title: 'Переквалификация действий', description: 'Переквалификация с ч.3 ст.159 на менее тяжкую ч.1 ст.159', evidence: 'Отсутствие существенного вреда', strength: 'weak', probability: 'low', articleReferences: 'ст. 159 ч.1, ч.3 УК РФ' },
  { id: 'dl3', personId: 'p1', strategyType: 'procedural_violation', title: 'Процессуальные нарушения', description: 'Нарушения при задержании и обыске - отсутствие адвоката при первом допросе', evidence: 'Протокол допроса без подписи адвоката', strength: 'strong', probability: 'moderate', articleReferences: 'ст. 48, 50 УПК РФ' },
  { id: 'dl4', personId: 'p1', strategyType: 'lack_of_evidence', title: 'Недостаточность доказательств', description: 'Доказательства не позволяют достоверно установить причастность к эпизоду 2', evidence: 'Противоречия в показаниях свидетелей', strength: 'moderate', probability: 'moderate', articleReferences: 'ст. 307 УПК РФ' },
  { id: 'dl5', personId: 'p1', strategyType: 'mitigating', title: 'Смягчающие обстоятельства', description: 'Первое совершение преступления, положительные характеристики, сотрудничество со следствием', evidence: 'Характеристика с работы, справка о отсутствии судимости', strength: 'strong', probability: 'high', articleReferences: 'ст. 61 УК РФ' },
]

export const mockComplianceChecks: LegalComplianceData[] = [
  { id: 'lc1', documentId: 'doc1', checkType: 'article_applicability', status: 'warning', description: 'Статья 159 ч.3 может быть переквалифицирована на ч.2', recommendation: 'Рекомендуется проверка актуальности квалификации', legalBasis: 'ФЗ № 207 от 03.07.2024', checkedAt: '2024-05-15T10:00:00Z' },
  { id: 'lc2', documentId: 'doc3', checkType: 'procedure_compliance', status: 'violation', description: 'Обыск произведён без участия адвоката подозреваемого', recommendation: 'Результаты обыска могут быть признаны недопустимым доказательством', legalBasis: 'ст. 48, 182 УПК РФ', checkedAt: '2024-05-15T10:00:00Z' },
  { id: 'lc3', documentId: 'doc1', checkType: 'evidence_admissibility', status: 'compliant', description: 'Доказательства получены законным способом', recommendation: null, legalBasis: 'ст. 75 УПК РФ', checkedAt: '2024-05-15T10:00:00Z' },
  { id: 'lc4', documentId: 'doc1', checkType: 'statute_limitations', status: 'compliant', description: 'Срок давности не истёк', recommendation: null, legalBasis: 'ст. 78 УК РФ', checkedAt: '2024-05-15T10:00:00Z' },
]

export const mockChatMessages: ChatMessageData[] = [
  { id: 'chat1', question: 'Какие статьи предъявлены Колесниченко?', answer: 'Колесниченко Д.А. обвиняется по ст. 159 ч.3 (мошенничество, совершённое группой лиц по предварительному сговору) и ст. 160 ч.2 (присвоение с использованием служебного положения) УК РФ.', contextType: 'person_specific', contextId: 'p1', createdAt: '2024-05-20T10:00:00Z', referencedDocuments: ['doc1'], referencedPersons: ['p1'], referencedArticles: ['ст. 159 ч.3 УК РФ', 'ст. 160 ч.2 УК РФ'] },
  { id: 'chat2', question: 'Какие нарушения есть в материалах дела?', answer: 'Основное нарушение: обыск произведён без участия адвоката (ст. 48 УПК РФ). Также есть противоречия в показаниях свидетелей Петрова и Козлова относительно даты событий.', contextType: 'general', contextId: null, createdAt: '2024-05-20T10:05:00Z', referencedDocuments: ['doc3'], referencedPersons: ['p3', 'p5'], referencedArticles: ['ст. 48 УПК РФ'] },
]

export const mockProcessingQueue: ProcessingQueueData[] = [
  { id: 'q1', documentId: 'doc5', queuePosition: 1, status: 'queued', startedAt: null, completedAt: null, error: null, priority: 5 },
  { id: 'q2', documentId: 'doc4', queuePosition: 0, status: 'processing', startedAt: '2024-04-10T09:00:00Z', completedAt: null, error: null, priority: 3 },
]

export const mockDashboardStats: DashboardStats = {
  summary: {
    totalDocuments: 5,
    totalPersons: 5,
    totalEpisodes: 3,
    totalArticles: 2,
    totalLocations: 3,
    totalCrossReferences: 4,
    totalChatMessages: 2,
    totalComplianceChecks: 4,
    totalDefenseLines: 5,
    totalGuiltAssessments: 5,
  },
  documents: {
    total: 5,
    byStatus: { completed: 3, processing: 1, pending: 1 },
    byType: { обвинение: 1, показание: 2, протокол: 1, экспертиза: 1 },
    recent: mockDocuments.slice(0, 3),
  },
  persons: {
    total: 5,
    byRole: { обвиняемый: 1, соучастник: 1, свидетель: 2, потерпевшая: 1 },
    kolesnichenko: { id: 'p1', fullName: 'Колесниченко Дмитрий Александрович', role: 'обвиняемый', status: 'задержанный', defenseStrategy: 'Непризнание вины, алиби на период эпизода 1' },
  },
  episodes: {
    total: 3,
    bySeverity: { тяжкое: 2, 'средней тяжести': 1 },
    byStatus: { доказано: 1, расследуется: 1, сомнительно: 1 },
  },
  processingQueue: {
    byStatus: { queued: 1, processing: 1 },
    inProgress: [
      { id: 'q2', documentId: 'doc4', originalName: 'Заключение эксперта.pdf', queuePosition: 0, startedAt: '2024-04-10T09:00:00Z' },
    ],
  },
  guiltAssessments: {
    total: 5,
    byGuiltLevel: { high: 2, moderate: 1, none: 2 },
    byEvidenceStrength: { strong: 1, moderate: 2, insufficient: 2 },
    details: [
      { id: 'ga1', personFullName: 'Колесниченко Д.А.', personRole: 'обвиняемый', isKolesnichenko: true, episodeTitle: 'Мошенничество с инвестициями', guiltLevel: 'high', evidenceStrength: 'strong', forecast: 'Обвинение вероятно', confidence: 'high' },
      { id: 'ga3', personFullName: 'Сидоров А.П.', personRole: 'соучастник', isKolesnichenko: false, episodeTitle: 'Мошенничество с инвестициями', guiltLevel: 'moderate', evidenceStrength: 'moderate', forecast: 'Частичное обвинение', confidence: 'moderate' },
    ],
  },
  defenseLines: {
    total: 5,
    byType: { alibi: 1, reclassification: 1, procedural_violation: 1, lack_of_evidence: 1, mitigating: 1 },
    byStrength: { strong: 2, moderate: 2, weak: 1 },
    details: mockDefenseLines.map(dl => ({ id: dl.id, strategyType: dl.strategyType, title: dl.title, description: dl.description, strength: dl.strength, probability: dl.probability })),
  },
  complianceChecks: {
    total: 4,
    byStatus: { compliant: 2, warning: 1, violation: 1 },
    byType: { article_applicability: 1, procedure_compliance: 1, evidence_admissibility: 1, statute_limitations: 1 },
    details: [
      { id: 'lc1', documentOriginalName: 'Обвинительное заключение', checkType: 'article_applicability', status: 'warning', description: 'Статья 159 ч.3 может быть переквалифицирована', recommendation: 'Проверка актуальности квалификации', articleCode: '159 УК РФ' },
      { id: 'lc2', documentOriginalName: 'Протокол обыска', checkType: 'procedure_compliance', status: 'violation', description: 'Обыск без участия адвоката', recommendation: 'Недопустимое доказательство', articleCode: null },
    ],
  },
}

// Structured search results matching SearchResultData interface
export const mockSearchResults: SearchResultData = {
  documents: [mockDocuments[0]],
  persons: [mockPersons[0]],
  episodes: [mockEpisodes[0]],
  crossReferences: [
    { id: 'cr1', referenceText: 'Обвинение ссылается на показания Колесниченко', referenceType: 'доказательство', sourceDocument: mockDocuments[0], targetDocument: mockDocuments[1] },
    { id: 'cr2', referenceText: 'Протокол обыска подтверждает обвинение', referenceType: 'подтверждение', sourceDocument: mockDocuments[2], targetDocument: mockDocuments[0] },
  ],
}

// Case Health Score
export const mockCaseHealthScore: CaseHealthScore = {
  score: 62,
  factors: {
    documentProcessing: { value: 60, label: 'Обработка документов', tooltip: 'Процент завершённых обработок документов из общего числа загруженных' },
    complianceRate: { value: 50, label: 'Соответствие нормам', tooltip: 'Доля проверок, показавших полное соответствие правовым нормам РФ' },
    evidenceStrength: { value: 55, label: 'Сила доказательств', tooltip: 'Средняя оценка силы доказательств по всем эпизодам дела' },
    defenseCoverage: { value: 80, label: 'Покрытие линии защиты', tooltip: 'Процент эпизодов, для которых разработана стратегия защиты' },
  },
}

// Evidence Timeline Events
export const mockEvidenceTimeline: EvidenceTimelineEvent[] = [
  { id: 'et1', date: '2024-01-10T08:00:00Z', eventType: 'document_upload', description: 'Загружено: Обвинительное заключение - Том 1', relatedEntityId: 'doc1', relatedEntityName: 'Обвинительное заключение' },
  { id: 'et2', date: '2024-01-10T08:15:00Z', eventType: 'analysis_complete', description: 'Анализ завершён: Обвинительное заключение', relatedEntityId: 'doc1', relatedEntityName: 'Обвинительное заключение' },
  { id: 'et3', date: '2024-01-15T10:00:00Z', eventType: 'document_upload', description: 'Загружено: Показания Колесниченко Д.А.', relatedEntityId: 'doc2', relatedEntityName: 'Показания Колесниченко' },
  { id: 'et4', date: '2024-01-15T10:20:00Z', eventType: 'analysis_complete', description: 'Анализ завершён: Показания Колесниченко', relatedEntityId: 'doc2', relatedEntityName: 'Показания Колесниченко' },
  { id: 'et5', date: '2024-02-20T14:00:00Z', eventType: 'document_upload', description: 'Загружено: Протокол обыска', relatedEntityId: 'doc3', relatedEntityName: 'Протокол обыска' },
  { id: 'et6', date: '2024-02-20T14:10:00Z', eventType: 'analysis_complete', description: 'Анализ завершён: Протокол обыска', relatedEntityId: 'doc3', relatedEntityName: 'Протокол обыска' },
  { id: 'et7', date: '2024-03-20T10:00:00Z', eventType: 'episode_found', description: 'Выявлен эпизод: Мошенничество с инвестициями', relatedEntityId: 'ep1', relatedEntityName: 'Мошенничество с инвестициями' },
  { id: 'et8', date: '2024-04-10T09:00:00Z', eventType: 'document_upload', description: 'Загружено: Заключение эксперта', relatedEntityId: 'doc4', relatedEntityName: 'Заключение эксперта' },
  { id: 'et9', date: '2024-05-15T10:00:00Z', eventType: 'compliance_check', description: 'Правовая проверка: Обнаружено нарушение — обыск без адвоката', relatedEntityId: 'lc2', relatedEntityName: 'Правовая проверка' },
  { id: 'et10', date: '2024-05-15T10:30:00Z', eventType: 'compliance_check', description: 'Правовая проверка: Предупреждение — возможна переквалификация ст. 159', relatedEntityId: 'lc1', relatedEntityName: 'Правовая проверка' },
  { id: 'et11', date: '2024-05-20T09:00:00Z', eventType: 'defense_update', description: 'Обновлена стратегия защиты: Процессуальные нарушения', relatedEntityId: 'dl3', relatedEntityName: 'Процессуальные нарушения' },
]

// Person Relationships
export const mockPersonRelationships: PersonRelationship[] = [
  { id: 'pr1', sourcePersonId: 'p1', targetPersonId: 'p2', relationshipType: 'соучастники', description: 'Колесниченко и Сидоров — соучастники по эпизоду 1', sourcePersonName: 'Колесниченко Д.А.', targetPersonName: 'Сидоров А.П.' },
  { id: 'pr2', sourcePersonId: 'p1', targetPersonId: 'p4', relationshipType: 'обвиняемый-потерпевшая', description: 'Колесниченко обвиняется в мошенничестве против Иванова', sourcePersonName: 'Колесниченко Д.А.', targetPersonName: 'Иванова М.С.' },
  { id: 'pr3', sourcePersonId: 'p1', targetPersonId: 'p3', relationshipType: 'обвиняемый-свидетель', description: 'Петров — свидетель по делу Колесниченко', sourcePersonName: 'Колесниченко Д.А.', targetPersonName: 'Петров И.В.' },
  { id: 'pr4', sourcePersonId: 'p1', targetPersonId: 'p5', relationshipType: 'обвиняемый-свидетель', description: 'Козлов — свидетель алиби Колесниченко', sourcePersonName: 'Колесниченко Д.А.', targetPersonName: 'Козлов В.Н.' },
  { id: 'pr5', sourcePersonId: 'p2', targetPersonId: 'p4', relationshipType: 'соучастник-потерпевшая', description: 'Сидоров — соучастник хищения средств Ивановой', sourcePersonName: 'Сидоров А.П.', targetPersonName: 'Иванова М.С.' },
  { id: 'pr6', sourcePersonId: 'p1', targetPersonId: 'p2', relationshipType: 'организатор-соучастник', description: 'Колесниченко — организатор, Сидоров — соучастник', sourcePersonName: 'Колесниченко Д.А.', targetPersonName: 'Сидоров А.П.' },
]

// Defense Improvement Suggestions
export const mockDefenseImprovements: DefenseImprovementData[] = [
  { id: 'di1', defenseLineId: 'dl1', suggestion: 'Представить дополнительные доказательства алиби: видео с камер наблюдения, электронные билеты', expectedImpact: 'Усиление алиби', probabilityChange: '+15%', difficulty: 'moderate', category: 'доказательства' },
  { id: 'di2', defenseLineId: 'dl2', suggestion: 'Собрать доказательства отсутствия значительного вреда для переквалификации на ч.1 ст. 159', expectedImpact: 'Успешная переквалификация', probabilityChange: '+20%', difficulty: 'hard', category: 'переквалификация' },
  { id: 'di3', defenseLineId: 'dl3', suggestion: 'Подать ходатайство о признании результатов обыска недопустимым доказательством', expectedImpact: 'Исключение ключевого доказательства', probabilityChange: '+25%', difficulty: 'easy', category: 'процессуальные' },
  { id: 'di4', defenseLineId: 'dl4', suggestion: 'Выявить дополнительные противоречия в показаниях свидетелей Петрова и Козлова', expectedImpact: 'Ослабление обвинения', probabilityChange: '+10%', difficulty: 'moderate', category: 'доказательства' },
  { id: 'di5', defenseLineId: 'dl5', suggestion: 'Получить положительные характеристики от дополнительных источников (соседи, бывшие коллеги)', expectedImpact: 'Усиление смягчающих', probabilityChange: '+5%', difficulty: 'easy', category: 'характеристика' },
]

// Notifications
export const mockNotifications: NotificationData[] = [
  { id: 'n1', type: 'processing', title: 'Документ в обработке', description: 'Заключение эксперта — обработка запущена', timestamp: '2024-04-10T09:00:00Z', isRead: false, relatedSection: 'documents', relatedEntityId: 'doc4' },
  { id: 'n2', type: 'compliance', title: 'Нарушение выявлено', description: 'Обыск без участия адвоката — ст. 48 УПК РФ', timestamp: '2024-05-15T10:00:00Z', isRead: false, relatedSection: 'legal-check', relatedEntityId: 'lc2' },
  { id: 'n3', type: 'compliance', title: 'Предупреждение', description: 'Ст. 159 ч.3 может быть переквалифицирована', timestamp: '2024-05-15T10:30:00Z', isRead: false, relatedSection: 'legal-check', relatedEntityId: 'lc1' },
  { id: 'n4', type: 'processing', title: 'Документ в очереди', description: 'Показания свидетеля Петрова — ожидает обработки', timestamp: '2024-05-01T11:00:00Z', isRead: true, relatedSection: 'documents', relatedEntityId: 'doc5' },
  { id: 'n5', type: 'defense', title: 'Стратегия обновлена', description: 'Процессуальные нарушения — сильная позиция', timestamp: '2024-05-20T09:00:00Z', isRead: true, relatedSection: 'defense', relatedEntityId: 'dl3' },
]

// Cross-reference Graph Nodes
export const mockCrossRefNodes: CrossRefNode[] = [
  {
    documentId: 'doc1', documentName: 'Обвинительное заключение', documentType: 'обвинение',
    linkedDocuments: [
      { id: 'doc2', name: 'Показания Колесниченко', type: 'показание', refType: 'доказательство' },
      { id: 'doc3', name: 'Протокол обыска', type: 'протокол', refType: 'подтверждение' },
    ],
  },
  {
    documentId: 'doc2', documentName: 'Показания Колесниченко', documentType: 'показание',
    linkedDocuments: [
      { id: 'doc1', name: 'Обвинительное заключение', type: 'обвинение', refType: 'цитата' },
    ],
  },
  {
    documentId: 'doc3', documentName: 'Протокол обыска', documentType: 'протокол',
    linkedDocuments: [
      { id: 'doc1', name: 'Обвинительное заключение', type: 'обвинение', refType: 'подтверждение' },
      { id: 'doc2', name: 'Показания Колесниченко', type: 'показание', refType: 'упоминание' },
    ],
  },
  {
    documentId: 'doc4', documentName: 'Заключение эксперта', documentType: 'экспертиза',
    linkedDocuments: [
      { id: 'doc1', name: 'Обвинительное заключение', type: 'обвинение', refType: 'доказательство' },
    ],
  },
]

// === NEW: Case Brief / Executive Summary ===
export const mockCaseBrief: CaseBriefData = {
  caseNumber: '2024-00145',
  caseTitle: 'Уголовное дело в отношении Колесниченко Д.А. и Сидорова А.П.',
  summary: 'Уголовное дело возбуждено по признакам преступлений, предусмотренных ч.3 ст.159 и ч.2 ст.160 УК РФ. Обвиняемые — Колесниченко Д.А. (организатор) и Сидоров А.П. (соучастник), бывшие руководство ООО "ТехноПром". Эпизоды включают мошенничество с инвестициями граждан и присвоение имущества организации. Общая сумма ущерба — 12,5 млн рублей. Дело содержит 5 томов материалов, 4 ключевых документа прошли AI-анализ.',
  keyDefendants: [
    { name: 'Колесниченко Дмитрий Александрович', role: 'организатор', articles: ['ст. 159 ч.3 УК РФ', 'ст. 160 ч.2 УК РФ'], guiltLevel: 'high' },
    { name: 'Сидоров Андрей Петрович', role: 'соучастник', articles: ['ст. 159 ч.3 УК РФ'], guiltLevel: 'moderate' },
  ],
  keyEpisodes: [
    { title: 'Мошенничество с инвестициями', date: '2023-06-01', severity: 'тяжкое', status: 'доказано' },
    { title: 'Присвоение имущества ООО', date: '2023-09-15', severity: 'тяжкое', status: 'расследуется' },
    { title: 'Фальсификация документов', date: '2023-12-01', severity: 'средней тяжести', status: 'сомнительно' },
  ],
  keyEvidence: [
    { description: 'Финансово-экономическая экспертиза', source: 'Заключение эксперта', strength: 'strong' },
    { description: 'Показания свидетеля Петрова И.В.', source: 'Протокол допроса', strength: 'moderate' },
    { description: 'Видеозапись с камер наблюдения', source: 'Приложение к протоколу обыска', strength: 'strong' },
    { description: 'Бухгалтерские документы ООО', source: 'Изъятие при обыске', strength: 'moderate' },
  ],
  keyViolations: [
    { description: 'Обыск без участия адвоката', legalBasis: 'ст. 48, 182 УПК РФ', severity: 'critical' },
    { description: 'Возможна переквалификация ст. 159', legalBasis: 'ФЗ № 207 от 03.07.2024', severity: 'major' },
    { description: 'Противоречия в показаниях свидетелей', legalBasis: 'ст. 87 УПК РФ', severity: 'minor' },
  ],
  defenseSummary: 'Основная линия защиты Колесниченко — непризнание вины и алиби на период эпизода 1, а также заявление о процессуальных нарушениях при обыске (отсутствие адвоката). Дополнительно — ходатайство о переквалификации и смягчающие обстоятельства (первая судимость, сотрудничество).',
  prosecutionSummary: 'Обвинение опирается на заключение финансовой экспертизы, показания свидетелей, изъятые при обыске документы. Ущерб подтверждён показаниями потерпевшей Ивановой М.С. и материалами бухгалтерской экспертизы.',
  predictedOutcome: [
    { scenario: 'Полное обвинение по всем эпизодам', probability: 45, description: 'Суд признает вину по ст. 159 ч.3 и 160 ч.2 с назначением реального лишения свободы 4-6 лет' },
    { scenario: 'Частичное обвинение (переквалификация)', probability: 30, description: 'Переквалификация на ч.2 ст.159, наказание 2-4 года условно' },
    { scenario: 'Исключение ключевых доказательств', probability: 15, description: 'Признание обыска недопустимым → прекращение дела за недоказанностью' },
    { scenario: 'Прекращение дела', probability: 10, description: 'Прекращение за примирением сторон или по иным основаниям' },
  ],
  generatedAt: '2024-05-22T10:00:00Z',
  aiConfidence: 78,
}

// === NEW: Risk Assessment Matrix ===
export const mockRiskAssessment: RiskAssessmentData = {
  overallRisk: 68,
  riskLevel: 'high',
  factors: {
    evidenceRisk: { score: 72, label: 'Риск доказательственной базы', description: 'Сила доказательств обвинения высокая, но есть процессуальные нарушения' },
    proceduralRisk: { score: 80, label: 'Процессуальный риск', description: 'Обыск без адвоката — основание для исключения доказательств' },
    defenseRisk: { score: 45, label: 'Риск линии защиты', description: 'Алиби умеренно сильное, но требует дополнительных доказательств' },
    complianceRisk: { score: 50, label: 'Риск несоответствия нормам', description: 'Возможна переквалификация, есть нарушения УПК' },
    timelineRisk: { score: 60, label: 'Риск по срокам', description: 'Сроки расследования близки к предельным, возможны нарушения' },
  },
  matrix: [
    { likelihood: 75, impact: 85, category: 'Осуждение по ст. 159 ч.3' },
    { likelihood: 60, impact: 70, category: 'Осуждение по ст. 160 ч.2' },
    { likelihood: 40, impact: 90, category: 'Исключение доказательств' },
    { likelihood: 30, impact: 50, category: 'Переквалификация' },
    { likelihood: 20, impact: 95, category: 'Прекращение дела' },
  ],
  mitigationStrategies: [
    { strategy: 'Подать ходатайство об исключении результатов обыска', riskReduction: 25, priority: 'high' },
    { strategy: 'Собрать дополнительные доказательства алиби', riskReduction: 15, priority: 'high' },
    { strategy: 'Подготовить смягчающие обстоятельства', riskReduction: 10, priority: 'medium' },
    { strategy: 'Выявить противоречия в показаниях свидетелей', riskReduction: 12, priority: 'medium' },
    { strategy: 'Ходатайствовать о переквалификации', riskReduction: 8, priority: 'low' },
  ],
}

// === NEW: Sentencing Calculator ===
export const mockSentencing: SentencingData[] = [
  {
    articleCode: 'ст. 159 ч.3 УК РФ',
    description: 'Мошенничество, совершённое группой лиц по предварительному сговору',
    punishmentMin: 2,
    punishmentMax: 6,
    baseSentence: 4,
    mitigatingFactors: [
      { factor: 'Первое совершение преступления', reduction: 1, applies: true },
      { factor: 'Положительные характеристики', reduction: 0.5, applies: true },
      { factor: 'Сотрудничество со следствием', reduction: 0.5, applies: true },
      { factor: 'Наличие малолетних детей', reduction: 0.5, applies: false },
      { factor: 'Возмещение ущерба', reduction: 1, applies: false },
    ],
    aggravatingFactors: [
      { factor: 'Руководящая роль в преступлении', increase: 1, applies: true },
      { factor: 'Особо крупный размер', increase: 1, applies: true },
      { factor: 'Совершение в группе', increase: 0.5, applies: true },
      { factor: 'Использование служебного положения', increase: 0.5, applies: true },
    ],
    estimatedSentence: 4,
    estimatedFine: 500000,
    additionalSanctions: ['Лишение права занимать руководящие должности на 3 года', 'Возмещение ущерба 12,5 млн руб.'],
    precedentCases: [
      { caseNumber: '1-12/2023', sentence: 4.5, description: 'Аналогичное дело, мошенничество группой лиц, реальное лишение свободы' },
      { caseNumber: '1-45/2023', sentence: 3, description: 'Мошенничество с переквалификацией на ч.2, условный срок' },
      { caseNumber: '1-78/2022', sentence: 5, description: 'Мошенничество в особо крупном размере, реальный срок' },
    ],
  },
  {
    articleCode: 'ст. 160 ч.2 УК РФ',
    description: 'Присвоение с использованием служебного положения',
    punishmentMin: 2,
    punishmentMax: 5,
    baseSentence: 3.5,
    mitigatingFactors: [
      { factor: 'Первое совершение преступления', reduction: 1, applies: true },
      { factor: 'Положительные характеристики', reduction: 0.5, applies: true },
      { factor: 'Сотрудничество со следствием', reduction: 0.5, applies: true },
    ],
    aggravatingFactors: [
      { factor: 'Использование служебного положения', increase: 1, applies: true },
      { factor: 'Особо крупный размер', increase: 1, applies: false },
    ],
    estimatedSentence: 3,
    estimatedFine: 300000,
    additionalSanctions: ['Лишение права занимать бухгалтерские должности на 2 года'],
    precedentCases: [
      { caseNumber: '1-23/2023', sentence: 3, description: 'Присвоение средств главным бухгалтером, условный срок' },
      { caseNumber: '1-67/2022', sentence: 4, description: 'Присвоение директором ООО, реальный срок' },
    ],
  },
]

// === NEW: Evidence Chain of Custody ===
export const mockEvidenceChain: EvidenceChainData[] = [
  {
    evidenceId: 'ev1',
    evidenceName: 'Бухгалтерские документы ООО "ТехноПром"',
    evidenceType: 'документы',
    collectedAt: '2024-02-20T14:00:00Z',
    collectedBy: 'Ст. следователь Иванов И.И.',
    location: 'Офис ООО "ТехноПром", г. Москва, ул. Ленина, д. 10',
    chainSteps: [
      { id: 'cs1', timestamp: '2024-02-20T14:00:00Z', action: 'Изъятие при обыске', actor: 'Следователь Иванов И.И.', notes: 'Изъято 45 листов документов', status: 'intact' },
      { id: 'cs2', timestamp: '2024-02-20T16:30:00Z', action: 'Передача в ОВД', actor: 'Понятой Смирнов А.А.', notes: 'Передача упаковки с документами', status: 'transferred' },
      { id: 'cs3', timestamp: '2024-02-21T09:00:00Z', action: 'Передача на экспертизу', actor: 'Эксперт Кузнецова Е.В.', notes: 'Назначена финансово-экономическая экспертиза', status: 'transferred' },
      { id: 'cs4', timestamp: '2024-04-10T17:00:00Z', action: 'Возврат с экспертизы', actor: 'Эксперт Кузнецова Е.В.', notes: 'Заключение эксперта приобщено к делу', status: 'analyzed' },
    ],
    integrityScore: 65,
    admissibility: 'questionable',
    challenges: [
      { description: 'Обыск без участия адвоката подозреваемого', severity: 'high' },
      { description: 'Отсутствие видеофиксации изъятия документов', severity: 'medium' },
      { description: 'Задержка в передаче на экспертизу (1 день)', severity: 'low' },
    ],
  },
  {
    evidenceId: 'ev2',
    evidenceName: 'Электронные носители (ноутбук, флеш-накопители)',
    evidenceType: 'электронные доказательства',
    collectedAt: '2024-02-20T14:30:00Z',
    collectedBy: 'Ст. следователь Иванов И.И.',
    location: 'Квартира Колесниченко, г. Москва, ул. Пушкина, д. 5',
    chainSteps: [
      { id: 'cs5', timestamp: '2024-02-20T14:30:00Z', action: 'Изъятие при обыске', actor: 'Следователь Иванов И.И.', notes: 'Изъято: 1 ноутбук, 3 флеш-накопителя', status: 'intact' },
      { id: 'cs6', timestamp: '2024-02-20T17:00:00Z', action: 'Передача специалисту', actor: 'Специалист Петров П.П.', notes: 'Создание образов дисков', status: 'transferred' },
      { id: 'cs7', timestamp: '2024-03-01T10:00:00Z', action: 'Компьютерно-техническая экспертиза', actor: 'Эксперт Соколов Д.А.', notes: 'Анализ содержимого', status: 'analyzed' },
    ],
    integrityScore: 80,
    admissibility: 'admissible',
    challenges: [
      { description: 'Отсутствие протокола точного времени изъятия', severity: 'low' },
    ],
  },
  {
    evidenceId: 'ev3',
    evidenceName: 'Показания свидетеля Петрова И.В.',
    evidenceType: 'показания',
    collectedAt: '2024-02-05T11:00:00Z',
    collectedBy: 'Следователь Сидоров С.С.',
    location: 'ОВД по району',
    chainSteps: [
      { id: 'cs8', timestamp: '2024-02-05T11:00:00Z', action: 'Допрос свидетеля', actor: 'Следователь Сидоров С.С.', notes: 'Протокол допроса 10 листов', status: 'intact' },
      { id: 'cs9', timestamp: '2024-04-15T14:00:00Z', action: 'Повторный допрос', actor: 'Следователь Сидоров С.С.', notes: 'Уточнения по обстоятельствам', status: 'questioned' },
    ],
    integrityScore: 55,
    admissibility: 'questionable',
    challenges: [
      { description: 'Противоречия с показаниями свидетеля Козлова В.Н.', severity: 'high' },
      { description: 'Изменение показаний между допросами', severity: 'medium' },
    ],
  },
]

// === NEW: Audit Log ===
export const mockAuditLog: AuditLogEntry[] = [
  { id: 'al1', timestamp: '2024-05-22T09:30:00Z', action: 'Вход в систему', category: 'login', actor: 'Адвокат Петров А.В.', details: 'Успешная авторизация', severity: 'info' },
  { id: 'al2', timestamp: '2024-05-22T09:35:00Z', action: 'Просмотр документов', category: 'system', actor: 'Адвокат Петров А.В.', details: 'Открыт раздел "Документы"', severity: 'info' },
  { id: 'al3', timestamp: '2024-05-22T09:42:00Z', action: 'Загрузка документа', category: 'upload', actor: 'Адвокат Петров А.В.', details: 'Загружен: Ходатайство о признании доказательств.pdf', entityId: 'doc6', entityType: 'document', severity: 'info' },
  { id: 'al4', timestamp: '2024-05-22T09:45:00Z', action: 'AI-анализ документа', category: 'analysis', actor: 'Система ИИ', details: 'Запущен AI-анализ документа doc6', entityId: 'doc6', entityType: 'document', severity: 'info' },
  { id: 'al5', timestamp: '2024-05-22T10:00:00Z', action: 'Поиск по делу', category: 'search', actor: 'Адвокат Петров А.В.', details: 'Поиск: "алиби Колесниченко"', severity: 'info' },
  { id: 'al6', timestamp: '2024-05-22T10:15:00Z', action: 'Экспорт данных', category: 'export', actor: 'Адвокат Петров А.В.', details: 'Экспортирован список документов в CSV', severity: 'warning' },
  { id: 'al7', timestamp: '2024-05-22T10:30:00Z', action: 'Вопрос ИИ', category: 'analysis', actor: 'Адвокат Петров А.В.', details: 'Вопрос: "Какие нарушения есть в материалах дела?"', severity: 'info' },
  { id: 'al8', timestamp: '2024-05-22T11:00:00Z', action: 'Удаление черновика', category: 'delete', actor: 'Адвокат Петров А.В.', details: 'Удалён черновик документа doc_draft_1', severity: 'warning' },
  { id: 'al9', timestamp: '2024-05-22T11:20:00Z', action: 'Изменение линии защиты', category: 'edit', actor: 'Адвокат Петров А.В.', details: 'Обновлена стратегия "Процессуальные нарушения"', entityId: 'dl3', entityType: 'defense', severity: 'info' },
  { id: 'al10', timestamp: '2024-05-22T11:45:00Z', action: 'Правовая проверка', category: 'analysis', actor: 'Система ИИ', details: 'Запущена правовая проверка по ст. 48 УПК РФ', severity: 'info' },
  { id: 'al11', timestamp: '2024-05-22T12:00:00Z', action: 'Критическое нарушение', category: 'system', actor: 'Система ИИ', details: 'Обнаружено критическое нарушение: обыск без адвоката', entityId: 'lc2', entityType: 'compliance', severity: 'critical' },
]

// === NEW: Case Timeline (overall chronology) ===
export const mockCaseTimeline: CaseTimelineEvent[] = [
  { id: 'ct1', date: '2023-06-01', title: 'Совершение эпизода 1 — Мошенничество', description: 'Хищение денежных средств инвесторов путём обмана, совершённое группой лиц по предварительному сговору', category: 'crime', importance: 'critical', relatedPersons: ['p1', 'p2'], relatedEpisodes: ['ep1'], status: 'completed' },
  { id: 'ct2', date: '2023-09-15', title: 'Совершение эпизода 2 — Присвоение', description: 'Присвоение имущества организации с использованием служебного положения', category: 'crime', importance: 'critical', relatedPersons: ['p1', 'p2'], relatedEpisodes: ['ep2'], status: 'completed' },
  { id: 'ct3', date: '2023-12-01', title: 'Совершение эпизода 3 — Фальсификация', description: 'Подделка финансовых документов для сокрытия хищения', category: 'crime', importance: 'high', relatedPersons: ['p1'], relatedEpisodes: ['ep3'], status: 'completed' },
  { id: 'ct4', date: '2024-01-05', title: 'Заявление в полицию', description: 'Потерпевшая Иванова М.С. подала заявление о мошенничестве', category: 'investigation', importance: 'high', relatedPersons: ['p4'], status: 'completed' },
  { id: 'ct5', date: '2024-01-08', title: 'Возбуждение уголовного дела', description: 'Следственным отделом возбуждено уголовное дело № 2024-00145', category: 'legal', importance: 'critical', status: 'completed' },
  { id: 'ct6', date: '2024-01-10', title: 'Загрузка обвинительного заключения', description: 'Загружен Том 1 — Обвинительное заключение', category: 'evidence', importance: 'high', relatedDocuments: ['doc1'], status: 'completed' },
  { id: 'ct7', date: '2024-01-15', title: 'Допрос Колесниченко', description: 'Допрос подозреваемого Колесниченко Д.А.', category: 'investigation', importance: 'critical', relatedPersons: ['p1'], relatedDocuments: ['doc2'], status: 'completed' },
  { id: 'ct8', date: '2024-02-05', title: 'Допрос свидетеля Петрова', description: 'Допрос свидетеля Петрова И.В.', category: 'investigation', importance: 'high', relatedPersons: ['p3'], relatedDocuments: ['doc5'], status: 'completed' },
  { id: 'ct9', date: '2024-02-20', title: 'Обыск по месту жительства', description: 'Обыск в квартире Колесниченко — изъяты документы и электронные носители', category: 'investigation', importance: 'critical', relatedPersons: ['p1'], relatedDocuments: ['doc3'], status: 'completed' },
  { id: 'ct10', date: '2024-03-15', title: 'Предъявление обвинения', description: 'Колесниченко предъявлено обвинение по ст. 159 ч.3, 160 ч.2 УК РФ', category: 'legal', importance: 'critical', relatedPersons: ['p1'], status: 'completed' },
  { id: 'ct11', date: '2024-03-20', title: 'Анализ виновности', description: 'AI-анализ определил высокую вероятность виновности Колесниченко', category: 'evidence', importance: 'high', relatedPersons: ['p1'], status: 'completed' },
  { id: 'ct12', date: '2024-04-10', title: 'Назначение экспертизы', description: 'Назначена финансово-экономическая экспертиза', category: 'investigation', importance: 'high', relatedDocuments: ['doc4'], status: 'ongoing' },
  { id: 'ct13', date: '2024-05-15', title: 'Правовая проверка', description: 'AI-анализ выявил нарушения УПК при обыске', category: 'legal', importance: 'critical', status: 'completed' },
  { id: 'ct14', date: '2024-05-20', title: 'Корректировка линии защиты', description: 'Добавлена стратегия: процессуальные нарушения (ст. 48 УПК)', category: 'defense', importance: 'high', relatedPersons: ['p1'], status: 'completed' },
  { id: 'ct15', date: '2024-06-15', title: 'Предстоящее судебное заседание', description: 'Предварительное слушание по ходатайству об исключении доказательств', category: 'hearing', importance: 'critical', status: 'planned' },
  { id: 'ct16', date: '2024-07-01', title: 'Основное судебное разбирательство', description: 'Начало основного судебного разбирательства по существу дела', category: 'hearing', importance: 'critical', status: 'planned' },
]

// === NEW: Bookmarks ===
export const mockBookmarks: BookmarkData[] = [
  { id: 'bm1', entityType: 'document', entityId: 'doc1', entityName: 'Обвинительное заключение - Том 1', note: 'Главный документ обвинения — изучить детально', color: 'red', createdAt: '2024-05-22T10:00:00Z' },
  { id: 'bm2', entityType: 'person', entityId: 'p1', entityName: 'Колесниченко Дмитрий Александрович', note: 'Основной клиент — приоритет защиты', color: 'red', createdAt: '2024-05-22T10:05:00Z' },
  { id: 'bm3', entityType: 'episode', entityId: 'ep1', entityName: 'Мошенничество с инвестициями', note: 'Главный эпизод — нужна переквалификация', color: 'amber', createdAt: '2024-05-22T10:10:00Z' },
  { id: 'bm4', entityType: 'document', entityId: 'doc3', entityName: 'Протокол обыска', note: 'Нарушение ст. 48 УПК — основание для исключения', color: 'emerald', createdAt: '2024-05-22T10:15:00Z' },
  { id: 'bm5', entityType: 'search', entityId: 'search_alibi', entityName: 'Поиск: алиби Колесниченко', note: 'Сохранённый поиск по алиби', color: 'stone', createdAt: '2024-05-22T10:20:00Z' },
]

// === NEW: Witness Statements ===
export const mockWitnessStatements: WitnessStatementData[] = [
  {
    id: 'ws1', witnessId: 'p3', witnessName: 'Петров Иван Васильевич',
    statementDate: '2024-02-05T11:00:00Z', statementType: 'initial',
    summary: 'Подтвердил факт работы в ООО "ТехноПром" и знание о финансовых операциях компании. Указал на подпись Колесниченко на приказах о переводе средств.',
    keyPoints: [
      'Работал в ООО "ТехноПром" с 2020 по 2023 год',
      'Знал о переводах средств на подставные компании',
      'Видел подпись Колесниченко на приказах',
      'Подтвердил передачу денег от Ивановой М.С.',
    ],
    contradictions: [{ withStatementId: 'ws3', description: 'Расхождение в дате подписания приказов: Петров указывает июнь 2023, Козлов — май 2023' }],
    reliability: 'moderate',
    verifiedBy: ['Бухгалтерские документы ООО', 'Приказы с подписью Колесниченко'],
  },
  {
    id: 'ws2', witnessId: 'p5', witnessName: 'Козлов Виктор Николаевич',
    statementDate: '2024-02-08T10:00:00Z', statementType: 'initial',
    summary: 'Сосед Колесниченко. Подтвердил, что Колесниченко был дома в день предполагаемого совершения эпизода 1 (1 июня 2023).',
    keyPoints: [
      'Живёт по соседству с Колесниченко 5 лет',
      'Видел Колесниченко 1 июня 2023 во дворе дома',
      'Подтверждает алиби на период эпизода 1',
      'Не помнит точного времени встречи',
    ],
    contradictions: [{ withStatementId: 'ws1', description: 'Козлов утверждает, что видел Колесниченко 1 июня, но финансовые документы подписаны Колесниченко в этот день' }],
    reliability: 'low',
    verifiedBy: [],
  },
  {
    id: 'ws3', witnessId: 'p3', witnessName: 'Петров Иван Васильевич',
    statementDate: '2024-04-15T14:00:00Z', statementType: 'clarification',
    summary: 'Уточнил ранее данные показания — указал, что приказы могли быть подписаны в мае 2023, а не в июне.',
    keyPoints: [
      'Уточнил дату подписания приказов — май 2023',
      'Подтвердил ранее данные показания',
      'Указал на возможную ошибку в первоначальных показаниях',
    ],
    contradictions: [{ withStatementId: 'ws1', description: 'Изменение даты подписания приказов с июня на май 2023' }],
    reliability: 'moderate',
    verifiedBy: ['Бухгалтерские документы с датой май 2023'],
  },
]

// === NEW: Mock Analytics Data ===
export const mockAnalytics: AnalyticsData = {
  processingTrend: [
    { date: 'Янв', processed: 1, pending: 0, failed: 0 },
    { date: 'Фев', processed: 2, pending: 0, failed: 0 },
    { date: 'Мар', processed: 1, pending: 0, failed: 0 },
    { date: 'Апр', processed: 0, pending: 1, failed: 0 },
    { date: 'Май', processed: 0, pending: 1, failed: 0 },
  ],
  episodeMatrix: [
    { severity: 'особо тяжкое', proven: 0, investigating: 0, doubtful: 0, total: 0 },
    { severity: 'тяжкое', proven: 1, investigating: 1, doubtful: 0, total: 2 },
    { severity: 'средней тяжести', proven: 0, investigating: 0, doubtful: 1, total: 1 },
    { severity: 'небольшой', proven: 0, investigating: 0, doubtful: 0, total: 0 },
  ],
  personInvolvement: [
    { name: 'Колесниченко Д.А.', episodes: 3, documents: 2, relationships: 4 },
    { name: 'Сидоров А.П.', episodes: 2, documents: 1, relationships: 3 },
    { name: 'Петров И.В.', episodes: 1, documents: 1, relationships: 1 },
    { name: 'Иванова М.С.', episodes: 1, documents: 0, relationships: 1 },
    { name: 'Козлов В.Н.', episodes: 1, documents: 0, relationships: 1 },
  ],
  articleCharges: [
    { code: 'ст. 159 ч.3 УК РФ', description: 'Мошенничество с использованием служебного положения', count: 2, severity: 'тяжкое' },
    { code: 'ст. 159 ч.4 УК РФ', description: 'Мошенничество в особо крупном размере', count: 1, severity: 'особо тяжкое' },
    { code: 'ст. 160 ч.3 УК РФ', description: 'Присвоение или растрата', count: 1, severity: 'тяжкое' },
    { code: 'ст. 33 УК РФ', description: 'Соучастие в преступлении', count: 1, severity: 'тяжкое' },
  ],
  complexity: {
    overallScore: 72,
    factors: [
      { name: 'Объём документов', score: 65, benchmark: 50 },
      { name: 'Количество участников', score: 70, benchmark: 40 },
      { name: 'Количество эпизодов', score: 55, benchmark: 35 },
      { name: 'Сложность статей', score: 85, benchmark: 60 },
      { name: 'Перекрёстных ссылок', score: 60, benchmark: 45 },
      { name: 'Экспертиз', score: 80, benchmark: 30 },
    ],
    rating: 'high',
  },
  documentTypes: [
    { type: 'Обвинение', count: 1, percentage: 20 },
    { type: 'Показание', count: 2, percentage: 40 },
    { type: 'Протокол', count: 1, percentage: 20 },
    { type: 'Экспертиза', count: 1, percentage: 20 },
  ],
  insights: [
    {
      type: 'critical',
      title: 'Противоречия в показаниях свидетелей',
      description: 'Обнаружены 3 противоречия в показаниях свидетелей по дате подписания приказов. Рекомендуется дополнительный допрос.',
      confidence: 88,
    },
    {
      type: 'warning',
      title: 'Истекает срок давности по эпизоду 2',
      description: 'По эпизоду 2 (средней тяжести) срок давности истекает через 14 месяцев. Необходимо ускорить рассмотрение.',
      confidence: 95,
    },
    {
      type: 'positive',
      title: 'Сильная доказательственная база по эпизоду 1',
      description: 'Эпизод 1 подтверждён 4 независимыми источниками. Вероятность доказанности в суде — 87%.',
      confidence: 92,
    },
    {
      type: 'info',
      title: 'Рекомендуется дополнительная экспертиза',
      description: 'Для полного доказывания по эпизоду 3 рекомендуется назначение почерковедческой экспертизы.',
      confidence: 78,
    },
  ],
  outcomePrediction: [
    { scenario: 'Полное признание вины по всем эпизодам', probability: 35, rationale: 'Сильная доказательная база по эп. 1, но есть противоречия' },
    { scenario: 'Частичное признание (эп. 1, оправдание эп. 2-3)', probability: 45, rationale: 'Алиби по эп. 1 опровергается, но по эп. 2-3 есть основания' },
    { scenario: 'Оправдание по всем эпизодам', probability: 12, rationale: 'Маловероятно при текущей доказательной базе' },
    { scenario: 'Возврат дела прокурору (нарушения)', probability: 8, rationale: 'Возможно при обнаружении процессуальных нарушений' },
  ],
  workloadByMonth: [
    { month: 'Янв', documents: 1, actions: 5, hearings: 0 },
    { month: 'Фев', documents: 2, actions: 8, hearings: 1 },
    { month: 'Мар', documents: 1, actions: 6, hearings: 1 },
    { month: 'Апр', documents: 1, actions: 9, hearings: 2 },
    { month: 'Май', documents: 1, actions: 7, hearings: 1 },
    { month: 'Июн', documents: 0, actions: 4, hearings: 1 },
  ],
}
