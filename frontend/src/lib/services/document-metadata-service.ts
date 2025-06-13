import { db } from "@/lib/db";
import { documents, tags, documentTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DatabaseError } from "@/lib/errors";

interface TagData {
  name: string;
  confidence: number;
  category?: string;
  description?: string;
}

interface DocumentMetadata {
  organizationId: string;
  projectId?: string;
  title: string;
  content?: string;
  filePath: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  createdBy: string;
  tags: TagData[];
}

export class DocumentMetadataService {
  /**
   * Stores document metadata and associated tags in a transaction.
   * Handles tag deduplication and maintains data consistency.
   */
  async storeDocumentMetadata(metadata: DocumentMetadata): Promise<string> {
    try {
      // Process tags outside transaction
      const tagMap = await this.processTagData(metadata.tags);

      // Execute all operations in a single transaction
      return await db.transaction(async (tx) => {
        // 1. Insert document record and get ID atomically
        const [document] = await tx
          .insert(documents)
          .values({
            organizationId: metadata.organizationId,
            projectId: metadata.projectId,
            title: metadata.title,
            content: metadata.content,
            filePath: metadata.filePath,
            originalFilename: metadata.originalFilename,
            mimeType: metadata.mimeType,
            size: metadata.size,
            createdBy: metadata.createdBy,
          })
          .returning({ id: documents.id });

        if (!document) {
          throw new DatabaseError("Failed to create document record");
        }

        // 2. Insert document-tag relationships if we have tags
        if (tagMap.size > 0) {
          const documentTagValues = Array.from(tagMap.values()).map(
            ({ id, confidence }) => ({
              documentId: document.id,
              tagId: id,
              confidence,
            })
          );

          await tx.insert(documentTags).values(documentTagValues);
        }

        return document.id;
      });
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to store document metadata: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Retrieves document metadata including associated tags.
   */
  async getDocumentMetadata(documentId: string) {
    try {
      const documents_result = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!documents_result || documents_result.length === 0) {
        throw new DatabaseError("Document not found");
      }

      const document = documents_result[0];

      const docTags = await db
        .select({
          tag: tags,
          confidence: documentTags.confidence,
        })
        .from(documentTags)
        .innerJoin(tags, eq(documentTags.tagId, tags.id))
        .where(eq(documentTags.documentId, documentId));

      return {
        ...document,
        tags: docTags.map((dt) => ({
          name: dt.tag.name,
          confidence: dt.confidence,
        })),
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to retrieve document metadata: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Process tags and return a map of tag IDs to confidence scores
   */
  private async processTagData(tagDataList: TagData[]): Promise<Map<string, { id: string; confidence: number }>> {
    const tagMap = new Map<string, { id: string; confidence: number }>();
    
    for (const tagData of tagDataList) {
      // Check if tag exists
      const existingTags = await db
        .select()
        .from(tags)
        .where(eq(tags.name, tagData.name))
        .limit(1);

      let tagId: string;

      if (existingTags.length > 0) {
        tagId = existingTags[0].id;
      } else {
        // Create new tag
        const newTags = await db
          .insert(tags)
          .values({
            name: tagData.name,
          })
          .returning({ id: tags.id });

        if (!newTags || newTags.length === 0) {
          throw new DatabaseError("Failed to create tag record");
        }
        tagId = newTags[0].id;
      }

      // Store tag with confidence score
      tagMap.set(tagId, { id: tagId, confidence: tagData.confidence });
    }

    return tagMap;
  }

  /**
   * Updates an existing document with analysis results (summary and tags).
   */
  async updateDocumentAnalysis(
    documentId: string,
    analysisData: {
      summary?: string;
      tags: TagData[];
    }
  ): Promise<void> {
    try {
      // Process tags outside the transaction
      const tagMap = await this.processTagData(analysisData.tags);
      
      // All database operations in a single transaction
      await db.transaction(async (tx) => {
        // 1. Update document with summary if provided
        if (analysisData.summary) {
          await tx.update(documents)
            .set({
              summary: analysisData.summary,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, documentId));
        }

        // 2. Remove existing tags
        await tx.delete(documentTags)
          .where(eq(documentTags.documentId, documentId));

        // 3. Insert new document-tag relationships
        if (tagMap.size > 0) {
          const documentTagValues = Array.from(tagMap.values()).map(
            ({ id, confidence }) => ({
              documentId: documentId,
              tagId: id,
              confidence,
            })
          );

          await tx.insert(documentTags).values(documentTagValues);
        }
      });
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to update document analysis: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
