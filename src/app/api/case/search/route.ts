import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface SearchFilters {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  personId?: string;
  articleCode?: string;
  documentId?: string;
  locationId?: string;
  searchType?: 'documents' | 'persons' | 'episodes' | 'articles' | 'crossReferences' | 'all';
  page?: number;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchFilters = await request.json();
    const {
      query = '',
      dateFrom,
      dateTo,
      personId,
      articleCode,
      documentId,
      locationId,
      searchType = 'all',
      page = 1,
      limit = 20,
    } = body;
    const skip = (page - 1) * limit;

    const results: Record<string, unknown[]> = {};
    let totalResults = 0;

    // Search Documents
    if (searchType === 'all' || searchType === 'documents') {
      const docWhere: Record<string, unknown> = {};
      
      if (query) {
        docWhere.OR = [
          { originalName: { contains: query } },
          { extractedText: { contains: query } },
          { summary: { contains: query } },
          { documentType: { contains: query } },
          { sourceReference: { contains: query } },
        ];
      }
      if (documentId) docWhere.id = documentId;
      if (dateFrom || dateTo) {
        const dateFilter: Record<string, unknown> = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) dateFilter.lte = new Date(dateTo);
        docWhere.uploadedAt = dateFilter;
      }
      if (personId) {
        docWhere.persons = { some: { personId } };
      }
      if (articleCode) {
        docWhere.articles = { some: { article: { code: { contains: articleCode } } } };
      }
      if (locationId) {
        docWhere.locations = { some: { locationId } };
      }

      const documents = await db.document.findMany({
        where: docWhere,
        skip: searchType === 'all' ? 0 : skip,
        take: searchType === 'all' ? 10 : limit,
        include: {
          persons: { include: { person: { select: { id: true, fullName: true, role: true } } } },
          episodes: { include: { episode: { select: { id: true, title: true } } } },
          articles: { include: { article: { select: { id: true, code: true, description: true } } } },
          locations: { include: { location: { select: { id: true, name: true, type: true } } } },
          crossReferences: { include: { targetDocument: { select: { id: true, originalName: true } } } },
        },
      });

      results.documents = documents.map((doc) => ({
        id: doc.id,
        originalName: doc.originalName,
        documentType: doc.documentType,
        documentDate: doc.documentDate,
        sourceReference: doc.sourceReference,
        summary: doc.summary,
        processingStatus: doc.processingStatus,
        uploadedAt: doc.uploadedAt,
        persons: doc.persons.map((pd) => ({
          personId: pd.person.id,
          fullName: pd.person.fullName,
          role: pd.person.role,
          mentionRole: pd.role,
        })),
        episodes: doc.episodes.map((ed) => ({
          episodeId: ed.episode.id,
          title: ed.episode.title,
        })),
        articles: doc.articles.map((da) => ({
          articleId: da.article.id,
          code: da.article.code,
          description: da.article.description,
        })),
        locations: doc.locations.map((dl) => ({
          locationId: dl.location.id,
          name: dl.location.name,
          type: dl.location.type,
        })),
        crossReferences: doc.crossReferences.map((cr) => ({
          referenceText: cr.referenceText,
          referenceType: cr.referenceType,
          targetDocumentId: cr.targetDocument.id,
          targetDocumentName: cr.targetDocument.originalName,
        })),
      }));
      totalResults += results.documents.length;
    }

    // Search Persons
    if (searchType === 'all' || searchType === 'persons') {
      const personWhere: Record<string, unknown> = {};
      
      if (query) {
        personWhere.OR = [
          { fullName: { contains: query } },
          { shortName: { contains: query } },
          { alias: { contains: query } },
          { description: { contains: query } },
          { role: { contains: query } },
          { occupation: { contains: query } },
        ];
      }
      if (personId) personWhere.id = personId;

      const persons = await db.person.findMany({
        where: personWhere,
        skip: searchType === 'all' ? 0 : skip,
        take: searchType === 'all' ? 10 : limit,
        include: {
          documents: { include: { document: { select: { id: true, originalName: true } } } },
          episodes: { include: { episode: { select: { id: true, title: true } } } },
          articles: { include: { article: { select: { id: true, code: true } } } },
          guiltAssessments: { select: { id: true, guiltLevel: true, forecast: true } },
        },
      });

      results.persons = persons.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        shortName: p.shortName,
        role: p.role,
        status: p.status,
        isKolesnichenko: p.isKolesnichenko,
        documents: p.documents.map((pd) => ({
          documentId: pd.document.id,
          originalName: pd.document.originalName,
        })),
        episodes: p.episodes.map((pe) => ({
          episodeId: pe.episode.id,
          title: pe.episode.title,
          involvement: pe.involvement,
        })),
        articles: p.articles.map((pa) => ({
          articleId: pa.article.id,
          code: pa.article.code,
          chargeStatus: pa.chargeStatus,
        })),
      }));
      totalResults += (results.persons as unknown[]).length;
    }

    // Search Episodes
    if (searchType === 'all' || searchType === 'episodes') {
      const episodeWhere: Record<string, unknown> = {};
      
      if (query) {
        episodeWhere.OR = [
          { title: { contains: query } },
          { description: { contains: query } },
          { episodeNumber: { contains: query } },
        ];
      }
      if (personId) {
        episodeWhere.persons = { some: { personId } };
      }
      if (articleCode) {
        episodeWhere.articles = { some: { article: { code: { contains: articleCode } } } };
      }
      if (locationId) {
        episodeWhere.locations = { some: { locationId } };
      }
      if (dateFrom || dateTo) {
        // Episodes store dates as strings, we can't filter easily with contains
        // but we include date-related episodes
      }

      const episodes = await db.episode.findMany({
        where: episodeWhere,
        skip: searchType === 'all' ? 0 : skip,
        take: searchType === 'all' ? 10 : limit,
        include: {
          persons: { include: { person: { select: { id: true, fullName: true, role: true } } } },
          locations: { include: { location: { select: { id: true, name: true } } } },
          articles: { include: { article: { select: { id: true, code: true, description: true } } } },
          documents: { include: { document: { select: { id: true, originalName: true } } } },
        },
      });

      results.episodes = episodes.map((ep) => ({
        id: ep.id,
        title: ep.title,
        description: ep.description,
        date: ep.date,
        episodeNumber: ep.episodeNumber,
        severity: ep.severity,
        status: ep.status,
        persons: ep.persons.map((pe) => ({
          personId: pe.person.id,
          fullName: pe.person.fullName,
          role: pe.person.role,
          involvement: pe.involvement,
        })),
        locations: ep.locations.map((el) => ({
          locationId: el.location.id,
          name: el.location.name,
        })),
        articles: ep.articles.map((ea) => ({
          articleId: ea.article.id,
          code: ea.article.code,
          description: ea.article.description,
        })),
        documents: ep.documents.map((ed) => ({
          documentId: ed.document.id,
          originalName: ed.document.originalName,
        })),
      }));
      totalResults += (results.episodes as unknown[]).length;
    }

    // Search Articles
    if (searchType === 'all' || searchType === 'articles') {
      const articleWhere: Record<string, unknown> = {};
      
      if (query) {
        articleWhere.OR = [
          { code: { contains: query } },
          { number: { contains: query } },
          { description: { contains: query } },
          { category: { contains: query } },
        ];
      }
      if (articleCode) {
        articleWhere.code = { contains: articleCode };
      }

      const articles = await db.article.findMany({
        where: articleWhere,
        skip: searchType === 'all' ? 0 : skip,
        take: searchType === 'all' ? 10 : limit,
        include: {
          documents: { include: { document: { select: { id: true, originalName: true } } } },
          persons: { include: { person: { select: { id: true, fullName: true, role: true } } } },
          episodes: { include: { episode: { select: { id: true, title: true } } } },
        },
      });

      results.articles = articles.map((a) => ({
        id: a.id,
        code: a.code,
        number: a.number,
        description: a.description,
        category: a.category,
        punishmentMin: a.punishmentMin,
        punishmentMax: a.punishmentMax,
        isCurrent: a.isCurrent,
        documents: a.documents.map((da) => ({
          documentId: da.document.id,
          originalName: da.document.originalName,
        })),
        persons: a.persons.map((pa) => ({
          personId: pa.person.id,
          fullName: pa.person.fullName,
          role: pa.person.role,
          chargeStatus: pa.chargeStatus,
        })),
        episodes: a.episodes.map((ea) => ({
          episodeId: ea.episode.id,
          title: ea.episode.title,
        })),
      }));
      totalResults += (results.articles as unknown[]).length;
    }

    // Search Cross References
    if (searchType === 'all' || searchType === 'crossReferences') {
      const crWhere: Record<string, unknown> = {};
      
      if (query) {
        crWhere.OR = [
          { referenceText: { contains: query } },
          { referenceType: { contains: query } },
          { context: { contains: query } },
          { note: { contains: query } },
        ];
      }
      if (documentId) {
        crWhere.OR = [
          { sourceDocumentId: documentId },
          { targetDocumentId: documentId },
        ];
      }

      const crossReferences = await db.crossReference.findMany({
        where: crWhere,
        skip: searchType === 'all' ? 0 : skip,
        take: searchType === 'all' ? 10 : limit,
        include: {
          sourceDocument: { select: { id: true, originalName: true } },
          targetDocument: { select: { id: true, originalName: true } },
        },
      });

      results.crossReferences = crossReferences.map((cr) => ({
        id: cr.id,
        sourceDocumentId: cr.sourceDocumentId,
        sourceDocumentName: cr.sourceDocument.originalName,
        targetDocumentId: cr.targetDocumentId,
        targetDocumentName: cr.targetDocument.originalName,
        referenceText: cr.referenceText,
        referenceType: cr.referenceType,
        context: cr.context,
        note: cr.note,
      }));
      totalResults += (results.crossReferences as unknown[]).length;
    }

    return NextResponse.json({
      success: true,
      results,
      totalResults,
      query,
      filters: {
        dateFrom,
        dateTo,
        personId,
        articleCode,
        documentId,
        locationId,
      },
      searchType,
      page,
      limit,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: String(error) },
      { status: 500 }
    );
  }
}
