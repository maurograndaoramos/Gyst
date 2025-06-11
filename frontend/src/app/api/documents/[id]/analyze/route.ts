import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from '@/lib/middleware/rbac'
import { getOrganizationContext, OrganizationContextError } from '@/lib/middleware/organization-filter'
import { handleOrganizationError } from '@/lib/services/data-access'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { DocumentAnalysisService } from '@/lib/services/document-analysis-service'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const documentId = params.id

    // 2. Verify document exists and belongs to organization
    const [document] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.organizationId, context.organizationId)
      ))

    if (!document) {
      return NextResponse.json({
        success: false,
        error: 'Document not found',
        code: 'NOT_FOUND'
      }, { status: 404 })
    }

    // 3. Update analysis status to 'analyzing'
    await db
      .update(documents)
      .set({
        analysisStatus: 'analyzing',
        analysisError: null,
        updatedAt: new Date()
      })
      .where(eq(documents.id, documentId))

    // 4. Trigger analysis asynchronously
    const documentAnalysisService = new DocumentAnalysisService()
    
    // Run analysis in background without blocking the response
    documentAnalysisService.analyzeDocument(documentId)
      .then(async () => {
        // Update status to completed on success
        await db
          .update(documents)
          .set({
            analysisStatus: 'completed',
            analysisError: null,
            updatedAt: new Date()
          })
          .where(eq(documents.id, documentId))
      })
      .catch(async (error) => {
        // Update status to failed on error
        console.error('Document analysis failed:', error)
        await db
          .update(documents)
          .set({
            analysisStatus: 'failed',
            analysisError: error.message || 'Analysis failed',
            updatedAt: new Date()
          })
          .where(eq(documents.id, documentId))
      })

    // 5. Return immediate response indicating analysis started
    return NextResponse.json({
      success: true,
      data: {
        message: 'Document analysis started',
        documentId,
        status: 'analyzing'
      }
    }, { status: 202 }) // 202 Accepted for async processing

  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json({
        success: false,
        error: errorResponse.message,
        code: 'PERMISSION_DENIED'
      }, { status: errorResponse.status })
    }

    console.error('Document analysis trigger error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while starting document analysis',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
