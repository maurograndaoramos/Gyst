'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UploadProgressModal, { FileProgress } from '@/components/UploadProgressModal'; // Import modal and type

// Function to generate unique IDs for files, can be replaced with cuid or uuid
const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function DocumentUploadClient() { // Renamed from UploadExample
  const [filesToUpload, setFilesToUpload] = useState<FileProgress[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // To reset file input
  const eventSourcesRef = useRef<Record<string, EventSource>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedNativeFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedNativeFiles.length === 0) return;

    const newUploads: FileProgress[] = selectedNativeFiles.map(nativeFile => {
      const fileId = generateFileId();
      return {
        id: fileId,
        name: nativeFile.name,
        progress: 0,
        status: 'queued',
        originalFile: nativeFile, // Store the original File object
      };
    });

    setFilesToUpload(prev => [...prev, ...newUploads]);
    setIsModalOpen(true); // Open modal when files are selected

    newUploads.forEach(fileProgress => {
      if (fileProgress.originalFile) {
        startIndividualUpload(fileProgress.originalFile, fileProgress.id);
      }
    });

    // Reset file input to allow selecting the same file again if needed
    setFileInputKey(Date.now());
  };

  const startIndividualUpload = (nativeFile: File, fileId: string) => {
    const formData = new FormData();
    formData.append('file', nativeFile);
    formData.append('fileId', fileId);

    // Update status to 'uploading' immediately for better UX
    setFilesToUpload(prev =>
      prev.map(fp => (fp.id === fileId ? { ...fp, status: 'uploading', progress: 0 } : fp))
    );

    const es = new EventSource(`/api/upload-progress`); // Pass fileId if server needs it for ES connection
    eventSourcesRef.current[fileId] = es;

    fetch('/api/upload-progress', {
      method: 'POST',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        // This error is for the POST request itself, not the SSE stream
        response.json().then(errData => {
          updateFileState(fileId, { status: 'error', errorMessage: `Upload start failed: ${errData.error || response.statusText}` });
        }).catch(() => {
          updateFileState(fileId, { status: 'error', errorMessage: `Upload start failed: ${response.statusText}` });
        });
        es.close();
        delete eventSourcesRef.current[fileId];
      }
      // SSE will handle further updates from now on
    }).catch(error => {
      updateFileState(fileId, { status: 'error', errorMessage: `Upload start error: ${(error as Error).message}` });
      es.close();
      delete eventSourcesRef.current[fileId];
    });

    es.onmessage = (event) => {
      if (event.data.startsWith(':ok')) return; // Ignore SSE connection ack
      try {
        const data = JSON.parse(event.data);
        if (data.fileId === fileId) { // Ensure message is for this file
          updateFileState(fileId, {
            progress: data.progress,
            status: data.status,
            errorMessage: data.errorMessage,
          });
          if (data.status === 'completed' || data.status === 'error' || data.status === 'cancelled') {
            es.close();
            delete eventSourcesRef.current[fileId];
          }
        }
      } catch (e) {
        console.error('Failed to parse SSE event data:', event.data, e);
      }
    };

    es.onerror = (errorEv) => {
      console.error('EventSource failed for file:', fileId, errorEv);
      // Don't mark as error if already completed, cancelled or errored out by another means
      setFilesToUpload(prev =>
        prev.map(fp =>
          (fp.id === fileId && fp.status !== 'completed' && fp.status !== 'cancelled' && fp.status !== 'error')
            ? { ...fp, status: 'error', errorMessage: 'Connection error during upload.' }
            : fp
        )
      );
      es.close();
      delete eventSourcesRef.current[fileId];
    };
  };

  const updateFileState = (fileId: string, updates: Partial<FileProgress>) => {
    setFilesToUpload(prev =>
      prev.map(fp => (fp.id === fileId ? { ...fp, ...updates } : fp))
    );
  };

  const handleCancelFile = (fileId: string) => {
    const es = eventSourcesRef.current[fileId];
    if (es) {
      es.close(); // This should trigger 'cancel' on the server's ReadableStream
      delete eventSourcesRef.current[fileId];
    }
    updateFileState(fileId, { status: 'cancelled', progress: 0 });
    // Optionally: send an explicit cancel request to the backend if stream cancellation isn't enough
    // fetch(`/api/upload-progress/cancel?fileId=${fileId}`, { method: 'POST' });
  };

  const handleRetryFile = (fileId: string) => {
    const fileToRetry = filesToUpload.find(fp => fp.id === fileId);
    if (fileToRetry && fileToRetry.originalFile) {
      updateFileState(fileId, { status: 'queued', progress: 0, errorMessage: undefined });
      startIndividualUpload(fileToRetry.originalFile, fileId);
    } else {
      console.error("Cannot retry: Original file data not found for", fileId);
      updateFileState(fileId, { status: 'error', errorMessage: 'Cannot retry: Original file data missing.' });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Decide if you want to clear files or keep them for reopening:
    // setFilesToUpload([]); // Option 1: Clear all files
    // setFilesToUpload(prev => prev.filter(f => f.status === 'completed')); // Option 2: Keep only completed
  };
  
  // Cleanup all event sources on component unmount
  useEffect(() => {
    return () => {
      Object.values(eventSourcesRef.current).forEach(es => es.close());
    };
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>
          Select one or more documents to upload. Progress will be shown in a modal.
          (txt, md, pdf, docx, max 5MB each)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            key={fileInputKey} // Used to reset the input field
            type="file"
            multiple // Allow multiple file selection
            accept=".txt,.md,.pdf,.docx" // Example accepted types
            onChange={handleFileChange}
            // disabled={filesToUpload.some(f => f.status === 'uploading' || f.status === 'processing')} // Optional: disable while any upload is active
          />
        </div>
        
        {/* The modal will be controlled by isModalOpen and filesToUpload state */}
        <UploadProgressModal
          files={filesToUpload}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onCancelFile={handleCancelFile}
          onRetryFile={handleRetryFile}
        />

        {/* Display summary of uploads if needed, or remove if modal is sufficient */}
        {filesToUpload.length > 0 && !isModalOpen && (
          <div className="mt-4">
            <h4 className="font-semibold">Upload Summary:</h4>
            <ul className="list-disc list-inside text-sm">
              {filesToUpload.map(f => (
                <li key={f.id}>{f.name} - {f.status} ({f.progress}%)</li>
              ))}
            </ul>
            <Button onClick={() => setIsModalOpen(true)} variant="link" className="p-0 h-auto mt-2">
              Show Progress Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
