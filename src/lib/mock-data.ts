import {
  DocumentData, PersonData, EpisodeData, DefenseLineData,
  LegalComplianceData, ChatMessageData, DashboardStats,
  ProcessingQueueData, SearchResultData, GuiltAssessmentData,
} from './case-store'

export const mockDocuments: DocumentData[] = [
  { id: 'doc1', fileName: 'obvinenie_tom1.pdf', originalName: 'Обвинительное заключение - Том 1.pdf', fileSize: 2456000, mimeType: 'application/pdf', extractedText: 'Обвинительное заключение по делу № 2024-00145 в отношении Колесниченко Д.А. по ст. 159 ч.3, 160 ч.2 УК РФ...', summary: 'Обвинительное заключение по делу о мошенничестве', documentDate: '2024-03-15', documentType: 'обвинение', sourceReference: 'том 1, л.д. 1-45', processingStatus: 'completed', processingError: null, uploadedAt: '2024-01-10T08:00:00Z', processedAt: '2024-01-10T08:15:00Z' },
  { id: 'doc2', fileName: 'pokazaniya_kolesnichenko.pdf', originalName: 'Показания Колесниченко Д.А.pdf', fileSize: 1560000, mimeType: 'application/pdf', extractedText: 'Показания подозреваемого Колесниченко Д.А. от 15.01.2024...', summary: 'Показания Колесниченко Д.А.', documentDate: '2024-01-15', documentType: 'показание', sourceReference: 'том 2, л.д. 10-25', processingStatus: 'completed', processingError: null, uploadedAt: '2024-01-15T10:00:00Z', processedAt: '2024-01-15T10:20:00Z' },
  { id: 'doc3', fileName: 'protokol_obyaska.pdf', originalName: 'Протокол обыска.pdf', fileSize: 890000, mimeType: 'application/pdf', extractedText: 'Протокол обыска жилого помещения...', summary: 'Протокол обыска по месту жительства', documentDate: '2024-02-20', documentType: 'протокол', sourceReference: 'том 3, л.д. 30-35', processingStatus: 'completed', processingError: null, uploadedAt: '2024-02-20T14:00:00Z', processedAt: '2024-02-20T14:10:00Z' },
  { id: 'doc4', fileName: 'expertiza.pdf', originalName: 'Заключение эксперта.pdf', fileSize: 3200000, mimeType: 'application/pdf', extractedText: 'Заключение финансово-экономической экспертизы...', summary: 'Финансово-экономическая экспертиза', documentDate: '2024-04-10', documentType: 'экспертиза', sourceReference: 'том 4, л.д. 5-60', processingStatus: 'processing', processingError: null, uploadedAt: '2024-04-10T09:00:00Z', processedAt: null },
  { id: 'doc5', fileName: 'svidetel_petrov.pdf', originalName: 'Показания свидетеля Петрова.pdf', fileSize: 980000, mimeType: 'application/pdf', extractedText: 'Показания свидетеля Петрова И.В.', summary: 'Показания свидетеля', documentDate: '2024-02-05', documentType: 'показание', sourceReference: 'том 2, л.д. 40-50', processingStatus: 'pending', processingError: null, uploadedAt: '2024-05-01T11:00:00Z', processedAt: null },
]

