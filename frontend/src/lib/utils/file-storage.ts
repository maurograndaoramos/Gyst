import fs from 'fs/promises'
import path from 'path'
import { generateSecureFilename } from './file-validation'

export class FileStorageService {
  private uploadDir: string
  private tempDir: string

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads'
    this.tempDir = process.env.TEMP_DIR || './uploads/temp'
  }

  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  async getOrganizationUploadPath(organizationId: string): Promise<string> {
    const orgPath = path.join(this.uploadDir, organizationId)
    await this.ensureDirectoryExists(orgPath)
    return orgPath
  }

  async moveFileToStorage(
    tempFilePath: string,
    originalFilename: string,
    organizationId: string
  ): Promise<{ filePath: string; filename: string }> {
    // Ensure upload directory exists
    const orgUploadPath = await this.getOrganizationUploadPath(organizationId)
    
    // Generate secure filename
    const secureFilename = generateSecureFilename(originalFilename, organizationId)
    const finalPath = path.join(orgUploadPath, secureFilename)
    
    // Move file from temp to final location
    await fs.rename(tempFilePath, finalPath)
    
    // Return relative path for database storage
    const relativePath = path.join(organizationId, secureFilename)
    
    return {
      filePath: relativePath,
      filename: secureFilename
    }
  }

  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error)
    }
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, filePath)
    return fs.readFile(fullPath)
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath)
    await fs.unlink(fullPath)
  }

  getAbsolutePath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath)
  }
}
