// Audit Logs API for Administrative Review
import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/middleware/rbac"
import { getOrganizationContext, OrganizationContextError } from "@/lib/middleware/organization-filter"
import { 
  getAuditLogs, 
  exportAuditLogs,
  AuditLogFilters 
} from "@/lib/services/audit-logging"

export async function GET(request: NextRequest) {
  try {
    // Only users with audit:read permission can access audit logs
    await requirePermission('audit:read')
    
    const url = new URL(request.url)
    const context = await getOrganizationContext()
    
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Parse query parameters
    const action = url.searchParams.get('action') as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | null
    const tableName = url.searchParams.get('tableName')
    const userId = url.searchParams.get('userId')
    const bypassUsed = url.searchParams.get('bypassUsed')
    const success = url.searchParams.get('success')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const format = url.searchParams.get('format') as 'json' | 'csv' || 'json'
    
    // Build filters
    const filters: AuditLogFilters = {
      organizationId: context.organizationId // Always filter by organization
    }
    
    if (action) filters.action = action
    if (tableName) filters.tableName = tableName
    if (userId) filters.userId = userId
    if (bypassUsed !== null) filters.bypassUsed = bypassUsed === 'true'
    if (success !== null) filters.success = success === 'true'
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    
    // Handle export requests
    if (format === 'csv') {
      const csvData = await exportAuditLogs(filters, 'csv')
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"'
        }
      })
    }
    
    // Get audit logs
    const logs = await getAuditLogs(filters, limit, offset)
    
    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
      filters,
      pagination: {
        limit,
        offset,
        hasMore: logs.length === limit
      }
    })
    
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === 'INSUFFICIENT_PERMISSIONS' ? 403 : 401 }
      )
    }
    
    console.error('Audit logs API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
