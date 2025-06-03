// frontend/src/components/FileValidator.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone, FileWithPath, FileRejection } from 'react-dropzone';
import useFileValidation from '@/hooks/useFileValidation';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/types/upload';

interface FileWithPreview extends FileWithPath {
  preview: string;
  isValid?: boolean;
  errors?: string[];
}

const FileValidator: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const { validate, isLoading: isValidating, error: validationHookError } = useFileValidation();

  const onDrop = useCallback(async (acceptedDropFiles: FileWithPath[]) => {
    const newFilesPromises = acceptedDropFiles.map(async (file) => {
      if (files.find(f => f.path === file.path)) {
        return null; // Skip if already present
      }
      const validationRes = await validate(file);
      return Object.assign(file, {
        preview: URL.createObjectURL(file),
        isValid: validationRes.isValid,
        errors: validationRes.errors,
      });
    });

    const resolvedNewFiles = (await Promise.all(newFilesPromises)).filter(Boolean) as FileWithPreview[];

    setFiles(prevFiles => [...prevFiles, ...resolvedNewFiles].filter((f, i, self) => i === self.findIndex(t => t.path === f.path)));
  }, [validate, files]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: SUPPORTED_EXTENSIONS.reduce((acc, ext) => {
        if (ext === '.txt') acc['text/plain'] = [ext];
        else if (ext === '.md') acc['text/markdown'] = [ext];
        else if (ext === '.pdf') acc['application/pdf'] = [ext];
        else if (ext === '.docx') acc['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = [ext];
        return acc;
    }, {} as Record<string, string[]>),
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = (filePath?: string) => {
    if (!filePath) return;
    const fileToRemove = files.find(f => f.path === filePath);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.preview); // Clean up object URL
    }
    setFiles(prevFiles => prevFiles.filter(f => f.path !== filePath));
  };

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`p-10 border-2 border-dashed rounded-md cursor-pointer text-center transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-600 text-lg">Drop the files here ...</p>
        ) : (
          <p className="text-gray-600 text-lg">Drag 'n' drop files here, or click to select files</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Supported types: {SUPPORTED_EXTENSIONS.join(', ')} (Max size: {MAX_FILE_SIZE / (1024 * 1024)}MB)
        </p>
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
              <div className="flex-grow">
                <p className="font-medium text-gray-800">{(file as FileWithPath).name || 'Unnamed file'}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                  {file.isValid === undefined && isValidating && ' - Validating...'}
                </p>
                {file.isValid === false && file.errors && (
                  <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                    {file.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                  </ul>
                )}
                 {file.isValid === true && (
                   <p className="text-xs text-green-600 mt-1">✔️ File is valid and ready for upload.</p>
                 )}
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
       {isValidating && files.every(f => f.isValid === undefined) && ( // Show general validating message if all files are currently being processed
         <p className="mt-4 text-sm text-yellow-600">Validating files...</p>
       )}
       {files.length > 0 && files.every(f => f.isValid === true) && (
        <div className="mt-6 text-center">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Upload Valid Files ({files.filter(f => f.isValid === true).length})
            </button>
        </div>
       )}
    </div>
  );
};

export default FileValidator;
