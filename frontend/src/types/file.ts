export interface FileData {
  id: string;
  title: string;
  originalFilename: string | null;
  filePath: string | null;
  content: string | null;
  summary: string | null;
  analysisStatus: string | null;
  size: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  tags?: Array<{
    name: string;
    confidence: number;
  }>;
}
