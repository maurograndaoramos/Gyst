"use client"

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const { user, role } = useAuth()
  const router = useRouter()

  const userRole = role || 'user'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <div className="mb-6">
          <svg 
            className="mx-auto h-16 w-16 text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>
        
        <p className="text-gray-600 mb-6">
          You don't have permission to access this resource.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            <strong>Current Role:</strong> {userRole}
          </p>
          {user?.email && (
            <p className="text-sm text-gray-700">
              <strong>User:</strong> {user.email}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/')} 
            className="w-full"
          >
            Return to Dashboard
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.back()} 
            className="w-full"
          >
            Go Back
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Contact an administrator if you believe this is an error.
        </p>
      </div>
    </div>
  )
}
