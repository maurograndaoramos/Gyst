import { fileTypeFromBuffer } from 'file-type'
import { createHash } from 'crypto'
import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE, SUPPORTED_EXTENSIONS, type FileValidationResult } from '@/lib/types/upload'

export async function validateFile(
  buffer: Buffer,
  filename: string,
  reportedMimeType: string,
  fileSize: number
): Promise<FileValidationResult> {
  const errors: string[] = []

  // 1. File size validation
  if (fileSize > MAX_FILE_SIZE) {
    errors.push(`File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 5MB`)
  }

  // 2. File type detection and validation
  let detectedMimeType: string | undefined;

  // Handle text-based files (.txt and .md)
  if (filename.endsWith('.txt') || filename.endsWith('.md')) {
    const isValidText = isValidTextFile(buffer);
    if (isValidText) {
      detectedMimeType = filename.endsWith('.md') ? 'text/markdown' : 'text/plain';
    } else {
      errors.push('File appears to be corrupted or not a valid text file');
    }
  } else {
    // For other file types (PDF, DOCX), detect MIME type
    try {
      const fileType = await fileTypeFromBuffer(buffer.slice(0, 4100));
      detectedMimeType = fileType?.mime;
    } catch (error) {
      errors.push('Failed to detect file type from content');
    }
  }

  // 3. File type validation
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const expectedMimeType = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }[ext];

  // 4. MIME type validation with more lenient rules
  if (!detectedMimeType && !expectedMimeType) {
    errors.push('Unable to determine file type - file may be corrupted');
  } else if (detectedMimeType && !SUPPORTED_MIME_TYPES.includes(detectedMimeType as any)) {
    // If we detected a MIME type but it's not in our supported list
    errors.push(`Unsupported file type. Supported files: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  }

  // 5. Cross-validate MIME types with more lenient rules for text files
  if (detectedMimeType && reportedMimeType && detectedMimeType !== reportedMimeType) {
    // For text files, accept if either type is text/*
    const isTextFile = (filename.endsWith('.txt') || filename.endsWith('.md'));
    const isTextMime = (mime: string) => mime.startsWith('text/');
    
    if (!isTextFile || !(isTextMime(detectedMimeType) || isTextMime(reportedMimeType))) {
      errors.push('File type mismatch - please ensure you are uploading the correct file type');
    }
  }

  // 6. Extension validation
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    errors.push(`Unsupported file extension: ${extension}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    detectedMimeType,
    fileSize
  }
}

function isValidTextFile(buffer: Buffer): boolean {
  try {
    // Check if buffer contains valid UTF-8 text
    const text = buffer.toString('utf8')
    
    // Check for null bytes (indicating binary content)
    if (text.includes('\0')) {
      return false
    }

    // Check for reasonable text content (allow common whitespace and printable characters)
    const validTextRegex = /^[\s\S]*$/
    return validTextRegex.test(text) && text.length > 0
  } catch {
    return false
  }
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts and unsafe characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')  // Replace unsafe chars with underscore
    .replace(/^\.+/, '')                      // Remove leading dots
    .replace(/\.+$/, '')                      // Remove trailing dots
    .substring(0, 255)                        // Limit length
}

export function generateSecureFilename(originalFilename: string, organizationId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const extension = originalFilename.substring(originalFilename.lastIndexOf('.'))
  
  // Create hash from original filename + timestamp + org ID for uniqueness
  const hash = createHash('sha256')
    .update(`${originalFilename}-${timestamp}-${organizationId}-${random}`)
    .digest('hex')
    .substring(0, 16)
  
  return `${hash}${extension}`
}
