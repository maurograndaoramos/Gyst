import { DocumentMetadataService } from './document-metadata-service';
import { FileStorageService } from '@/lib/utils/file-storage';

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
    this.pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Triggers document analysis and updates metadata with AI-generated tags
   */
  async analyzeDocument(documentId: string): Promise<void> {
    try {
      // 1. Get document metadata
      const metadata = await this.metadataService.getDocumentMetadata(documentId);
      if (!metadata) {
        throw new Error('Document not found');
      }

      // 2. Get absolute file path
      const absolutePath = this.fileStorage.getAbsolutePath(metadata.filePath);

      // 3. Call Python service for analysis
      const response = await fetch(`${this.pythonServiceUrl}/documents/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_path: absolutePath,
          max_tags: 10,
          generate_summary: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result: AnalysisResult = await response.json();

      // 4. Update document metadata with new tags
      await this.metadataService.storeDocumentMetadata({
        ...metadata,
        tags: result.tags,
      });

    } catch (error) {
      console.error('Document analysis failed:', error);
      throw error;
    }
  }
} 