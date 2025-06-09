import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import type { FileAccessLog } from './file-service'

export interface AuditLogEntry {
  userId: string
  organizationId: string
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  tableName: string
  recordId?: string
  recordCount?: number
  query?: string
  success: boolean
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface FileAccessAuditEntry {
  userId: string
  organizationId: string
  documentId: string
  action: 'VIEW' | 'DOWNLOAD'
  success: boolean
  bytesServed?: number
  errorMessage?: string
  ipAddress: string
  userAgent?: string | null
  rangeRequest?: boolean
}

class AuditService {
  /**
   * Log file access events
   */
  async logFileAccess(entry: FileAccessAuditEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: entry.userId,
        organizationId: entry.organizationId,
        action: 'SELECT', // Map to database audit action
        tableName: 'documents',
        recordCount: 1,
        query: `FILE_ACCESS: ${entry.action} document ${entry.documentId}`,
        success: entry.success,
        errorMessage: entry.errorMessage,
        bypassUsed: false,
        timestamp: new Date()
      })

      // Also log detailed file access if needed
      console.log('File access audit:', {
        userId: entry.userId,
        organizationId: entry.organizationId,
        documentId: entry.documentId,
        action: entry.action,
        success: entry.success,
        bytesServed: entry.bytesServed,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        rangeRequest: entry.rangeRequest,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log audit entry:', error)
      // Don't throw error to avoid disrupting the main operation
    }
  }

  /**
   * Log general database operations
   */
  async logDatabaseOperation(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: entry.userId,
        organizationId: entry.organizationId,
        action: entry.action,
        tableName: entry.tableName,
        recordCount: entry.recordCount || 1,
        query: entry.query || '',
        success: entry.success,
        errorMessage: entry.errorMessage,
        bypassUsed: false,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Failed to log database audit entry:', error)
    }
  }

  /**
   * Log user authentication events
   */
  async logAuthEvent(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId,
        organizationId: null,
        action: 'SELECT', // Map auth events to SELECT for consistency
        tableName: 'users',
        recordCount: 1,
        query: `AUTH_EVENT: ${action}`,
        success: action !== 'LOGIN_FAILED',
        errorMessage,
        bypassUsed: false,
        timestamp: new Date()
      })

      console.log('Auth audit:', {
        userId,
        action,
        success: action !== 'LOGIN_FAILED',
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log auth audit entry:', error)
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    organizationId?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      if (organizationId) {
        const query = await db
          .select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.userId, userId),
              eq(auditLogs.organizationId, organizationId)
            )
          )
          .orderBy(desc(auditLogs.timestamp))
          .limit(limit)
        return query
      } else {
        const query = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.userId, userId))
          .orderBy(desc(auditLogs.timestamp))
          .limit(limit)
        return query
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      return []
    }
  }

  /**
   * Get file access statistics
   */
  async getFileAccessStats(
    organizationId: string,
    timeRange: 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    totalAccesses: number
    uniqueUsers: number
    totalBytesServed: number
    topDocuments: Array<{ documentId: string; accesses: number }>
  }> {
    try {
      // Calculate time boundary
      const now = new Date()
      const timeAgo = new Date()
      
      switch (timeRange) {
        case 'day':
          timeAgo.setDate(now.getDate() - 1)
          break
        case 'week':
          timeAgo.setDate(now.getDate() - 7)
          break
        case 'month':
          timeAgo.setMonth(now.getMonth() - 1)
          break
      }

      // This is a simplified version - in a real implementation,
      // you'd want to parse the query field to extract file access data
      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.organizationId, organizationId),
            eq(auditLogs.tableName, 'documents'),
            gte(auditLogs.timestamp, timeAgo)
          )
        )

      // Extract stats from logs
      const fileAccessLogs = logs.filter(log => 
        log.query?.startsWith('FILE_ACCESS:')
      )

      const uniqueUsers = new Set(fileAccessLogs.map(log => log.userId)).size
      const totalAccesses = fileAccessLogs.length
      
      // For bytes served, you'd need to store this in metadata or separate table
      const totalBytesServed = 0 // Placeholder

      // Top documents (simplified)
      const documentCounts: Record<string, number> = {}
      fileAccessLogs.forEach(log => {
        const match = log.query?.match(/document (\w+)/)
        if (match) {
          const docId = match[1]
          documentCounts[docId] = (documentCounts[docId] || 0) + 1
        }
      })

      const topDocuments = Object.entries(documentCounts)
        .map(([documentId, accesses]) => ({ documentId, accesses }))
        .sort((a, b) => b.accesses - a.accesses)
        .slice(0, 10)

      return {
        totalAccesses,
        uniqueUsers,
        totalBytesServed,
        topDocuments
      }
    } catch (error) {
      console.error('Failed to get file access stats:', error)
      return {
        totalAccesses: 0,
        uniqueUsers: 0,
        totalBytesServed: 0,
        topDocuments: []
      }
    }
  }

  /**
   * Log bandwidth usage (for monitoring)
   */
  async logBandwidthUsage(
    organizationId: string,
    userId: string,
    bytesTransferred: number,
    operation: 'UPLOAD' | 'DOWNLOAD'
  ): Promise<void> {
    try {
      console.log('Bandwidth usage:', {
        organizationId,
        userId,
        bytesTransferred,
        operation,
        timestamp: new Date().toISOString()
      })

      // In a production system, you might want to store this in a dedicated table
      // or send to a monitoring service
    } catch (error) {
      console.error('Failed to log bandwidth usage:', error)
    }
  }

  /**
   * Get organization bandwidth usage
   */
  async getOrganizationBandwidth(
    organizationId: string,
    timeRange: 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    upload: number
    download: number
    total: number
  }> {
    // This would be implemented with proper bandwidth tracking
    // For now, return placeholder data
    return {
      upload: 0,
      download: 0,
      total: 0
    }
  }
}

// Import necessary functions from drizzle-orm
import { eq, and, desc, gte } from 'drizzle-orm'

export const auditService = new AuditService()
