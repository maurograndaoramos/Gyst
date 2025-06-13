import React, { useState, useCallback, useRef, useEffect } from 'react'
import useFileValidation from '@/hooks/useFileValidation'
import type { FileData } from '@/types/file'

export interface UploadFileProgress {
  id: string
  name: string
  size: number
  progress: number
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error'
  errorMessage?: string
  originalFile: File
}

export interface UseEnhancedUploadReturn {
  uploadFiles: (files: File[]) => Promise<void>
  uploadState: 'idle' | 'uploading' | 'completed' | 'error'
  uploadingFiles: UploadFileProgress[]
  isExpanded: boolean
  toggleExpanded: () => void
  clearCompleted: () => void
  retryFile: (fileId: string) => void
  cancelFile: (fileId: string) => void
  hasActiveUploads: boolean
  totalFiles: number
  completedFiles: number
  failedFiles: number
}

interface UseEnhancedUploadOptions {
  organizationId: string
  onUploadComplete?: (uploadedFiles: FileData[]) => void
  onFileListRefresh?: () => void
}

export function useEnhancedUpload({ 
  organizationId, 
  onUploadComplete, 
  onFileListRefresh 
}: UseEnhancedUploadOptions): UseEnhancedUploadReturn {
  const [uploadingFiles, setUploadingFiles] = useState<UploadFileProgress[]>([])
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle')
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldRefreshFileList, setShouldRefreshFileList] = useState(false)
  
  const { validate: validateFile } = useFileValidation()
  const progressIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  // Use effect to defer file list refresh to avoid setState during render
  useEffect(() => {
    if (shouldRefreshFileList && onFileListRefresh) {
      onFileListRefresh()
      setShouldRefreshFileList(false)
    }
  }, [shouldRefreshFileList, onFileListRefresh])

  // Computed properties
  const hasActiveUploads = uploadingFiles.some(file => 
    file.status === 'queued' || file.status === 'uploading' || file.status === 'processing'
  )
  const totalFiles = uploadingFiles.length
  const completedFiles = uploadingFiles.filter(file => file.status === 'completed').length
  const failedFiles = uploadingFiles.filter(file => file.status === 'error').length

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const clearCompleted = useCallback(() => {
    setUploadingFiles(prev => prev.filter(file => 
      file.status !== 'completed' && file.status !== 'error'
    ))
    
    // If no files remain, reset state
    setUploadingFiles(prev => {
      if (prev.length === 0) {
        setUploadState('idle')
        setIsExpanded(false)
      }
      return prev
    })
  }, [])

  const cancelFile = useCallback((fileId: string) => {
    // Cancel the upload request
    const controller = abortControllersRef.current.get(fileId)
    if (controller) {
      controller.abort()
      abortControllersRef.current.delete(fileId)
    }

    // Clear progress interval
    const interval = progressIntervalsRef.current.get(fileId)
    if (interval) {
      clearInterval(interval)
      progressIntervalsRef.current.delete(fileId)
    }

    // Update file status
    setUploadingFiles(prev => prev.filter(file => file.id !== fileId))
  }, [])

  const retryFile = useCallback(async (fileId: string) => {
    const fileToRetry = uploadingFiles.find(file => file.id === fileId)
    if (!fileToRetry) return

    // Reset file status
    setUploadingFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, status: 'queued', progress: 0, errorMessage: undefined }
        : file
    ))

    // Start upload for this specific file
    await uploadSingleFile(fileToRetry)
  }, [uploadingFiles])

  const uploadSingleFile = async (fileProgress: UploadFileProgress) => {
    const controller = new AbortController()
    abortControllersRef.current.set(fileProgress.id, controller)

    try {
      // Update status to uploading
      setUploadingFiles(prev => prev.map(file => 
        file.id === fileProgress.id 
          ? { ...file, status: 'uploading', progress: 0 }
          : file
      ))

      // Create fake progress updates
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => {
          const currentFile = prev.find(f => f.id === fileProgress.id)
          if (!currentFile || currentFile.status !== 'uploading') {
            clearInterval(progressInterval)
            return prev
          }
          const newProgress = Math.min(95, (currentFile.progress || 0) + Math.random() * 15)
          return prev.map(f => 
            f.id === fileProgress.id 
              ? { ...f, progress: newProgress }
              : f
          )
        })
      }, 200)

      progressIntervalsRef.current.set(fileProgress.id, progressInterval)

      // Create form data
      const formData = new FormData()
      formData.append('file', fileProgress.originalFile)

      // Make upload request
      const response = await fetch(`/api/documents/upload?organizationId=${organizationId}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      // Clear progress interval
      clearInterval(progressInterval)
      progressIntervalsRef.current.delete(fileProgress.id)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Mark as completed
      setUploadingFiles(prev => prev.map(file => 
        file.id === fileProgress.id 
          ? { ...file, status: 'completed', progress: 100 }
          : file
      ))

      // Call completion callback if provided
      if (onUploadComplete && result.data) {
        onUploadComplete([result.data])
      }

    } catch (error) {
      // Clear progress interval
      const interval = progressIntervalsRef.current.get(fileProgress.id)
      if (interval) {
        clearInterval(interval)
        progressIntervalsRef.current.delete(fileProgress.id)
      }

      // Don't treat aborted requests as errors
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      // Mark as error
      setUploadingFiles(prev => prev.map(file => 
        file.id === fileProgress.id 
          ? { 
              ...file, 
              status: 'error',
              errorMessage: error instanceof Error ? error.message : 'Upload failed'
            }
          : file
      ))
    } finally {
      abortControllersRef.current.delete(fileProgress.id)
    }
  }

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    // Validate files first
    const validatedFiles: UploadFileProgress[] = []
    const invalidFiles: { file: File; errors: string[] }[] = []

    for (const file of files) {
      try {
        const validationResult = await validateFile(file)
        
        if (validationResult.isValid) {
          validatedFiles.push({
            id: Math.random().toString(36).substring(2, 15),
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'queued',
            originalFile: file
          })
        } else {
          invalidFiles.push({
            file,
            errors: validationResult.errors || ['Validation failed']
          })
        }
      } catch (error) {
        invalidFiles.push({
          file,
          errors: [error instanceof Error ? error.message : 'Validation failed']
        })
      }
    }

    // Show validation errors for invalid files
    if (invalidFiles.length > 0) {
      console.warn('Some files failed validation:', invalidFiles)
      // TODO: Show toast notification or other user feedback
    }

    if (validatedFiles.length === 0) {
      return
    }

    // Add files to upload queue
    setUploadingFiles(prev => [...prev, ...validatedFiles])
    setUploadState('uploading')
    setIsExpanded(true) // Auto-expand when uploads start

    // Start uploading files sequentially
    for (const fileProgress of validatedFiles) {
      await uploadSingleFile(fileProgress)
    }

    // Update overall state when all uploads complete
    setUploadingFiles(prev => {
      const stillUploading = prev.some(file => 
        file.status === 'queued' || file.status === 'uploading' || file.status === 'processing'
      )
      
      if (!stillUploading) {
        const hasErrors = prev.some(file => file.status === 'error')
        setUploadState(hasErrors ? 'error' : 'completed')
        
        // Defer file list refresh to avoid setState during render
        setShouldRefreshFileList(true)
      }
      
      return prev
    })
  }, [organizationId, validateFile, onUploadComplete, onFileListRefresh])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clear all intervals
      progressIntervalsRef.current.forEach(interval => clearInterval(interval))
      progressIntervalsRef.current.clear()
      
      // Abort all requests
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  return {
    uploadFiles,
    uploadState,
    uploadingFiles,
    isExpanded,
    toggleExpanded,
    clearCompleted,
    retryFile,
    cancelFile,
    hasActiveUploads,
    totalFiles,
    completedFiles,
    failedFiles
  }
}
