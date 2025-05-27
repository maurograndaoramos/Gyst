// Audit Statistics and Security Monitoring API
import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/middleware/rbac"
import { getOrganizationContext, OrganizationContextError } from "@/lib/middleware/organization-filter"
import { getAuditStats, detectSuspiciousActivity } from "@/lib/services/audit-logging"

export async function GET(request: NextRequest) {
  try {
    await requirePermission('audit:read')
    
    const url = new URL(request.url)
    const context = await getOrganizationContext()
    
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const includeStats = url.searchParams.get('stats') !== 'false'
    const includeSecurity = url.searchParams.get('security') !== 'false'
    
    const result: {
      stats?: Awaited<ReturnType<typeof getAuditStats>>
      security?: Awaited<ReturnType<typeof detectSuspiciousActivity>>
    } = {}
    
    if (includeStats) {
      result.stats = await getAuditStats(context.organizationId)
    }
    
    if (includeSecurity) {
      result.security = await detectSuspiciousActivity(context.organizationId)
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      organizationId: context.organizationId
    })
    
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === 'INSUFFICIENT_PERMISSIONS' ? 403 : 401 }
      )
    }
    
    console.error('Audit stats API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit statistics' },
      { status: 500 }
    )
  }
}
