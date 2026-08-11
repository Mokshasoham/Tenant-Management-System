import logger from '../platform/logging/logger.js';

export class PropertyDocumentExtractionService {
  /**
   * Normalizes property document data extracted from document/provider response.
   * Missing attributes are normalized to 'UNKNOWN' rather than fabricated.
   */
  extractPropertyData(rawInput = {}) {
    logger.info('[PropertyDocumentExtractionService] Normalizing extracted property metadata');

    const data = rawInput.extractedData || rawInput;

    const safeString = (val) => {
      if (!val || val === 'UNKNOWN') return 'UNKNOWN';
      if (typeof val === 'string') return val.trim();
      if (typeof val === 'object' && val.name) return String(val.name).trim();
      return String(val).trim();
    };

    return {
      ownerName: safeString(data.ownerName || data.owner || data.name),
      address: safeString(data.address || data.propertyAddress),
      propertyId: data.propertyId || 'UNKNOWN',
      surveyNumber: safeString(data.surveyNumber || data.surveyNo),
      registrationNumber: safeString(data.registrationNumber || data.regNo),
      city: safeString(data.city),
      state: safeString(data.state),
      pincode: safeString(data.pincode || data.pin),
      propertyType: safeString(data.propertyType || data.type),
      area: safeString(data.area || data.builtUpArea),
      issueDate: data.issueDate || null,
      expiryDate: data.expiryDate || null,
    };
  }
}

export default new PropertyDocumentExtractionService();
