import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Aggregate stats - documents
    const totalDocuments = await db.document.count();
    const documentsByStatus = await db.document.groupBy({
      by: ['processingStatus'],
      _count: { id: true },
    });

    const documentsByType = await db.document.groupBy({
      by: ['documentType'],
      _count: { id: true },
    });

    // Aggregate stats - persons
    const totalPersons = await db.person.count();
    const personsByRole = await db.person.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const kolesnichenkoPerson = await db.person.findFirst({
      where: { isKolesnichenko: true },
      select: {
        id: true,
        fullName: true,
        role: true,
        status: true,
        defenseStrategy: true,
      },
    });

    // Aggregate stats - episodes
    const totalEpisodes = await db.episode.count();
    const episodesBySeverity = await db.episode.groupBy({
      by: ['severity'],
      _count: { id: true },
    });

    const episodesByStatus = await db.episode.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // Aggregate stats - articles
    const totalArticles = await db.article.count();

    // Aggregate stats - locations
    const totalLocations = await db.location.count();

    // Aggregate stats - cross references
    const totalCrossReferences = await db.crossReference.count();

    // Processing queue status
    const queueByStatus = await db.processingQueue.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const queueInProgress = await db.processingQueue.findMany({
      where: { status: 'processing' },
      include: {
        document: {
          select: { id: true, originalName: true, processingStatus: true },
        },
      },
    });

    // Guilt assessment summary
    const guiltAssessments = await db.guiltAssessment.findMany({
      include: {
        person: { select: { id: true, fullName: true, role: true, isKolesnichenko: true } },
        episode: { select: { id: true, title: true } },
      },
    });

    const guiltLevelCounts: Record<string, number> = {};
    const evidenceStrengthCounts: Record<string, number> = {};
    for (const ga of guiltAssessments) {
      guiltLevelCounts[ga.guiltLevel] = (guiltLevelCounts[ga.guiltLevel] || 0) + 1;
      evidenceStrengthCounts[ga.evidenceStrength] = (evidenceStrengthCounts[ga.evidenceStrength] || 0) + 1;
    }

    // Defense lines summary
    const defenseLines = await db.defenseLine.findMany({
      where: { personId: kolesnichenkoPerson?.id },
    });

    const defenseLineByType: Record<string, number> = {};
    const defenseLineByStrength: Record<string, number> = {};
    for (const dl of defenseLines) {
      defenseLineByType[dl.strategyType] = (defenseLineByType[dl.strategyType] || 0) + 1;
      if (dl.strength) {
        defenseLineByStrength[dl.strength] = (defenseLineByStrength[dl.strength] || 0) + 1;
      }
    }

    // Compliance check summary
    const complianceChecks = await db.legalCompliance.findMany({
      include: {
        document: { select: { id: true, originalName: true } },
        article: { select: { id: true, code: true } },
      },
    });

    const complianceByStatus: Record<string, number> = {};
    const complianceByType: Record<string, number> = {};
    for (const cc of complianceChecks) {
      complianceByStatus[cc.status] = (complianceByStatus[cc.status] || 0) + 1;
      complianceByType[cc.checkType] = (complianceByType[cc.checkType] || 0) + 1;
    }

    // Recent documents
    const recentDocuments = await db.document.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        originalName: true,
        documentType: true,
        documentDate: true,
        processingStatus: true,
        uploadedAt: true,
        processedAt: true,
        summary: true,
      },
    });

    // Chat messages count
    const totalChatMessages = await db.chatMessage.count();

    // Format status counts for documents
    const documentStatusMap: Record<string, number> = {};
    for (const item of documentsByStatus) {
      if (item.processingStatus) {
        documentStatusMap[item.processingStatus] = item._count.id;
      }
    }

    // Format type counts for documents
    const documentTypeMap: Record<string, number> = {};
    for (const item of documentsByType) {
      if (item.documentType) {
        documentTypeMap[item.documentType] = item._count.id;
      }
    }

    // Format role counts for persons
    const personRoleMap: Record<string, number> = {};
    for (const item of personsByRole) {
      if (item.role) {
        personRoleMap[item.role] = item._count.id;
      }
    }

    // Format severity counts for episodes
    const episodeSeverityMap: Record<string, number> = {};
    for (const item of episodesBySeverity) {
      if (item.severity) {
        episodeSeverityMap[item.severity] = item._count.id;
      }
    }

    // Format episode status counts
    const episodeStatusMap: Record<string, number> = {};
    for (const item of episodesByStatus) {
      if (item.status) {
        episodeStatusMap[item.status] = item._count.id;
      }
    }

    // Format queue status counts
    const queueStatusMap: Record<string, number> = {};
    for (const item of queueByStatus) {
      queueStatusMap[item.status] = item._count.id;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalDocuments,
        totalPersons,
        totalEpisodes,
        totalArticles,
        totalLocations,
        totalCrossReferences,
        totalChatMessages,
        totalComplianceChecks: complianceChecks.length,
        totalDefenseLines: defenseLines.length,
        totalGuiltAssessments: guiltAssessments.length,
      },
      documents: {
        total: totalDocuments,
        byStatus: documentStatusMap,
        byType: documentTypeMap,
        recent: recentDocuments,
      },
      persons: {
        total: totalPersons,
        byRole: personRoleMap,
        kolesnichenko: kolesnichenkoPerson,
      },
      episodes: {
        total: totalEpisodes,
        bySeverity: episodeSeverityMap,
        byStatus: episodeStatusMap,
      },
      processingQueue: {
        byStatus: queueStatusMap,
        inProgress: queueInProgress.map((q) => ({
          id: q.id,
          documentId: q.documentId,
          originalName: q.document.originalName,
          queuePosition: q.queuePosition,
          startedAt: q.startedAt,
        })),
      },
      guiltAssessments: {
        total: guiltAssessments.length,
        byGuiltLevel: guiltLevelCounts,
        byEvidenceStrength: evidenceStrengthCounts,
        details: guiltAssessments.map((ga) => ({
          id: ga.id,
          personFullName: ga.person.fullName,
          personRole: ga.person.role,
          isKolesnichenko: ga.person.isKolesnichenko,
          episodeTitle: ga.episode?.title,
          guiltLevel: ga.guiltLevel,
          evidenceStrength: ga.evidenceStrength,
          forecast: ga.forecast,
          confidence: ga.confidence,
        })),
      },
      defenseLines: {
        total: defenseLines.length,
        byType: defenseLineByType,
        byStrength: defenseLineByStrength,
        details: defenseLines.map((dl) => ({
          id: dl.id,
          strategyType: dl.strategyType,
          title: dl.title,
          description: dl.description,
          strength: dl.strength,
          probability: dl.probability,
        })),
      },
      complianceChecks: {
        total: complianceChecks.length,
        byStatus: complianceByStatus,
        byType: complianceByType,
        details: complianceChecks.map((cc) => ({
          id: cc.id,
          documentOriginalName: cc.document.originalName,
          checkType: cc.checkType,
          status: cc.status,
          description: cc.description,
          recommendation: cc.recommendation,
          articleCode: cc.article?.code,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics', details: String(error) },
      { status: 500 }
    );
  }
}
