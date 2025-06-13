import React, { useState } from 'react'
import { 
  FileText,
  FileType,
  FileSpreadsheet,
  FileImage,
  File,
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Trash2,
  Edit2,
  Calendar,
  Weight,
  Tag,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TagEditor from './TagEditor'
import type { FileData } from '@/types/file'

interface DocumentDetailsModalProps {
  file: FileData
  isOpen: boolean
  onClose: () => void
  onRetryAnalysis: () => void
  onDeleteDocument: () => void
  onUpdateTags: (tags: string[]) => void
  isRetrying?: boolean
  isDeleting?: boolean
  isUpdatingTags?: boolean
}

const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  file,
  isOpen,
  onClose,
  onRetryAnalysis,
  onDeleteDocument,
  onUpdateTags,
  isRetrying = false,
  isDeleting = false,
  isUpdatingTags = false,
}) => {
  const [isEditingTags, setIsEditingTags] = useState(false)

  const handleTagSave = (tags: string[]) => {
    onUpdateTags(tags)
    setIsEditingTags(false)
  }

  const handleTagCancel = () => {
    setIsEditingTags(false)
  }

  const getFileIcon = () => {
    const filename = file.originalFilename || file.title || ''
    const ext = filename.split('.').pop()?.toLowerCase()
    
    switch (ext) {
      case 'pdf':
        return <FileType className="w-6 h-6 text-red-500" />
      case 'doc':
      case 'docx':
        return <FileText className="w-6 h-6 text-blue-500" />
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-6 h-6 text-green-500" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <FileImage className="w-6 h-6 text-purple-500" />
      default:
        return <File className="w-6 h-6 text-muted-foreground" />
    }
  }

  const getStatusIcon = () => {
    switch (file.analysisStatus) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />
      case 'analyzing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (file.analysisStatus) {
      case 'pending':
        return 'Pending analysis'
      case 'analyzing':
        return 'Analyzing...'
      case 'completed':
        return 'Analysis complete'
      case 'failed':
        return 'Analysis failed'
      default:
        return 'No analysis'
    }
  }

  const getStatusBadgeVariant = () => {
    switch (file.analysisStatus) {
      case 'pending':
        return 'secondary'
      case 'analyzing':
        return 'default'
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const canRetry = file.analysisStatus === 'failed' || file.analysisStatus === 'pending'

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Unknown date'
    
    let dateObj: Date
    if (typeof date === 'string') {
      dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date'
      }
    } else if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        return 'Invalid date'
      }
      dateObj = date
    } else {
      return 'Unknown date'
    }
    
    const now = new Date()
    const diff = now.getTime() - dateObj.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {getFileIcon()}
            <h2 className="text-lg font-semibold truncate">{file.originalFilename || file.title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Analysis Status Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Analysis Status</h4>
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={onRetryAnalysis}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Retry
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <Badge variant={getStatusBadgeVariant()} className="text-xs">
                {getStatusText()}
              </Badge>
            </div>
          </div>

          {/* File Metadata */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">File Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Uploaded {formatDate(file.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Weight className="w-4 h-4" />
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Tags</h4>
              {!isEditingTags && !isUpdatingTags && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent"
                  onClick={() => setIsEditingTags(true)}
                  title="Edit tags"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {isEditingTags ? (
              <TagEditor
                tags={file.tags || []}
                onSave={handleTagSave}
                onCancel={handleTagCancel}
                isLoading={isUpdatingTags}
              />
            ) : (
              <>
                {file.tags && file.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {file.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs px-2 py-1"
                      >
                        {tag.name}
                        <span className="ml-1 text-xs opacity-70">
                          {Math.round(tag.confidence * 100)}%
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic py-3 text-center border border-dashed rounded-lg">
                    No tags assigned yet
                  </div>
                )}
              </>
            )}
          </div>

          {/* Summary Section */}
          {file.summary && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Summary</h4>
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 leading-relaxed border">
                {file.summary}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteDocument}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentDetailsModal
