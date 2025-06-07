import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

export interface SearchParams {
  query?: string
  organizationId: string
  tags?: string[]
  page?: number
  limit?: number
  highlight?: boolean
}

export interface SearchResult {
  id: string
  title: string
  originalFilename: string | null
  filePath: string | null
  content: string | null
  organizationId: string
  createdAt: Date | null
  updatedAt: Date | null
  relevanceScore?: number
  highlights?: {
    filename?: string
    content?: string
  }
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  query?: string
}

export class SearchService {
  /**
   * Search documents using FTS5 and optional tag filtering
   */
  async searchDocuments(params: SearchParams): Promise<SearchResponse> {
    const {
      query,
      organizationId,
      tags = [],
      page = 1,
      limit = 20,
      highlight = false
    } = params

    const offset = (page - 1) * limit

    let results: SearchResult[] = []
    let total = 0

    try {
      if (query && query.trim().length > 0) {
        // Use FTS5 search
        results = await this.performFTSSearch(query, organizationId, offset, limit, highlight)
        total = await this.getFTSSearchCount(query, organizationId)
      } else {
        // No query, just return organization documents (optionally filtered by tags)
        results = await this.getOrganizationDocuments(organizationId, tags, offset, limit)
        total = await this.getOrganizationDocumentsCount(organizationId, tags)
      }

      // Apply tag filtering if specified (for FTS results)
      if (tags.length > 0 && query) {
        results = await this.filterByTags(results, tags)
      }

      return {
        results,
        total,
        page,
        limit,
        hasMore: total > offset + results.length,
        query: query?.trim()
      }
    } catch (error) {
      console.error('Search error:', error)
      throw new Error('Search failed')
    }
  }

  /**
   * Perform FTS5 search
   */
  private async performFTSSearch(
    query: string,
    organizationId: string,
    offset: number,
    limit: number,
    highlight: boolean
  ): Promise<SearchResult[]> {
    const escapedQuery = this.escapeFTSQuery(query)
    
    // Access the underlying better-sqlite3 instance
    const sqlite = (db as any).$client
    const ftsResults = sqlite.prepare(`
      SELECT 
        fts.document_id,
        fts.filename,
        fts.content,
        rank,
        ${highlight ? `
          highlight(documents_fts, 1, '<mark>', '</mark>') as filename_highlight,
          snippet(documents_fts, 2, '<mark>', '</mark>', '...', 32) as content_highlight
        ` : 'NULL as filename_highlight, NULL as content_highlight'}
      FROM documents_fts fts
      WHERE documents_fts MATCH ? AND organizationId = ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `).all(escapedQuery, organizationId, limit, offset)

    // Get full document details
    if (ftsResults.length === 0) return []

    const documentIds = ftsResults.map((r: any) => r.document_id)
    const documentsData = await db
      .select()
      .from(documents)
      .where(
        and(
          sql`${documents.id} IN (${sql.join(documentIds.map(() => sql.placeholder('id')), sql`, `)})`,
          eq(documents.organizationId, organizationId)
        )
      )
      .execute()

    // Merge FTS results with document data
    return documentsData.map(doc => {
      const ftsResult = ftsResults.find((r: any) => r.document_id === doc.id)
      return {
        ...doc,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
        relevanceScore: ftsResult?.rank || 0,
        highlights: highlight ? {
          filename: ftsResult?.filename_highlight || undefined,
          content: ftsResult?.content_highlight || undefined
        } : undefined
      }
    })
  }

  /**
   * Get count for FTS search
   */
  private async getFTSSearchCount(query: string, organizationId: string): Promise<number> {
    const escapedQuery = this.escapeFTSQuery(query)
    
    // Access the underlying better-sqlite3 instance
    const sqlite = (db as any).$client
    const result = sqlite.prepare(`
      SELECT COUNT(*) as count
      FROM documents_fts
      WHERE documents_fts MATCH ? AND organizationId = ?
    `).get(escapedQuery, organizationId) as { count: number }

    return result.count
  }

  /**
   * Get organization documents without search
   */
  private async getOrganizationDocuments(
    organizationId: string,
    tags: string[],
    offset: number,
    limit: number
  ): Promise<SearchResult[]> {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, organizationId))
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset)

    return docs.map(doc => ({
      ...doc,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null
    }))
  }

  /**
   * Get count of organization documents
   */
  private async getOrganizationDocumentsCount(
    organizationId: string,
    tags: string[]
  ): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(eq(documents.organizationId, organizationId))

    return result[0]?.count || 0
  }

  /**
   * Filter results by tags (OR logic)
   */
  private async filterByTags(results: SearchResult[], tags: string[]): Promise<SearchResult[]> {
    // TODO: Implement tag filtering when tag tables are available
    // For now, return all results
    return results
  }

  /**
   * Escape FTS5 query to prevent injection
   */
  private escapeFTSQuery(query: string): string {
    // Remove potentially dangerous FTS5 operators and escape quotes
    return query
      .replace(/[^\w\s-]/g, ' ') // Remove special chars except word chars, spaces, and hyphens
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => `"${term}"`)
      .join(' OR ')
  }

  /**
   * Get all files for an organization (for dashboard sidebar)
   */
  async getOrganizationFiles(organizationId: string): Promise<SearchResult[]> {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, organizationId))
      .orderBy(desc(documents.createdAt))

    return docs.map(doc => ({
      ...doc,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null
    }))
  }

  /**
   * Get search suggestions based on organization's documents
   */
  async getSearchSuggestions(
    query: string,
    organizationId: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!query || query.length < 2) return []

    const escapedQuery = this.escapeFTSQuery(query)
    
    // Access the underlying better-sqlite3 instance
    const sqlite = (db as any).$client
    const results = sqlite.prepare(`
      SELECT DISTINCT filename
      FROM documents_fts
      WHERE documents_fts MATCH ? AND organizationId = ?
      ORDER BY rank
      LIMIT ?
    `).all(escapedQuery, organizationId, limit) as { filename: string }[]

    return results
      .map(r => r.filename)
      .filter(filename => filename && filename.toLowerCase().includes(query.toLowerCase()))
  }
}

export const searchService = new SearchService()
