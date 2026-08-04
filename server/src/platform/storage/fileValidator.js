import path from 'path';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Shared File Upload Validation Service.
 */
export const validateUpload = (fileBuffer, originalFilename, mimeType) => {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Empty file block submitted.');
  }

  // 1. File Size Verification
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File block exceeds limit: Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  // 2. Extension Verification
  const ext = path.extname(originalFilename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File extension "${ext}" is not permitted. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // 3. MIME Type Verification
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File MIME type "${mimeType}" is not permitted.`);
  }

  return true;
};
