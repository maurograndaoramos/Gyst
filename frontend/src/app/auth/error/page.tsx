'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'organization_not_found':
        return 'Unable to find your organization. This could be because your organization is still being set up. Please try logging in again.'
      case 'callback_error':
        return 'There was a problem setting up your account. Please try logging in again.'
      case 'CredentialsSignin':
        return 'Invalid email or password. Please check your credentials and try again.'
      case 'unauthorized':
        return 'You are not authorized to access this resource. Please contact your organization administrator.'
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with a different sign-in method. Please use your original sign-in method.'
      case 'AccessDenied':
        return 'Access denied. You may not have the required permissions.'
      case 'SessionRequired':
        return 'Please sign in to access this page.'
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          {error === 'organization_not_found' ? 'Organization Setup' : 'Authentication Error'}
        </h1>
        <p className="text-gray-600 mb-6">
          {getErrorMessage(error)}
        </p>
        <Link
          href="/login"
          className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
