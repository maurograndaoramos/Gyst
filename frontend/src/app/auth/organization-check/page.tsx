'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function OrganizationCheckPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    console.log('OrganizationCheck: Effect triggered', { 
      status, 
      session: session ? {
        userId: session.user?.id,
        organizationId: session.user?.organizationId,
        email: session.user?.email
      } : null 
    })

    if (status === 'loading') {
      // Still loading session
      console.log('OrganizationCheck: Session still loading...')
      return
    }

    if (!session) {
      // No session, redirect to login
      console.log('OrganizationCheck: No session, redirecting to login')
      router.replace('/login')
      return
    }

    if (session.user) {
      console.log('OrganizationCheck: Session user data:', {
        id: session.user.id,
        email: session.user.email,
        organizationId: session.user.organizationId,
        role: session.user.role
      })

      if (!session.user.organizationId || session.user.organizationId === '') {
        // User has no organization, redirect to setup
        console.log('OrganizationCheck: User needs organization setup, redirecting to setup page')
        router.replace('/auth/setup-organization')
      } else {
        // User has organization, redirect to dashboard
        console.log('OrganizationCheck: User has organization, redirecting to dashboard:', `/${session.user.organizationId}/dashboard`)
        router.replace(`/${session.user.organizationId}/dashboard`)
      }
    }
  }, [session, status, router])

  // Show loading while checking
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up your account...</p>
      </div>
    </div>
  )
}
