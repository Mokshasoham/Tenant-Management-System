import { AadhaarProvider } from './aadhaarProvider.js';
import config from '../../config/config.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';

export class AadhaarProductionProvider extends AadhaarProvider {
  constructor() {
    super();
    this.providerName = 'production';
    this.apiKey = config.AADHAAR_PROVIDER_API_KEY;
    this.apiUrl = config.AADHAAR_PROVIDER_URL;
    this.timeoutMs = config.AADHAAR_TIMEOUT_MS || 10000;
  }

  validateConfig() {
    if (!this.apiKey || !this.apiUrl) {
      logger.error('[AadhaarProductionProvider] Production Aadhaar provider API configuration missing');
      throw new AppError(
        'Production Aadhaar Provider configuration missing. Set AADHAAR_PROVIDER_API_KEY and AADHAAR_PROVIDER_URL in environment.',
        500
      );
    }
  }

  async sendOtp(payload = {}) {
    this.validateConfig();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiUrl}/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          encryptedReference: payload.encryptedReference,
          maskedAadhaar: payload.maskedAadhaar,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        logger.error(`[AadhaarProductionProvider] OTP send failed HTTP ${response.status}: ${errText}`);
        throw new AppError(`Aadhaar Provider HTTP ${response.status}: ${errText}`, response.status === 429 ? 429 : 502);
      }

      const data = await response.json();
      return {
        success: true,
        providerRequestId: data.providerRequestId || data.requestId,
        status: 'OTP_SENT',
        message: 'Aadhaar OTP dispatched via production provider',
        otpExpiresInSec: data.otpExpiresInSec || 600,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        logger.error('[AadhaarProductionProvider] OTP send request timed out');
        const timeoutErr = new Error('Aadhaar provider request timed out');
        timeoutErr.name = 'AbortError';
        throw timeoutErr;
      }
      throw err;
    }
  }

  async verifyOtp(payload = {}) {
    this.validateConfig();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiUrl}/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          providerRequestId: payload.providerRequestId,
          otp: payload.otp,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        logger.error(`[AadhaarProductionProvider] OTP verify failed HTTP ${response.status}: ${errText}`);
        throw new AppError(`Aadhaar Provider HTTP ${response.status}: ${errText}`, response.status === 429 ? 429 : 502);
      }

      const data = await response.json();
      return {
        success: data.verified === true,
        providerRequestId: data.providerRequestId || payload.providerRequestId,
        status: data.verified === true ? 'VERIFIED' : 'FAILED',
        reason: data.reason || (data.verified === true ? 'Aadhaar verified' : 'OTP verification failed'),
        confidenceScore: data.confidenceScore !== undefined ? data.confidenceScore : null,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        logger.error('[AadhaarProductionProvider] OTP verify request timed out');
        const timeoutErr = new Error('Aadhaar provider request timed out');
        timeoutErr.name = 'AbortError';
        throw timeoutErr;
      }
      throw err;
    }
  }

  async checkProviderHealth() {
    this.validateConfig();
    return { status: 'UP', mode: 'PRODUCTION' };
  }
}

export default AadhaarProductionProvider;
