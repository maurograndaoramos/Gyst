import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUploadComponent = () => {
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

  const onDrop = (acceptedFiles, rejectedFiles) => {
    const newErrors = rejectedFiles.map(file => {
      if (!acceptedFileTypes.includes(file.file.type)) {
        return `Invalid file type: ${file.file.name}`;
      }
      if (file.file.size > maxFileSize) {
        return `File too large: ${file.file.name}`;
      }
      return null;
    }).filter(Boolean);

    setErrors([...errors, ...newErrors]);

    const validFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
    }));

    setFiles([...files, ...validFiles]);
    simulateUpload(validFiles);
  };

  const simulateUpload = (validFiles) => {
    validFiles.forEach((fileObj, index) => {
      const interval = setInterval(() => {
        setFiles(prevFiles => {
          const updatedFiles = [...prevFiles];
          const fileIndex = updatedFiles.findIndex(f => f.file.name === fileObj.file.name);
          if (fileIndex !== -1) {
            updatedFiles[fileIndex].progress += 10;
            if (updatedFiles[fileIndex].progress >= 100) {
              clearInterval(interval);
            }
          }
          return updatedFiles;
        });
      }, 300);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.join(','),
    maxSize: maxFileSize,
  });

  return (
    <div className="p-4 border-2 border-dashed rounded-md text-center">
      <div
        {...getRootProps()}
        className={`p-6 border-2 rounded-md cursor-pointer ${
          isDragActive ? 'border-blue-500 bg-blue-100' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        <p>Drag and drop files here, or click to select files</p>
        <p className="text-sm text-gray-500">Accepted files: PDF, JPG, PNG, GIF</p>
        <p className="text-sm text-gray-500">Max file size: 5MB per file</p>
      </div>
      {errors.length > 0 && (
        <div className="mt-4 text-red-500">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      )}
      <div className="mt-4">
        {files.map((fileObj, index) => (
          <div key={index} className="flex items-center justify-between mb-2">
            <span className="text-sm">{fileObj.file.name}</span>
            <div className="w-1/2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${fileObj.progress}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUploadComponent;
