"use client"

import { useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/auth/loading-spinner'
import { UserHeader } from '@/components/user-header'
import { UploadSection } from '@/components/upload-section'

export default function Dashboard() {
  const { isLoading, isAuthenticated, role } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Please log in to access the dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with role indicators */}
      <UserHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Gyst
            </h1>
            <p className="text-gray-600">
              Your AI-native documentation brain for intelligent knowledge management.
            </p>
          </div>

          {/* Upload Section - Conditional rendering based on role */}
          <UploadSection />

          {/* Main Content Area */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Document Management
            </h2>
            <div className="space-y-4">
              {/* Document list would go here */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">
                  Document browser and search functionality will be implemented here.
                </p>
                {role !== 'admin' && (
                  <p className="text-sm text-gray-400 mt-2">
                    Contact an administrator to upload new documents.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              AI Assistant
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500">
                Conversational AI interface for document queries will be implemented here.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
