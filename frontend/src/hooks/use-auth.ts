"use client"

import { useAuth as useAuthContext, useRequireAuth as useRequireAuthContext, useRequireRole as useRequireRoleContext } from '@/contexts/auth-context'

// Re-export the main auth hook
export const useAuth = useAuthContext

// Re-export the require auth hook
export const useRequireAuth = useRequireAuthContext

// Re-export the require role hook
export const useRequireRole = useRequireRoleContext

// Additional convenience hooks

/**
 * Check if user is authenticated
 */
export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth()
  return { isAuthenticated: !isLoading && isAuthenticated, isLoading }
}

/**
 * Check if user has admin role
 */
export function useIsAdmin() {
  const { checkRole, isLoading } = useAuth()
  return { isAdmin: !isLoading && checkRole('admin'), isLoading }
}

/**
 * Get current user data
 */
export function useCurrentUser() {
  const { user, isLoading } = useAuth()
  return { user, isLoading }
}

/**
 * Get authentication status with loading state
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user, role, organizationId } = useAuth()
  
  return {
    isAuthenticated,
    isLoading,
    user,
    role,
    organizationId,
    isReady: !isLoading
  }
}

/**
 * Hook for logout functionality
 */
export function useLogout() {
  const { logout } = useAuth()
  return logout
}

/**
 * Hook for session refresh
 */
export function useSessionRefresh() {
  const { refreshSession } = useAuth()
  return refreshSession
}
