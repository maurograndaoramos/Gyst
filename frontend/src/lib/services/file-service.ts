import { promises as fs } from 'fs'
import path from 'path'
import { createReadStream as nodeCreateReadStream } from 'fs'

export interface FileAccessLog {
  userId: string
  organizationId: string
  documentId: string
  action: 'VIEW' | 'DOWNLOAD'
  success: boolean
  bytesServed?: number
  errorMessage?: string
  ipAddress: string
  userAgent?: string | null
  rangeRequest?: boolean
}

class FileService {
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads')
  
  /**
   * Get secure file path ensuring it's within organization directory
   */
  getSecureFilePath(filePath: string, organizationId: string): string {
    // Remove any path traversal attempts
    const safePath = filePath.replace(/\.\./g, '').replace(/\/+/g, '/')
    
    // Ensure the path starts with organization ID
    const expectedPrefix = `${organizationId}/`
    if (!safePath.startsWith(expectedPrefix)) {
      throw new Error('Invalid file path for organization')
    }
    
    const fullPath = path.resolve(this.uploadBaseDir, safePath)
    const allowedBasePath = path.resolve(this.uploadBaseDir, organizationId)
    
    // Verify the resolved path is still within the organization directory
    if (!fullPath.startsWith(allowedBasePath)) {
      throw new Error('File path outside organization directory')
    }
    
    return fullPath
  }
  
  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Get content type from MIME type or filename
   */
  getContentType(mimeType: string | null, filename: string | null): string {
    // Use stored MIME type if available
    if (mimeType) {
      return mimeType
    }
    
    // Fallback to extension-based detection
    if (!filename) {
      return 'application/octet-stream'
    }
    
    const ext = path.extname(filename).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip'
    }
    
    return mimeMap[ext] || 'application/octet-stream'
  }
  
  /**
   * Create a readable stream with optional range support
   */
  async createReadStream(filePath: string, start?: number, end?: number): Promise<ReadableStream> {
    const options: { start?: number; end?: number } = {}
    
    if (start !== undefined) {
      options.start = start
    }
    
    if (end !== undefined) {
      options.end = end
    }
    
    const nodeStream = nodeCreateReadStream(filePath, options)
    
    // Convert Node.js readable stream to Web API ReadableStream
    return new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: string | Buffer) => {
          const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
          controller.enqueue(new Uint8Array(buffer))
        })
        
        nodeStream.on('end', () => {
          controller.close()
        })
        
        nodeStream.on('error', (error) => {
          controller.error(error)
        })
      },
      
      cancel() {
        nodeStream.destroy()
      }
    })
  }
  
  /**
   * Sanitize filename for Content-Disposition header
   */
  sanitizeFilename(filename: string): string {
    // Remove path separators and control characters
    return filename
      .replace(/[/\\]/g, '_')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .replace(/["]/g, "'")
      .trim()
  }
  
  /**
   * Get file size
   */
  async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath)
    return stats.size
  }
  
  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<{
    size: number
    modified: Date
    created: Date
  }> {
    const stats = await fs.stat(filePath)
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime
    }
  }
  
  /**
   * Calculate ETag for a file
   */
  async calculateETag(filePath: string): Promise<string> {
    const stats = await fs.stat(filePath)
    return `"${stats.size}-${stats.mtime.getTime()}"`
  }
  
  /**
   * Validate file path format
   */
  isValidFilePath(filePath: string): boolean {
    // Check for path traversal attempts
    if (filePath.includes('..') || filePath.includes('\\')) {
      return false
    }
    
    // Check for null bytes
    if (filePath.includes('\0')) {
      return false
    }
    
    // Check for excessive slashes
    if (filePath.includes('//')) {
      return false
    }
    
    return true
  }
  
  /**
   * Get organization directory path
   */
  getOrganizationDir(organizationId: string): string {
    return path.join(this.uploadBaseDir, organizationId)
  }
  
  /**
   * Ensure organization directory exists
   */
  async ensureOrganizationDir(organizationId: string): Promise<void> {
    const orgDir = this.getOrganizationDir(organizationId)
    await fs.mkdir(orgDir, { recursive: true })
  }
}

export const fileService = new FileService()
