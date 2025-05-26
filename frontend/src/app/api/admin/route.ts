// Admin API Route: System-level Operations with Bypass
import { NextRequest, NextResponse } from "next/server"
import { projectService, handleOrganizationError, userService } from "@/lib/services/data-access"
import { getAuditLogs, OrganizationContextError } from "@/lib/middleware/organization-filter"
import { authOptions } from "@/lib/auth/config"
import { auth } from "@/lib/auth/config"

// Verify admin permissions (simplified - implement proper role checking)
async function requireAdminAccess() {
  const session = await auth()
  
  if (!session?.user) {
    throw new OrganizationContextError(
      'Authentication required for admin operations',
      'MISSING_AUTH'
    )
  }

  // In production, implement proper admin role verification
  // For now, we'll assume all authenticated users can perform admin operations
  return session.user
}

// GET /api/admin/projects - Get all projects across organizations
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdminAccess()
    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation')

    switch (operation) {
      case 'all-projects':
        // System-level operation: Get all projects across organizations
        const allProjects = await projectService.getAllForSystem(
          user.id!,
          'Admin dashboard - view all projects'
        )
        
        return NextResponse.json({
          success: true,
          data: allProjects,
          message: `Retrieved ${allProjects.length} projects across all organizations`,
          warning: 'This operation bypassed organization filtering'
        })

      case 'audit-logs':
        const organizationId = searchParams.get('organizationId')
        const limit = parseInt(searchParams.get('limit') || '100')
        
        const auditLogs = getAuditLogs(organizationId || undefined, limit)
        
        return NextResponse.json({
          success: true,
          data: auditLogs,
          message: `Retrieved ${auditLogs.length} audit log entries`
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid operation. Supported: all-projects, audit-logs",
            code: "INVALID_OPERATION"
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Admin GET error:", error)
    
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { 
          success: false, 
          error: errorResponse.message,
          code: errorResponse.code
        },
        { status: errorResponse.status }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "Admin operation failed",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Admin user operations
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminAccess()
    const body = await request.json()
    const { action, userId, organizationId } = body

    switch (action) {
      case 'update-organization':
        if (!userId || !organizationId) {
          return NextResponse.json(
            {
              success: false,
              error: "userId and organizationId are required",
              code: "VALIDATION_ERROR"
            },
            { status: 400 }
          )
        }

        await userService.updateOrganization(
          userId,
          organizationId,
          user.id!
        )

        return NextResponse.json({
          success: true,
          message: `User ${userId} organization updated to ${organizationId}`,
          warning: 'This operation bypassed organization filtering'
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action. Supported: update-organization",
            code: "INVALID_ACTION"
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Admin POST error:", error)
    
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { 
          success: false, 
          error: errorResponse.message,
          code: errorResponse.code
        },
        { status: errorResponse.status }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "Admin operation failed",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    )
  }
}
