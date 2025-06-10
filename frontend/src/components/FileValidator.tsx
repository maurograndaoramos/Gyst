// frontend/src/components/FileValidator.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, FileCode, FileCheck } from 'lucide-react';
import { useDropzone, FileWithPath, FileRejection, DropzoneOptions } from 'react-dropzone';
import useFileValidation from '@/hooks/useFileValidation';
import type { InputHTMLAttributes } from 'react';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/types/upload';

export interface FileWithPreview extends FileWithPath {
  preview: string;
  isValid?: boolean;
  errors?: string[];
  processedForUpload?: boolean; // Flag to track if the file has been processed for upload
}

interface FileValidatorProps {
  onFilesReadyForUpload: (files: FileWithPreview[]) => void;
  processedFilePaths?: string[]; // Optional: to prevent re-uploading files already processed by parent
  customClasses?: {
    root?: string;
    dropzone?: string;
  };
}

const FileValidator: React.FC<FileValidatorProps> = ({ 
  onFilesReadyForUpload, 
  processedFilePaths = [],
  customClasses = {} 
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [justDropped, setJustDropped] = useState(false);
  const { validate, isLoading: isValidating, error: validationHookError } = useFileValidation();

  const onDrop = useCallback(async (acceptedDropFiles: FileWithPath[]) => {
    setJustDropped(true);
    setTimeout(() => setJustDropped(false), 1000); // Reset after animation

    const newFilesPromises = acceptedDropFiles.map(async (file) => {
      // Skip if already present in current component's list or already processed by parent
      if (files.find(f => f.path === file.path) || (file.path && processedFilePaths.includes(file.path))) {
        return null; 
      }
      const validationRes = await validate(file);
      return Object.assign(file, {
        preview: URL.createObjectURL(file),
        isValid: validationRes.isValid,
        errors: validationRes.errors,
        processedForUpload: false, // Initialize as not processed
      });
    });

    const resolvedNewFiles = (await Promise.all(newFilesPromises)).filter(Boolean) as FileWithPreview[];
    
    // Filter out duplicates based on path before setting state
    setFiles(prevFiles => {
      const combined = [...prevFiles, ...resolvedNewFiles];
      return combined.filter((f, i, self) => i === self.findIndex(t => t.path === f.path));
    });

  }, [validate, files, processedFilePaths]);

  // Effect to trigger upload for newly validated files
  useEffect(() => {
    const readyFiles = files.filter(
      (file) => file.isValid === true && !file.processedForUpload
    );

    if (readyFiles.length > 0) {
      onFilesReadyForUpload(readyFiles);
      // Mark these files as processed to avoid re-triggering
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          readyFiles.some(rf => rf.path === file.path)
            ? { ...file, processedForUpload: true }
            : file
        )
      );
    }
  }, [files, onFilesReadyForUpload]);
  
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/*': ['.txt', '.md'], // Fallback for text files
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      // Add extensions directly for better browser compatibility
      '.txt': [], 
      '.md': [],
      '.pdf': [],
      '.docx': []
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    onDragEnter: () => {},
    onDragOver: () => {},
    onDragLeave: () => {},
  } as DropzoneOptions);

  const removeFile = (filePath?: string) => {
    if (!filePath) return;
    const fileToRemove = files.find(f => f.path === filePath);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.preview); // Clean up object URL
    }
    setFiles(prevFiles => prevFiles.filter(f => f.path !== filePath));
  };

  return (
    <div className={`p-4 border rounded-lg shadow-md bg-white w-full max-w-2xl mx-auto ${customClasses.root || ''}`}>
      <div
        {...getRootProps()}
        className={`p-10 border-2 border-dashed rounded-md cursor-pointer text-center transition-all duration-300
          ${isDragActive ? 'border-primary/50 bg-primary/5 scale-[1.02] shadow-lg ring-2 ring-primary/20' : ''}
          ${justDropped ? 'animate-success-flash' : 'border-gray-300 hover:border-gray-400'}
          ${customClasses.dropzone || ''}
        `}
        data-dragover={isDragActive}
      >
        <input {...(getInputProps() as InputHTMLAttributes<HTMLInputElement>)} type="file" />
        <div className="flex flex-col items-center gap-2">
          <Upload 
            className={`w-12 h-12 transition-all duration-300 ${
              isDragActive ? 'text-primary animate-bounce' : 
              justDropped ? 'text-green-500 scale-110' : 
              'text-gray-400'
            }`}
          />
          {isDragActive ? (
            <p className="text-primary text-lg font-medium">Drop your files here ...</p>
          ) : justDropped ? (
            <p className="text-green-600 text-lg font-medium">Files ready for upload! ✨</p>
          ) : (
            <p className="text-gray-600 text-lg">Drag & drop files here, or click to select</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          <span className="text-xs text-gray-500">Supported types:</span>
          <div className="flex gap-2">
            {SUPPORTED_EXTENSIONS.map(ext => {
              const Icon = ext === '.txt' ? FileText 
                : ext === '.md' ? FileCode 
                : FileCheck;
              return (
                <div 
                  key={ext} 
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200 cursor-default hover:scale-105 ${
                    ext === '.txt' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 
                    ext === '.md' ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 
                    'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-xs font-medium">{ext}</span>
                </div>
              );
            })}
          </div>
          <span className="text-xs text-gray-500 ml-2">
            Max size: {MAX_FILE_SIZE / (1024 * 1024)}MB
          </span>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="font-semibold text-red-700">Rejected Files (by dropzone):</h4>
          <ul className="list-disc list-inside text-sm text-red-600">
            {fileRejections.map(({ file, errors }: FileRejection) => (
              <li key={file.name || 'unknown-file-rejection'}>
                {(file as FileWithPath).name || 'File without name'} - {errors.map(e => e.message).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validationHookError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          <p>Validation Error: {validationHookError}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-3 text-gray-700">Selected Files:</h4>
          {files.map(file => (
            <div
              key={file.path ?? file.name}
              className={`p-3 mb-3 border rounded-md flex items-center justify-between transition-all duration-300 ease-in-out
                ${file.isValid === undefined && !isValidating && !fileRejections.find(fr => fr.file.name === (file as FileWithPath).name) ? 'border-gray-300' : ''}
                ${isValidating && file.isValid === undefined ? 'border-yellow-400 bg-yellow-50 animate-pulse' : ''}
                ${file.isValid === true ? 'border-green-500 bg-green-50' : ''}
                ${file.isValid === false ? 'border-red-500 bg-red-50' : ''}
              `}
            >
              <div className="flex-grow flex gap-3">
                {/* File type icon */}
                {(() => {
                  const ext = (file as FileWithPath).name?.split('.').pop()?.toLowerCase();
                  const Icon = ext === 'txt' ? FileText 
                    : ext === 'md' ? FileCode 
                    : FileCheck;
                  return (
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      ext === 'txt' ? 'bg-blue-50' : 
                      ext === 'md' ? 'bg-purple-50' :
                      'bg-emerald-50'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        ext === 'txt' ? 'text-blue-600' :
                        ext === 'md' ? 'text-purple-600' :
                        'text-emerald-600'
                      }`} />
                    </div>
                  );
                })()}
                
                {/* File info */}
                <div>
                  <p className="font-medium text-gray-800">{(file as FileWithPath).name || 'Unnamed file'}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    {file.isValid === undefined && isValidating && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Validating...
                      </span>
                    )}
                  </div>
                  {file.isValid === false && file.errors && (
                    <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                      {file.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                  {file.isValid === true && (
                    <p className="text-xs text-green-600 mt-1">✔️ File is valid and ready for upload.</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeFile(file.path)}
                className="ml-4 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
       {isValidating && files.every(f => f.isValid === undefined) && (
         <p className="mt-4 text-sm text-yellow-600">Validating files...</p>
       )}
    </div>
  );
};

export default FileValidator;
