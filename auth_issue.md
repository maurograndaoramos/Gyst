# Authentication Flow Issues Analysis

## Current Problems

1. **Session/Organization ID Race Condition**
   - Login succeeds but organization ID isn't immediately available
   - Attempts to create organization happening out of sync with session updates
   - Causes "Organization ID not found in session" errors

2. **Infinite Redirect Loop**
   ```log
   GET /api/auth/session 200
   GET /{orgId}/dashboard 200
   GET /api/auth/session 200
   ```
   - Session checks causing repeated page reloads
   - Each reload triggers new session checks
   - Dashboard and home page creating circular redirects

3. **React Router State Update Issue**
   ```error
   Cannot update a component (`Router`) while rendering a different component (`HomePage`)
   ```
   - State updates during render causing React errors
   - Multiple components trying to handle redirects simultaneously

## Root Causes

1. **Authentication Flow Design**
   - Current flow: Login → Create Org → Update Session → Redirect
   - Problem: Steps not properly synchronized
   - Missing proper await/handling of async operations

2. **Session Management**
   - Session updates not properly propagated
   - Missing centralized session state management
   - Excessive session refreshes

3. **Route Protection**
   - Multiple components handling auth checks
   - Inconsistent redirect handling
   - Missing proper route guards

## Proposed New Approach

1. **Simplified Auth Flow**
   ```mermaid
   graph TD
      A[Login] --> B[Create Session]
      B --> C{Has Org?}
      C -->|Yes| D[Dashboard]
      C -->|No| E[Create Org]
      E --> F[Update Session]
      F --> D
   ```

2. **Session Management**
   - Single source of truth for session data
   - Proper loading states between transitions
   - Reduced session refresh frequency

## Current Implementation Issues

### In `authenticateUser`
```typescript
// Problem: Organization creation not awaited properly
if (!orgId) {
  const defaultOrg = await db.insert(organizations)
    .values({
      name: `${foundUser.name || 'User'}'s Organization`,
      owner_id: foundUser.id,
    })
    .returning();
```

### In `HomePage`
```typescript
// Problem: Direct router calls during render
if (organizationId) {
  router.replace(`/${organizationId}/dashboard`)
  return <LoadingSpinner />
}
```

### In `useAuth` Hook
```typescript
// Problem: Excessive session refreshes
useEffect(() => {
  if (!auth.isLoading && !auth.isAuthenticated) {
    router.push('/login')
  }
}, [auth.isLoading, auth.isAuthenticated, router])
```

## Next Steps

1. Implement proper async flow handling for organization creation
2. Create centralized session management
3. Add proper loading states and error boundaries
4. Implement proper route guards
5. Reduce session refresh frequency
6. Handle redirects in useEffect only
