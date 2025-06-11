import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from '@/lib/middleware/rbac'
import { getOrganizationContext, OrganizationContextError } from '@/lib/middleware/organization-filter'
import { handleOrganizationError } from '@/lib/services/data-access'
import { db } from '@/lib/db'
import { documents, documentTags, tags } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authentication and Authorization
    await requirePermission('documents:read')
    const context = await getOrganizationContext()
    
    if (!context) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 })
    }

    const documentId = params.id

    // 2. Get document with tags
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

    // 3. Get associated tags with confidence scores
    const documentTagsWithDetails = await db
      .select({
        tagId: tags.id,
        tagName: tags.name,
        confidence: documentTags.confidence,
        createdAt: documentTags.createdAt
      })
      .from(documentTags)
      .innerJoin(tags, eq(documentTags.tagId, tags.id))
      .where(eq(documentTags.documentId, documentId))
      .orderBy(documentTags.confidence)

    // 4. Return document with tags and analysis status
    return NextResponse.json({
      success: true,
      data: {
        document: {
          ...document,
          tags: documentTagsWithDetails
        }
      }
    })

  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json({
        success: false,
        error: errorResponse.message,
        code: 'PERMISSION_DENIED'
      }, { status: errorResponse.status })
    }

    console.error('Document fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching document',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { summary, analysisStatus, analysisError } = await request.json()

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

    // 3. Update document fields
    const updateData: any = {
      updatedAt: new Date()
    }

    if (summary !== undefined) updateData.summary = summary
    if (analysisStatus !== undefined) updateData.analysisStatus = analysisStatus
    if (analysisError !== undefined) updateData.analysisError = analysisError

    const [updatedDocument] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, documentId))
      .returning()

    return NextResponse.json({
      success: true,
      data: { document: updatedDocument }
    })

  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json({
        success: false,
        error: errorResponse.message,
        code: 'PERMISSION_DENIED'
      }, { status: errorResponse.status })
    }

    console.error('Document update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while updating document',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authentication and Authorization
    await requirePermission('documents:delete')
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

    // 3. Delete related document tags first (foreign key constraint)
    await db
      .delete(documentTags)
      .where(eq(documentTags.documentId, documentId))

    // 4. Delete the document
    await db
      .delete(documents)
      .where(eq(documents.id, documentId))

    // 5. TODO: Delete physical file from filesystem if needed
    // if (document.filePath) {
    //   try {
    //     await fs.unlink(document.filePath)
    //   } catch (fileError) {
    //     console.warn('Could not delete physical file:', fileError)
    //   }
    // }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json({
        success: false,
        error: errorResponse.message,
        code: 'PERMISSION_DENIED'
      }, { status: errorResponse.status })
    }

    console.error('Document deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while deleting document',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
