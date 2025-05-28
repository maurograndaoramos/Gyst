"use client"

import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

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
    <div>
      <FileUploadComponent />
    </div>
  )
}
