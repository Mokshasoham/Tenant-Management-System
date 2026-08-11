import { AppError } from '../../utils/errorHandling.js';

export class IdentityVerificationProvider {
  /**
   * Abstract provider interface for identity verification.
   * All providers (DevelopmentProvider, ProductionProvider) must implement these methods.
   */

  async verifyIdentity(payload) {
    throw new AppError('verifyIdentity() must be implemented by subclass', 500);
  }

  async getVerificationStatus(requestId) {
    throw new AppError('getVerificationStatus() must be implemented by subclass', 500);
  }

  async cancelVerification(requestId) {
    throw new AppError('cancelVerification() must be implemented by subclass', 500);
  }
}

export default IdentityVerificationProvider;
