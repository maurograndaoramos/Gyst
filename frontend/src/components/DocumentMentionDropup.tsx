import React, { useEffect, useRef } from 'react';
import { FileText, Hash, Loader2 } from 'lucide-react';
import { Mention } from '@/types/mentions';

interface DocumentMentionDropupProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  mentions: Mention[];
  selectedIndex: number;
  isLoading: boolean;
  query: string;
  onSelect: (mention: Mention) => void;
  onClose: () => void;
}

export const DocumentMentionDropup: React.FC<DocumentMentionDropupProps> = ({
  isOpen,
  position,
  mentions,
  selectedIndex,
  isLoading,
  query,
  onSelect,
  onClose
}) => {
  const dropupRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropupRef.current && !dropupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (isOpen && dropupRef.current) {
      const selectedElement = dropupRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, selectedIndex]);

  if (!isOpen || !position) {
    return null;
  }

  const documents = mentions.filter(m => m.type === 'document');
  const tags = mentions.filter(m => m.type === 'tag');
  const hasResults = documents.length > 0 || tags.length > 0;

  // Calculate dropup position (appears above the input)
  const dropupStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.left,
    bottom: `calc(100vh - ${position.top}px + 8px)`, // 8px spacing above input
    zIndex: 1000,
    minWidth: '300px',
    maxWidth: '400px',
    maxHeight: '200px'
  };

  return (
    <div
      ref={dropupRef}
      style={dropupStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in slide-in-from-bottom-2 duration-150"
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Searching...</span>
        </div>
      ) : !hasResults ? (
        <div className="p-4 text-center">
          <span className="text-sm text-gray-500">
            {query ? `No results for "${query}"` : 'Start typing to search documents and tags'}
          </span>
        </div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto">
          {/* Documents Section */}
          {documents.length > 0 && (
            <div>
              {documents.map((doc, index) => {
                const globalIndex = index;
                const isSelected = globalIndex === selectedIndex;
                return (
                  <div
                    key={`doc-${doc.id}`}
                    data-index={globalIndex}
                    className={`flex items-center space-x-3 px-4 py-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-l-2 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelect(doc)}
                  >
                    <FileText className={`w-4 h-4 flex-shrink-0 ${
                      isSelected ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {doc.name}
                      </div>
                      {doc.title !== doc.name && (
                        <div className="text-xs text-gray-500 truncate">
                          {doc.title}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Separator between documents and tags */}
          {documents.length > 0 && tags.length > 0 && (
            <div className="border-t border-gray-100" />
          )}

          {/* Tags Section */}
          {tags.length > 0 && (
            <div>
              {tags.map((tag, index) => {
                const globalIndex = documents.length + index;
                const isSelected = globalIndex === selectedIndex;
                return (
                  <div
                    key={`tag-${tag.id}`}
                    data-index={globalIndex}
                    className={`flex items-center space-x-3 px-4 py-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-green-50 border-l-2 border-green-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelect(tag)}
                  >
                    <Hash className={`w-4 h-4 flex-shrink-0 ${
                      isSelected ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        isSelected ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {tag.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {tag.documentCount} document{tag.documentCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer with instructions */}
      {hasResults && !isLoading && (
        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
          <div className="text-xs text-gray-500">
            ↑↓ to navigate • Enter to select • Esc to close
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentMentionDropup;
