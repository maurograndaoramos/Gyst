// Simplified Data Access Layer with Organization Filtering
import { eq, and, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { projects, documents, users } from "@/lib/db/schema"
import { 
  withOrganizationContext,
  addOrganizationFilter,
  addOrganizationToData,
  SecurityContext,
  OrganizationContextError
} from "@/lib/middleware/organization-filter"

// Project operations with organization filtering
export const projectService = {
  // Get all projects for the current organization
  async getAll() {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        // System-level bypass operation
        return db.select().from(projects).orderBy(desc(projects.createdAt))
      }
      
      return db.select()
        .from(projects)
        .where(addOrganizationFilter(projects, organizationId))
        .orderBy(desc(projects.createdAt))
    })
  },

  // Get a specific project by ID (with organization filtering)
  async getById(id: string) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        const result = await db.select().from(projects).where(eq(projects.id, id))
        return result[0] || null
      }
      
      const result = await db.select()
        .from(projects)
        .where(and(
          eq(projects.id, id),
          addOrganizationFilter(projects, organizationId)
        ))
      return result[0] || null
    })
  },

  // Create a new project (organizationId will be auto-injected)
  async create(data: { name: string; description?: string; createdBy: string }) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        // For bypass operations, organization ID should be explicitly provided
        throw new OrganizationContextError(
          'Organization ID must be explicitly provided for bypass operations',
          'BYPASS_REQUIRES_ORG'
        )
      }
      
      const projectData = addOrganizationToData(data, organizationId)
      return db.insert(projects).values(projectData).returning()
    })
  },

  // Update a project (only within current organization)
  async update(id: string, data: Partial<{ name: string; description: string }>) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        return db.update(projects)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(projects.id, id))
          .returning()
      }
      
      return db.update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
          eq(projects.id, id),
          addOrganizationFilter(projects, organizationId)
        ))
        .returning()
    })
  },

  // Delete a project (only within current organization)
  async delete(id: string) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        return db.delete(projects).where(eq(projects.id, id))
      }
      
      return db.delete(projects)
        .where(and(
          eq(projects.id, id),
          addOrganizationFilter(projects, organizationId)
        ))
    })
  },

  // System-level operation: Get all projects across organizations (requires bypass)
  async getAllForSystem(requestedBy: string, reason: string) {
    const securityContext: SecurityContext = {
      bypassOrganizationFilter: true,
      reason,
      requestedBy
    }
    
    return withOrganizationContext(async (_organizationId, _userId) => {
      return db.select().from(projects).orderBy(desc(projects.createdAt))
    }, securityContext)
  }
}

// Document operations with organization filtering
export const documentService = {
  async getAll(projectId?: string) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        if (projectId) {
          return db.select().from(documents)
            .where(eq(documents.projectId, projectId))
            .orderBy(desc(documents.createdAt))
        }
        return db.select().from(documents).orderBy(desc(documents.createdAt))
      }
      
      if (projectId) {
        return db.select().from(documents)
          .where(and(
            eq(documents.projectId, projectId),
            addOrganizationFilter(documents, organizationId)
          ))
          .orderBy(desc(documents.createdAt))
      } else {
        return db.select().from(documents)
          .where(addOrganizationFilter(documents, organizationId))
          .orderBy(desc(documents.createdAt))
      }
    })
  },

  async getById(id: string) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        const result = await db.select().from(documents).where(eq(documents.id, id))
        return result[0] || null
      }
      
      const result = await db.select()
        .from(documents)
        .where(and(
          eq(documents.id, id),
          addOrganizationFilter(documents, organizationId)
        ))
      return result[0] || null
    })
  },

  async create(data: {
    projectId?: string
    title: string
    content?: string
    filePath?: string
    mimeType?: string
    size?: number
    createdBy: string
  }) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        throw new OrganizationContextError(
          'Organization ID must be explicitly provided for bypass operations',
          'BYPASS_REQUIRES_ORG'
        )
      }
      
      const documentData = addOrganizationToData(data, organizationId)
      return db.insert(documents).values(documentData).returning()
    })
  },

  async update(id: string, data: Partial<{
    title: string
    content: string
    filePath: string
    mimeType: string
    size: number
  }>) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        return db.update(documents)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(documents.id, id))
          .returning()
      }
      
      return db.update(documents)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
          eq(documents.id, id),
          addOrganizationFilter(documents, organizationId)
        ))
        .returning()
    })
  },

  async delete(id: string) {
    return withOrganizationContext(async (organizationId, _userId) => {
      if (organizationId === 'bypass') {
        return db.delete(documents).where(eq(documents.id, id))
      }
      
      return db.delete(documents)
        .where(and(
          eq(documents.id, id),
          addOrganizationFilter(documents, organizationId)
        ))
    })
  }
}

// User operations (system-level, no organization filtering needed)
export const userService = {
  async getById(id: string) {
    // Users table doesn't require organization filtering
    const result = await db.select().from(users).where(eq(users.id, id))
    return result[0] || null
  },

  async getByEmail(email: string) {
    // Users table doesn't require organization filtering  
    const result = await db.select().from(users).where(eq(users.email, email))
    return result[0] || null
  },

  async updateOrganization(userId: string, organizationId: string, requestedBy: string) {
    // This is a system-level operation that requires careful logging
    try {
      const result = await db.update(users)
        .set({ organizationId })
        .where(eq(users.id, userId))
        .returning()

      // Log the organization change
      console.log(`[SECURITY] User ${userId} organization changed to ${organizationId} by ${requestedBy}`)
      
      return result
    } catch (error) {
      console.error(`[SECURITY] Failed to update user ${userId} organization:`, error)
      throw error
    }
  }
}

// Enhanced error handling utilities
export function handleOrganizationError(error: unknown) {
  if (error instanceof OrganizationContextError) {
    switch (error.code) {
      case 'MISSING_ORG_CONTEXT':
        return {
          status: 401,
          message: 'Authentication required. Please log in to access this resource.',
          code: 'UNAUTHORIZED'
        }
      case 'USER_NOT_FOUND':
        return {
          status: 404,
          message: 'User account not found. Please contact support.',
          code: 'USER_NOT_FOUND'
        }
      case 'MISSING_ORG_COLUMN':
        return {
          status: 500,
          message: 'Internal server error. Data access configuration issue.',
          code: 'INTERNAL_ERROR'
        }
      default:
        return {
          status: 403,
          message: 'Access denied. Insufficient organization permissions.',
          code: 'FORBIDDEN'
        }
    }
  }

  // Generic error handling
  return {
    status: 500,
    message: 'An unexpected error occurred.',
    code: 'INTERNAL_ERROR'
  }
}
