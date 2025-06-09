'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/auth/loading-spinner'

export default function AuthCallbackPage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [retryCount, setRetryCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1 second

    const handleAuth = async () => {
      if (status === 'loading') return

      if (!session) {
        setError('No active session found')
        router.push('/login')
        return
      }

      try {
        // Force a session refresh to ensure we have the latest data
        await updateSession()

        const organizationId = session?.user?.organizationId
        if (!organizationId && retryCount < MAX_RETRIES) {
          // Retry a few times before giving up, as the organization might be being created
          console.log(`Retrying session check (${retryCount + 1}/${MAX_RETRIES})`)
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
          }, RETRY_DELAY)
          return
        }

        if (!organizationId) {
          setError('Unable to find your organization')
          router.push('/login?error=organization_not_found')
          return
        }

        // Successfully found organization ID, redirect to dashboard
        router.push(`/${organizationId}/dashboard`)
      } catch (error) {
        console.error('Auth callback error:', error)
        setError('An unexpected error occurred')
        router.push('/login?error=callback_error')
      }
    }

    handleAuth()
  }, [session, status, router, retryCount, updateSession])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm text-muted-foreground">
          {error ? (
            <span className="text-red-500">{error}</span>
          ) : retryCount > 0 ? (
            `Initializing your account... (Attempt ${retryCount})`
          ) : (
            'Redirecting to your dashboard...'
          )}
        </p>
      </div>
    </div>
  )
}
