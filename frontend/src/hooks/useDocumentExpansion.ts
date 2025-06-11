import { useState, useCallback } from 'react'

interface UseDocumentExpansionReturn {
  expandedDocs: Set<string>
  isExpanded: (fileId: string) => boolean
  toggleExpanded: (fileId: string) => void
  expandAll: () => void
  collapseAll: () => void
  setExpanded: (fileId: string, expanded: boolean) => void
}

export function useDocumentExpansion(): UseDocumentExpansionReturn {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())

  const isExpanded = useCallback((fileId: string) => {
    return expandedDocs.has(fileId)
  }, [expandedDocs])

  const toggleExpanded = useCallback((fileId: string) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }, [])

  const setExpanded = useCallback((fileId: string, expanded: boolean) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev)
      if (expanded) {
        newSet.add(fileId)
      } else {
        newSet.delete(fileId)
      }
      return newSet
    })
  }, [])

  const expandAll = useCallback(() => {
    // This would need the current file list to expand all
    // For now, we'll implement it when we have the file list context
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedDocs(new Set())
  }, [])

  return {
    expandedDocs,
    isExpanded,
    toggleExpanded,
    expandAll,
    collapseAll,
    setExpanded,
  }
}
