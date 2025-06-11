import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from '@/lib/middleware/rbac'
import { getOrganizationContext, OrganizationContextError } from '@/lib/middleware/organization-filter'
import { handleOrganizationError } from '@/lib/services/data-access'
import { db } from '@/lib/db'
import { tags, documentTags, documents } from '@/lib/db/schema'
import { sql, eq, and, count } from 'drizzle-orm'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId || organizationId !== context.organizationId) {
      return NextResponse.json({
        success: false,
        error: 'Organization ID mismatch',
        code: 'FORBIDDEN'
      }, { status: 403 })
    }

    // 2. Get tags with document counts for the organization
    const tagsWithCounts = await db
      .select({
        id: tags.id,
        name: tags.name,
        count: count(documentTags.documentId),
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt
      })
      .from(tags)
      .leftJoin(documentTags, eq(tags.id, documentTags.tagId))
      .leftJoin(documents, and(
        eq(documentTags.documentId, documents.id),
        eq(documents.organizationId, organizationId)
      ))
      .where(eq(documents.organizationId, organizationId))
      .groupBy(tags.id, tags.name, tags.createdAt, tags.updatedAt)
      .orderBy(sql`count(${documentTags.documentId}) DESC, ${tags.name} ASC`)

    // 3. Return success response
    return NextResponse.json({
      success: true,
      data: {
        tags: tagsWithCounts,
        total: tagsWithCounts.length
      }
    })

  } catch (error) {
    // Handle specific error types
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json({
        success: false,
        error: errorResponse.message,
        code: 'PERMISSION_DENIED'
      }, { status: errorResponse.status })
    }

    console.error('Tags fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching tags',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// POST endpoint to create a new tag (for future use)
export async function POST(request: NextRequest) {
  try {
    await requirePermission('documents:write')
    const context = await getOrganizationContext()
    
    if (!context) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tag name is required',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Create or get existing tag
    const [tag] = await db.insert(tags).values({
      name: name.trim()
    }).onConflictDoUpdate({
      target: tags.name,
      set: {
        updatedAt: new Date()
      }
    }).returning()

    return NextResponse.json({
      success: true,
      data: { tag }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json({
        success: false,
        error: errorResponse.message,
        code: 'PERMISSION_DENIED'
      }, { status: errorResponse.status })
    }

    console.error('Tag creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while creating tag',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
