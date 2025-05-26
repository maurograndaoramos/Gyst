# Organization-Based Data Filtering Middleware

This system provides comprehensive organization-based data filtering for multi-tenant applications using SQLite and better-sqlite3 with Drizzle ORM.

## Overview

The organization filtering middleware automatically:
- ✅ Injects `WHERE organizationId = ?` clauses for SELECT queries
- ✅ Injects `organizationId` values for INSERT operations  
- ✅ Restricts UPDATE/DELETE operations to current organization
- ✅ Provides bypass mechanisms for system-level queries
- ✅ Logs all data access operations for audit trails
- ✅ Handles missing organization context with proper errors
- ✅ Prevents SQL injection through prepared statements

## Core Components

### 1. Organization Filter Middleware (`/lib/middleware/organization-filter.ts`)

**Key Classes:**
- `SecureQueryBuilder` - Wraps Drizzle queries with organization filtering
- `OrganizationContextError` - Custom error for organization issues

**Key Functions:**
- `getOrganizationContext()` - Extracts organization from session
- `createSecureQueryBuilder()` - Factory for secure query operations
- `logDataAccess()` - Audit logging for all data operations
- `requiresOrganizationFilter()` - Determines if table needs filtering

### 2. Data Access Layer (`/lib/services/data-access.ts`)

Provides high-level service functions that automatically apply organization filtering:

```typescript
// Automatically filtered by organization
const projects = await projectService.getAll()
const project = await projectService.getById(id)
await projectService.create(data)
```

**Services Available:**
- `projectService` - Project CRUD operations
- `taskService` - Task CRUD operations  
- `documentService` - Document CRUD operations
- `userService` - User operations (system-level)

### 3. Database Schema (`/lib/db/schema.ts`)

**Organization-Filtered Tables:**
- `projects` - Requires `organizationId` 
- `tasks` - Requires `organizationId`
- `documents` - Requires `organizationId`

**System Tables (No Filtering):**
- `users` - System-level (has `organizationId` for association)
- `accounts`, `sessions` - NextAuth tables
- `verificationTokens`, `authenticators` - NextAuth tables

## Usage Examples

### Basic API Route with Organization Filtering

```typescript
// /app/api/projects/route.ts
import { projectService, handleOrganizationError } from "@/lib/services/data-access"
import { OrganizationContextError } from "@/lib/middleware/organization-filter"

export async function GET() {
  try {
    // Automatically filtered by current user's organization
    const projects = await projectService.getAll()
    return NextResponse.json({ data: projects })
  } catch (error) {
    if (error instanceof OrganizationContextError) {
      const errorResponse = handleOrganizationError(error)
      return NextResponse.json(
        { error: errorResponse.message },
        { status: errorResponse.status }
      )
    }
    // Handle other errors...
  }
}
```

### System-Level Operations with Bypass

```typescript
// Admin operation that needs to see all organizations
const allProjects = await projectService.getAllForSystem(
  userId,
  "Admin dashboard - system overview"
)
```

### Custom Query with Manual Filtering

```typescript
import { createSecureQueryBuilder } from "@/lib/middleware/organization-filter"

async function customQuery() {
  const queryBuilder = await createSecureQueryBuilder()
  
  // This query will automatically have organizationId filtering applied
  const query = db.select()
    .from(tasks)
    .where(eq(tasks.status, 'in_progress'))
    
  return queryBuilder.select(query, 'task').execute()
}
```

## Security Features

### 1. Automatic Organization Injection

```typescript
// When creating data, organizationId is automatically injected
await taskService.create({
  title: "New Task",
  description: "Task description"
  // organizationId will be automatically added
})
```

### 2. Organization Context Validation

The system ensures users have proper organization context before allowing data access:

```typescript
// Throws OrganizationContextError if no organization context
const context = await getOrganizationContext()
```

### 3. System Table Exclusion

System tables automatically bypass organization filtering:

```typescript
// These tables are never filtered by organization
const systemTables = [
  'user', 'account', 'session', 'verificationToken', 
  'authenticator', 'migrations', 'audit_logs'
]
```

### 4. Bypass Mechanism for Admin Operations

