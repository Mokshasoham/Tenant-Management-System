import { useState, useCallback } from 'react';
import { verificationService } from '../services/api';
import compressImage from '../utils/compressImage';
import { validateDocumentUpload } from '../validators/verificationValidators';
import formatVerificationApiError from '../utils/verificationApiErrors';

export const useVerificationUpload = (verificationId) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = useCallback(async (documentType, file, templateRules = {}) => {
    if (!verificationId) {
      setError('Verification ID is required for document upload');
      return null;
    }

    const validation = validateDocumentUpload(file, templateRules);
    if (!validation.isValid) {
      const msg = validation.errors.join('. ');
      setError(msg);
      throw new Error(msg);
    }

    try {
      setUploading(true);
      setProgress(20);
      setError(null);

      let processedFile = file;
      if (file.type.startsWith('image/')) {
        processedFile = await compressImage(file, 1920, 0.8);
        setProgress(50);
      }

      // Mock file upload payload binding (fileId or url)
      const fileData = {
        documentType,
        filename: file.name,
        fileId: `file_${Date.now()}`,
        url: URL.createObjectURL(processedFile),
      };

      setProgress(80);
      const res = await verificationService.uploadDocument(verificationId, fileData);
      setProgress(100);
      return res?.data || res;
    } catch (err) {
      const msg = formatVerificationApiError(err);
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [verificationId]);

  return {
    uploading,
    progress,
    error,
    upload,
  };
};

export default useVerificationUpload;