export const mockPersons: PersonData[] = [
  { id: 'p1', fullName: 'Колесниченко Дмитрий Александрович', shortName: 'Колесниченко Д.А.', role: 'обвиняемый', status: 'задержанный', description: 'Главный обвиняемый, бывший директор ООО "ТехноПром"', birthDate: '1985-06-15', occupation: 'Директор ООО', alias: null, isKolesnichenko: true, defenseStrategy: 'Непризнание вины, алиби на период эпизода 1' },
  { id: 'p2', fullName: 'Сидоров Андрей Петрович', shortName: 'Сидоров А.П.', role: 'соучастник', status: 'активный', description: 'Соучастник, бухгалтер ООО', birthDate: '1990-03-22', occupation: 'Бухгалтер', alias: null, isKolesnichenko: false, defenseStrategy: null },
  { id: 'p3', fullName: 'Петров Иван Васильевич', shortName: 'Петров И.В.', role: 'свидетель', status: 'активный', description: 'Свидетель, бывший сотрудник ООО', birthDate: '1978-11-08', occupation: 'Менеджер', alias: null, isKolesnichenko: false, defenseStrategy: null },
  { id: 'p4', fullName: 'Иванова Мария Сергеевна', shortName: 'Иванова М.С.', role: 'потерпевшая', status: 'активный', description: 'Потерпевшая, инвестор ООО', birthDate: '1982-07-30', occupation: 'Инвестор', alias: null, isKolesnichenko: false, defenseStrategy: null },
  { id: 'p5', fullName: 'Козлов Виктор Николаевич', shortName: 'Козлов В.Н.', role: 'свидетель', status: 'активный', description: 'Свидетель, сосед Колесниченко', birthDate: '1975-01-12', occupation: 'Пенсионер', alias: 'Козёл', isKolesnichenko: false, defenseStrategy: null },
]

export const mockEpisodes: EpisodeData[] = [
  { id: 'ep1', title: 'Мошенничество с инвестициями', description: 'Хищение денежных средств инвесторов путём обмана, совершённое группой лиц по предварительному сговору', date: '2023-06-01', episodeNumber: '1', severity: 'тяжкое', status: 'доказано' },
  { id: 'ep2', title: 'Присвоение имущества ООО', description: 'Присвоение имущества организации, совершённое с использованием служебного положения', date: '2023-09-15', episodeNumber: '2', severity: 'тяжкое', status: 'расследуется' },
  { id: 'ep3', title: 'Фальсификация документов', description: 'Подделка финансовых документов для сокрытия хищения', date: '2023-12-01', episodeNumber: '3', severity: 'средней тяжести', status: 'сомнительно' },
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
  { id: 'lc1', documentId: 'doc1', checkType: 'article_applicability', status: 'warning', description: 'Статья 159 ч.3 может быть переквалифицирована на ч.2 в связи с изменениями в законодательстве', recommendation: 'Рекомендуется проверка актуальности квалификации', legalBasis: 'ФЗ № 207 от 03.07.2024', checkedAt: '2024-05-15T10:00:00Z' },
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
  totalDocuments: 5,
  totalPersons: 5,
  totalEpisodes: 3,
  totalArticles: 2,
  totalLocations: 3,
  totalCrossReferences: 4,
  totalChatMessages: 2,
  documentsByStatus: { completed: 3, processing: 1, pending: 1 },
  documentsByType: { обвинение: 1, показание: 2, протокол: 1, экспертиза: 1 },
  personsByRole: { обвиняемый: 1, соучастник: 1, свидетель: 2, потерпевшая: 1 },
  kolesnichenkoPerson: mockPersons[0],
  episodesBySeverity: { тяжкое: 2, 'средней тяжести': 1 },
  episodesByStatus: { доказано: 1, расследуется: 1, сомнительно: 1 },
  processingQueue: { queued: 1, processing: 1 },
  recentDocuments: mockDocuments.slice(0, 3),
  guiltAssessments: mockGuiltAssessments,
  defenseLines: mockDefenseLines,
  complianceChecks: mockComplianceChecks,
}

export const mockSearchResults: SearchResultData[] = [
  { type: 'document', id: 'doc1', title: 'Обвинительное заключение', description: 'Основной документ дела', relevance: 0.95 },
  { type: 'person', id: 'p1', title: 'Колесниченко Д.А.', description: 'Главный обвиняемый', relevance: 0.90 },
  { type: 'episode', id: 'ep1', title: 'Мошенничество с инвестициями', description: 'Эпизод 1 - тяжкое преступление', relevance: 0.85 },
  { type: 'article', id: 'art1', title: 'ст. 159 ч.3 УК РФ', description: 'Мошенничество группой лиц', relevance: 0.80 },
]
