import { AppError } from '../../utils/errorHandling.js';

export class PANProvider {
  /**
   * Abstract provider interface for PAN verification and matching.
   */
  async verifyPan(payload) {
    throw new AppError('verifyPan() must be implemented by subclass', 500);
  }

  async checkProviderHealth() {
    throw new AppError('checkProviderHealth() must be implemented by subclass', 500);
  }
}

export default PANProvider;
