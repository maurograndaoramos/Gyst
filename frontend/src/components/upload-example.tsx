'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UploadResponse {
  success: boolean
  data?: {
    id: string
    filename: string
    originalFilename: string
    size: number
    mimeType: string
    filePath: string
    createdAt: Date
  }
  error?: string
  code?: string
  details?: {
    errors?: string[]
    maxSize?: string
    supportedTypes?: string[]
  }
}

export function UploadExample() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResponse | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      // Optional: add project ID
      // formData.append('projectId', 'some-project-id')

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const data: UploadResponse = await response.json()
      setResult(data)

      if (data.success) {
        // Reset form on success
        setFile(null)
        const input = document.querySelector('input[type="file"]') as HTMLInputElement
        if (input) input.value = ''
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Upload failed: Network error',
        code: 'NETWORK_ERROR'
      })
    } finally {
      setUploading(false)
    }
  }

  const getUploadConfig = async () => {
    try {
      const response = await fetch('/api/documents/upload')
      const config = await response.json()
      console.log('Upload configuration:', config)
    } catch (error) {
      console.error('Failed to get upload config:', error)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>
          Upload documents (txt, md, pdf, docx) up to 5MB
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            accept=".txt,.md,.pdf,.docx"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
          <Button
            variant="outline"
            onClick={getUploadConfig}
            disabled={uploading}
          >
            Config
          </Button>
        </div>

        {file && (
          <div className="text-sm text-gray-600">
            <p><strong>File:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Type:</strong> {file.type || 'Unknown'}</p>
          </div>
        )}

        {result && (
          <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <div className="text-green-800">
                <p className="font-semibold">✅ Upload Successful!</p>
                <p className="text-sm">ID: {result.data?.id}</p>
                <p className="text-sm">File: {result.data?.originalFilename}</p>
                <p className="text-sm">Size: {result.data?.size} bytes</p>
                <p className="text-sm">Type: {result.data?.mimeType}</p>
              </div>
            ) : (
              <div className="text-red-800">
                <p className="font-semibold">❌ Upload Failed</p>
                <p className="text-sm">Error: {result.error}</p>
                <p className="text-sm">Code: {result.code}</p>
                {result.details?.errors && result.details.errors.length > 0 && (
                  <p className="text-sm">{result.details.errors[0]}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
