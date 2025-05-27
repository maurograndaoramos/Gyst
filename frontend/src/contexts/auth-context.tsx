"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Session } from 'next-auth'
import type { UserRole } from '@/types/next-auth'

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  role: UserRole
  organizationId: string
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  role: UserRole | null
  organizationId: string | null
}

export interface AuthContextValue extends AuthState {
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  checkRole: (requiredRole: UserRole) => boolean
  checkAuthentication: () => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Compute authentication state
  const isLoading = status === 'loading' || isRefreshing
  const isAuthenticated = !!session?.user
  
  // Extract user data from session
  const user: AuthUser | null = session?.user ? {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
    image: session.user.image,
    role: session.user.role || 'user',
    organizationId: session.user.organizationId || '',
  } : null

  const role = user?.role || null
  const organizationId = user?.organizationId || null

  // Handle session expiry
  useEffect(() => {
    if (status === 'unauthenticated' && window.location.pathname !== '/login') {
      // Session expired or user logged out
      router.push('/login')
    }
  }, [status, router])

  // Monitor session expiry
  useEffect(() => {
    if (session?.expires) {
      const expiryTime = new Date(session.expires).getTime()
      const currentTime = new Date().getTime()
      const timeUntilExpiry = expiryTime - currentTime

      if (timeUntilExpiry > 0) {
        // Set timer to refresh session before expiry
        const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000) // 5 minutes before expiry, minimum 1 minute
        
        const timer = setTimeout(() => {
          refreshSession()
        }, refreshTime)

        return () => clearTimeout(timer)
      } else {
        // Session already expired
        logout()
      }
    }
  }, [session?.expires])

  const logout = async (): Promise<void> => {
    try {
      // Clear any local storage or additional cleanup
      localStorage.removeItem('auth-user')
      localStorage.removeItem('auth-preferences')
      
      // Sign out with NextAuth
      await signOut({ 
        callbackUrl: '/login',
        redirect: true 
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if signOut fails
      router.push('/login')
    }
  }

  const refreshSession = async (): Promise<void> => {
    try {
      setIsRefreshing(true)
      await update()
    } catch (error) {
      console.error('Session refresh error:', error)
      // If refresh fails, logout user
      await logout()
    } finally {
      setIsRefreshing(false)
    }
  }

  const checkRole = (requiredRole: UserRole): boolean => {
    if (!user || !user.role) return false
    
    // Admin has access to all roles
    if (user.role === 'admin') return true
    
    // Check specific role
    return user.role === requiredRole
  }

  const checkAuthentication = (): boolean => {
    return isAuthenticated && !isLoading
  }

  // Persist user data to localStorage for offline access
  useEffect(() => {
    if (user) {
      localStorage.setItem('auth-user', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      }))
    } else {
      localStorage.removeItem('auth-user')
    }
  }, [user])

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated,
    role,
    organizationId,
    logout,
    refreshSession,
    checkRole,
    checkAuthentication,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Custom hook for components that require authentication
export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/login')
    }
  }, [auth.isLoading, auth.isAuthenticated, router])

  return auth
}

// Custom hook for role-based access
export function useRequireRole(requiredRole: UserRole) {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        router.push('/login')
      } else if (!auth.checkRole(requiredRole)) {
        router.push('/unauthorized')
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.checkRole, requiredRole, router])

  return auth
}
