import { AppError } from '../../utils/errorHandling.js';

export class PropertyVerificationProvider {
  /**
   * Abstract provider contract for property verification.
   * Concrete subclasses (PropertyDevelopmentProvider, PropertyProductionProvider) must implement these methods.
   */

  async verifyProperty(payload) {
    throw new AppError('verifyProperty() must be implemented by subclass', 500);
  }

  async getVerificationStatus(requestId) {
    throw new AppError('getVerificationStatus() must be implemented by subclass', 500);
  }

  async cancelVerification(requestId) {
    throw new AppError('cancelVerification() must be implemented by subclass', 500);
  }
}

export default PropertyVerificationProvider;
