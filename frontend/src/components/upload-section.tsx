"use client"

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function UploadSection() {
  const { role } = useAuth()
  const [isUploading, setIsUploading] = useState(false)

  // Graceful degradation - default to 'user' if role is undefined
  const userRole = role || 'user'
  const isAdmin = userRole === 'admin'

  const handleUpload = async () => {
    if (!isAdmin) return
    
    setIsUploading(true)
    // Upload logic would go here
    setTimeout(() => {
      setIsUploading(false)
      alert('Upload functionality would be implemented here')
    }, 1000)
  }

  const handleFileSelect = () => {
    if (!isAdmin) return
    
    // File selection logic would go here
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.md,.pdf,.docx'
    input.multiple = true
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        console.log('Files selected:', Array.from(files).map(f => f.name))
        handleUpload()
      }
    }
    input.click()
  }

  // Conditional rendering based on user role
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Document Upload
        </h2>
        <div className="text-center py-8">
          <div className="upload-restricted">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400 mb-4" 
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Restricted
            </h3>
            <p className="text-gray-500 mb-4">
              Document upload is available to administrators only.
            </p>
            <Button 
              disabled 
              className="upload-button-disabled"
              aria-label="Upload disabled for non-admin users"
            >
              Upload Documents
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Admin view - show upload functionality
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Document Upload
      </h2>
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400 mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Documents
          </h3>
          <p className="text-gray-500 mb-4">
            Upload .txt, .md, .pdf, or .docx files for AI analysis and tagging.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={handleFileSelect}
              disabled={isUploading}
              className="upload-button-enabled"
            >
              {isUploading ? 'Uploading...' : 'Select Files'}
            </Button>
            <p className="text-xs text-gray-400">
              Maximum file size: 5MB per file
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
