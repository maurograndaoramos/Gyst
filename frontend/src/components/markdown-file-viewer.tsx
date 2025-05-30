'use client';

import React, { useState, useEffect } from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import { FileText, Download, Eye, EyeOff } from 'lucide-react';

interface MarkdownFileViewerProps {
  filePath?: string;
  fileContent?: string;
  fileName?: string;
  className?: string;
  showControls?: boolean;
  enableMermaid?: boolean;
  enableMath?: boolean;
  allowHtml?: boolean;
  onLinkClick?: (url: string, isInternal: boolean) => void;
}

export function MarkdownFileViewer({
  filePath,
  fileContent,
  fileName = 'document.md',
  className = '',
  showControls = true,
  enableMermaid = true,
  enableMath = true,
  allowHtml = false,
  onLinkClick,
}: MarkdownFileViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // Load content from file path or use provided content
  useEffect(() => {
    if (fileContent) {
      setContent(fileContent);
      return;
    }

    if (!filePath) {
      setContent('');
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`);
        }
        
        const text = await response.text();
        setContent(text);
      } catch (err) {
        console.error('Error loading markdown file:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath, fileContent]);

  const handleDownload = () => {
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <FileText className="h-5 w-5" />
          <h3 className="font-medium">Error loading markdown file</h3>
        </div>
        <p className="text-red-500 dark:text-red-300 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className={`p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <FileText className="h-5 w-5" />
          <p>No markdown content to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {showControls && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {fileName}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({content.split('\n').length} lines, {content.length} characters)
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={showRaw ? 'Show rendered view' : 'Show raw markdown'}
            >
              {showRaw ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>{showRaw ? 'Rendered' : 'Raw'}</span>
            </button>
            
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Download markdown file"
            >
              <Download size={16} />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}
      
      <div className="p-6">
        {showRaw ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            {content}
          </pre>
        ) : (
          <MarkdownRenderer
            content={content}
            enableMermaid={enableMermaid}
            enableMath={enableMath}
            allowHtml={allowHtml}
            onLinkClick={onLinkClick}
            className="max-w-none"
          />
        )}
      </div>
    </div>
  );
}
