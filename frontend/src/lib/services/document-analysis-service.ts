import { DocumentMetadataService } from "./document-metadata-service";
import { FileStorageService } from "@/lib/utils/file-storage";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface AnalysisResult {
  tags: Array<{
    name: string;
    confidence: number;
    category?: string;
    description?: string;
  }>;
  summary?: string;
}

export class DocumentAnalysisService {
  private metadataService: DocumentMetadataService;
  private fileStorage: FileStorageService;
  private pythonServiceUrl: string;

  constructor() {
    this.metadataService = new DocumentMetadataService();
    this.fileStorage = new FileStorageService();
    // Add /api prefix to match backend route configuration
    this.pythonServiceUrl =
      (process.env.PYTHON_SERVICE_URL || "http://localhost:8000") + "/api";
  }

  /**
   * Triggers document analysis and updates metadata with AI-generated tags
   */
  async analyzeDocument(documentId: string): Promise<void> {
    try {
      // 1. Get document metadata
      const metadata = await this.metadataService.getDocumentMetadata(
        documentId
      );
      if (!metadata) {
        throw new Error("Document not found");
      }

      // 2. Get relative file path (backend expects relative paths for security)
      if (!metadata.filePath) {
        throw new Error("Document file path not found");
      }

      // Backend expects path relative to the uploads directory (no uploads/ prefix needed)
      // since backend now points directly to frontend/uploads directory
      const relativePath = metadata.filePath;

      // 3. Call Python service for analysis
      try {
        const response = await fetch(
          `${this.pythonServiceUrl}/documents/analyze`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              document_path: relativePath,
              max_tags: 3,
              generate_summary: false,
            }),
          }
        );

        if (!response.ok) {
          console.warn(
            `Analysis service returned status ${response.status}: ${response.statusText}`
          );
          // Don't throw error, just return without tags
          return;
        }

        const result: AnalysisResult = await response.json();

        // 4. Update document with analysis results (summary and tags)
        await this.metadataService.updateDocumentAnalysis(documentId, {
          summary: result.summary,
          tags: result.tags,
        });
      } catch (analysisError) {
        // Log the error but don't throw it
        console.warn(
          "Document analysis failed, continuing without tags:",
          analysisError
        );
        return;
      }
    } catch (error) {
      console.error("Document metadata error:", error);
      throw error;
    }
  }
}
