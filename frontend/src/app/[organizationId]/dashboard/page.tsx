"use client"

import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { UploadExample } from '@/components/upload-example'

import FileUploadComponent from '@/components/FileUploadComponent';

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const organizationId = params.organizationId as string

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session?.user) {
    return null // Will redirect to login
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard!
              </h1>
              <div className="space-y-2 text-gray-600">
                <p><strong>Organization:</strong> {organizationId}</p>
                <p><strong>User:</strong> {user.name || user.email}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role || 'user'}</p>
              </div>
              <div className="mt-8">
                <p className="text-sm text-gray-500">
                  <UploadExample />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <FileUploadComponent />
      </div>
    </div>
  )
}
