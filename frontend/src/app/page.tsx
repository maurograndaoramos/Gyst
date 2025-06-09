"use client"

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/auth/loading-spinner'
import LandingPage from './landing/page'

export default function HomePage() {
  const { isLoading, isAuthenticated, organizationId } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const redirectAttempted = useRef(false)

  // Handle redirects in useEffect with guards against infinite loops
  useEffect(() => {
    // Prevent multiple redirect attempts
    if (redirectAttempted.current) return
    
    if (!isLoading && isAuthenticated && organizationId && !isRedirecting) {
      redirectAttempted.current = true
      setIsRedirecting(true)
      
      // Add a small delay to ensure state updates complete
      setTimeout(() => {
        router.replace(`/${organizationId}/dashboard`)
      }, 100)
    }
  }, [isLoading, isAuthenticated, organizationId, router, isRedirecting])

  // Handle organization setup redirect for authenticated users without organization
  useEffect(() => {
    if (!isLoading && isAuthenticated && !organizationId && !redirectAttempted.current) {
      redirectAttempted.current = true
      setIsRedirecting(true)
      router.replace('/auth/setup-organization')
    }
  }, [isLoading, isAuthenticated, organizationId, router])

  // Reset redirect flag when auth state changes significantly
  useEffect(() => {
    if (!isAuthenticated) {
      redirectAttempted.current = false
      setIsRedirecting(false)
    }
  }, [isAuthenticated])

  // Show loading state while checking authentication or during redirect
  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
        <span className="ml-3 text-sm text-muted-foreground">
          {isRedirecting ? 'Redirecting...' : 'Loading...'}
        </span>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage />
  }

  // This should rarely be reached due to the useEffect redirects above
  // but provides a fallback for authenticated users without organization
  if (!organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
        <span className="ml-3 text-sm text-muted-foreground">
          Setting up your organization...
        </span>
      </div>
    )
  }

  // Render nothing while we wait for redirect to dashboard
  return null
}
