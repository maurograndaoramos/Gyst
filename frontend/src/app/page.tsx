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

  // Reset redirect flag when auth state changes significantly
  useEffect(() => {
    if (!isAuthenticated || !organizationId) {
      redirectAttempted.current = false
      setIsRedirecting(false)
    }
  }, [isAuthenticated, organizationId])

  // Show loading state while checking authentication or during redirect
  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
        <span className="ml-3 text-sm text-muted-foreground">
          {isRedirecting ? 'Redirecting to dashboard...' : 'Loading...'}
        </span>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage />
  }

  // Show message for authenticated users without organization
  if (!organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">Welcome to Gyst</h1>
          <p className="text-red-600 mb-4">
            No organization associated with your account.
            Please contact your administrator.
          </p>
          <Link
            href="/login"
            className="text-primary hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  // Render nothing while we wait for redirect
  return null
}
