import { db } from "@/lib/db";
import { documents, tags, documentTags } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

export interface SearchParams {
  query?: string;
  organizationId: string;
  tags?: string[];
  page?: number;
  limit?: number;
  highlight?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  originalFilename: string | null;
  filePath: string | null;
  content: string | null;
  summary: string | null;
  organizationId: string;
  analysisStatus: string | null;
  size: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  relevanceScore?: number;
  highlights?: {
    filename?: string;
    content?: string;
  };
  tags?: Array<{
    name: string;
    confidence: number;
  }>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  query?: string;
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
      highlight = false,
    } = params;

    console.log("SearchService.searchDocuments called with:", {
      query,
      organizationId,
      tags,
      page,
      limit,
    });

    const offset = (page - 1) * limit;

    let results: SearchResult[] = [];
    let total = 0;

    try {
      if (query && query.trim().length > 0) {
        console.log("Performing FTS search for query:", query);
        // Use FTS5 search
        results = await this.performFTSSearch(
          query,
          organizationId,
          offset,
          limit,
          highlight
        );
        total = await this.getFTSSearchCount(query, organizationId);
        console.log("FTS search results:", {
          resultsCount: results.length,
          total,
        });
      } else {
        console.log("No query provided, getting organization documents");
        // No query, just return organization documents (optionally filtered by tags)
        results = await this.getOrganizationDocuments(
          organizationId,
          tags,
          offset,
          limit
        );
        total = await this.getOrganizationDocumentsCount(organizationId, tags);
        console.log("Organization documents:", {
          resultsCount: results.length,
          total,
        });
      }

      // Apply tag filtering if specified (for FTS results)
      if (tags.length > 0 && query) {
        results = await this.filterByTags(results, tags);
      }

      return {
        results,
        total,
        page,
        limit,
        hasMore: total > offset + results.length,
        query: query?.trim(),
      };
    } catch (error) {
      console.error("Search error:", error);
      throw new Error(
        `Search failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
    const escapedQuery = this.escapeFTSQuery(query);
    console.log(
      "FTS search - escaped query:",
      escapedQuery,
      "organizationId:",
      organizationId
    );

    // Access the underlying better-sqlite3 instance
    const sqlite = (db as any).$client;
    const ftsResults = sqlite
      .prepare(
        `
      SELECT 
        fts.document_id,
        fts.filename,
        fts.content,
        rank,
        ${
          highlight
            ? `
          highlight(documents_fts, 1, '<mark>', '</mark>') as filename_highlight,
          snippet(documents_fts, 2, '<mark>', '</mark>', '...', 32) as content_highlight
        `
            : "NULL as filename_highlight, NULL as content_highlight"
        }
      FROM documents_fts fts
      WHERE documents_fts MATCH ? AND organizationId = ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `
      )
      .all(escapedQuery, organizationId, limit, offset);

    console.log("FTS raw results count:", ftsResults.length);

    // Get full document details
    if (ftsResults.length === 0) return [];

    const documentIds = ftsResults.map((r: any) => r.document_id);
    console.log("Document IDs from FTS:", documentIds);

    // Use inArray with the documentIds
    const documentsData = await db
      .select()
      .from(documents)
      .where(
        and(
          inArray(documents.id, documentIds),
          eq(documents.organizationId, organizationId)
        )
      );

    console.log("Documents data retrieved:", documentsData.length);

    // Merge FTS results with document data
    return documentsData.map((doc) => {
      const ftsResult = ftsResults.find((r: any) => r.document_id === doc.id);
      return {
        ...doc,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
        relevanceScore: ftsResult?.rank || 0,
        highlights: highlight
          ? {
              filename: ftsResult?.filename_highlight || undefined,
              content: ftsResult?.content_highlight || undefined,
            }
          : undefined,
      };
    });
  }

  /**
   * Get count for FTS search
   */
  private async getFTSSearchCount(
    query: string,
    organizationId: string
  ): Promise<number> {
    const escapedQuery = this.escapeFTSQuery(query);

    // Access the underlying better-sqlite3 instance
    const sqlite = (db as any).$client;
    const result = sqlite
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM documents_fts
      WHERE documents_fts MATCH ? AND organizationId = ?
    `
      )
      .get(escapedQuery, organizationId) as { count: number };

    return result.count;
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
      .offset(offset);

    return docs.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
    }));
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
      .where(eq(documents.organizationId, organizationId));

    return result[0]?.count || 0;
  }

  /**
   * Filter results by tags (OR logic)
   */
  private async filterByTags(
    results: SearchResult[],
    tags: string[]
  ): Promise<SearchResult[]> {
    // TODO: Implement tag filtering when tag tables are available
    // For now, return all results
    return results;
  }

  /**
   * Escape FTS5 query to prevent injection
   */
  private escapeFTSQuery(query: string): string {
    // Clean and escape the query for FTS5
    const cleaned = query
      .replace(/["']/g, "") // Remove quotes to prevent injection
      .replace(/[^\w\s\-\.]/g, " ") // Keep word chars, spaces, hyphens, and dots
      .trim();

    if (!cleaned) return '""'; // Return empty match if nothing left

    // Split into terms and create a more flexible search
    const terms = cleaned.split(/\s+/).filter((term) => term.length > 0);

    if (terms.length === 0) return '""';

    // For single term, try both exact and prefix matching
    if (terms.length === 1) {
      const term = terms[0];
      return `"${term}" OR ${term}*`;
    }

    // For multiple terms, try phrase match and individual terms
    const phraseMatch = `"${terms.join(" ")}"`;
    const termMatches = terms.map((term) => `${term}*`).join(" OR ");

    return `${phraseMatch} OR ${termMatches}`;
  }

  /**
   * Get all files for an organization (for dashboard sidebar)
   */
  async getOrganizationFiles(organizationId: string): Promise<SearchResult[]> {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, organizationId))
      .orderBy(desc(documents.createdAt));

    // Get tags for all documents in a single query
    const allDocumentTags = await db
      .select({
        documentId: documentTags.documentId,
        tagName: tags.name,
        confidence: documentTags.confidence,
      })
      .from(documentTags)
      .innerJoin(tags, eq(documentTags.tagId, tags.id))
      .innerJoin(documents, eq(documentTags.documentId, documents.id))
      .where(eq(documents.organizationId, organizationId));

    // Group tags by document ID
    const tagsByDocument = allDocumentTags.reduce((acc, tagData) => {
      if (!acc[tagData.documentId]) {
        acc[tagData.documentId] = [];
      }
      acc[tagData.documentId].push({
        name: tagData.tagName,
        confidence: tagData.confidence,
      });
      return acc;
    }, {} as Record<string, Array<{ name: string; confidence: number }>>);

    // Read file content from filesystem for each document
    const docsWithContent = await Promise.all(
      docs.map(async (doc) => {
        let content: string | null = doc.content;

        // If content is not in database but filePath exists, read from file
        if (!content && doc.filePath) {
          try {
            let absolutePath: string;

            if (path.isAbsolute(doc.filePath)) {
              absolutePath = doc.filePath;
            } else {
              // Handle relative paths - ensure they point to the uploads directory
              if (doc.filePath.startsWith("uploads/")) {
                absolutePath = path.join(process.cwd(), doc.filePath);
              } else {
                absolutePath = path.join(
                  process.cwd(),
                  "uploads",
                  doc.filePath
                );
              }
            }

            content = await fs.readFile(absolutePath, "utf-8");
            console.log(
              `Successfully read file content for ${doc.originalFilename}, length: ${content.length}`
            );
          } catch (error) {
            console.error(`Failed to read file ${doc.filePath}:`, error);
            content = null;
          }
        }

        return {
          ...doc,
          content,
          createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
          tags: tagsByDocument[doc.id] || [],
        };
      })
    );

    return docsWithContent;
  }

  /**
   * Get search suggestions based on organization's documents
   */
  async getSearchSuggestions(
    query: string,
    organizationId: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const escapedQuery = this.escapeFTSQuery(query);

    // Access the underlying better-sqlite3 instance
    const sqlite = (db as any).$client;
    const results = sqlite
      .prepare(
        `
      SELECT DISTINCT filename
      FROM documents_fts
      WHERE documents_fts MATCH ? AND organizationId = ?
      ORDER BY rank
      LIMIT ?
    `
      )
      .all(escapedQuery, organizationId, limit) as { filename: string }[];

    return results
      .map((r) => r.filename)
      .filter(
        (filename) =>
          filename && filename.toLowerCase().includes(query.toLowerCase())
      );
  }
}

export const searchService = new SearchService();
