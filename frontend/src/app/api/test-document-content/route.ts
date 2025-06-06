import { NextRequest, NextResponse } from 'next/server'
import { fileService } from '@/lib/services/file-service'
import { auditService } from '@/lib/services/audit-service'

/**
 * Test endpoint to demonstrate document content retrieval
 * This serves one of the existing test files for demonstration
 */
export async function GET(request: NextRequest) {
  try {
    // For demo purposes, serve a test file
    const testOrganizationId = 'f32625fb-d44f-4fdb-be0d-910539614ad2'
    const testFileName = 'test-search-functionality.txt'
    const testFilePath = `${testOrganizationId}/${testFileName}`
    
    // Mock user for testing
    const mockUserId = 'test-user-123'
    
    // Get secure file path
    const filePath = fileService.getSecureFilePath(testFilePath, testOrganizationId)
    
    // Check if file exists
    const fileExists = await fileService.fileExists(filePath)
    if (!fileExists) {
      return NextResponse.json({ error: 'Test file not found' }, { status: 404 })
    }
    
    // Get file stats
    const fileStats = await fileService.getFileStats(filePath)
    
    // Handle range requests if present
    const range = request.headers.get('range')
    let start = 0
    let end = fileStats.size - 1
    let statusCode = 200
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      start = parseInt(parts[0], 10)
      end = parts[1] ? parseInt(parts[1], 10) : fileStats.size - 1
      statusCode = 206
    }
    
    // Create stream
    const stream = await fileService.createReadStream(filePath, start, end)
    
    // Prepare headers
    const headers = new Headers()
    headers.set('Content-Type', 'text/plain')
    headers.set('Content-Length', (end - start + 1).toString())
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'private, max-age=3600')
    headers.set('X-Content-Type-Options', 'nosniff')
    
    if (statusCode === 206) {
      headers.set('Content-Range', `bytes ${start}-${end}/${fileStats.size}`)
    }
    
    // Log the access for demo
    await auditService.logFileAccess({
      userId: mockUserId,
      organizationId: testOrganizationId,
      documentId: 'test-document-id',
      action: 'VIEW',
      success: true,
      bytesServed: end - start + 1,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      rangeRequest: !!range
    })
    
    return new NextResponse(stream, {
      status: statusCode,
      headers
    })
    
  } catch (error) {
    console.error('Test document content error:', error)
    return NextResponse.json(
      { error: 'Failed to serve test document' },
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
