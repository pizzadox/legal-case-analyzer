import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mockAnalytics } from '@/lib/mock-data'
import type { AnalyticsData } from '@/lib/case-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try to compute analytics from real DB data, fall back to mock if DB is empty
    const [
      documents,
      persons,
      episodes,
      articles,
      guiltAssessments,
      crossRefs,
      defenseLines,
    ] = await Promise.all([
      db.document.findMany({ select: { id: true, documentType: true, processingStatus: true, uploadedAt: true } }),
      db.person.findMany({ select: { id: true, fullName: true, shortName: true, role: true, guiltLevel: true } }),
      db.episode.findMany({ select: { id: true, severity: true, status: true } }),
      db.article.findMany({ select: { id: true, code: true, description: true, category: true } }),
      db.guiltAssessment.findMany({ select: { id: true, personId: true, guiltLevel: true } }),
      db.crossReference.findMany({ select: { id: true, sourceDocumentId: true, targetDocumentId: true } }),
      db.defenseLine.findMany({ select: { id: true, strategyType: true, strength: true } }),
    ]).catch(() => [null, null, null, null, null, null, null])

    // If DB queries failed or no documents, return mock
    if (!documents || documents.length === 0) {
      return NextResponse.json(mockAnalytics)
    }

    // Compute analytics from real data
    const docTypeMap = new Map<string, number>()
    documents.forEach(doc => {
      const type = doc.documentType ?? 'не указан'
      docTypeMap.set(type, (docTypeMap.get(type) ?? 0) + 1)
    })
    const documentTypes = Array.from(docTypeMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / documents.length) * 100),
    }))

    // Processing trend (group by month)
    const monthMap = new Map<string, { processed: number; pending: number; failed: number }>()
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    documents.forEach(doc => {
      const d = new Date(doc.uploadedAt)
      const monthKey = monthNames[d.getMonth()] ?? '?'
      const entry = monthMap.get(monthKey) ?? { processed: 0, pending: 0, failed: 0 }
      if (doc.processingStatus === 'completed') entry.processed++
      else if (doc.processingStatus === 'processing') entry.pending++
      else if (doc.processingStatus === 'failed') entry.failed++
      else entry.pending++
      monthMap.set(monthKey, entry)
    })
    const processingTrend = Array.from(monthMap.entries()).map(([date, v]) => ({ date, ...v }))

    // Episode matrix
    const severitySet = new Set<string>(['особо тяжкое', 'тяжкое', 'средней тяжести', 'небольшой'])
    episodes.forEach(ep => ep.severity && severitySet.add(ep.severity))
    const episodeMatrix = Array.from(severitySet).map(severity => {
      const matching = episodes.filter(ep => ep.severity === severity)
      return {
        severity,
        proven: matching.filter(ep => ep.status === 'доказано').length,
        investigating: matching.filter(ep => ep.status === 'расследуется').length,
        doubtful: matching.filter(ep => ep.status === 'сомнительно').length,
        total: matching.length,
      }
    })

    // Person involvement
    const personInvolvement = persons.map(p => ({
      name: p.shortName ?? p.fullName,
      episodes: 0, // Would require joins
      documents: 0,
      relationships: 0,
    }))

    // Article charges
    const articleCharges = articles.map(a => ({
      code: a.code,
      description: a.description,
      count: 1,
      severity: a.category ?? 'не указана',
    }))

    // Complexity score (rough heuristic)
    const complexityScore = Math.min(100, Math.round(
      (documents.length * 5) +
      (persons.length * 6) +
      (episodes.length * 8) +
      (articles.length * 4) +
      (crossRefs.length * 2)
    ))

    const computed: AnalyticsData = {
      processingTrend: processingTrend.length > 0 ? processingTrend : mockAnalytics.processingTrend,
      episodeMatrix: episodeMatrix.length > 0 ? episodeMatrix : mockAnalytics.episodeMatrix,
      personInvolvement: personInvolvement.length > 0 ? personInvolvement : mockAnalytics.personInvolvement,
      articleCharges: articleCharges.length > 0 ? articleCharges : mockAnalytics.articleCharges,
      complexity: {
        overallScore: complexityScore,
        factors: [
          { name: 'Объём документов', score: Math.min(100, documents.length * 10), benchmark: 50 },
          { name: 'Количество участников', score: Math.min(100, persons.length * 12), benchmark: 40 },
          { name: 'Количество эпизодов', score: Math.min(100, episodes.length * 15), benchmark: 35 },
          { name: 'Сложность статей', score: Math.min(100, articles.length * 14), benchmark: 60 },
          { name: 'Перекрёстных ссылок', score: Math.min(100, crossRefs.length * 5), benchmark: 45 },
          { name: 'Линий защиты', score: Math.min(100, defenseLines.length * 12), benchmark: 30 },
        ],
        rating: complexityScore >= 80 ? 'extreme' : complexityScore >= 60 ? 'high' : complexityScore >= 40 ? 'moderate' : 'low',
      },
      documentTypes: documentTypes.length > 0 ? documentTypes : mockAnalytics.documentTypes,
      insights: mockAnalytics.insights, // Use mock insights (would require AI in production)
      outcomePrediction: mockAnalytics.outcomePrediction, // Use mock predictions
      workloadByMonth: mockAnalytics.workloadByMonth,
    }

    return NextResponse.json(computed)
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(mockAnalytics)
  }
}
