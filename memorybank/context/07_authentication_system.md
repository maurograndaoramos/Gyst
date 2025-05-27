# Authentication System

This document describes the comprehensive authentication state management system implemented using React Context and NextAuth V5 for the Gyst application.

## Features

- ✅ **Persistent Session State** - Sessions persist across page refreshes using JWT tokens
- ✅ **Loading States** - Proper loading indicators during authentication checks
- ✅ **Role-Based State Management** - Support for admin/user roles with organization context
- ✅ **Session Expiry Handling** - Automatic session refresh and expiry detection
- ✅ **Automatic Logout Redirect** - Clean logout with proper state cleanup
- ✅ **TypeScript Support** - Fully typed authentication state and hooks

## Architecture

```
AuthContextProvider (React Context)
├── NextAuth SessionProvider
├── Local Storage Persistence
├── Session Refresh Handler
└── Role & Organization Management

Custom Hooks
├── useAuth() - Main authentication hook
├── useRequireAuth() - Protected route logic
├── useRole() - Role-based access
└── Convenience hooks (useIsAdmin, useLogout, etc.)

Guard Components
├── <AuthGuard> - Requires authentication
├── <RoleGuard> - Role-based protection
└── <AdminGuard> - Admin-only access
```

## Implementation Details

### Core Files

1. **Authentication Context** (`src/contexts/auth-context.tsx`)
   - Central auth state management with TypeScript
   - Integration with NextAuth's `useSession` hook
   - Persistent session state across page refreshes
   - Loading states during auth checks
   - Role-based state management (Admin/User)
   - Organization context integration

2. **Custom Hooks** (`src/hooks/use-auth.ts`)
   - `useAuth()` - Main authentication hook
   - `useRequireAuth()` - Protected route logic
   - `useRequireRole()` - Role-based access
   - Convenience hooks: `useIsAuthenticated()`, `useIsAdmin()`, `useLogout()`, etc.

3. **Guard Components** (`src/components/auth/`)
   - `<AuthGuard>` - Requires authentication
   - `<RoleGuard>` - Role-based protection
   - `<AdminGuard>` - Admin-only access
   - `<LoadingSpinner>` - Loading state component

4. **Enhanced NextAuth Configuration** (`src/auth.ts`)
   - Proper JWT callbacks with role and organization data
   - Session management with 30-day expiry
   - Enhanced type safety

5. **Updated Providers** (`src/components/providers.tsx`)
   - Integrated AuthProvider with SessionProvider

6. **Enhanced TypeScript Types** (`src/types/next-auth.d.ts`)
   - Proper role and organization typing
   - Extended NextAuth interfaces

## Quick Start

### 1. Wrap your app with providers

```tsx
// app/layout.tsx
import { Providers } from '@/components/providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

### 2. Use authentication in components

```tsx
import { useAuth } from '@/hooks/use-auth'

