// Enhanced Documents API with RBAC and Organization Filtering
import { NextRequest, NextResponse } from "next/server"
import { documentService, handleOrganizationError } from "@/lib/services/data-access"
import { requirePermission, hasPermission, canAccessUserResource } from "@/lib/middleware/rbac"
import { OrganizationContextError } from "@/lib/middleware/organization-filter"

export async function GET(request: NextRequest) {
  try {
    // Check read permission
    await requirePermission('documents:read')
    
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    
    const documents = await documentService.getAll(projectId || undefined)
    
    return NextResponse.json({
      success: true,
      data: documents,
      count: documents.length
    })
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { success: false, error: errorResponse.message },
        { status: errorResponse.status }
      )
    }
    
    console.error('Documents API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check write permission
    await requirePermission('documents:write')
    
    const body = await request.json()
    const { projectId, title, content, filePath, mimeType, size, createdBy } = body
    
    if (!title || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Title and createdBy are required' },
        { status: 400 }
      )
    }
    
    // Check if user can create documents for this project
    if (projectId) {
      // In a real app, you'd check if the project exists and user has access
      // For now, we rely on organization filtering to handle this
    }
    
    const document = await documentService.create({
      projectId,
      title,
      content,
      filePath,
      mimeType,
      size,
      createdBy
    })
    
    return NextResponse.json({
      success: true,
      data: document
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { success: false, error: errorResponse.message },
        { status: errorResponse.status }
      )
    }
    
    console.error('Create document error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create document' },
      { status: 500 }
    )
  }
}
