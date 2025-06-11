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

// Update document tags
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
    const { selectedTagId, customTagName, confidence = 0.9 } = await request.json()

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

    let tagId = selectedTagId

    // 3. Create custom tag if provided
    if (customTagName && !selectedTagId) {
      const [newTag] = await db.insert(tags).values({
        name: customTagName.trim()
      }).onConflictDoUpdate({
        target: tags.name,
        set: {
          updatedAt: new Date()
        }
      }).returning()
      
      tagId = newTag.id
    }

    if (!tagId) {
      return NextResponse.json({
        success: false,
        error: 'Either selectedTagId or customTagName must be provided',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // 4. Remove existing tags for this document (we only want one primary tag)
    await db.delete(documentTags).where(eq(documentTags.documentId, documentId))

    // 5. Add the new tag relationship
    const [documentTag] = await db.insert(documentTags).values({
      documentId,
      tagId,
      confidence: confidence
    }).returning()

    // 6. Get the tag details for response
    const [tagDetails] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, tagId))

    return NextResponse.json({
      success: true,
      data: {
        documentTag,
        tag: tagDetails
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

    console.error('Document tag update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while updating document tags',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Remove all tags from document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 3. Remove all tags for this document
    await db.delete(documentTags).where(eq(documentTags.documentId, documentId))

    return NextResponse.json({
      success: true,
      message: 'All tags removed from document'
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

    console.error('Document tag deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while removing document tags',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
