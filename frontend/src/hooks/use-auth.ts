"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { UserRole } from '@/types/next-auth'

// Main auth hook using NextAuth directly
export function useAuth() {
  const { data: session, status, update } = useSession()
  const [lastCheck, setLastCheck] = useState<number>(0)
  const organizationIdRef = useRef<string | null>(null)
  const UPDATE_INTERVAL = 30000 // 30 seconds
  
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated' && !!session?.user

  // Cache organization ID to prevent unnecessary updates
  if (session?.user?.organizationId !== organizationIdRef.current) {
    organizationIdRef.current = session?.user?.organizationId || null
  }
  
  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
    image: session.user.image,
    role: session.user.role || 'user' as UserRole,
    organizationId: organizationIdRef.current || '',
  } : null

  // Refresh session only if enough time has passed
  useEffect(() => {
    const now = Date.now()
    if (isAuthenticated && now - lastCheck > UPDATE_INTERVAL) {
      setLastCheck(now)
      update() // Update session data
    }
  }, [isAuthenticated, lastCheck, update])

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    role: user?.role || null,
    organizationId: organizationIdRef.current,
    update, // Expose update function
  }
}

// Hook that requires authentication
export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()
  const redirectingRef = useRef(false)

  useEffect(() => {
    // Prevent multiple redirects
    if (!auth.isLoading && !auth.isAuthenticated && !redirectingRef.current) {
      redirectingRef.current = true
      router.push('/login')
    }
    // Reset flag when auth state changes
    return () => {
      redirectingRef.current = false
    }
  }, [auth.isLoading, auth.isAuthenticated, router])

  return auth
}

// Hook that requires specific role
export function useRequireRole(requiredRole: UserRole) {
  const auth = useAuth()
  const router = useRouter()

  const checkRole = (role: UserRole): boolean => {
    if (!auth.user?.role) return false
    if (auth.user.role === 'admin') return true
    return auth.user.role === role
  }

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        router.push('/login')
      } else if (!checkRole(requiredRole)) {
        router.push('/unauthorized')
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, requiredRole, router])

  return auth
}

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
  const { user, isLoading } = useAuth()
  const isAdmin = !isLoading && user?.role === 'admin'
  return { isAdmin, isLoading }
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
