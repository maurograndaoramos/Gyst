import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { MentionState, MentionSearchResult, AttachedDocument, Mention } from '@/types/mentions';

interface UseMentionsProps {
  organizationId: string;
  maxAttachments?: number;
  onAttachmentsChange?: (attachments: AttachedDocument[]) => void;
}

export function useMentions({ 
  organizationId, 
  maxAttachments = 5, 
  onAttachmentsChange 
}: UseMentionsProps) {
  const [state, setState] = useState<MentionState>({
    isOpen: false,
    query: '',
    position: null,
    selectedIndex: 0,
    results: { documents: [], tags: [] },
    attachedDocuments: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(state.query, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Search for documents and tags
  const searchMentions = useCallback(async (query: string): Promise<MentionSearchResult> => {
    if (!query.trim()) {
      return { documents: [], tags: [] };
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/chat/documents-search?q=${encodeURIComponent(query)}&organizationId=${organizationId}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, return empty results
        return { documents: [], tags: [] };
      }
      console.error('Mention search error:', error);
      return { documents: [], tags: [] };
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [organizationId]);

  // Effect to search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && state.isOpen) {
      searchMentions(debouncedQuery).then(results => {
        setState(prev => ({
          ...prev,
          results,
          selectedIndex: 0
        }));
      });
    }
  }, [debouncedQuery, state.isOpen, searchMentions]);

  // Get all available mentions (documents + tags)
  const getAllMentions = useCallback((): Mention[] => {
    return [...state.results.documents, ...state.results.tags];
  }, [state.results]);

  // Open mention dropdown
  const openMentions = useCallback((position: { top: number; left: number }, query: string = '') => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      position,
      query,
      selectedIndex: 0,
      results: { documents: [], tags: [] }
    }));

    // If there's an initial query, search immediately
    if (query) {
      searchMentions(query).then(results => {
        setState(prev => ({
          ...prev,
          results,
          selectedIndex: 0
        }));
      });
    }
  }, [searchMentions]);

  // Close mention dropdown
  const closeMentions = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      query: '',
      position: null,
      selectedIndex: 0,
      results: { documents: [], tags: [] }
    }));

    // Cancel any pending search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Update search query
  const updateQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      query,
      selectedIndex: 0
    }));
  }, []);

  // Navigate selection
  const navigateSelection = useCallback((direction: 'up' | 'down') => {
    const allMentions = getAllMentions();
    if (allMentions.length === 0) return;

    setState(prev => {
      let newIndex = prev.selectedIndex;
      if (direction === 'down') {
        newIndex = (newIndex + 1) % allMentions.length;
      } else {
        newIndex = newIndex <= 0 ? allMentions.length - 1 : newIndex - 1;
      }
      return { ...prev, selectedIndex: newIndex };
    });
  }, [getAllMentions]);

  // Get documents by tag
  const getDocumentsByTag = useCallback(async (tagId: string): Promise<AttachedDocument[]> => {
    try {
      const response = await fetch(`/api/chat/documents-by-tag?tagId=${tagId}&organizationId=${organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch documents by tag');
      
      const documents = await response.json();
      return documents.map((doc: any) => ({
        id: doc.id,
        name: doc.originalFilename || doc.title,
        filePath: doc.filePath,
        source: 'tag' as const,
        tagName: state.results.tags.find(t => t.id === tagId)?.name
      }));
    } catch (error) {
      console.error('Error fetching documents by tag:', error);
      return [];
    }
  }, [organizationId, state.results.tags]);

  // Select a mention - now returns the selected mention info for inline insertion
  const selectMention = useCallback(async (mention?: Mention): Promise<{ selectedMention: Mention; newAttachments: AttachedDocument[] } | null> => {
    const allMentions = getAllMentions();
    const selectedMention = mention || allMentions[state.selectedIndex];
    
    if (!selectedMention || state.attachedDocuments.length >= maxAttachments) {
      closeMentions();
      return null;
    }

    let newAttachments: AttachedDocument[] = [];

    if (selectedMention.type === 'document') {
      // Check if document is already attached
      const isAlreadyAttached = state.attachedDocuments.some(doc => doc.id === selectedMention.id);
      if (!isAlreadyAttached) {
        newAttachments = [{
          id: selectedMention.id,
          name: selectedMention.name,
          filePath: selectedMention.filePath,
          source: 'document'
        }];
      }
    } else if (selectedMention.type === 'tag') {
      // Get all documents with this tag
      const tagDocuments = await getDocumentsByTag(selectedMention.id);
      
      // Filter out already attached documents and respect max limit
      const availableSlots = maxAttachments - state.attachedDocuments.length;
      newAttachments = tagDocuments
        .filter(doc => !state.attachedDocuments.some(attached => attached.id === doc.id))
        .slice(0, availableSlots);
    }

    if (newAttachments.length > 0) {
      const updatedAttachments = [...state.attachedDocuments, ...newAttachments];
      setState(prev => ({
        ...prev,
        attachedDocuments: updatedAttachments
      }));
      onAttachmentsChange?.(updatedAttachments);
    }

    closeMentions();
    return { selectedMention, newAttachments };
  }, [getAllMentions, state.selectedIndex, state.attachedDocuments, maxAttachments, closeMentions, getDocumentsByTag, onAttachmentsChange]);

  // Remove attachment
  const removeAttachment = useCallback((documentId: string) => {
    const updatedAttachments = state.attachedDocuments.filter(doc => doc.id !== documentId);
    setState(prev => ({
      ...prev,
      attachedDocuments: updatedAttachments
    }));
    onAttachmentsChange?.(updatedAttachments);
  }, [state.attachedDocuments, onAttachmentsChange]);

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    setState(prev => ({
      ...prev,
      attachedDocuments: []
    }));
    onAttachmentsChange?.([]);
  }, [onAttachmentsChange]);

  // Get selected mention
  const getSelectedMention = useCallback((): Mention | null => {
    const allMentions = getAllMentions();
    return allMentions[state.selectedIndex] || null;
  }, [getAllMentions, state.selectedIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    isOpen: state.isOpen,
    query: state.query,
    position: state.position,
    selectedIndex: state.selectedIndex,
    results: state.results,
    attachedDocuments: state.attachedDocuments,
    isLoading,
    
    // Actions
    openMentions,
    closeMentions,
    updateQuery,
    navigateSelection,
    selectMention,
    removeAttachment,
    clearAttachments,
    
    // Utilities
    getAllMentions,
    getSelectedMention,
    hasAttachments: state.attachedDocuments.length > 0,
    canAttachMore: state.attachedDocuments.length < maxAttachments,
    attachmentCount: state.attachedDocuments.length,
    maxAttachments
  };
}

export type UseMentionsReturn = ReturnType<typeof useMentions>;
