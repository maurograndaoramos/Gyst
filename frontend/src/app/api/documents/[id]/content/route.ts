import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { documents, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { promises as fs } from 'fs'
import path from 'path'
import { fileService } from '@/lib/services/file-service'
import { auditService } from '@/lib/services/audit-service'

interface Params {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: Params) {
  let documentId: string | undefined
  let userId: string | undefined
  let organizationId: string | undefined

  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    userId = session.user.id
    organizationId = session.user.organizationId
    documentId = params.id

    // Validate required parameters
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization access required' }, { status: 403 })
    }

    // Permission verification - get document and verify ownership
    const document = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!document.length) {
      await auditService.logFileAccess({
        userId,
        organizationId,
        documentId,
        action: 'VIEW',
        success: false,
        errorMessage: 'Document not found or access denied',
        ipAddress: getClientIP(request)
      })
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const doc = document[0]

    // Verify file path exists
    if (!doc.filePath) {
      await auditService.logFileAccess({
        userId,
        organizationId,
        documentId,
        action: 'VIEW',
        success: false,
        errorMessage: 'No file path associated with document',
        ipAddress: getClientIP(request)
      })
      return NextResponse.json({ error: 'File not available' }, { status: 404 })
    }

    // Normalize path separators and validate file path
    const normalizedPath = doc.filePath.replace(/\\/g, '/')
    const filePath = fileService.getSecureFilePath(normalizedPath, organizationId)
    const fileExists = await fileService.fileExists(filePath)
    
    if (!fileExists) {
      await auditService.logFileAccess({
        userId,
        organizationId,
        documentId,
        action: 'VIEW',
        success: false,
        errorMessage: 'Physical file not found',
        ipAddress: getClientIP(request)
      })
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }

    // Get file stats for caching and range requests
    const fileStats = await fs.stat(filePath)
    const fileSize = fileStats.size
    const lastModified = fileStats.mtime
    const etag = `"${fileSize}-${lastModified.getTime()}"`

    // Handle conditional requests (caching)
    const ifNoneMatch = request.headers.get('if-none-match')
    const ifModifiedSince = request.headers.get('if-modified-since')

    if (ifNoneMatch === etag || 
        (ifModifiedSince && new Date(ifModifiedSince) >= lastModified)) {
      return new NextResponse(null, { status: 304 })
    }

    // Handle range requests for PDFs and large files
    const range = request.headers.get('range')
    let start = 0
    let end = fileSize - 1
    let statusCode = 200

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      start = parseInt(parts[0], 10)
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      statusCode = 206
      
      if (start >= fileSize || end >= fileSize || start > end) {
        return NextResponse.json({ error: 'Range not satisfiable' }, { status: 416 })
      }
    }

    // Determine content type
    const contentType = fileService.getContentType(doc.mimeType, doc.originalFilename)
    
    // Create readable stream for efficient serving
    const stream = await fileService.createReadStream(filePath, start, end)
    
    // Prepare headers
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Length', (end - start + 1).toString())
    headers.set('Accept-Ranges', 'bytes')
    headers.set('ETag', etag)
    headers.set('Last-Modified', lastModified.toUTCString())
    headers.set('Cache-Control', 'private, max-age=3600') // 1 hour cache
    
    // Add security headers
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'SAMEORIGIN')
    
    if (statusCode === 206) {
      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`)
    }

    // Add content disposition for downloads
    if (doc.originalFilename) {
      const filename = fileService.sanitizeFilename(doc.originalFilename)
      headers.set('Content-Disposition', `inline; filename="${filename}"`)
    }

    // Log successful access
    await auditService.logFileAccess({
      userId,
      organizationId,
      documentId,
      action: 'VIEW',
      success: true,
      bytesServed: end - start + 1,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      rangeRequest: !!range
    })

    // Return streaming response
    return new NextResponse(stream, {
      status: statusCode,
      headers
    })

  } catch (error) {
    console.error('Document content API error:', error)
    
    // Log error
    if (userId && documentId) {
      await auditService.logFileAccess({
        userId,
        organizationId: organizationId || '',
        documentId,
        action: 'VIEW',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: getClientIP(request)
      })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}
