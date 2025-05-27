"use client"

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

export function UserHeader() {
  const { user, role } = useAuth()

  // Graceful degradation - default to 'user' if role is undefined
  const userRole = role || 'user'

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Gyst</h1>
          </div>

          {/* User Info and Role Indicator */}
          <div className="flex items-center space-x-4">
            {/* User Information */}
            <div className="text-sm text-gray-600">
              <span>Welcome, {user?.name || user?.email}</span>
            </div>

            {/* Role Badge - Visual indicator of user role */}
            <div className="flex items-center">
              <span 
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  userRole === 'admin' 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}
              >
                {userRole === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>

            {/* Organization Info */}
            {user?.organizationId && (
              <div className="text-xs text-gray-500">
                Org: {user.organizationId}
              </div>
            )}

            {/* Logout Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
