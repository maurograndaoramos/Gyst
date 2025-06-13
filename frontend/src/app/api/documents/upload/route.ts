import { NextRequest, NextResponse } from "next/server"
import fs from 'fs/promises'
import { requirePermission } from '@/lib/middleware/rbac'
import { getOrganizationContext, OrganizationContextError } from '@/lib/middleware/organization-filter'
import { handleOrganizationError } from '@/lib/services/data-access'
import { validateFile, sanitizeFilename } from '@/lib/utils/file-validation'
import { FileStorageService } from '@/lib/utils/file-storage'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { MAX_FILE_SIZE, type UploadResponse } from '@/lib/types/upload'
import { DocumentAnalysisService } from '@/lib/services/document-analysis-service'


const fileStorage = new FileStorageService()
const documentAnalysisService = new DocumentAnalysisService()

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  let tempFilePath: string | undefined

  try {
    // 1. Authentication and Authorization
    await requirePermission('documents:write')
    const context = await getOrganizationContext()
    
    if (!context) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 })
    }

    // 2. Parse multipart form data
    const data = await request.formData()
    const file = data.get('file') as File
    const projectId = data.get('projectId') as string | null

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE'
      }, { status: 400 })
    }

    // Check file size before processing
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'File size exceeds 5MB limit',
        code: 'FILE_TOO_LARGE',
        details: { maxSize: '5MB' }
      }, { status: 413 })
    }

    // Create temporary file for validation
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name ? file.name.split('.').pop() : 'tmp'
    const tempFileName = `temp_${timestamp}_${random}.${fileExtension}`
    const tempDir = process.env.TEMP_DIR || './uploads/temp'
    await fileStorage.ensureDirectoryExists(tempDir)
    tempFilePath = `${tempDir}/${tempFileName}`

    // Write file to temp location
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(tempFilePath, buffer)

    // Create uploadedFile object for compatibility
    const uploadedFile = {
      filepath: tempFilePath,
      originalFilename: file.name,
      mimetype: file.type,
      size: file.size
    }

    // 4. Read file for validation
    const fileBuffer = buffer
    
    // 5. Comprehensive file validation
    const validation = await validateFile(
      fileBuffer,
      uploadedFile.originalFilename || 'unknown',
      uploadedFile.mimetype || '',
      uploadedFile.size
    )

    if (!validation.isValid) {
      await fileStorage.cleanupTempFile(tempFilePath)
      
      return NextResponse.json({
        success: false,
        error: 'File validation failed',
        code: 'VALIDATION_FAILED',
        details: {
          errors: validation.errors,
          maxSize: '5MB',
          supportedTypes: ['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        }
      }, { status: 422 })
    }

    // 6. Move file to secure storage
    const { filePath, filename } = await fileStorage.moveFileToStorage(
      tempFilePath,
      uploadedFile.originalFilename || 'unknown',
      context.organizationId
    )

    // Clear temp file path since file has been moved
    tempFilePath = undefined

    // 7. Create database record with content for text-based files
    const sanitizedOriginalName = sanitizeFilename(uploadedFile.originalFilename || 'unknown')
    
    // Read content for text-based files
    let fileContent: string | null = null
    const mimeType = validation.detectedMimeType || uploadedFile.mimetype
    if (mimeType && (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'text/markdown'
    )) {
      try {
        fileContent = buffer.toString('utf-8')
        console.log(`Stored content for ${sanitizedOriginalName}, length: ${fileContent.length}`)
      } catch (error) {
        console.warn(`Failed to read content for ${sanitizedOriginalName}:`, error)
      }
    }

    const [document] = await db.insert(documents).values({
      organizationId: context.organizationId,
      title: sanitizedOriginalName,
      originalFilename: sanitizedOriginalName,
      filePath: filePath,
      mimeType: mimeType,
      size: uploadedFile.size,
      content: fileContent,
      createdBy: context.userId,
      projectId: projectId || null,
      analysisStatus: 'analyzing'
    }).returning()

    // 8. Trigger AI analysis asynchronously
    documentAnalysisService.analyzeDocument(document.id)
      .then(async () => {
        // Update status to completed on success
        await db.update(documents)
          .set({
            analysisStatus: 'completed',
            analysisError: null,
            updatedAt: new Date()
          })
          .where(eq(documents.id, document.id))
      })
      .catch(async (error) => {
        // Update status to failed on error
        console.error('Document analysis failed:', error)
        await db.update(documents)
          .set({
            analysisStatus: 'failed',
            analysisError: error.message || 'Analysis failed',
            updatedAt: new Date()
          })
          .where(eq(documents.id, document.id))
      })

    // 9. Success response
    return NextResponse.json({
      success: true,
      data: {
        id: document.id,
        filename: filename,
        originalFilename: sanitizedOriginalName,
        size: uploadedFile.size,
        mimeType: validation.detectedMimeType || uploadedFile.mimetype || 'application/octet-stream',
        filePath: filePath,
        createdAt: document.createdAt || new Date()
      }
    }, { status: 201 })

  } catch (error) {
    // Cleanup temp file if upload failed
    if (tempFilePath) {
      await fileStorage.cleanupTempFile(tempFilePath)
    }

    // Handle specific error types
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json({
        success: false,
        error: errorResponse.message,
        code: 'PERMISSION_DENIED'
      }, { status: errorResponse.status })
    }

    // Handle formidable errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'LIMIT_FILE_SIZE') {
      return NextResponse.json({
        success: false,
        error: 'File size exceeds 5MB limit',
        code: 'FILE_TOO_LARGE',
        details: { maxSize: '5MB' }
      }, { status: 413 })
    }

    console.error('Document upload error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during upload',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Optional: Add GET method for upload status/info
export async function GET(request: NextRequest) {
  try {
    await requirePermission('documents:read')
    
    return NextResponse.json({
      success: true,
      config: {
        maxFileSize: MAX_FILE_SIZE,
        maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
        supportedTypes: ['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        supportedExtensions: ['.txt', '.md', '.pdf', '.docx']
      }
    })
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { success: false, error: errorResponse.message },
        { status: errorResponse.status }
      )
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get upload configuration'
    }, { status: 500 })
  }
}
