import React, { useState } from 'react'
import { 
  File, 
  FileText,
  FileType,
  FileSpreadsheet,
  FileImage,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import DocumentDetailsModal from './DocumentDetailsModal'
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
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  return (
    <>
      <div className={cn(
        "group relative bg-white border border-border/40 rounded-lg transition-all duration-200 hover:shadow-sm",
        "hover:border-primary/30 hover:bg-accent/20",
        isSelected && "bg-primary/5 border-primary/50 shadow-sm",
        isDeleting && "opacity-50 pointer-events-none",
        className
      )}>
        {/* Compact Layout - Only File Icon, Name, and Eye Button */}
        <div className="flex items-center gap-3 p-3">
          {/* File Icon */}
          <div className="shrink-0">
            {getFileIcon()}
          </div>

          {/* File Name - Clickable to Select */}
          <div className="flex-1 min-w-0">
            <button
              onClick={onSelect}
              className="text-left w-full group/filename"
            >
              <div className="font-medium text-sm text-foreground truncate group-hover/filename:text-primary transition-colors">
                {file.originalFilename || file.title}
              </div>
            </button>
          </div>

          {/* Eye Button - Visible on Hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => setIsModalOpen(true)}
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <DocumentDetailsModal
        file={file}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRetryAnalysis={onRetryAnalysis}
        onDeleteDocument={onDeleteDocument}
        onUpdateTags={onUpdateTags}
        isRetrying={isRetrying}
        isDeleting={isDeleting}
        isUpdatingTags={isUpdatingTags}
      />
    </>
  )
}

export default DocumentItem
