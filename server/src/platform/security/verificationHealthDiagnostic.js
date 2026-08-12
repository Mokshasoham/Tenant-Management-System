import config from '../../config/config.js';
import { CircuitBreakerRegistry } from './circuitBreaker.js';
import productionAlertService from './productionAlertService.js';

export const getVerificationHealthDiagnostics = () => {
  const modes = {
    identity: config.REAL_IDENTITY_VERIFICATION ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    property: config.REAL_PROPERTY_VERIFICATION ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    digilocker: config.REAL_DIGILOCKER ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    aadhaar: config.REAL_AADHAAR ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    pan: config.REAL_PAN ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    gst: config.REAL_GST ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    facial: config.REAL_FACIAL_VERIFICATION ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    videoKyc: config.REAL_VIDEO_KYC ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    fraud: config.REAL_FRAUD_DETECTION ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
    sanction: config.REAL_SANCTION_SCREENING ? 'PRODUCTION' : 'DEVELOPMENT_MOCK',
  };

  const credentialPresence = {
    identity: Boolean(process.env.IDENTITY_PROVIDER_API_KEY && process.env.IDENTITY_PROVIDER_URL),
    property: Boolean(process.env.PROPERTY_PROVIDER_API_KEY && process.env.PROPERTY_PROVIDER_URL),
    digilocker: Boolean(config.DIGILOCKER_CLIENT_ID && config.DIGILOCKER_CLIENT_SECRET && config.DIGILOCKER_REDIRECT_URI),
    aadhaar: Boolean(config.AADHAAR_PROVIDER_API_KEY && config.AADHAAR_PROVIDER_URL),
    pan: Boolean(config.PAN_PROVIDER_API_KEY && config.PAN_PROVIDER_URL),
    gst: Boolean(config.GST_PROVIDER_API_KEY && config.GST_PROVIDER_URL),
    facial: Boolean(config.FACIAL_PROVIDER_API_KEY && config.FACIAL_PROVIDER_URL),
    videoKyc: Boolean(config.VIDEO_KYC_PROVIDER_API_KEY && config.VIDEO_KYC_PROVIDER_URL),
    fraud: Boolean(config.FRAUD_PROVIDER_API_KEY && config.FRAUD_PROVIDER_URL),
    sanction: Boolean(config.SANCTION_PROVIDER_API_KEY && config.SANCTION_PROVIDER_URL),
  };

  // Readiness calculation per feature
  const readiness = {};
  for (const feature of Object.keys(modes)) {
    const isProduction = modes[feature] === 'PRODUCTION';
    const hasCreds = credentialPresence[feature];
    if (isProduction && !hasCreds) {
      readiness[feature] = 'MISCONFIGURED_MISSING_CREDS';
    } else if (isProduction) {
      readiness[feature] = 'PRODUCTION_READY';
    } else {
      readiness[feature] = 'DEVELOPMENT_MOCK_ACTIVE';
    }
  }

  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    activeModes: modes,
    credentialPresence,
    readiness,
    circuitBreakers: CircuitBreakerRegistry.getAllStates(),
    recentAlerts: productionAlertService.getRecentAlerts(10),
  };
};

export default getVerificationHealthDiagnostics;
