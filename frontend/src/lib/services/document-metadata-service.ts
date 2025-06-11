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
      return await db.transaction(async (tx) => {
        // 1. Insert document record
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

        // 2. Process tags with deduplication
        const tagMap = new Map<string, { id: string; confidence: number }>();

        for (const tagData of metadata.tags) {
          // Check if tag exists
          const existingTag = await tx
            .select()
            .from(tags)
            .where(eq(tags.name, tagData.name))
            .get();

          let tagId: string;

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // Create new tag
            const [newTag] = await tx
              .insert(tags)
              .values({
                name: tagData.name,
              })
              .returning({ id: tags.id });

            if (!newTag) {
              throw new DatabaseError("Failed to create tag record");
            }
            tagId = newTag.id;
          }

          // Store tag with confidence score
          tagMap.set(tagId, { id: tagId, confidence: tagData.confidence });
        }

        // 3. Batch insert document-tag relationships
        if (tagMap.size > 0) {
          const documentTagValues = Array.from(tagMap.values()).map(({ id, confidence }) => ({
            documentId: document.id,
            tagId: id,
            confidence,
          }));

          await tx.insert(documentTags).values(documentTagValues);
        }

        return document.id;
      });
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to store document metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves document metadata including associated tags.
   */
  async getDocumentMetadata(documentId: string) {
    try {
      const document = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .get();

      if (!document) {
        throw new DatabaseError("Document not found");
      }

      const docTags = await db
        .select({
          tag: tags,
          confidence: documentTags.confidence,
        })
        .from(documentTags)
        .innerJoin(tags, eq(documentTags.tagId, tags.id))
        .where(eq(documentTags.documentId, documentId))
        .all();

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
      throw new DatabaseError(`Failed to retrieve document metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates an existing document with analysis results (summary and tags).
   */
  async updateDocumentAnalysis(documentId: string, analysisData: {
    summary?: string;
    tags: TagData[];
  }): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // 1. Update document with summary
        if (analysisData.summary) {
          await tx
            .update(documents)
            .set({
              summary: analysisData.summary,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, documentId));
        }

        // 2. Remove existing tags for this document
        await tx
          .delete(documentTags)
          .where(eq(documentTags.documentId, documentId));

        // 3. Process new tags with deduplication
        const tagMap = new Map<string, { id: string; confidence: number }>();

        for (const tagData of analysisData.tags) {
          // Check if tag exists
          const existingTag = await tx
            .select()
            .from(tags)
            .where(eq(tags.name, tagData.name))
            .get();

          let tagId: string;

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // Create new tag
            const [newTag] = await tx
              .insert(tags)
              .values({
                name: tagData.name,
              })
              .returning({ id: tags.id });

            if (!newTag) {
              throw new DatabaseError("Failed to create tag record");
            }
            tagId = newTag.id;
          }

          // Store tag with confidence score
          tagMap.set(tagId, { id: tagId, confidence: tagData.confidence });
        }

        // 4. Batch insert new document-tag relationships
        if (tagMap.size > 0) {
          const documentTagValues = Array.from(tagMap.values()).map(({ id, confidence }) => ({
            documentId: documentId,
            tagId: id,
            confidence,
          }));

          await tx.insert(documentTags).values(documentTagValues);
        }
      });
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update document analysis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
