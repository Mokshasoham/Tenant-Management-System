import { DigiLockerProvider } from './digilockerProvider.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';
import config from '../../config/config.js';
import { CircuitBreakerRegistry } from '../../platform/security/circuitBreaker.js';

export class DigiLockerProductionProvider extends DigiLockerProvider {
  constructor() {
    super();
    this.providerName = 'production';
    this.clientId = config.DIGILOCKER_CLIENT_ID;
    this.clientSecret = config.DIGILOCKER_CLIENT_SECRET;
    this.redirectUri = config.DIGILOCKER_REDIRECT_URI;
    this.apiBaseUrl = config.DIGILOCKER_API_BASE_URL || 'https://api.digitallocker.gov.in/public/oauth2/1';
    this.authUrl = config.DIGILOCKER_AUTH_URL || 'https://api.digitallocker.gov.in/public/oauth2/1/authorize';
    this.tokenUrl = config.DIGILOCKER_TOKEN_URL || 'https://api.digitallocker.gov.in/public/oauth2/1/token';
    this.timeoutMs = config.DIGILOCKER_TIMEOUT_MS || 10000;
    this.circuitBreaker = CircuitBreakerRegistry.get('digilockerProduction', {
      failureThreshold: 5,
      recoveryWindowMs: 60000,
      requestTimeoutMs: this.timeoutMs,
    });
  }

  get circuitState() {
    return this.circuitBreaker.getState();
  }

  _recordFailure(err = new Error('Simulated failure')) {
    this.circuitBreaker.recordFailure(err);
  }

  validateConfig() {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      logger.error('[DigiLockerProductionProvider] Missing required production DigiLocker OAuth credentials');
      throw new AppError(
        'Production DigiLocker credentials are not configured. Set DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET, and DIGILOCKER_REDIRECT_URI in environment.',
        500
      );
    }
  }

  getAuthorizationUrl(state) {
    this.validateConfig();
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'read dl_read profile',
    });
    return `${this.authUrl}?${query.toString()}`;
  }

  async exchangeToken(code, state) {
    this.validateConfig();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          state,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[DigiLockerProductionProvider] Token exchange failed HTTP ${response.status}: ${errorText}`);
        return {
          success: false,
          error: response.status === 401 ? 'unauthorized' : 'invalid_grant',
          errorDescription: `DigiLocker token exchange HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresIn: data.expires_in || 3600,
        tokenType: data.token_type || 'Bearer',
        providerUserReference: data.digilockerid || data.user_id || `DL-USER-${Date.now()}`,
        consentStatus: 'GRANTED',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      logger.error(`[DigiLockerProductionProvider] ${isTimeout ? 'Token exchange timed out' : 'Network error'}: ${err.message}`);
      return {
        success: false,
        error: isTimeout ? 'timeout' : 'network_failure',
        errorDescription: isTimeout ? 'DigiLocker connection timed out' : err.message,
      };
    }
  }

  async getUserProfile(accessToken) {
    this.validateConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiBaseUrl}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: 'expired_token', errorDescription: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        digilockerId: data.digilockerid || data.sub,
        name: data.name,
        dob: data.dob,
        gender: data.gender,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return { success: false, error: 'network_failure', errorDescription: err.message };
    }
  }

  async listDocuments(accessToken) {
    this.validateConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiBaseUrl}/files/issued`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`[DigiLockerProductionProvider] List documents failed HTTP ${response.status}`);
        return {
          success: false,
          error: response.status === 401 || response.status === 403 ? 'expired_token' : 'service_unavailable',
          errorDescription: `DigiLocker document listing HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const rawList = data.items || data.files || [];
      const documents = rawList.map(item => ({
        providerDocumentId: item.uri || item.id || `DL-URI-${Math.random()}`,
        documentType: this.mapDocumentType(item.doctype || item.type || item.name),
        documentName: item.name || item.description || 'DigiLocker Document',
        issuer: item.issuer || 'Official Issuer',
        issueDate: item.date || item.issueDate || null,
        uri: item.uri || '',
      }));

      return {
        success: true,
        documents,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: err.name === 'AbortError' ? 'timeout' : 'network_failure',
        errorDescription: err.message,
      };
    }
  }

  async getDocument(accessToken, providerDocumentId) {
    this.validateConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const downloadUrl = `${this.apiBaseUrl}/file/download/${encodeURIComponent(providerDocumentId)}`;
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: response.status === 401 || response.status === 403 ? 'expired_token' : 'download_failed',
          errorDescription: `DigiLocker download HTTP ${response.status}`,
        };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') || 'application/pdf';
      const docType = this.mapDocumentType(providerDocumentId);

      return {
        success: true,
        providerDocumentId,
        documentType: docType,
        filename: `DigiLocker_${docType}_${Date.now()}.pdf`,
        mimeType,
        contentBuffer: buffer,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: err.name === 'AbortError' ? 'timeout' : 'network_failure',
        errorDescription: err.message,
      };
    }
  }

  async revokeAccess(accessToken) {
    this.validateConfig();
    try {
      await fetch(`${this.apiBaseUrl}/oauth2/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: accessToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });
      return { success: true, message: 'Revoked successfully' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  mapDocumentType(rawType = '') {
    const clean = String(rawType).toUpperCase();
    if (clean.includes('ADHR') || clean.includes('AADHAAR')) return 'AADHAAR';
    if (clean.includes('PAN') || clean.includes('TAX')) return 'PAN';
    if (clean.includes('DRV') || clean.includes('LICEN')) return 'DRIVING_LICENSE';
    if (clean.includes('PSPRT') || clean.includes('PASSPORT')) return 'PASSPORT';
    if (clean.includes('VOTER') || clean.includes('ELE') || clean.includes('EPIC')) return 'VOTER_ID';
    if (clean.includes('DEED') || clean.includes('PROP') || clean.includes('SALE') || clean.includes('REG')) return 'OWNERSHIP_DEED';
    return 'OTHER';
  }
}

export default DigiLockerProductionProvider;
