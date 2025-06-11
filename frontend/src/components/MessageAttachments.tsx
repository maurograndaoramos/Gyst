import React from 'react';
import { FileText } from 'lucide-react';
import { AttachedDocument } from '@/types/mentions';

interface MessageAttachmentsProps {
  attachments: AttachedDocument[];
}

export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({
  attachments
}) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 pb-2 border-b border-gray-200">
      <div className="space-y-1">
        {attachments.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center space-x-2 text-sm"
          >
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-gray-700 truncate">
              {doc.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageAttachments;
