import React from 'react';
import { FileText, X, Hash } from 'lucide-react';
import { AttachedDocument } from '@/types/mentions';

interface AttachedDocumentsPreviewProps {
  attachments: AttachedDocument[];
  onRemove: (documentId: string) => void;
  maxAttachments: number;
}

export const AttachedDocumentsPreview: React.FC<AttachedDocumentsPreviewProps> = ({
  attachments,
  onRemove,
  maxAttachments
}) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Attached Documents
          </span>
          <span className="text-xs text-gray-500">
            ({attachments.length}/{maxAttachments})
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        {attachments.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2 group hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {doc.name}
                </div>
                {doc.source === 'tag' && doc.tagName && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Hash className="w-3 h-3" />
                    <span>from {doc.tagName}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => onRemove(doc.id)}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
              aria-label={`Remove ${doc.name}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      {attachments.length >= maxAttachments && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Maximum number of attachments reached ({maxAttachments})
        </div>
      )}
    </div>
  );
};

export default AttachedDocumentsPreview;
