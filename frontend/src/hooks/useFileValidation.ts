// frontend/src/hooks/useFileValidation.ts
import { useState, useCallback } from 'react';
import { validateFile } from '@/lib/utils/file-validation';
import { FileValidationResult } from '@/lib/types/upload';

interface UseFileValidationReturn {
  validationResult: FileValidationResult | null;
  validate: (file: File) => Promise<FileValidationResult>;
  isLoading: boolean;
  error: string | null;
}

const useFileValidation = (): UseFileValidationReturn => {
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const readFileAsBuffer = (file: File): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(Buffer.from(event.target.result as ArrayBuffer));
        } else {
          reject(new Error('Failed to read file.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file.'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const validate = useCallback(async (file: File): Promise<FileValidationResult> => {
    setIsLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      const buffer = await readFileAsBuffer(file);
      const result = await validateFile(
        buffer,
        file.name,
        file.type, // Reported MIME type
        file.size
      );
      setValidationResult(result);
      setIsLoading(false);
      return result;
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during validation.');
      const res = { isValid: false, errors: [err.message || 'Validation error'], fileSize: file.size };
      setValidationResult(res);
      setIsLoading(false);
      return res;
    }
  }, []);

  return { validationResult, validate, isLoading, error };
};

export default useFileValidation;
