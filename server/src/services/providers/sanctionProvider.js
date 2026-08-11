import { AppError } from '../../utils/errorHandling.js';

export class SanctionProvider {
  /**
   * Abstract interface for Sanctions, PEP & Adverse Media Providers
   * @param {string} verificationId
   * @param {object} entityData - { legalName, dob, country, entityType }
   * @param {object} metadata
   */
  async screenEntity(verificationId, entityData = {}, metadata = {}) {
    throw new AppError('screenEntity method must be implemented by subclass', 500);
  }

  async checkProviderHealth() {
    throw new AppError('checkProviderHealth method must be implemented by subclass', 500);
  }
}
