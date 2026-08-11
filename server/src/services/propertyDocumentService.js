import { AppError } from '../utils/errorHandling.js';
import { encryptData } from '../utils/encryption.js';

export class PropertyDocumentService {
  constructor() {
    this.allowedCategories = [
      'OWNERSHIP_DEED',
      'SALE_DEED',
      'PROPERTY_TAX_RECEIPT',
      'ENCUMBRANCE_CERTIFICATE',
      'OCCUPANCY_CERTIFICATE',
      'BUILDING_APPROVAL',
      'FIRE_NOC',
      'UTILITY_DOCUMENT',
      'INSURANCE',
      'PROPERTY_REGISTRATION',
      'OTHER',
    ];
    this.allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  validateDocumentUpload(documentType, file) {
    if (!documentType || !this.allowedCategories.includes(documentType.toUpperCase())) {
      throw new AppError(`Invalid property document category '${documentType}'. Allowed: ${this.allowedCategories.join(', ')}`, 400);
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

  maskDocumentReference(docRef) {
    if (!docRef || typeof docRef !== 'string') return '';
    const clean = docRef.trim();
    if (clean.length <= 4) return 'X'.repeat(clean.length);
    const visibleSuffix = clean.slice(-4);
    const maskedPrefix = clean.slice(0, -4).replace(/[a-zA-Z0-9]/g, 'X');
    return `${maskedPrefix}${visibleSuffix}`;
  }

  generateSecureReference(documentType, propertyId) {
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const pIdStr = propertyId ? propertyId.toString().slice(-6) : 'NATIVE';
    return `PROP-REF-${documentType}-${pIdStr}-${timestamp}-${randomHex}`;
  }

  encryptReference(referenceStr) {
    return encryptData(referenceStr);
  }
}

export default new PropertyDocumentService();
