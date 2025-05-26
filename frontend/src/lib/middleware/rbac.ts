// Role-Based Access Control (RBAC) Integration
// Extends organization filtering with role-based permissions
import { getOrganizationContext, OrganizationContextError } from "./organization-filter"

export type Role = 'admin' | 'manager' | 'member' | 'viewer'
export type Permission = 
  | 'projects:read' | 'projects:write' | 'projects:delete'
  | 'tasks:read' | 'tasks:write' | 'tasks:delete'
  | 'documents:read' | 'documents:write' | 'documents:delete'
  | 'users:read' | 'users:write' | 'users:delete'
  | 'audit:read' | 'system:admin'

export interface RoleDefinition {
  role: Role
  permissions: Permission[]
  description: string
}

export interface UserRole {
  userId: string
  organizationId: string
  role: Role
  assignedBy: string
  assignedAt: Date
}

// Role definitions with their permissions
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  admin: {
    role: 'admin',
    permissions: [
      'projects:read', 'projects:write', 'projects:delete',
      'tasks:read', 'tasks:write', 'tasks:delete',
      'documents:read', 'documents:write', 'documents:delete',
      'users:read', 'users:write', 'users:delete',
      'audit:read', 'system:admin'
    ],
    description: 'Full access to all organization resources and user management'
  },
  manager: {
    role: 'manager',
    permissions: [
      'projects:read', 'projects:write', 'projects:delete',
      'tasks:read', 'tasks:write', 'tasks:delete',
      'documents:read', 'documents:write', 'documents:delete',
      'users:read', 'audit:read'
    ],
    description: 'Manage projects, tasks, and documents. View users and audit logs'
  },
  member: {
    role: 'member',
    permissions: [
      'projects:read', 'projects:write',
      'tasks:read', 'tasks:write',
      'documents:read', 'documents:write'
    ],
    description: 'Create and edit projects, tasks, and documents'
  },
  viewer: {
    role: 'viewer',
    permissions: [
      'projects:read',
      'tasks:read',
      'documents:read'
    ],
    description: 'Read-only access to projects, tasks, and documents'
  }
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  try {
    const context = await getOrganizationContext()
    
    if (!context) {
      return false
    }

    const roleDefinition = ROLE_DEFINITIONS[context.role]
    return roleDefinition.permissions.includes(permission)
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Require a specific permission, throw error if not authorized
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const authorized = await hasPermission(permission)
  
  if (!authorized) {
    const context = await getOrganizationContext()
    throw new OrganizationContextError(
      `Permission denied. Required permission: ${permission}. Current role: ${context?.role || 'none'}`,
      'INSUFFICIENT_PERMISSIONS'
    )
  }
}

/**
 * Check multiple permissions (user must have ALL)
 */
export async function hasAllPermissions(permissions: Permission[]): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(permission))) {
      return false
    }
  }
  return true
}

/**
 * Check multiple permissions (user must have ANY)
 */
export async function hasAnyPermission(permissions: Permission[]): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(permission)) {
      return true
    }
  }
  return false
}

/**
 * Higher-order function to wrap API operations with permission checks
 */
export function withPermission<T extends any[], R>(
  permission: Permission,
  operation: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    await requirePermission(permission)
    return operation(...args)
  }
}

/**
 * Higher-order function to wrap API operations with multiple permission checks
 */
export function withPermissions<T extends any[], R>(
  permissions: Permission[],
  requireAll: boolean = true,
  operation: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const authorized = requireAll 
      ? await hasAllPermissions(permissions)
      : await hasAnyPermission(permissions)
    
    if (!authorized) {
      const context = await getOrganizationContext()
      throw new OrganizationContextError(
        `Permission denied. Required permissions: ${permissions.join(', ')}. Current role: ${context?.role || 'none'}`,
        'INSUFFICIENT_PERMISSIONS'
      )
    }
    
    return operation(...args)
  }
}

/**
 * Get user's role and permissions
 */
export async function getUserPermissions(): Promise<{
  role: Role
  permissions: Permission[]
  organizationId: string
}> {
  const context = await getOrganizationContext()
  
  if (!context) {
    throw new OrganizationContextError(
      'Authentication required to get permissions',
      'MISSING_AUTH'
    )
  }

  const roleDefinition = ROLE_DEFINITIONS[context.role]
  
  return {
    role: context.role,
    permissions: roleDefinition.permissions,
    organizationId: context.organizationId
  }
}

/**
 * Check if user can perform action on resource owned by another user
 */
export async function canAccessUserResource(resourceOwnerId: string): Promise<boolean> {
  const context = await getOrganizationContext()
  
  if (!context) {
    return false
  }

    // Users can always access their own resources
  if (context.userId === resourceOwnerId) {
    return true
  }

  // Admins can access any resource in their organization
  return context.role === 'admin'
}

/**
 * Filter resources based on user permissions and ownership
 */
export function filterUserResources<T extends { createdBy: string }>(
  resources: T[],
  userRole: Role,
  userId: string
): T[] {
  // Admins and managers see all resources
  if (userRole === 'admin' || userRole === 'manager') {
    return resources
  }

  // Members and viewers only see their own resources
  return resources.filter(resource => resource.createdBy === userId)
}

/**
 * Enhanced error handling for permission errors
 */
export function handlePermissionError(error: unknown) {
  if (error instanceof OrganizationContextError) {
    switch (error.code) {
      case 'INSUFFICIENT_PERMISSIONS':
        return {
          status: 403,
          message: 'You do not have permission to perform this action.',
          code: 'FORBIDDEN'
        }
      case 'MISSING_AUTH':
        return {
          status: 401,
          message: 'Authentication required to access this resource.',
          code: 'UNAUTHORIZED'
        }
      default:
        return {
          status: 403,
          message: 'Access denied.',
          code: 'FORBIDDEN'
        }
    }
  }

  return {
    status: 500,
    message: 'An unexpected error occurred.',
    code: 'INTERNAL_ERROR'
  }
}

/**
 * Utility to check if a role has higher privileges than another
 */
export function hasHigherRole(userRole: Role, targetRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    viewer: 1,
    member: 2,
    manager: 3,
    admin: 4
  }

  return roleHierarchy[userRole] > roleHierarchy[targetRole]
}
