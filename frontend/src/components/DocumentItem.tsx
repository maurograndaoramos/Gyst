import React, { useState } from 'react'
import { 
  File, 
  FileText,
  FileType,
  FileSpreadsheet,
  FileImage,
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Trash2,
  Edit2,
  Calendar,
  Weight,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import TagEditor from './TagEditor'
import type { FileData } from '@/types/file'

interface DocumentItemProps {
  file: FileData
  isExpanded: boolean
  isSelected: boolean
  onToggleExpand: () => void
  onSelect: () => void
  onRetryAnalysis: () => void
  onDeleteDocument: () => void
  onUpdateTags: (tags: string[]) => void
  isRetrying?: boolean
  isDeleting?: boolean
  isUpdatingTags?: boolean
  className?: string
}

const DocumentItem: React.FC<DocumentItemProps> = ({
  file,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  onRetryAnalysis,
  onDeleteDocument,
  onUpdateTags,
  isRetrying = false,
  isDeleting = false,
  isUpdatingTags = false,
  className
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
        return <FileType className="w-4 h-4 text-red-500" />
      case 'doc':
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <FileImage className="w-4 h-4 text-purple-500" />
      default:
        return <File className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusIcon = () => {
    switch (file.analysisStatus) {
      case 'pending':
        return <Clock className="w-3 h-3 text-amber-500" />
      case 'analyzing':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />
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
    
    // Handle both Date objects and string dates from API
    let dateObj: Date
    if (typeof date === 'string') {
      dateObj = new Date(date)
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date'
      }
    } else if (date instanceof Date) {
      // Check if the date is valid
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

  return (
    <div className={cn(
      "group relative bg-white border border-border/40 rounded-lg transition-all duration-200 hover:shadow-sm",
      "hover:border-primary/30 hover:bg-accent/20",
      isSelected && "bg-primary/5 border-primary/50 shadow-sm",
      isDeleting && "opacity-50 pointer-events-none",
      className
    )}>
      {/* Clean, Minimal Header */}
      <div className="flex items-center gap-3 p-3">
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 shrink-0 hover:bg-accent/50"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </Button>

        {/* File Icon */}
        <div className="shrink-0">
          {getFileIcon()}
        </div>

        {/* File Info - Clean and Minimal */}
        <div className="flex-1 min-w-0">
          <button
            onClick={onSelect}
            className="text-left w-full group/filename"
          >
            <div className="font-medium text-sm text-foreground truncate group-hover/filename:text-primary transition-colors">
              {file.originalFilename || file.title}
            </div>
          </button>
          
          {/* Only show upload date when collapsed */}
          {!isExpanded && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDate(file.createdAt)}
            </div>
          )}
        </div>

        {/* Compact Tag Preview (when collapsed) */}
        {!isExpanded && file.tags && file.tags.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {file.tags.length}
            </span>
          </div>
        )}

        {/* Delete Button - Always Visible on Hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDeleteDocument}
            disabled={isDeleting}
            title="Delete document"
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content - All Details Here */}
      {isExpanded && (
        <div className="border-t border-border/30 bg-accent/10">
          <div className="p-4 space-y-4">
            
            {/* Analysis Status Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Analysis Status</h4>
                {canRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onRetryAnalysis}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <Badge variant={getStatusBadgeVariant()} className="text-xs">
                  {getStatusText()}
                </Badge>
              </div>
            </div>

            {/* File Metadata */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">File Details</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Uploaded {formatDate(file.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Weight className="w-3 h-3" />
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
                    className="h-6 w-6 p-0 hover:bg-accent"
                    onClick={() => setIsEditingTags(true)}
                    title="Edit tags"
                  >
                    <Edit2 className="w-3 h-3" />
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
                    <div className="text-xs text-muted-foreground italic py-2">
                      No tags assigned yet
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Summary Section */}
            {file.summary && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Summary</h4>
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 leading-relaxed border">
                  {file.summary.length > 300 
                    ? `${file.summary.substring(0, 300)}...` 
                    : file.summary
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentItem
