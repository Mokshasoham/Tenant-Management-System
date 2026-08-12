import { AppError } from '../../utils/errorHandling.js';

export class GSTProvider {
  /**
   * Abstract provider interface for GSTIN verification.
   */
  async verifyGstin(payload) {
    throw new AppError('verifyGstin() must be implemented by subclass', 500);
  }

  async checkProviderHealth() {
    throw new AppError('checkProviderHealth() must be implemented by subclass', 500);
  }
}

export default GSTProvider;
