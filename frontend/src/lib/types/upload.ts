export interface UploadedFile {
  fieldName: string
  originalFilename: string
  filename: string
  encoding: string
  mimetype: string
  size: number
  filepath: string
}

export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  detectedMimeType?: string
  fileSize?: number
}

export interface UploadResponse {
  success: boolean
  data?: {
    id: string
    filename: string
    originalFilename: string
    size: number
    mimeType: string
    filePath: string
    createdAt: Date
  }
  error?: string
  code?: string
  details?: {
    maxSize?: string
    supportedTypes?: string[]
  }
}

export type SupportedMimeType = 
  | 'text/plain'
  | 'text/markdown'
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  'text/plain',
  'text/markdown', 
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx']
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
