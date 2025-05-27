"use client"

import { ReactNode } from 'react'
import { useRequireAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from './loading-spinner'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * AuthGuard component that requires user authentication
 * Redirects to login if not authenticated
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useRequireAuth()

  if (isLoading) {
    return fallback || <LoadingSpinner />
  }

  if (!isAuthenticated) {
    // useRequireAuth handles the redirect
    return null
  }

  return <>{children}</>
}
