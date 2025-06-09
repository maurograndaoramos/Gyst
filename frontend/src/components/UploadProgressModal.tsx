'use client';

import React from 'react';
import { cn } from "@/lib/utils";

export interface FileProgress {
  id: string;
  name: string;
  progress: number;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  estimatedTimeRemaining?: string;
  errorMessage?: string;
  originalFile?: File;
  eventSource?: EventSource;
}

interface UploadProgressModalProps {
  files: FileProgress[];
  isOpen: boolean;
  onClose: () => void;
  onCancelFile: (fileId: string) => void;
  onRetryFile: (fileId: string) => void;
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  files,
  isOpen,
  onClose,
  onCancelFile,
  onRetryFile,
}) => {
  if (!isOpen) return null;

  const activeUploads = files.filter(f => f.status !== 'completed' && f.status !== 'cancelled' && f.status !== 'error');
  const completedUploads = files.filter(f => f.status === 'completed');
  const erroredUploads = files.filter(f => f.status === 'error');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div className="bg-background max-h-[80vh] w-[500px] rounded-lg shadow-lg overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Progress</h2>

          {activeUploads.length > 0 && (
            <>
              <h3 className="text-lg font-medium mb-3">In Progress</h3>
              {activeUploads.map((file) => (
                <div key={file.id} className="mb-4 p-4 border rounded-lg bg-white">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{file.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {file.status === 'uploading' && `${file.progress}%`}
                      {file.status === 'processing' && 'Processing...'}
                      {file.status === 'queued' && 'Queued...'}
                    </span>
                  </div>
                  
                  {file.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-[width] duration-300 ease-in-out"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {file.estimatedTimeRemaining && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {file.estimatedTimeRemaining}
                    </p>
                  )}
                  
                  {file.status !== 'completed' && file.status !== 'error' && file.status !== 'cancelled' && (
                    <button
                      onClick={() => onCancelFile(file.id)}
                      className="mt-2 px-3 py-1 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {erroredUploads.length > 0 && (
            <>
              <h3 className="text-lg font-medium mb-3">Errors</h3>
              {erroredUploads.map((file) => (
                <div key={file.id} className="mb-4 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{file.name}</span>
                    <span className="text-sm text-destructive">Error</span>
                  </div>
                  {file.errorMessage && (
                    <div className="mt-1">
                      <p className="text-sm text-destructive font-medium">Error:</p>
                      <p className="text-sm text-destructive/90 mt-1 whitespace-pre-wrap">
                        {file.errorMessage}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => onRetryFile(file.id)}
                    className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ))}
            </>
          )}
          
          {completedUploads.length > 0 && (
            <>
              <h3 className="text-lg font-medium mb-3">Completed</h3>
              {completedUploads.map((file) => (
                <div key={file.id} className="mb-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center">
                    <span className="font-medium">{file.name}</span>
                    <span className="ml-2 text-sm text-muted-foreground">✓ Complete</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {files.length === 0 && (
            <p className="text-muted-foreground">Select files to upload.</p>
          )}

          <button
            onClick={onClose}
            className="mt-6 w-full px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadProgressModal;
