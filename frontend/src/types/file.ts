export interface FileData {
  id: string;
  title: string;
  originalFilename: string | null;
  filePath: string | null;
  content: string | null;
  createdAt: Date | null;
}
