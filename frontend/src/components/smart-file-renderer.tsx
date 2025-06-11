'use client';

import React from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import PDFViewer from './pdf-viewer';
import { FileText, FileCode, File } from 'lucide-react';
import type { FileData } from '@/types/file';

interface SmartFileRendererProps {
  file: FileData;
  className?: string;
}

// Enhanced Text Renderer for .txt and .docx files
const EnhancedTextRenderer: React.FC<{ content: string; filename?: string }> = ({ 
  content, 
  filename 
}) => {
  return (
    <div className="w-full h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {filename && (
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">{filename}</h2>
          </div>
        )}
        <div className="prose prose-gray max-w-none">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700 bg-gray-50 p-6 rounded-lg border">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};

// Basic fallback renderer
const BasicTextRenderer: React.FC<{ content: string; filename?: string }> = ({ 
  content, 
  filename 
}) => {
  return (
    <div className="w-full h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {filename && (
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            <File className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">{filename}</h2>
          </div>
        )}
        <div className="prose prose-gray max-w-none">
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700 bg-gray-50 p-6 rounded-lg border">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get file extension
const getFileExtension = (filename: string | null): string => {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
};

// Helper function to generate PDF URL (you may need to adjust this based on your backend setup)
const getPDFUrl = (file: SmartFileRendererProps['file']): string => {
  // Get PDF file content from the documents endpoint
  if (file.id) {
    return `/api/documents/${file.id}/content`;
  }
  return '';
};

export const SmartFileRenderer: React.FC<SmartFileRendererProps> = ({ 
  file, 
  className = '' 
}) => {
  const extension = getFileExtension(file.originalFilename || file.filePath);
  const filename = file.originalFilename || file.title;


  // Handle different file types
  switch (extension) {
    case '.md':
      return (
        <div className={`w-full h-[calc(100vh-4rem)] overflow-y-auto ${className}`}>
          <div className="max-w-4xl mx-auto p-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
              <FileCode className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">{filename}</h2>
            </div>
            <MarkdownRenderer 
              content={file.content || ''} 
              enableMermaid={true}
              enableMath={true}
              allowHtml={false}
              className="max-w-none"
            />
          </div>
        </div>
      );
    
    case '.pdf':
      const pdfUrl = getPDFUrl(file);
      if (!pdfUrl) {
        return (
          <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
            <div className="text-center space-y-4">
              <File className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">PDF File</h3>
                <p className="text-sm text-gray-600">{filename}</p>
                <p className="text-sm text-red-600 mt-2">Unable to load PDF file</p>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className={`w-full h-[calc(100vh-4rem)] ${className}`}>
          <PDFViewer 
            fileUrl={pdfUrl}
            className="w-full h-full"
            enableSearch={true}
            enablePrint={true}
          />
        </div>
      );
    
    case '.txt':
      return (
        <EnhancedTextRenderer 
          content={file.content || ''} 
          filename={filename}
        />
      );
    
    case '.docx':
      return (
        <EnhancedTextRenderer 
          content={file.content || ''} 
          filename={filename}
        />
      );
    
    default:
      // Fallback for unknown file types
      return (
        <BasicTextRenderer 
          content={file.content || ''} 
          filename={filename}
        />
      );
  }
};

export default SmartFileRenderer;
