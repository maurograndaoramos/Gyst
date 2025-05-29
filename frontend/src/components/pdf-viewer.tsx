"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Document, Page } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card } from '@/components/ui/card'
import { usePDFViewer, type UsePDFViewerOptions } from '@/hooks/use-pdf-viewer'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Printer,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import required CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

export interface PDFViewerProps {
  fileUrl: string
  className?: string
  initialPage?: number
  initialZoom?: number
  enableSearch?: boolean
  enablePrint?: boolean
  onPageChange?: (page: number) => void
  onZoomChange?: (zoom: number) => void
  onError?: (error: Error) => void
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5]

export function PDFViewer({
  fileUrl,
  className,
  initialPage = 1,
  initialZoom = 1,
  enableSearch = true,
  enablePrint = true,
  onPageChange,
  onZoomChange,
  onError
}: PDFViewerProps) {
  const [pageWidth, setPageWidth] = useState<number>(0)
  const [showSearch, setShowSearch] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const pdfViewer = usePDFViewer({
    initialPage,
    initialZoom,
    onPageChange,
    onZoomChange,
    onError
  })

  const {
    numPages,
    pageNumber,
    scale,
    zoomMode,
    isLoading,
    error,
    searchText,
    searchResults,
    currentSearchIndex,
    loadingProgress,
    containerRef,
    onDocumentLoadSuccess,
    onDocumentLoadError,
    onLoadProgress,
    goToPage,
    goToPreviousPage,
    goToNextPage,
    setZoom,
    zoomIn,
    zoomOut,
    fitToWidth,
    fitToPage,
    search,
    goToNextSearchResult,
    goToPreviousSearchResult,
    clearSearch,
    print
  } = pdfViewer

  // Calculate scale based on zoom mode
  const calculateScale = () => {
    if (!pageRef.current || zoomMode === 'custom') return scale

    const container = containerRef.current
    if (!container) return scale

    const containerWidth = container.clientWidth - 32 // Account for padding
    const containerHeight = container.clientHeight - 200 // Account for toolbar

    if (zoomMode === 'fit-width') {
      return pageWidth > 0 ? containerWidth / pageWidth : 1
    } else if (zoomMode === 'fit-page') {
      // This is approximated - in a real implementation you'd get the page height
      return Math.min(containerWidth / pageWidth, containerHeight / (pageWidth * 1.414))
    }

    return scale
  }

  const currentScale = calculateScale()

  // Handle page input change
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value)
    if (!isNaN(page)) {
      goToPage(page)
    }
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchText.trim()) {
      search(searchText)
    }
  }

  // Handle zoom slider change
  const handleZoomSliderChange = (value: number[]) => {
    setZoom(value[0])
  }

  // Toggle search visibility
  const toggleSearch = () => {
    setShowSearch(!showSearch)
    if (!showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      clearSearch()
    }
  }

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault()
        toggleSearch()
      } else if (event.key === 'Escape' && showSearch) {
        toggleSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSearch])

  // Handle page load success to get dimensions
  const handlePageLoadSuccess = (page: any) => {
    const viewport = page.getViewport({ scale: 1 })
    setPageWidth(viewport.width)
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("w-full h-96 flex items-center justify-center", className)}>
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Failed to load PDF</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn("w-full h-full flex flex-col bg-background", className)}>
        {/* Toolbar */}
        <div className="border-b bg-muted/30 p-2">
          <div className="flex items-center justify-between gap-2">
            {/* Left side - Navigation */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous page</TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-1 text-sm">
                <Input
                  type="number"
                  min={1}
                  max={numPages || 1}
                  value={pageNumber}
                  onChange={handlePageInputChange}
                  className="w-16 h-8 text-center"
                />
                <span className="text-muted-foreground">
                  of {numPages || 0}
                </span>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!numPages || pageNumber >= numPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next page</TooltipContent>
              </Tooltip>
            </div>

            {/* Center - Zoom controls */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>

              <Slider
                value={[scale]}
                onValueChange={handleZoomSliderChange}
                max={5}
                min={0.1}
                step={0.1}
                className="w-24"
              />

              <span className="text-xs text-muted-foreground min-w-[3rem]">
                {Math.round(currentScale * 100)}%
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={fitToWidth}>
                    <Maximize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit to width</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={fitToPage}>
                    <Minimize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit to page</TooltipContent>
              </Tooltip>
            </div>

            {/* Right side - Additional controls */}
            <div className="flex items-center gap-2">
              {enableSearch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showSearch ? "default" : "ghost"}
                      size="sm"
                      onClick={toggleSearch}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search (Ctrl+F)</TooltipContent>
                </Tooltip>
              )}

              {enablePrint && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={print}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Print (Ctrl+P)</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="mt-2 p-2 bg-background border rounded-lg">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search in document..."
                  value={searchText}
                  onChange={(e) => search(e.target.value)}
                  className="flex-1"
                />
                
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {currentSearchIndex + 1} of {searchResults.length}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousSearchResult}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={goToNextSearchResult}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}

          {/* Loading progress */}
          {isLoading && (
            <div className="mt-2">
              <Progress value={loadingProgress} className="h-1" />
            </div>
          )}
        </div>

        {/* PDF Content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4"
        >
          <div className="flex justify-center">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              onLoadProgress={onLoadProgress}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading PDF...</p>
                  </div>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-8">
                  <div className="text-center space-y-2">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                    <p className="text-sm text-muted-foreground">Failed to load PDF</p>
                  </div>
                </div>
              }
            >
              <div ref={pageRef}>
                <Page
                  pageNumber={pageNumber}
                  scale={currentScale}
                  onLoadSuccess={handlePageLoadSuccess}
                  className="shadow-lg"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </div>
            </Document>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default PDFViewer