function Dashboard() {
  const { user, isLoading, isAuthenticated, logout } = useAuth()

  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Please log in</div>

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### 3. Protect routes with guards

```tsx
import { AuthGuard, AdminGuard } from '@/components/auth'

// Require authentication
function ProtectedPage() {
  return (
    <AuthGuard>
      <div>This content requires authentication</div>
    </AuthGuard>
  )
}

// Require admin role
function AdminPage() {
  return (
    <AdminGuard>
      <div>Admin-only content</div>
    </AdminGuard>
  )
}
```

## Available Hooks

### `useAuth()`
Main authentication hook providing complete auth state:

```tsx
const {
  user,              // Current user data
  session,           // NextAuth session
  isLoading,         // Loading state
  isAuthenticated,   // Authentication status
  role,              // User role (admin/user)
  organizationId,    // User's organization
  logout,            // Logout function
  refreshSession,    // Manual session refresh
  checkRole,         // Role validation function
  checkAuthentication // Auth validation function
} = useAuth()
```

### `useRequireAuth()`
For components that require authentication:

```tsx
function ProtectedComponent() {
  const auth = useRequireAuth() // Redirects to login if not authenticated
  return <div>Protected content</div>
}
```

### `useRequireRole(role)`
For components that require specific roles:

```tsx
function AdminComponent() {
  const auth = useRequireRole('admin') // Redirects if not admin
  return <div>Admin content</div>
}
```

### Convenience Hooks

```tsx
// Check authentication status
const { isAuthenticated, isLoading } = useIsAuthenticated()

// Check admin role
const { isAdmin, isLoading } = useIsAdmin()

// Get current user
const { user, isLoading } = useCurrentUser()

// Logout function
const logout = useLogout()

// Session refresh
const refreshSession = useSessionRefresh()
```

## Guard Components

### `<AuthGuard>`
Requires user authentication:

```tsx
<AuthGuard fallback={<LoginPrompt />}>
  <ProtectedContent />
</AuthGuard>
```

### `<RoleGuard>`
Requires specific role:

```tsx
<RoleGuard requiredRole="admin" fallback={<AccessDenied />}>
  <AdminContent />
</RoleGuard>
```

### `<AdminGuard>`
Shortcut for admin-only content:

```tsx
<AdminGuard>
  <AdminPanel />
</AdminGuard>
```

## Session Management

### Automatic Features
- **Session Persistence**: JWT tokens automatically persist across browser sessions
- **Auto Refresh**: Sessions refresh 5 minutes before expiry
- **Expiry Detection**: Automatic logout when sessions expire
- **Cross-tab Sync**: Session state synchronized across browser tabs

### Manual Control
```tsx
const { refreshSession, logout } = useAuth()

// Manually refresh session
await refreshSession()

// Logout with cleanup
await logout()
```

## TypeScript Types

```tsx
import type { UserRole, AuthUser, AuthState } from '@/contexts/auth-context'

type UserRole = 'admin' | 'user'

interface AuthUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  role: UserRole
  organizationId: string
}
```

## Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Automatic retry for session refresh
- **Expired Sessions**: Clean logout and redirect to login
- **Invalid Tokens**: Automatic session cleanup
- **Role Violations**: Redirect to unauthorized page

## Security Features

- **JWT Token Validation**: Automatic token validation and refresh
- **Role-Based Access**: Granular permission system
- **Organization Isolation**: Multi-tenant data separation
- **Secure Logout**: Complete session and local storage cleanup
- **CSRF Protection**: Built-in NextAuth CSRF protection

## Configuration

Session configuration in `auth.ts`:

```tsx
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

Customize redirect paths:

```tsx
pages: {
  signIn: "/login",
  error: "/auth/error",
}
```

## Integration with Data Flows

This authentication system integrates with the existing data flows described in `03_data_flows.md`:

### Document Upload Flow
- Enhanced role verification using `useRequireRole('admin')`
- Organization context automatically included in upload requests
- Session validation at each step

### AI Chat Flow
- User authentication verified before chat requests
- Organization ID automatically filtered from session context
- Role-based response customization

### Search Flow
- Organization-based filtering automatic from auth context
- Role-based search result filtering
- Session-based query history

### Authentication Flow
- Enhanced with React Context state management
- Persistent session across application
- Real-time role and organization updates

## Best Practices

1. **Always use guards** for protected content
2. **Check loading states** before rendering auth-dependent content
3. **Handle errors gracefully** with fallback UI
4. **Use appropriate hooks** for your use case
5. **Test role-based access** thoroughly

## Migration from Basic NextAuth

If migrating from basic NextAuth setup:

1. Replace `useSession()` calls with `useAuth()`
2. Wrap components with guard components instead of manual checks
3. Use role-based hooks for permission checks
4. Update type declarations to include role and organization data

## Performance Considerations

- Context updates are optimized to prevent unnecessary re-renders
- Loading states are managed efficiently to avoid UI flicker
- Session refresh is batched to prevent multiple concurrent requests
- Local storage operations are debounced for performance

## Testing Considerations

- Mock auth context for component testing
- Test role-based access control thoroughly
- Verify session persistence across page refreshes
- Test logout cleanup and redirect behavior
- Validate organization data isolation

## Future Enhancements

- Multi-factor authentication support
- Single sign-on (SSO) integration
- Advanced permission granularity
- Session analytics and monitoring
- Advanced security policies
