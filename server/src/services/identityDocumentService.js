import { AppError } from '../utils/errorHandling.js';
import logger from '../platform/logging/logger.js';

export class IdentityDocumentService {
  constructor() {
    this.allowedDocumentTypes = ['GOVT_ID', 'PAN', 'AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'BUSINESS_REGISTRATION', 'TAX_PIN'];
    this.allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
  }

  validateDocumentUpload(documentType, file) {
    if (!documentType || !this.allowedDocumentTypes.includes(documentType.toUpperCase())) {
      throw new AppError(`Invalid document type '${documentType}'. Allowed types: ${this.allowedDocumentTypes.join(', ')}`, 400);
    }

    if (file) {
      if (file.size && file.size > this.maxFileSize) {
        throw new AppError(`File size exceeds limit of 10MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`, 400);
      }

      if (file.mimetype && !this.allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
        throw new AppError(`Invalid file format '${file.mimetype}'. Allowed formats: JPG, PNG, WEBP, PDF`, 400);
      }
    }
    return true;
  }

  maskDocumentNumber(docNumber) {
    if (!docNumber || typeof docNumber !== 'string') return '';
    const clean = docNumber.trim();
    if (clean.length <= 4) return 'X'.repeat(clean.length);
    const visibleSuffix = clean.slice(-4);
    const maskedPrefix = clean.slice(0, -4).replace(/[a-zA-Z0-9]/g, 'X');
    return `${maskedPrefix}${visibleSuffix}`;
  }

  generateSecureReference(documentType, entityId) {
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    return `SEC-REF-${documentType}-${entityId.toString().slice(-6)}-${timestamp}-${randomHex}`;
  }
}

export default new IdentityDocumentService();
