"use client"

import { ReactNode } from 'react'
import { useRequireRole } from '@/hooks/use-auth'
import type { UserRole } from '@/types/next-auth'
import { LoadingSpinner } from './loading-spinner'

interface RoleGuardProps {
  children: ReactNode
  requiredRole: UserRole
  fallback?: ReactNode
}

/**
 * RoleGuard component that requires specific user role
 * Redirects to unauthorized/login if role requirements not met
 */
export function RoleGuard({ children, requiredRole, fallback }: RoleGuardProps) {
  const { isLoading, isAuthenticated, checkRole } = useRequireRole(requiredRole)

  if (isLoading) {
    return fallback || <LoadingSpinner />
  }

  if (!isAuthenticated || !checkRole(requiredRole)) {
    // useRequireRole handles the redirect
    return null
  }

  return <>{children}</>
}

/**
 * AdminGuard component that requires admin role
 */
export function AdminGuard({ children, fallback }: Omit<RoleGuardProps, 'requiredRole'>) {
  return (
    <RoleGuard requiredRole="admin" fallback={fallback}>
      {children}
    </RoleGuard>
  )
}
