import { AadhaarProvider } from './aadhaarProvider.js';
import logger from '../../platform/logging/logger.js';
import { AppError } from '../../utils/errorHandling.js';

export class AadhaarDevelopmentProvider extends AadhaarProvider {
  constructor() {
    super();
    this.providerName = 'development';
  }

  async sendOtp(payload = {}) {
    logger.info(`[AadhaarDevelopmentProvider] Executing sandbox sendOtp for masked reference`);

    if (payload.forceTimeout) {
      const err = new Error('Provider request timed out');
      err.name = 'AbortError';
      throw err;
    }

    if (payload.forceError) {
      throw new AppError('External Aadhaar provider service unavailable', 502);
    }

    const providerRequestId = `DEV-AADHAAR-REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return {
      success: true,
      providerRequestId,
      status: 'OTP_SENT',
      message: 'Sandbox Aadhaar OTP dispatched successfully',
      otpExpiresInSec: 600,
    };
  }

  async verifyOtp(payload = {}) {
    logger.info(`[AadhaarDevelopmentProvider] Executing sandbox verifyOtp for req: ${payload.providerRequestId}`);

    if (payload.forceTimeout) {
      const err = new Error('Provider request timed out');
      err.name = 'AbortError';
      throw err;
    }

    if (payload.forceError) {
      throw new AppError('External Aadhaar provider service unavailable', 502);
    }

    const isMockValid = payload.otp === '123456';
    const providerRequestId = payload.providerRequestId || `DEV-AADHAAR-REQ-${Date.now()}`;

    if (!isMockValid) {
      return {
        success: false,
        providerRequestId,
        status: 'FAILED',
        reason: 'Invalid Aadhaar OTP provided in sandbox environment',
        confidenceScore: payload.confidenceScore !== undefined ? payload.confidenceScore : null,
      };
    }

    return {
      success: true,
      providerRequestId,
      status: 'VERIFIED',
      reason: 'Sandbox Aadhaar OTP verified successfully',
      confidenceScore: payload.confidenceScore !== undefined ? payload.confidenceScore : null,
    };
  }

  async checkProviderHealth() {
    return { status: 'UP', mode: 'SANDBOX' };
  }
}

export default AadhaarDevelopmentProvider;
