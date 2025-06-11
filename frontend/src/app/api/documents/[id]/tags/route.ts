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
    const body = await request.json()
    
    // Support both single tag and multiple tags formats
    const { selectedTagId, customTagName, confidence = 0.9, tags: tagArray } = body

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

    // Handle multiple tags (new format)
    if (tagArray !== undefined && Array.isArray(tagArray)) {
      // Remove all existing tags for this document first
      await db.delete(documentTags).where(eq(documentTags.documentId, documentId))

      const resultTags = []

      // If tagArray is empty, we're removing all tags - just return success
      if (tagArray.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            tags: []
          }
        })
      }

      // Process each tag in the array
      for (const tagData of tagArray) {
        try {
          const tagName = typeof tagData === 'string' ? tagData : tagData.name
          const tagConfidence = typeof tagData === 'object' ? tagData.confidence || 1.0 : 1.0

          if (!tagName || tagName.trim() === '') {
            continue // Skip empty tag names
          }

          // Create or get existing tag
          const [tag] = await db.insert(tags).values({
            name: tagName.trim()
          }).onConflictDoUpdate({
            target: tags.name,
            set: {
              updatedAt: new Date()
            }
          }).returning()

          // Add the tag relationship
          await db.insert(documentTags).values({
            documentId,
            tagId: tag.id,
            confidence: tagConfidence
          })

          resultTags.push({
            name: tag.name,
            confidence: tagConfidence
          })
        } catch (tagError) {
          console.error(`Error processing tag:`, tagError)
          // Continue with other tags instead of failing completely
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          tags: resultTags
        }
      })
    }

    // Handle single tag (legacy format)
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
