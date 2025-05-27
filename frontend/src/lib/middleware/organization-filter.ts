// Organization-based data filtering middleware for multi-tenant security
import { eq, sql, SQL} from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { auth } from "@/auth"

// Types for organization context
export interface OrganizationContext {
  organizationId: string
  userId: string
  role: 'admin' | 'member' | 'viewer'
  bypassSecurityCheck?: boolean
}

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

// Security context for bypassing organization filters
export interface SecurityContext {
  bypassOrganizationFilter: boolean
  reason: string
  requestedBy: string
}

// Error class for organization context issues
export class OrganizationContextError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'OrganizationContextError'
  }
}

// In-memory audit log (in production, store in database)
const auditLog: AuditLogEntry[] = []

/**
 * Get organization context from the current session
 */
export async function getOrganizationContext(): Promise<OrganizationContext | null> {
  const session = await auth()
  
  if (!session?.user?.id) {
    return null
  }

  // In this implementation, we assume organizationId is stored in user record
  // In a real application, you might have a separate user_organizations table
  const user = await db.select({
    id: users.id,
    organizationId: sql<string>`COALESCE(${users.organizationId}, 'default')`.as('organizationId')
  }).from(users).where(eq(users.id, session.user.id)).get()

  if (!user) {
    throw new OrganizationContextError(
      'User not found in database',
      'USER_NOT_FOUND'
    )
  }

  return {
    organizationId: user.organizationId || 'default',
    userId: user.id,
    role: 'member', // Default role - implement proper role fetching
    bypassSecurityCheck: false
  }
}

/**
 * Enhanced audit logging with detailed context
 */
export function logDataAccess(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
  const auditEntry: AuditLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date()
  }
  
  auditLog.push(auditEntry)
  
  // Log to console for development (use proper logging in production)
  console.log(`[AUDIT] ${entry.action} on ${entry.tableName} by user ${entry.userId} (org: ${entry.organizationId}, bypass: ${entry.bypassUsed})`)
  
  // In production, persist to database or external logging service
  // await persistAuditLog(auditEntry)
}

/**
 * Get audit logs (for admin review)
 */
export function getAuditLogs(organizationId?: string, limit: number = 100): AuditLogEntry[] {
  let logs = auditLog
  
  if (organizationId) {
    logs = logs.filter(log => log.organizationId === organizationId)
  }
  
  return logs
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit)
}

/**
 * Check if a table requires organization filtering
 */
export function requiresOrganizationFilter(tableName: string): boolean {
  // System tables that don't require organization filtering
  const systemTables = [
    'user', 'account', 'session', 'verificationToken', 'authenticator',
    'migrations', 'audit_logs'
  ]
  
  return !systemTables.includes(tableName)
}

/**
 * Simple organization filter utilities that work with standard Drizzle queries
 */

/**
 * Add organization filter to WHERE clause
 */
export function addOrganizationFilter(table: any, organizationId: string): SQL {
  if (!table.organizationId) {
    throw new OrganizationContextError(
      `Table does not have organizationId column for filtering`,
      'MISSING_ORG_COLUMN'
    )
  }
  return eq(table.organizationId, organizationId)
}

/**
 * Enhance data with organization ID for INSERT operations
 */
export function addOrganizationToData<T extends Record<string, any>>(
  data: T, 
  organizationId: string
): T & { organizationId: string } {
  return { ...data, organizationId }
}

/**
 * Higher-order function for organization-aware database operations
 */
export async function withOrganizationContext<T>(
  operation: (organizationId: string, userId: string) => Promise<T>,
  securityContext?: SecurityContext
): Promise<T> {
  // Skip organization checks if bypass is enabled
  if (securityContext?.bypassOrganizationFilter) {
    console.warn(`[SECURITY] Organization filter bypassed: ${securityContext.reason} (by: ${securityContext.requestedBy})`)
    // For bypass operations, we still need a user ID, so let's get the session
    const session = await auth()
    if (!session?.user?.id) {
      throw new OrganizationContextError(
        'Authentication required even for bypass operations',
        'MISSING_AUTH'
      )
    }
    return operation('bypass', session.user.id)
  }

  const context = await getOrganizationContext()
  
  if (!context) {
    throw new OrganizationContextError(
      'Organization context required for data access',
      'MISSING_ORG_CONTEXT'
    )
  }

  try {
    const result = await operation(context.organizationId, context.userId)
    
    // Log successful operation
    logDataAccess({
      userId: context.userId,
      organizationId: context.organizationId,
      action: 'SELECT', // Default action
      tableName: 'unknown',
      recordCount: Array.isArray(result) ? result.length : 1,
      query: 'Database operation',
      bypassUsed: false,
      success: true
    })
    
    return result
  } catch (error) {
    // Log failed operation
    logDataAccess({
      userId: context.userId,
      organizationId: context.organizationId,
      action: 'SELECT',
      tableName: 'unknown',
      recordCount: 0,
      query: 'Failed database operation',
      bypassUsed: false,
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    
    throw error
  }
}

/**
 * Higher-order function to wrap database operations with organization filtering
 */
export function withOrganizationSecurity<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  tableName: string,
  securityContext?: SecurityContext
) {
  return async (...args: T): Promise<R> => {
    try {
      const result = await operation(...args)
      
      // Log successful operation
      const context = await getOrganizationContext()
      if (context) {
        logDataAccess({
          userId: context.userId,
          organizationId: context.organizationId,
          action: 'SELECT', // Default to SELECT, override in specific implementations
          tableName,
          recordCount: Array.isArray(result) ? result.length : 1,
          query: `Operation on ${tableName}`,
          bypassUsed: !!securityContext?.bypassOrganizationFilter,
          success: true
        })
      }
      
      return result
    } catch (error) {
      // Log failed operation
      const context = await getOrganizationContext()
      if (context) {
        logDataAccess({
          userId: context.userId,
          organizationId: context.organizationId,
          action: 'SELECT',
          tableName,
          recordCount: 0,
          query: `Failed operation on ${tableName}`,
          bypassUsed: !!securityContext?.bypassOrganizationFilter,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error)
        })
      }
      
      throw error
    }
  }
}
