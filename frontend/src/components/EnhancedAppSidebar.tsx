import * as React from "react"
import { File, Search, X, Tag, Upload, FolderOpen, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, RotateCcw } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import DocumentItem from "./DocumentItem"
import DeleteConfirmationModal from "./DeleteConfirmationModal"
import { useDocumentActions } from "@/hooks/useDocumentActions"
import { useDocumentExpansion } from "@/hooks/useDocumentExpansion"
import { useEnhancedUpload, type UploadFileProgress } from "@/hooks/useEnhancedUpload"
import type { FileData } from "@/types/file"

interface TagData {
  id: string
  name: string
  count: number
  createdAt: Date
  updatedAt: Date
}

interface EnhancedAppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  organizationId: string
  files: FileData[]
  onFileSelect: (file: FileData) => void
  onFilesReorder?: (files: FileData[]) => void
  onFileListRefresh?: () => void
  loading: boolean
  isAdmin?: boolean
}

export function EnhancedAppSidebar({ 
  organizationId, 
  files, 
  onFileSelect, 
  onFilesReorder, 
  onFileListRefresh,
  loading, 
  isAdmin = false, 
  ...props 
}: EnhancedAppSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [tagSearchQuery, setTagSearchQuery] = React.useState("")
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])
  const [filterLogic, setFilterLogic] = React.useState<"AND" | "OR">("OR")
  const [sortBy, setSortBy] = React.useState<"count" | "name">("count")
  const [selectedFile, setSelectedFile] = React.useState<string>("")
  const [searchResults, setSearchResults] = React.useState<FileData[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [tags, setTags] = React.useState<TagData[]>([])
  const [tagsLoading, setTagsLoading] = React.useState(false)
  const [localFiles, setLocalFiles] = React.useState<FileData[]>(files)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [fileToDelete, setFileToDelete] = React.useState<FileData | null>(null)
  const [isTagsSectionCollapsed, setIsTagsSectionCollapsed] = React.useState(false)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const debouncedSearch = useDebounce(searchQuery, 300)
  const debouncedTagSearch = useDebounce(tagSearchQuery, 300)

  // Enhanced upload functionality
  const {
    uploadFiles,
    uploadState,
    uploadingFiles,
    isExpanded: isUploadExpanded,
    toggleExpanded: toggleUploadExpanded,
    clearCompleted,
    retryFile,
    cancelFile,
    hasActiveUploads,
    totalFiles: totalUploadFiles,
    completedFiles,
    failedFiles
  } = useEnhancedUpload({
    organizationId,
    onFileListRefresh: onFileListRefresh
  })

  // Document expansion state
  const { isExpanded, toggleExpanded } = useDocumentExpansion()

  // Document actions
  const {
    retryAnalysis,
    deleteDocument,
    updateTags,
    loadingStates
  } = useDocumentActions({
    organizationId,
    onFileUpdate: (fileId, updates) => {
      setLocalFiles(prev => prev.map(file => 
        file.id === fileId ? { ...file, ...updates } : file
      ))
    },
    onFileDelete: (fileId) => {
      setLocalFiles(prev => prev.filter(file => file.id !== fileId))
    },
    onRefreshFiles: () => {
      // This would trigger a refresh from the parent component
      console.log('Refresh files requested')
    }
  })

  // Update local files when props change
  React.useEffect(() => {
    setLocalFiles(files)
  }, [files])

  // Perform search with API when there's a query
  React.useEffect(() => {
    if (debouncedSearch && organizationId) {
      performSearch(debouncedSearch)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
  }, [debouncedSearch, organizationId])

  const performSearch = async (query: string) => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&organizationId=${organizationId}&highlight=true`)
      if (response.ok) {
        const searchResponse = await response.json()
        setSearchResults(searchResponse.results)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Filter local files for display when no search query
  const displayFiles = React.useMemo(() => {
    if (debouncedSearch) return searchResults || []
    return localFiles || []
  }, [debouncedSearch, searchResults, localFiles])

  // Fetch tags when organizationId changes
  React.useEffect(() => {
    if (organizationId) {
      fetchTags()
    }
  }, [organizationId])

  const fetchTags = async () => {
    setTagsLoading(true)
    try {
      const response = await fetch(`/api/tags?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setTags(data.data?.tags || [])
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    } finally {
      setTagsLoading(false)
    }
  }

  // Sort tags based on selected option
  const sortedTags = React.useMemo(() => {
    return [...tags].sort((a, b) => {
      if (sortBy === "count") {
        return b.count - a.count
      }
      return a.name.localeCompare(b.name)
    })
  }, [tags, sortBy])

  // Get tag color based on frequency
  const getTagColor = (count: number) => {
    if (count >= 10) return "default"
    if (count >= 5) return "secondary"
    return "outline"
  }

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  // Clear all selected tags
  const clearTags = () => {
    setSelectedTags([])
  }

  // Filter tags based on search query
  const filteredTags = React.useMemo(() => {
    return sortedTags.filter(tag => 
      tag.name.toLowerCase().includes(debouncedTagSearch.toLowerCase())
    )
  }, [sortedTags, debouncedTagSearch])

  // Clear tag search
  const clearTagSearch = () => {
    setTagSearchQuery("")
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery("")
  }

  const handleFileSelect = (file: FileData) => {
    setSelectedFile(file.id)
    onFileSelect(file)
  }

  const handleRetryAnalysis = async (fileId: string) => {
    try {
      await retryAnalysis(fileId)
    } catch (error) {
      console.error('Failed to retry analysis:', error)
    }
  }

  const handleDeleteDocument = (file: FileData) => {
    setFileToDelete(file)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!fileToDelete) return
    
    try {
      await deleteDocument(fileToDelete.id)
      setDeleteModalOpen(false)
      setFileToDelete(null)
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  const handleUpdateTags = async (fileId: string, tags: string[]) => {
    try {
      await updateTags(fileId, tags)
    } catch (error) {
      console.error('Failed to update tags:', error)
    }
  }

  // Enhanced upload handlers
  const handleEnhancedUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      await uploadFiles(files)
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only hide overlay if leaving the sidebar container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (!isAdmin) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await uploadFiles(files)
    }
  }

  // Get status icon for upload progress
  const getStatusIcon = (status: UploadFileProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />
      case 'uploading':
      case 'processing':
        return <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      default:
        return <AlertCircle className="w-3 h-3 text-gray-400" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <>
      <Sidebar 
        {...props} 
        className="border-r border-border/50 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <SidebarContent className="bg-background">
          {/* Drag & Drop Overlay */}
          {isDragOver && isAdmin && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Upload className="w-8 h-8 mx-auto text-primary" />
                <p className="text-sm font-medium text-primary">Drop files to upload</p>
                <p className="text-xs text-primary/70">Supports: PDF, TXT, MD, DOCX</p>
              </div>
            </div>
          )}
          {/* Modern Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/30 bg-accent/5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <img src="/gyst-remake-flip.png" alt="GYST" className="h-5 w-5" />
              </div>
              <h1 className="font-semibold text-lg text-foreground">GYST</h1>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                {/* Enhanced Upload Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 hover:bg-primary/10 flex items-center gap-1 ${
                    hasActiveUploads ? 'text-primary' : ''
                  }`}
                  onClick={handleEnhancedUpload}
                  title="Upload files"
                >
                  <Upload className="h-4 w-4" />
                  {hasActiveUploads && (
                    <>
                      <span className="text-xs">
                        {completedFiles}/{totalUploadFiles}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleUploadExpanded()
                        }}
                      >
                        {isUploadExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    </>
                  )}
                </Button>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.pdf,.docx"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            )}
          </div>

          {/* Upload Progress Section - Expandable */}
          {totalUploadFiles > 0 && (
            <Collapsible open={isUploadExpanded} onOpenChange={toggleUploadExpanded}>
              <CollapsibleContent>
                <div className="border-b border-border/30 bg-accent/5">
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Upload Progress ({completedFiles}/{totalUploadFiles})
                      </span>
                      {completedFiles > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={clearCompleted}
                        >
                          Clear Completed
                        </Button>
                      )}
                    </div>
                    
                    {/* Upload File List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uploadingFiles.map((file) => (
                        <div key={file.id} className="bg-background rounded-md p-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {getStatusIcon(file.status)}
                              <span className="text-xs font-medium truncate" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </span>
                              {file.status === 'error' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0"
                                  onClick={() => retryFile(file.id)}
                                  title="Retry upload"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                              {(file.status === 'queued' || file.status === 'uploading') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0"
                                  onClick={() => cancelFile(file.id)}
                                  title="Cancel upload"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          {file.status === 'uploading' && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          )}
                          
                          {/* Status Text */}
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${
                              file.status === 'completed' ? 'text-green-600' :
                              file.status === 'error' ? 'text-red-600' :
                              file.status === 'uploading' ? 'text-blue-600' :
                              'text-gray-500'
                            }`}>
                              {file.status === 'completed' && 'Upload completed'}
                              {file.status === 'error' && 'Upload failed'}
                              {file.status === 'uploading' && `Uploading... ${file.progress}%`}
                              {file.status === 'processing' && 'Processing...'}
                              {file.status === 'queued' && 'Queued'}
                            </span>
                            {file.status === 'uploading' && (
                              <span className="text-muted-foreground">
                                {file.progress}%
                              </span>
                            )}
                          </div>
                          
                          {/* Error Message */}
                          {file.status === 'error' && file.errorMessage && (
                            <div className="text-xs text-red-600 bg-red-50 p-1.5 rounded border">
                              {file.errorMessage}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Tag Filter Section - Collapsible */}
          <SidebarGroup>
            <Collapsible open={!isTagsSectionCollapsed} onOpenChange={setIsTagsSectionCollapsed}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded px-2 py-1 mx-2">
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-medium">Tags</span>
                    {selectedTags.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {selectedTags.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isTagsSectionCollapsed ? '-rotate-90' : ''}`} />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <SidebarGroupContent>
                  <div className="px-4 py-3 space-y-3">
                    {/* Tag Search Input */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search tags..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="pl-8 pr-8 h-8 text-sm border-border/50 focus:border-primary/50"
                      />
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      {tagSearchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                          onClick={clearTagSearch}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Tag Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Select value={filterLogic} onValueChange={(value: "AND" | "OR") => setFilterLogic(value)}>
                          <SelectTrigger className="h-7 w-[70px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={(value: "count" | "name") => setSortBy(value)}>
                          <SelectTrigger className="h-7 w-[80px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTags.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={clearTags}
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    {/* Tags Grid */}
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredTags.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1">
                          {filteredTags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant={selectedTags.includes(tag.id) ? "default" : getTagColor(tag.count)}
                              className="cursor-pointer flex items-center justify-between hover:shadow-sm transition-all h-8 px-3"
                              onClick={() => toggleTag(tag.id)}
                            >
                              <span className="text-xs font-medium truncate">{tag.name}</span>
                              <span className="ml-2 text-xs opacity-75 bg-black/10 px-1.5 py-0.5 rounded">
                                {tag.count}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          {tags.length === 0 ? (
                            <div className="space-y-2">
                              <Tag className="w-8 h-8 mx-auto text-muted-foreground/50" />
                              <p className="text-sm font-medium text-muted-foreground">No tags yet</p>
                              <p className="text-xs text-muted-foreground/70">Upload files to see tags</p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No tags found</p>
                          )}
                        </div>
                      )}
                      {tagsLoading && (
                        <div className="text-sm text-muted-foreground py-4 text-center">
                          Loading tags...
                        </div>
                      )}
                    </div>
                  </div>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          {/* Documents Section */}
          <SidebarGroup className="flex-1">
            <SidebarGroupLabel className="flex items-center justify-between px-4 py-2">
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                <span className="font-medium">Documents</span>
                {displayFiles.length > 0 && (
                  <Badge variant="outline" className="h-5 px-1.5 text-xs">
                    {displayFiles.length}
                  </Badge>
                )}
              </span>
            </SidebarGroupLabel>
            
            <SidebarGroupContent className="flex-1">
              {/* File Search Input */}
              <div className="px-4 py-3 border-b border-border/30">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-8 h-9 border-border/50 focus:border-primary/50"
                  />
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                      onClick={clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* File List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Loading documents...</p>
                    </div>
                  </div>
                ) : isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Searching...</p>
                    </div>
                  </div>
                ) : displayFiles.length > 0 ? (
                  <div className="p-3 space-y-2">
                    {displayFiles.map((file) => (
                      <DocumentItem
                        key={file.id}
                        file={file}
                        isExpanded={isExpanded(file.id)}
                        isSelected={file.id === selectedFile}
                        onToggleExpand={() => toggleExpanded(file.id)}
                        onSelect={() => handleFileSelect(file)}
                        onRetryAnalysis={() => handleRetryAnalysis(file.id)}
                        onDeleteDocument={() => handleDeleteDocument(file)}
                        onUpdateTags={(tags) => handleUpdateTags(file.id, tags)}
                        isRetrying={loadingStates.retrying[file.id]}
                        isDeleting={loadingStates.deleting[file.id]}
                        isUpdatingTags={loadingStates.updatingTags[file.id]}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3 max-w-[200px]">
                      <File className="w-12 h-12 mx-auto text-muted-foreground/30" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {debouncedSearch ? 'No results found' : 'No documents yet'}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {debouncedSearch 
                            ? 'Try adjusting your search terms' 
                            : 'Upload your first document to get started'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setFileToDelete(null)
        }}
        onConfirm={confirmDelete}
        isDeleting={fileToDelete ? loadingStates.deleting[fileToDelete.id] : false}
        fileName={fileToDelete?.originalFilename || fileToDelete?.title || ''}
      />
    </>
  )
}
