import {
  DocumentData, PersonData, EpisodeData, DefenseLineData,
  LegalComplianceData, ChatMessageData, DashboardStats,
  ProcessingQueueData, SearchResultData, GuiltAssessmentData,
  EvidenceTimelineEvent, PersonRelationship, DefenseImprovementData,
  NotificationData, CaseHealthScore, CrossRefNode,
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
