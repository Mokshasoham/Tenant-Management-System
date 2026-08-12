import { AppError } from '../../utils/errorHandling.js';

export class AadhaarProvider {
  /**
   * Abstract provider interface for Aadhaar verification.
   */
  async sendOtp(payload) {
    throw new AppError('sendOtp() must be implemented by subclass', 500);
  }

  async verifyOtp(payload) {
    throw new AppError('verifyOtp() must be implemented by subclass', 500);
  }

  async checkProviderHealth() {
    throw new AppError('checkProviderHealth() must be implemented by subclass', 500);
  }
}

export default AadhaarProvider;
