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

  // 2. Detect actual MIME type from file content
  let detectedMimeType: string | undefined
  try {
    const fileType = await fileTypeFromBuffer(buffer.slice(0, 4100)) // Read first 4KB for detection
    detectedMimeType = fileType?.mime
  } catch (error) {
    errors.push('Failed to detect file type from content')
  }

  // 3. MIME type validation
  if (!detectedMimeType) {
    // For text files, file-type might not detect MIME type
    if (filename.endsWith('.txt') || filename.endsWith('.md')) {
      // Additional validation for text files
      const isValidText = isValidTextFile(buffer)
      if (isValidText) {
        detectedMimeType = filename.endsWith('.md') ? 'text/markdown' : 'text/plain'
      } else {
        errors.push('File appears to be corrupted or not a valid text file')
      }
    } else {
      errors.push('Unable to determine file type - file may be corrupted')
    }
  }

  // 4. Check if detected MIME type is supported
  if (detectedMimeType && !SUPPORTED_MIME_TYPES.includes(detectedMimeType as any)) {
    errors.push(`Unsupported file type: ${detectedMimeType}. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`)
  }

  // 5. Cross-validate reported vs detected MIME type
  if (detectedMimeType && reportedMimeType && detectedMimeType !== reportedMimeType) {
    errors.push(`File content (${detectedMimeType}) doesn't match reported type (${reportedMimeType})`)
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
