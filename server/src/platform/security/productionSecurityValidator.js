import config from '../../config/config.js';
import logger from '../logging/logger.js';

const WEAK_JWT_SECRETS = [
  'your_super_secret_jwt_key_change_in_production_12345',
  'secret',
  'jwtsecret',
  '123456',
  'default',
  'password',
  'change_me',
  'admin',
];

const WEAK_ENCRYPTION_KEYS = [
  'default_encryption_key',
  'secret_key_12345',
  '00000000000000000000000000000000',
  '12345678901234567890123456789012',
  'change_this_encryption_key_32bytes',
];

export const validateProductionSecurityConfig = () => {
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  if (nodeEnv !== 'production') {
    // Non-production environments continue to work normally
    return true;
  }

  const errors = [];

  // 1. JWT Secret Validation
  const jwtSecret = process.env.JWT_SECRET || config.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET: Environment variable is missing in production.');
  } else if (WEAK_JWT_SECRETS.includes(jwtSecret.toLowerCase()) || jwtSecret.length < 16) {
    errors.push('JWT_SECRET: Production JWT secret is weak or using a default placeholder.');
  }

  // 2. Encryption Key Validation
  const encryptionKey = process.env.TOKEN_SECRET || process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    errors.push('TOKEN_SECRET/ENCRYPTION_KEY: Encryption key environment variable is missing in production.');
  } else if (WEAK_ENCRYPTION_KEYS.includes(encryptionKey.toLowerCase()) || encryptionKey.length < 32) {
    errors.push('TOKEN_SECRET/ENCRYPTION_KEY: Production encryption key must be a strong key of at least 32 characters.');
  }

  // 3. Demo / Mock Mode Rejection in Production
  if (process.env.DEMO_MODE === 'true' || config.DEMO_MODE === true) {
    errors.push('DEMO_MODE: DEMO_MODE must not be set to true in production environment.');
  }

  // 4. Real Verification Feature Provider Credential Checks when Enabled in Production
  const checkFeature = (flagName, credsConfigured, categoryName) => {
    if (process.env[flagName] === 'true' && !credsConfigured) {
      errors.push(`${categoryName}: Feature is enabled (${flagName}=true) but production provider API credentials/URL are missing or invalid.`);
    }
  };

  checkFeature(
    'REAL_IDENTITY_VERIFICATION',
    Boolean(process.env.IDENTITY_PROVIDER_API_KEY && process.env.IDENTITY_PROVIDER_URL),
    'IDENTITY_PROVIDER'
  );
  checkFeature(
    'REAL_PROPERTY_VERIFICATION',
    Boolean(process.env.PROPERTY_PROVIDER_API_KEY && process.env.PROPERTY_PROVIDER_URL),
    'PROPERTY_PROVIDER'
  );
  checkFeature(
    'REAL_DIGILOCKER_VERIFICATION',
    Boolean(config.DIGILOCKER_CLIENT_ID && config.DIGILOCKER_CLIENT_SECRET && config.DIGILOCKER_REDIRECT_URI),
    'DIGILOCKER_PROVIDER'
  );
  checkFeature(
    'REAL_AADHAAR_VERIFICATION',
    Boolean(config.AADHAAR_PROVIDER_API_KEY && config.AADHAAR_PROVIDER_URL),
    'AADHAAR_PROVIDER'
  );
  checkFeature(
    'REAL_PAN_VERIFICATION',
    Boolean(config.PAN_PROVIDER_API_KEY && config.PAN_PROVIDER_URL),
    'PAN_PROVIDER'
  );
  checkFeature(
    'REAL_GST_VERIFICATION',
    Boolean(config.GST_PROVIDER_API_KEY && config.GST_PROVIDER_URL),
    'GST_PROVIDER'
  );
  checkFeature(
    'REAL_FACIAL_VERIFICATION',
    Boolean(config.FACIAL_PROVIDER_API_KEY && config.FACIAL_PROVIDER_URL),
    'FACIAL_PROVIDER'
  );
  checkFeature(
    'REAL_VIDEO_KYC_VERIFICATION',
    Boolean(config.VIDEO_KYC_PROVIDER_API_KEY && config.VIDEO_KYC_PROVIDER_URL),
    'VIDEO_KYC_PROVIDER'
  );
  checkFeature(
    'REAL_FRAUD_DETECTION',
    Boolean(config.FRAUD_PROVIDER_API_KEY && config.FRAUD_PROVIDER_URL),
    'FRAUD_PROVIDER'
  );
  checkFeature(
    'REAL_SANCTION_SCREENING',
    Boolean(config.SANCTION_PROVIDER_API_KEY && config.SANCTION_PROVIDER_URL),
    'SANCTION_PROVIDER'
  );

  if (errors.length > 0) {
    const errorMessage = `PRODUCTION SECURITY VALIDATION FAILED:\n- ${errors.join('\n- ')}`;
    logger.error(`[ProductionSecurityValidator] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  logger.info('[ProductionSecurityValidator] Production security configuration validated successfully.');
  return true;
};

export default validateProductionSecurityConfig;
