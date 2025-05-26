// Enhanced Audit Logging System
// Provides persistent audit logging for organization-filtered operations
import Database from "better-sqlite3"

// Create raw SQLite connection for audit logging
const rawDb = new Database(process.env.DATABASE_URL!)

export interface AuditLogEntry {
  id: string
  userId: string
  organizationId: string | null
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  tableName: string
  recordCount: number
  query: string
  timestamp: Date
  bypassUsed: boolean
  success: boolean
  errorMessage?: string
}

export interface AuditLogFilters {
  userId?: string
  organizationId?: string
  action?: string
  tableName?: string
  bypassUsed?: boolean
  success?: boolean
  startDate?: Date
  endDate?: Date
}

// In-memory fallback storage
const memoryStore: AuditLogEntry[] = []

/**
 * Save audit entry to database
 */
async function saveAuditEntry(entry: AuditLogEntry): Promise<boolean> {
  try {
    // Use raw database for audit operations
    const stmt = rawDb.prepare(`
      INSERT INTO audit_logs (
        id, userId, organizationId, action, tableName, recordCount, 
        query, bypassUsed, success, errorMessage, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      entry.id,
      entry.userId,
      entry.organizationId, 
      entry.action,
      entry.tableName,
      entry.recordCount,
      entry.query,
      entry.bypassUsed ? 1 : 0,
      entry.success ? 1 : 0,
      entry.errorMessage,
      entry.timestamp.getTime()
    )
    return true
  } catch (error) {
    console.error('[AUDIT] Failed to save audit log:', error)
    // Store in memory as fallback
    memoryStore.push(entry)
    return false
  }
}

/**
 * Log a data access operation to the persistent audit log
 */
export async function logDataAccess(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  const auditEntry: AuditLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date()
  }
  
  await saveAuditEntry(auditEntry)
  
  // Also log to console for development
  const status = auditEntry.success ? '✓' : '✗'
  const bypass = auditEntry.bypassUsed ? '[BYPASS]' : ''
  console.log(
    `[AUDIT] ${status} ${auditEntry.action} on ${auditEntry.tableName} ` +
    `by user ${auditEntry.userId} (org: ${auditEntry.organizationId}) ${bypass}`
  )
  
  if (!auditEntry.success && auditEntry.errorMessage) {
    console.error(`[AUDIT] Error: ${auditEntry.errorMessage}`)
  }
}

/**
 * Retrieve audit logs with filtering and pagination
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  limit: number = 100,
  offset: number = 0
): Promise<AuditLogEntry[]> {
  try {
    // Build query with filters
    let query = `
      SELECT 
        id, userId, organizationId, action, tableName,
        recordCount, query, bypassUsed, success, errorMessage, timestamp
      FROM audit_logs
      WHERE 1=1
    `
    
    const params: any[] = []
    
    // Apply filters
    if (filters.userId) {
      query += ` AND userId = ?`
      params.push(filters.userId)
    }
    
    if (filters.organizationId) {
      query += ` AND organizationId = ?`
      params.push(filters.organizationId)
    }
    
    if (filters.action) {
      query += ` AND action = ?`
      params.push(filters.action)
    }
    
    if (filters.tableName) {
      query += ` AND tableName = ?`
      params.push(filters.tableName)
    }
    
    if (filters.bypassUsed !== undefined) {
      query += ` AND bypassUsed = ?`
      params.push(filters.bypassUsed ? 1 : 0)
    }
    
    if (filters.success !== undefined) {
      query += ` AND success = ?`
      params.push(filters.success ? 1 : 0)
    }
    
    if (filters.startDate) {
      query += ` AND timestamp >= ?`
      params.push(filters.startDate.getTime())
    }
    
    if (filters.endDate) {
      query += ` AND timestamp <= ?`
      params.push(filters.endDate.getTime())
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)
    
    const stmt = rawDb.prepare(query)
    const rows = stmt.all(...params)
    
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId,
      action: row.action,
      tableName: row.tableName,
      recordCount: row.recordCount,
      query: row.query,
      bypassUsed: Boolean(row.bypassUsed),
      success: Boolean(row.success),
      errorMessage: row.errorMessage,
      timestamp: new Date(row.timestamp)
    }))
  } catch (error) {
    console.error('Failed to retrieve audit logs from database, using memory fallback:', error)
    
    // Fallback to in-memory logs
    let logs = [...memoryStore]
    
    // Apply filters to memory logs
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId)
    }
    if (filters.organizationId) {
      logs = logs.filter(log => log.organizationId === filters.organizationId)
    }
    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action)
    }
    if (filters.tableName) {
      logs = logs.filter(log => log.tableName === filters.tableName)
    }
    if (filters.bypassUsed !== undefined) {
      logs = logs.filter(log => log.bypassUsed === filters.bypassUsed)
    }
    if (filters.success !== undefined) {
      logs = logs.filter(log => log.success === filters.success)
    }
    if (filters.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate!)
    }
    if (filters.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate!)
    }
    
    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit)
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(organizationId?: string): Promise<{
  totalOperations: number
  failedOperations: number
  bypassOperations: number
  operationsByAction: Record<string, number>
  operationsByTable: Record<string, number>
}> {
  try {
    let whereClause = '1=1'
    const params: any[] = []
    
    if (organizationId) {
      whereClause = 'organizationId = ?'
      params.push(organizationId)
    }
    
    // Get basic stats
    const totalStmt = rawDb.prepare(`SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`)
    const totalResult = totalStmt.get(...params) as any
    
    const failedStmt = rawDb.prepare(`SELECT COUNT(*) as failed FROM audit_logs WHERE ${whereClause} AND success = 0`)
    const failedResult = failedStmt.get(...params) as any
    
    const bypassStmt = rawDb.prepare(`SELECT COUNT(*) as bypass FROM audit_logs WHERE ${whereClause} AND bypassUsed = 1`)
    const bypassResult = bypassStmt.get(...params) as any
    
    // Get operations by action
    const actionStmt = rawDb.prepare(`SELECT action, COUNT(*) as count FROM audit_logs WHERE ${whereClause} GROUP BY action`)
    const actionResults = actionStmt.all(...params) as any[]
    
    // Get operations by table
    const tableStmt = rawDb.prepare(`SELECT tableName, COUNT(*) as count FROM audit_logs WHERE ${whereClause} GROUP BY tableName`)
    const tableResults = tableStmt.all(...params) as any[]
    
    return {
      totalOperations: totalResult?.total || 0,
      failedOperations: failedResult?.failed || 0,
      bypassOperations: bypassResult?.bypass || 0,
      operationsByAction: actionResults.reduce((acc: any, row: any) => {
        acc[row.action] = row.count
        return acc
      }, {}),
      operationsByTable: tableResults.reduce((acc: any, row: any) => {
        acc[row.tableName] = row.count
        return acc
      }, {})
    }
  } catch (error) {
    console.error('Failed to get audit stats:', error)
    return {
      totalOperations: 0,
      failedOperations: 0,
      bypassOperations: 0,
      operationsByAction: {},
      operationsByTable: {}
    }
  }
}

/**
 * Clean up old audit logs (for maintenance)
 */
export async function cleanupAuditLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  try {
    const stmt = rawDb.prepare(`
      DELETE FROM audit_logs 
      WHERE timestamp < ?
    `)
    
    const result = stmt.run(cutoffDate.getTime())
    
    console.log(`[AUDIT] Cleaned up ${result.changes} old audit log entries`)
    return result.changes || 0
  } catch (error) {
    console.error('Failed to cleanup audit logs:', error)
    return 0
  }
}
