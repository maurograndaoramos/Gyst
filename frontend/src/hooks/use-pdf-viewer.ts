"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { pdfjs } from 'react-pdf'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export type ZoomMode = 'fit-width' | 'fit-page' | 'custom'

export interface PDFViewerState {
  numPages: number | null
  pageNumber: number
  scale: number
  zoomMode: ZoomMode
  isLoading: boolean
  error: string | null
  searchText: string
  searchResults: any[]
  currentSearchIndex: number
  loadingProgress: number
}

export interface UsePDFViewerOptions {
  initialPage?: number
  initialZoom?: number
  initialZoomMode?: ZoomMode
  onPageChange?: (page: number) => void
  onZoomChange?: (zoom: number) => void
  onError?: (error: Error) => void
}

export function usePDFViewer(options: UsePDFViewerOptions = {}) {
  const {
    initialPage = 1,
    initialZoom = 1,
    initialZoomMode = 'fit-width',
    onPageChange,
    onZoomChange,
    onError
  } = options

  const [state, setState] = useState<PDFViewerState>({
    numPages: null,
    pageNumber: initialPage,
    scale: initialZoom,
    zoomMode: initialZoomMode,
    isLoading: false,
    error: null,
    searchText: '',
    searchResults: [],
    currentSearchIndex: -1,
    loadingProgress: 0
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const documentRef = useRef<any>(null)

  // Document load success handler
  const onDocumentLoadSuccess = useCallback((pdf: any) => {
    setState(prev => ({
      ...prev,
      numPages: pdf.numPages,
      isLoading: false,
      error: null,
      loadingProgress: 100
    }))
    documentRef.current = pdf
  }, [])

  // Document load error handler
  const onDocumentLoadError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: error.message,
      loadingProgress: 0
    }))
    onError?.(error)
  }, [onError])

  // Loading progress handler
  const onLoadProgress = useCallback(({ loaded, total }: { loaded: number; total: number }) => {
    const progress = total > 0 ? (loaded / total) * 100 : 0
    setState(prev => ({
      ...prev,
      loadingProgress: progress
    }))
  }, [])

  // Page navigation
  const goToPage = useCallback((page: number) => {
    if (!state.numPages || page < 1 || page > state.numPages) return
    
    setState(prev => ({ ...prev, pageNumber: page }))
    onPageChange?.(page)
  }, [state.numPages, onPageChange])

  const goToPreviousPage = useCallback(() => {
    goToPage(state.pageNumber - 1)
  }, [goToPage, state.pageNumber])

  const goToNextPage = useCallback(() => {
    goToPage(state.pageNumber + 1)
  }, [goToPage, state.pageNumber])

  // Zoom controls
  const setZoom = useCallback((scale: number, mode: ZoomMode = 'custom') => {
    setState(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, scale)),
      zoomMode: mode
    }))
    onZoomChange?.(scale)
  }, [onZoomChange])

  const zoomIn = useCallback(() => {
    setZoom(state.scale * 1.2)
  }, [setZoom, state.scale])

  const zoomOut = useCallback(() => {
    setZoom(state.scale / 1.2)
  }, [setZoom, state.scale])

  const fitToWidth = useCallback(() => {
    setZoom(1, 'fit-width')
  }, [setZoom])

  const fitToPage = useCallback(() => {
    setZoom(1, 'fit-page')
  }, [setZoom])

  // Search functionality
  const search = useCallback(async (text: string) => {
    if (!documentRef.current || !text.trim()) {
      setState(prev => ({
        ...prev,
        searchText: text,
        searchResults: [],
        currentSearchIndex: -1
      }))
      return
    }

    setState(prev => ({ ...prev, searchText: text }))

    try {
      const results: any[] = []
      
      // Search through all pages
      for (let pageNum = 1; pageNum <= (state.numPages || 0); pageNum++) {
        const page = await documentRef.current.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .toLowerCase()

        const searchLower = text.toLowerCase()
        let index = 0
        
        while ((index = pageText.indexOf(searchLower, index)) !== -1) {
          results.push({
            pageNumber: pageNum,
            text: text,
            index: index
          })
          index += searchLower.length
        }
      }

      setState(prev => ({
        ...prev,
        searchResults: results,
        currentSearchIndex: results.length > 0 ? 0 : -1
      }))

      // Navigate to first result
      if (results.length > 0) {
        goToPage(results[0].pageNumber)
      }
    } catch (error) {
      console.error('Search error:', error)
    }
  }, [state.numPages, goToPage])

  const goToNextSearchResult = useCallback(() => {
    if (state.searchResults.length === 0) return
    
    const nextIndex = (state.currentSearchIndex + 1) % state.searchResults.length
    setState(prev => ({ ...prev, currentSearchIndex: nextIndex }))
    goToPage(state.searchResults[nextIndex].pageNumber)
  }, [state.searchResults, state.currentSearchIndex, goToPage])

  const goToPreviousSearchResult = useCallback(() => {
    if (state.searchResults.length === 0) return
    
    const prevIndex = state.currentSearchIndex === 0 
      ? state.searchResults.length - 1 
      : state.currentSearchIndex - 1
    setState(prev => ({ ...prev, currentSearchIndex: prevIndex }))
    goToPage(state.searchResults[prevIndex].pageNumber)
  }, [state.searchResults, state.currentSearchIndex, goToPage])

  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchText: '',
      searchResults: [],
      currentSearchIndex: -1
    }))
  }, [])

  // Print functionality
  const print = useCallback(() => {
    window.print()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'f':
            event.preventDefault()
            // Focus search input - will be handled by parent component
            break
          case 'p':
            event.preventDefault()
            print()
            break
          case '=':
          case '+':
            event.preventDefault()
            zoomIn()
            break
          case '-':
            event.preventDefault()
            zoomOut()
            break
        }
      } else {
        switch (event.key) {
          case 'ArrowLeft':
          case 'PageUp':
            event.preventDefault()
            goToPreviousPage()
            break
          case 'ArrowRight':
          case 'PageDown':
            event.preventDefault()
            goToNextPage()
            break
          case 'Home':
            event.preventDefault()
            goToPage(1)
            break
          case 'End':
            event.preventDefault()
            if (state.numPages) goToPage(state.numPages)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.numPages, goToPreviousPage, goToNextPage, goToPage, zoomIn, zoomOut, print])

  return {
    // State
    ...state,
    
    // Refs
    containerRef,
    
    // Event handlers
    onDocumentLoadSuccess,
    onDocumentLoadError,
    onLoadProgress,
    
    // Navigation
    goToPage,
    goToPreviousPage,
    goToNextPage,
    
    // Zoom
    setZoom,
    zoomIn,
    zoomOut,
    fitToWidth,
    fitToPage,
    
    // Search
    search,
    goToNextSearchResult,
    goToPreviousSearchResult,
    clearSearch,
    
    // Other
    print
  }
}