```typescript
const securityContext: SecurityContext = {
  bypassOrganizationFilter: true,
  reason: "System maintenance - data migration",
  requestedBy: adminUserId
}

const queryBuilder = await createSecureQueryBuilder(securityContext)
```

## Audit Logging

All data operations are automatically logged with:
- User ID and Organization ID
- Operation type (SELECT, INSERT, UPDATE, DELETE)
- Table name and record count
- SQL query executed
- Whether bypass was used
- Success/failure status
- Timestamp

### Viewing Audit Logs

```typescript
// Get audit logs for current organization
const logs = getAuditLogs()

// Get audit logs for specific organization (admin only)
const orgLogs = getAuditLogs('org-123', 50)
```

## Error Handling

The system provides specific error types for different scenarios:

```typescript
try {
  await projectService.getAll()
} catch (error) {
  if (error instanceof OrganizationContextError) {
    switch (error.code) {
      case 'MISSING_ORG_CONTEXT':
        // User not authenticated
        break
      case 'USER_NOT_FOUND':
        // User account issues
        break
      case 'MISSING_ORG_COLUMN':
        // Schema configuration error
        break
    }
  }
}
```

## API Endpoints

### Projects
- `GET /api/projects` - List organization projects
- `POST /api/projects` - Create project (org auto-injected)
- `GET /api/projects/[id]` - Get specific project (org-filtered)
- `PUT /api/projects/[id]` - Update project (org-filtered)
- `DELETE /api/projects/[id]` - Delete project (org-filtered)

### Tasks
- `GET /api/tasks` - List organization tasks
- `GET /api/tasks?projectId=123` - List tasks for project
- `GET /api/tasks?assignedTo=user123` - List user's tasks
- `POST /api/tasks` - Create task (org auto-injected)

### Admin Operations
- `GET /api/admin?operation=all-projects` - System-wide projects (bypass)
- `GET /api/admin?operation=audit-logs` - View audit logs
- `POST /api/admin` - Admin operations (user org updates, etc.)

## Configuration

### Environment Variables
```bash
DATABASE_URL=./db.sqlite  # SQLite database path
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

### Schema Migration

When adding new tables that require organization filtering:

1. Add `organizationId` column:
```typescript
export const newTable = sqliteTable("new_table", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(), // Required!
  // other columns...
})
```

2. Update `requiresOrganizationFilter()` if needed:
```typescript
export function requiresOrganizationFilter(tableName: string): boolean {
  const systemTables = [
    'user', 'account', 'session', // existing system tables
    'new_system_table' // add new system table here
  ]
  return !systemTables.includes(tableName)
}
```

3. Create service functions in data access layer:
```typescript
export const newTableService = {
  async getAll() {
    const queryBuilder = await createSecureQueryBuilder()
    const query = db.select().from(newTable)
    return queryBuilder.select(query, 'new_table').execute()
  }
  // other CRUD operations...
}
```

## Best Practices

1. **Always use service layer** - Don't bypass the data access layer
2. **Handle OrganizationContextError** - Provide proper error responses
3. **Use bypass judiciously** - Only for legitimate system operations
4. **Monitor audit logs** - Review for suspicious activity
5. **Test organization isolation** - Verify data doesn't leak between orgs
6. **Validate organization context** - Ensure users belong to correct org

## Performance Considerations

- Organization filtering adds minimal overhead (single WHERE clause)
- Indexes should be created on `organizationId` columns for large tables:
  ```sql
  CREATE INDEX idx_projects_org ON projects(organizationId);
  CREATE INDEX idx_tasks_org ON tasks(organizationId);
  CREATE INDEX idx_documents_org ON documents(organizationId);
  ```
- Prepared statements prevent SQL injection and improve performance
- Audit logging is in-memory by default (implement database persistence for production)

## Testing Organization Isolation

```typescript
// Test that users can only see their organization's data
describe('Organization Isolation', () => {
  it('should not return data from other organizations', async () => {
    // Setup: Create data in org1 and org2
    // Test: User from org1 should only see org1 data
    // Assert: No org2 data is returned
  })
})
```
