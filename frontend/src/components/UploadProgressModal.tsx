'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface FileProgress { // Exporting for use in other components
  id: string; // Unique ID for the file, e.g., generated cuid or uuid
  name: string;
  progress: number; // 0-100
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  estimatedTimeRemaining?: string; // e.g., "2 minutes remaining"
  errorMessage?: string;
  originalFile?: File; // To store the original file object for retries
  eventSource?: EventSource; // To store the EventSource instance for cancellation
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
  if (!isOpen) {
    return null;
  }

  const activeUploads = files.filter(f => f.status !== 'completed' && f.status !== 'cancelled' && f.status !== 'error');
  const completedUploads = files.filter(f => f.status === 'completed');
  const erroredUploads = files.filter(f => f.status === 'error');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        color: '#333', // Ensuring text is visible on white background
      }}>
        <h2 style={{ marginTop: 0 }}>Upload Progress</h2>

        {activeUploads.length > 0 && <h3>In Progress</h3>}
        {activeUploads.map((file) => (
          <div key={file.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>{file.name}</span>
              <span style={{ fontSize: '0.9em', color: '#555' }}>
                {file.status === 'uploading' && `${file.progress}%`}
                {file.status === 'processing' && 'Processing with AI...'}
                {file.status === 'queued' && 'Queued...'}
              </span>
            </div>
            {file.status === 'uploading' && (
              <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px', marginTop: '5px' }}>
                <div
                  style={{
                    width: `${file.progress}%`,
                    height: '10px',
                    backgroundColor: '#4caf50',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease-in-out',
                  }}
                />
              </div>
            )}
            {file.estimatedTimeRemaining && file.status !== 'completed' && file.status !== 'error' && (
              <p style={{ fontSize: '0.8em', color: '#777', margin: '5px 0 0' }}>
                {file.estimatedTimeRemaining}
              </p>
            )}
            {file.status !== 'completed' && file.status !== 'error' && file.status !== 'cancelled' && (
              <button
                onClick={() => onCancelFile(file.id)}
                style={{ marginTop: '10px', padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
        ))}

        {erroredUploads.length > 0 && <h3>Errors</h3>}
        {erroredUploads.map((file) => (
          <div key={file.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #fdd', borderRadius: '4px', backgroundColor: '#ffeeee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>{file.name}</span>
              <span style={{ fontSize: '0.9em', color: 'red' }}>Error</span>
            </div>
            {file.errorMessage && <p style={{ color: 'red', fontSize: '0.9em' }}>{file.errorMessage}</p>}
            <button
              onClick={() => onRetryFile(file.id)}
              style={{ marginTop: '10px', padding: '5px 10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ))}
        
        {completedUploads.length > 0 && <h3>Completed</h3>}
        {completedUploads.map((file) => (
          <div key={file.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
            <span style={{ fontWeight: 'bold' }}>{file.name}</span> - Completed
          </div>
        ))}

        {files.length === 0 && <p>Select files to upload.</p>}

        <button
          onClick={onClose}
          style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default UploadProgressModal;
