import { useState, useCallback } from 'react'
import type { FileData } from '@/types/file'

interface UseDocumentActionsProps {
  organizationId: string
  onFileUpdate?: (fileId: string, updates: Partial<FileData>) => void
  onFileDelete?: (fileId: string) => void
  onRefreshFiles?: () => void
}

interface UseDocumentActionsReturn {
  retryAnalysis: (fileId: string) => Promise<void>
  deleteDocument: (fileId: string) => Promise<void>
  updateTags: (fileId: string, tags: string[]) => Promise<void>
  loadingStates: {
    retrying: Record<string, boolean>
    deleting: Record<string, boolean>
    updatingTags: Record<string, boolean>
  }
}

export function useDocumentActions({
  organizationId,
  onFileUpdate,
  onFileDelete,
  onRefreshFiles
}: UseDocumentActionsProps): UseDocumentActionsReturn {
  const [retryingDocs, setRetryingDocs] = useState<Record<string, boolean>>({})
  const [deletingDocs, setDeletingDocs] = useState<Record<string, boolean>>({})
  const [updatingTagsDocs, setUpdatingTagsDocs] = useState<Record<string, boolean>>({})

  const retryAnalysis = useCallback(async (fileId: string) => {
    setRetryingDocs(prev => ({ ...prev, [fileId]: true }))
    
    try {
      // Update status to analyzing optimistically
      onFileUpdate?.(fileId, { analysisStatus: 'analyzing' })

      const response = await fetch(`/api/documents/${fileId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to retry analysis')
      }

      // The analysis status will be updated by polling or refresh
      onRefreshFiles?.()
    } catch (error) {
      console.error('Failed to retry analysis:', error)
      // Revert status on error
      onFileUpdate?.(fileId, { analysisStatus: 'failed' })
      throw error
    } finally {
      setRetryingDocs(prev => ({ ...prev, [fileId]: false }))
    }
  }, [onFileUpdate, onRefreshFiles])

  const deleteDocument = useCallback(async (fileId: string) => {
    setDeletingDocs(prev => ({ ...prev, [fileId]: true }))
    
    try {
      const response = await fetch(`/api/documents/${fileId}?organizationId=${organizationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Only try to parse JSON if there's content
        let errorMessage = 'Failed to delete document'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } else {
            errorMessage = await response.text() || errorMessage
          }
        } catch (parseError) {
          // If we can't parse the error response, use the default message
          console.warn('Could not parse error response:', parseError)
        }
        throw new Error(errorMessage)
      }

      // Try to parse success response, but don't fail if it's empty
      try {
        const result = await response.json()
        console.log('Delete successful:', result.message)
      } catch (parseError) {
        // Success responses might be empty, that's OK
        console.log('Document deleted successfully (empty response)')
      }

      // Remove from local state
      onFileDelete?.(fileId)
      onRefreshFiles?.()
    } catch (error) {
      console.error('Failed to delete document:', error)
      throw error
    } finally {
      setDeletingDocs(prev => ({ ...prev, [fileId]: false }))
    }
  }, [organizationId, onFileDelete, onRefreshFiles])

  const updateTags = useCallback(async (fileId: string, tags: string[]) => {
    setUpdatingTagsDocs(prev => ({ ...prev, [fileId]: true }))
    
    try {
      const response = await fetch(`/api/documents/${fileId}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tags: tags.map(tag => ({ name: tag, confidence: 1.0 })) 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update tags')
      }

      const result = await response.json()
      
      // Update local state with new tags
      onFileUpdate?.(fileId, { 
        tags: result.tags || tags.map(tag => ({ name: tag, confidence: 1.0 }))
      })
      
      onRefreshFiles?.()
    } catch (error) {
      console.error('Failed to update tags:', error)
      throw error
    } finally {
      setUpdatingTagsDocs(prev => ({ ...prev, [fileId]: false }))
    }
  }, [onFileUpdate, onRefreshFiles])

  return {
    retryAnalysis,
    deleteDocument,
    updateTags,
    loadingStates: {
      retrying: retryingDocs,
      deleting: deletingDocs,
      updatingTags: updatingTagsDocs,
    },
  }
}
