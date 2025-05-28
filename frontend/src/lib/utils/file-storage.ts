import fs from 'fs/promises'
import path from 'path'
import { generateSecureFilename } from './file-validation'

export class FileStorageService {
  private uploadDir: string
  private tempDir: string
  private readonly MAX_COLLISION_ATTEMPTS = 5

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

  private async atomicWrite(
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    const tempTargetPath = `${targetPath}.tmp`
    
    try {
      // First write to temporary file
      await fs.copyFile(sourcePath, tempTargetPath)
      
      // Then atomically rename
      await fs.rename(tempTargetPath, targetPath)
    } catch (error) {
      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempTargetPath)
      } catch {
        // Ignore cleanup errors
      }
      throw error
    }
  }

  private async handleCollision(
    sourcePath: string,
    targetPath: string,
    baseFilename: string,
    organizationId: string,
    attempt: number = 0
  ): Promise<{ filePath: string; filename: string }> {
    if (attempt >= this.MAX_COLLISION_ATTEMPTS) {
      throw new Error('Maximum collision resolution attempts reached')
    }

    // Generate new filename with attempt number
    const newFilename = generateSecureFilename(
      `${baseFilename}-${attempt}`,
      organizationId
    )
    const newTargetPath = path.join(
      path.dirname(targetPath),
      newFilename
    )

    try {
      // Check if new path exists
      await fs.access(newTargetPath)
      // If we get here, file exists - try again
      return this.handleCollision(
        sourcePath,
        newTargetPath,
        newFilename,
        organizationId,
        attempt + 1
      )
    } catch {
      // File doesn't exist, proceed with atomic write
      await this.atomicWrite(sourcePath, newTargetPath)
      return {
        filePath: newTargetPath,
        filename: newFilename
      }
    }
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
    
    try {
      // Check if file exists
      await fs.access(finalPath)
      // If we get here, file exists - handle collision
      return this.handleCollision(
        tempFilePath,
        finalPath,
        secureFilename,
        organizationId
      )
    } catch {
      // File doesn't exist, proceed with atomic write
      await this.atomicWrite(tempFilePath, finalPath)
      return {
        filePath: finalPath,
        filename: secureFilename
      }
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
