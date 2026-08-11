import { AppError } from '../../utils/errorHandling.js';

export class FraudProvider {
  /**
   * Abstract interface for Fraud Detection Providers
   * @param {string} verificationId
   * @param {Array} signals
   * @param {object} metadata
   */
  async evaluateFraudRisk(verificationId, signals = [], metadata = {}) {
    throw new AppError('evaluateFraudRisk method must be implemented by subclass', 500);
  }

  async checkProviderHealth() {
    throw new AppError('checkProviderHealth method must be implemented by subclass', 500);
  }
}
