import { DigiLockerProvider } from './digilockerProvider.js';
import logger from '../../platform/logging/logger.js';

export class DigiLockerDevelopmentProvider extends DigiLockerProvider {
  constructor() {
    super();
    this.providerName = 'development';
  }

  getAuthorizationUrl(state) {
    logger.info(`[DigiLockerDevelopmentProvider] Generating sandbox authorization URL for state: ${state}`);
    return `https://sandbox.digitallocker.gov.in/public/oauth2/1/authorize?response_type=code&client_id=DEV_CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fverifications%2Fdigilocker%2Fcallback&state=${encodeURIComponent(state)}&scope=read`;
  }

  async exchangeToken(code, state) {
    logger.info(`[DigiLockerDevelopmentProvider] Exchanging sandbox authorization code: ${code}`);

    if (code === 'INVALID_CODE') {
      return {
        success: false,
        error: 'invalid_grant',
        errorDescription: 'Authorization code is invalid or expired',
      };
    }

    return {
      success: true,
      accessToken: `dev_access_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      refreshToken: `dev_refresh_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      expiresIn: 3600,
      tokenType: 'Bearer',
      providerUserReference: 'DL-DEV-USER-998822',
      consentStatus: 'GRANTED',
    };
  }

  async getUserProfile(accessToken) {
    if (accessToken?.includes('expired')) {
      return { success: false, error: 'expired_token', errorDescription: 'Token has expired' };
    }
    return {
      success: true,
      digilockerId: 'DL-DEV-USER-998822',
      name: 'John Landlord',
      dob: '1985-05-15',
      gender: 'M',
    };
  }

  async listDocuments(accessToken) {
    logger.info(`[DigiLockerDevelopmentProvider] Listing DigiLocker issued documents for token`);

    if (accessToken?.includes('expired')) {
      return { success: false, error: 'expired_token', errorDescription: 'Token has expired' };
    }

    return {
      success: true,
      documents: [
        {
          providerDocumentId: 'DL-DOC-AADHAAR-8877',
          documentType: 'AADHAAR',
          documentName: 'Aadhaar Card (e-Aadhaar)',
          issuer: 'Unique Identification Authority of India (UIDAI)',
          issueDate: '2022-01-10',
          uri: 'in.gov.uidai-adhr-887766554433',
        },
        {
          providerDocumentId: 'DL-DOC-PAN-4433',
          documentType: 'PAN',
          documentName: 'PAN Verification Record',
          issuer: 'Income Tax Department',
          issueDate: '2021-06-20',
          uri: 'in.gov.tax-pan-ABCDE1234F',
        },
        {
          providerDocumentId: 'DL-DOC-OWNERSHIP-1122',
          documentType: 'OWNERSHIP_DEED',
          documentName: 'Property Title Certificate & Registered Sale Deed',
          issuer: 'Department of Stamps and Registration, Karnataka',
          issueDate: '2023-03-15',
          uri: 'in.gov.ka.registration-deed-9988',
        },
      ],
    };
  }

  async getDocument(accessToken, providerDocumentId) {
    logger.info(`[DigiLockerDevelopmentProvider] Fetching document content for ID: ${providerDocumentId}`);

    if (accessToken?.includes('expired')) {
      return { success: false, error: 'expired_token', errorDescription: 'Token has expired' };
    }

    let docType = 'OTHER';
    let docNumber = 'DL-REF-9988';
    let ownerName = 'John Landlord';
    let address = 'Plot 42, Green Heights';
    let surveyNumber = 'SN-9988';

    if (providerDocumentId.includes('AADHAAR')) {
      docType = 'AADHAAR';
      docNumber = '887766554433';
    } else if (providerDocumentId.includes('PAN')) {
      docType = 'PAN';
      docNumber = 'ABCDE1234F';
    } else if (providerDocumentId.includes('OWNERSHIP')) {
      docType = 'OWNERSHIP_DEED';
      docNumber = 'DEED-KA-998877';
    }

    const payload = JSON.stringify({
      providerDocumentId,
      documentType: docType,
      documentNumber: docNumber,
      ownerName,
      address,
      surveyNumber,
      issuedAt: new Date().toISOString(),
    });

    return {
      success: true,
      providerDocumentId,
      documentType: docType,
      filename: `DigiLocker_${docType}_${providerDocumentId}.json`,
      mimeType: 'application/json',
      contentBuffer: Buffer.from(payload),
      rawPayload: payload,
    };
  }

  async revokeAccess(accessToken) {
    logger.info(`[DigiLockerDevelopmentProvider] Revoking DigiLocker consent for token`);
    return {
      success: true,
      message: 'DigiLocker consent revoked successfully',
    };
  }
}

export default DigiLockerDevelopmentProvider;
