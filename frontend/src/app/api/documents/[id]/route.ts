// Individual Document API with RBAC
import { NextRequest, NextResponse } from "next/server"
import { documentService, handleOrganizationError } from "@/lib/services/data-access"
import { requirePermission, canAccessUserResource } from "@/lib/middleware/rbac"
import { OrganizationContextError } from "@/lib/middleware/organization-filter"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('documents:read')
    
    const params = await context.params
    const document = await documentService.getById(params.id)
    
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }
    
    // Check if user can access this document
    const canAccess = await canAccessUserResource(document.createdBy)
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this document' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: document
    })
    
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { success: false, error: errorResponse.message },
        { status: errorResponse.status }
      )
    }
    
    console.error('Get document error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('documents:write')
    
    const body = await request.json()
    const { title, content, filePath, mimeType, size } = body
    
    const params = await context.params
    
    // First get the document to check ownership
    const existingDocument = await documentService.getById(params.id)
    
    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }
    
    // Check if user can modify this document
    const canAccess = await canAccessUserResource(existingDocument.createdBy)
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to modify this document' },
        { status: 403 }
      )
    }
    
    const updatedDocument = await documentService.update(params.id, {
      title,
      content,
      filePath,
      mimeType,
      size
    })
    
    return NextResponse.json({
      success: true,
      data: updatedDocument
    })
    
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { success: false, error: errorResponse.message },
        { status: errorResponse.status }
      )
    }
    
    console.error('Update document error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('documents:delete')
    
    const params = await context.params
    
    // First get the document to check ownership
    const existingDocument = await documentService.getById(params.id)
    
    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }
    
    // Check if user can delete this document
    const canAccess = await canAccessUserResource(existingDocument.createdBy)
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to delete this document' },
        { status: 403 }
      )
    }
    
    await documentService.delete(params.id)
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })
    
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { success: false, error: errorResponse.message },
        { status: errorResponse.status }
      )
    }
    
    console.error('Delete document error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
