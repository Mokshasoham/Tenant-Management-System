import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  BASE_URL: process.env.BASE_URL || 'http://localhost:5000',
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173',
  CLIENT_URL: process.env.FRONTEND_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production_12345',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  
  // Resend API Configuration
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || 'support@yourdomain.com',
  
  // Logs
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  
  // Verification & Demo Configuration
  DEMO_MODE: process.env.DEMO_MODE === 'true' || true,
  REAL_IDENTITY_VERIFICATION: process.env.REAL_IDENTITY_VERIFICATION === 'true' || false,
  IDENTITY_VERIFICATION_MAX_ATTEMPTS: parseInt(process.env.IDENTITY_VERIFICATION_MAX_ATTEMPTS || '3', 10),
  IDENTITY_VERIFICATION_ATTEMPT_WINDOW_HOURS: parseInt(process.env.IDENTITY_VERIFICATION_ATTEMPT_WINDOW_HOURS || '24', 10),
  REAL_PROPERTY_VERIFICATION: process.env.REAL_PROPERTY_VERIFICATION === 'true' || false,
  PROPERTY_VERIFICATION_MAX_ATTEMPTS: parseInt(process.env.PROPERTY_VERIFICATION_MAX_ATTEMPTS || '3', 10),
  PROPERTY_VERIFICATION_ATTEMPT_WINDOW_HOURS: parseInt(process.env.PROPERTY_VERIFICATION_ATTEMPT_WINDOW_HOURS || '24', 10),
  REAL_DIGILOCKER_VERIFICATION: process.env.REAL_DIGILOCKER_VERIFICATION === 'true' || false,
  DIGILOCKER_CLIENT_ID: process.env.DIGILOCKER_CLIENT_ID || '',
  DIGILOCKER_CLIENT_SECRET: process.env.DIGILOCKER_CLIENT_SECRET || '',
  DIGILOCKER_REDIRECT_URI: process.env.DIGILOCKER_REDIRECT_URI || 'http://localhost:5000/api/verifications/digilocker/callback',
  DIGILOCKER_API_BASE_URL: process.env.DIGILOCKER_API_BASE_URL || 'https://api.digitallocker.gov.in/public/oauth2/1',
  DIGILOCKER_AUTH_URL: process.env.DIGILOCKER_AUTH_URL || 'https://api.digitallocker.gov.in/public/oauth2/1/authorize',
  DIGILOCKER_TOKEN_URL: process.env.DIGILOCKER_TOKEN_URL || 'https://api.digitallocker.gov.in/public/oauth2/1/token',
  DIGILOCKER_TIMEOUT_MS: parseInt(process.env.DIGILOCKER_TIMEOUT_MS || '10000', 10),
  DIGILOCKER_MAX_ATTEMPTS: parseInt(process.env.DIGILOCKER_MAX_ATTEMPTS || '3', 10),
  DIGILOCKER_ATTEMPT_WINDOW_HOURS: parseInt(process.env.DIGILOCKER_ATTEMPT_WINDOW_HOURS || '24', 10),
  REAL_FACIAL_VERIFICATION: process.env.REAL_FACIAL_VERIFICATION === 'true' || false,
  FACIAL_PROVIDER_API_KEY: process.env.FACIAL_PROVIDER_API_KEY || '',
  FACIAL_PROVIDER_SECRET: process.env.FACIAL_PROVIDER_SECRET || '',
  FACIAL_PROVIDER_URL: process.env.FACIAL_PROVIDER_URL || '',
  FACIAL_VERIFICATION_TIMEOUT_MS: parseInt(process.env.FACIAL_VERIFICATION_TIMEOUT_MS || '10000', 10),
  FACIAL_VERIFICATION_MAX_ATTEMPTS: parseInt(process.env.FACIAL_VERIFICATION_MAX_ATTEMPTS || '3', 10),
  FACIAL_VERIFICATION_ATTEMPT_WINDOW_HOURS: parseInt(process.env.FACIAL_VERIFICATION_ATTEMPT_WINDOW_HOURS || '24', 10),
  CURRENT_BIOMETRIC_CONSENT_VERSION: process.env.CURRENT_BIOMETRIC_CONSENT_VERSION || 'v1.0',
  CURRENT_BIOMETRIC_CONSENT_PURPOSE: process.env.CURRENT_BIOMETRIC_CONSENT_PURPOSE || 'Identity Verification & Liveness Audit',
  BIOMETRIC_METADATA_RETENTION_DAYS: parseInt(process.env.BIOMETRIC_METADATA_RETENTION_DAYS || '365', 10),
  BIOMETRIC_CONSENT_RETENTION_DAYS: parseInt(process.env.BIOMETRIC_CONSENT_RETENTION_DAYS || '730', 10),
  BIOMETRIC_AUDIT_RETENTION_DAYS: parseInt(process.env.BIOMETRIC_AUDIT_RETENTION_DAYS || '1095', 10),
  REAL_VIDEO_KYC_VERIFICATION: process.env.REAL_VIDEO_KYC_VERIFICATION === 'true' || false,
  VIDEO_KYC_PROVIDER_API_KEY: process.env.VIDEO_KYC_PROVIDER_API_KEY || '',
  VIDEO_KYC_PROVIDER_SECRET: process.env.VIDEO_KYC_PROVIDER_SECRET || '',
  VIDEO_KYC_PROVIDER_URL: process.env.VIDEO_KYC_PROVIDER_URL || '',
  VIDEO_KYC_TIMEOUT_MS: parseInt(process.env.VIDEO_KYC_TIMEOUT_MS || '10000', 10),
  VIDEO_KYC_SESSION_TIMEOUT_MINUTES: parseInt(process.env.VIDEO_KYC_SESSION_TIMEOUT_MINUTES || '15', 10),
  VIDEO_KYC_MAX_ATTEMPTS: parseInt(process.env.VIDEO_KYC_MAX_ATTEMPTS || '3', 10),
  VIDEO_KYC_ATTEMPT_WINDOW_HOURS: parseInt(process.env.VIDEO_KYC_ATTEMPT_WINDOW_HOURS || '24', 10),
  CURRENT_VIDEO_KYC_CONSENT_VERSION: process.env.CURRENT_VIDEO_KYC_CONSENT_VERSION || 'v1.0',
  CURRENT_VIDEO_KYC_CONSENT_PURPOSE: process.env.CURRENT_VIDEO_KYC_CONSENT_PURPOSE || 'Live Agent Video KYC & Geolocation Audit',
  VIDEO_KYC_SAVE_RECORDING: process.env.VIDEO_KYC_SAVE_RECORDING === 'true' || false,
  VIDEO_KYC_METADATA_RETENTION_DAYS: parseInt(process.env.VIDEO_KYC_METADATA_RETENTION_DAYS || '365', 10),
  VIDEO_KYC_MEDIA_RETENTION_DAYS: parseInt(process.env.VIDEO_KYC_MEDIA_RETENTION_DAYS || '30', 10),
  VIDEO_KYC_GEO_RETENTION_DAYS: parseInt(process.env.VIDEO_KYC_GEO_RETENTION_DAYS || '90', 10),
  VIDEO_KYC_CONSENT_RETENTION_DAYS: parseInt(process.env.VIDEO_KYC_CONSENT_RETENTION_DAYS || '730', 10),
  VIDEO_KYC_AUDIT_RETENTION_DAYS: parseInt(process.env.VIDEO_KYC_AUDIT_RETENTION_DAYS || '1095', 10),

  // Phase 3.6.6 Fraud Detection Engine Configuration
  REAL_FRAUD_DETECTION: process.env.REAL_FRAUD_DETECTION === 'true' || false,
  FRAUD_PROVIDER_API_KEY: process.env.FRAUD_PROVIDER_API_KEY || '',
  FRAUD_PROVIDER_SECRET: process.env.FRAUD_PROVIDER_SECRET || '',
  FRAUD_PROVIDER_URL: process.env.FRAUD_PROVIDER_URL || '',
  FRAUD_TIMEOUT_MS: parseInt(process.env.FRAUD_TIMEOUT_MS || '10000', 10),
  FRAUD_MAX_ATTEMPTS: parseInt(process.env.FRAUD_MAX_ATTEMPTS || '5', 10),
  FRAUD_ATTEMPT_WINDOW_HOURS: parseInt(process.env.FRAUD_ATTEMPT_WINDOW_HOURS || '24', 10),
  FRAUD_LOW_RISK_MAX: parseInt(process.env.FRAUD_LOW_RISK_MAX || '24', 10),
  FRAUD_MEDIUM_RISK_MAX: parseInt(process.env.FRAUD_MEDIUM_RISK_MAX || '49', 10),
  FRAUD_HIGH_RISK_MAX: parseInt(process.env.FRAUD_HIGH_RISK_MAX || '74', 10),
  FRAUD_CRITICAL_RISK_MIN: parseInt(process.env.FRAUD_CRITICAL_RISK_MIN || '75', 10),
  FRAUD_METADATA_RETENTION_DAYS: parseInt(process.env.FRAUD_METADATA_RETENTION_DAYS || '365', 10),
  FRAUD_AUDIT_RETENTION_DAYS: parseInt(process.env.FRAUD_AUDIT_RETENTION_DAYS || '1095', 10),

  // Phase 3.6.7 Sanctions, PEP & Adverse Media Screening Configuration
  REAL_SANCTION_SCREENING: process.env.REAL_SANCTION_SCREENING === 'true' || false,
  SANCTION_PROVIDER_API_KEY: process.env.SANCTION_PROVIDER_API_KEY || '',
  SANCTION_PROVIDER_SECRET: process.env.SANCTION_PROVIDER_SECRET || '',
  SANCTION_PROVIDER_URL: process.env.SANCTION_PROVIDER_URL || '',
  SANCTION_TIMEOUT_MS: parseInt(process.env.SANCTION_TIMEOUT_MS || '10000', 10),
  SANCTION_MAX_ATTEMPTS: parseInt(process.env.SANCTION_MAX_ATTEMPTS || '5', 10),
  SANCTION_ATTEMPT_WINDOW_HOURS: parseInt(process.env.SANCTION_ATTEMPT_WINDOW_HOURS || '24', 10),
  SANCTION_MATCH_THRESHOLD: parseInt(process.env.SANCTION_MATCH_THRESHOLD || '80', 10),
  PEP_MATCH_THRESHOLD: parseInt(process.env.PEP_MATCH_THRESHOLD || '75', 10),
  SANCTION_METADATA_RETENTION_DAYS: parseInt(process.env.SANCTION_METADATA_RETENTION_DAYS || '90', 10),
  SANCTION_AUDIT_RETENTION_DAYS: parseInt(process.env.SANCTION_AUDIT_RETENTION_DAYS || '2555', 10),

  // Phase 3.6.4 Aadhaar / PAN / GST Configuration
  REAL_AADHAAR_VERIFICATION: process.env.REAL_AADHAAR_VERIFICATION === 'true' || false,
  AADHAAR_PROVIDER_API_KEY: process.env.AADHAAR_PROVIDER_API_KEY || '',
  AADHAAR_PROVIDER_URL: process.env.AADHAAR_PROVIDER_URL || '',
  AADHAAR_TIMEOUT_MS: parseInt(process.env.AADHAAR_TIMEOUT_MS || '10000', 10),
  AADHAAR_MAX_ATTEMPTS: parseInt(process.env.AADHAAR_MAX_ATTEMPTS || '3', 10),
  AADHAAR_ATTEMPT_WINDOW_HOURS: parseInt(process.env.AADHAAR_ATTEMPT_WINDOW_HOURS || '24', 10),

  REAL_PAN_VERIFICATION: process.env.REAL_PAN_VERIFICATION === 'true' || false,
  PAN_PROVIDER_API_KEY: process.env.PAN_PROVIDER_API_KEY || '',
  PAN_PROVIDER_URL: process.env.PAN_PROVIDER_URL || '',
  PAN_TIMEOUT_MS: parseInt(process.env.PAN_TIMEOUT_MS || '10000', 10),
  PAN_MAX_ATTEMPTS: parseInt(process.env.PAN_MAX_ATTEMPTS || '3', 10),
  PAN_ATTEMPT_WINDOW_HOURS: parseInt(process.env.PAN_ATTEMPT_WINDOW_HOURS || '24', 10),

  REAL_GST_VERIFICATION: process.env.REAL_GST_VERIFICATION === 'true' || false,
  GST_PROVIDER_API_KEY: process.env.GST_PROVIDER_API_KEY || '',
  GST_PROVIDER_URL: process.env.GST_PROVIDER_URL || '',
  GST_TIMEOUT_MS: parseInt(process.env.GST_TIMEOUT_MS || '10000', 10),
  GST_MAX_ATTEMPTS: parseInt(process.env.GST_MAX_ATTEMPTS || '3', 10),
  GST_ATTEMPT_WINDOW_HOURS: parseInt(process.env.GST_ATTEMPT_WINDOW_HOURS || '24', 10),
  GST_ENABLED: process.env.GST_ENABLED === 'true' || false,

  ENGINE_VERSION: process.env.ENGINE_VERSION || 'demo-v1',
  VERIFICATION_OTP_MODE: process.env.VERIFICATION_OTP_MODE || 'MOCK',
  IDENTITY_VERIFICATION_MODE: process.env.IDENTITY_VERIFICATION_MODE || 'DEMO',
  AADHAAR_ENABLED: process.env.AADHAAR_ENABLED === 'true' || false,
  PAN_ENABLED: process.env.PAN_ENABLED === 'true' || false,
  DIGILOCKER_ENABLED: process.env.DIGILOCKER_ENABLED === 'true' || false,
  FACE_VERIFICATION_ENABLED: process.env.FACE_VERIFICATION_ENABLED === 'true' || false,
  RISK_THRESHOLD: parseInt(process.env.RISK_THRESHOLD || '40', 10),
  EXPIRY_REMINDER_DAYS: parseInt(process.env.EXPIRY_REMINDER_DAYS || '30', 10),
  
  // Paths
  DIR: __dirname,
  ROOT_DIR: path.join(__dirname, '..', '..'),
};

export const validateFraudConfig = (cfg) => {
  const { FRAUD_LOW_RISK_MAX, FRAUD_MEDIUM_RISK_MAX, FRAUD_HIGH_RISK_MAX, FRAUD_CRITICAL_RISK_MIN } = cfg;
  if (
    typeof FRAUD_LOW_RISK_MAX !== 'number' || isNaN(FRAUD_LOW_RISK_MAX) ||
    typeof FRAUD_MEDIUM_RISK_MAX !== 'number' || isNaN(FRAUD_MEDIUM_RISK_MAX) ||
    typeof FRAUD_HIGH_RISK_MAX !== 'number' || isNaN(FRAUD_HIGH_RISK_MAX) ||
    typeof FRAUD_CRITICAL_RISK_MIN !== 'number' || isNaN(FRAUD_CRITICAL_RISK_MIN)
  ) {
    throw new Error('[ConfigValidation] Fraud risk thresholds must be valid numbers.');
  }
  if (
    FRAUD_LOW_RISK_MAX < 0 || FRAUD_LOW_RISK_MAX > 100 ||
    FRAUD_MEDIUM_RISK_MAX < 0 || FRAUD_MEDIUM_RISK_MAX > 100 ||
    FRAUD_HIGH_RISK_MAX < 0 || FRAUD_HIGH_RISK_MAX > 100 ||
    FRAUD_CRITICAL_RISK_MIN < 0 || FRAUD_CRITICAL_RISK_MIN > 100
  ) {
    throw new Error('[ConfigValidation] Fraud risk thresholds must be between 0 and 100.');
  }
  if (
    !(FRAUD_LOW_RISK_MAX < FRAUD_MEDIUM_RISK_MAX &&
      FRAUD_MEDIUM_RISK_MAX < FRAUD_HIGH_RISK_MAX &&
      FRAUD_HIGH_RISK_MAX < FRAUD_CRITICAL_RISK_MIN)
  ) {
    throw new Error('[ConfigValidation] Fraud risk thresholds must be strictly ordered (LOW_MAX < MEDIUM_MAX < HIGH_MAX < CRITICAL_MIN).');
  }
};

export const validateSanctionConfig = (cfg) => {
  const { SANCTION_MATCH_THRESHOLD, PEP_MATCH_THRESHOLD } = cfg;
  if (
    typeof SANCTION_MATCH_THRESHOLD !== 'number' || isNaN(SANCTION_MATCH_THRESHOLD) ||
    typeof PEP_MATCH_THRESHOLD !== 'number' || isNaN(PEP_MATCH_THRESHOLD)
  ) {
    throw new Error('[ConfigValidation] Sanction/PEP match thresholds must be valid numbers.');
  }
  if (
    SANCTION_MATCH_THRESHOLD < 0 || SANCTION_MATCH_THRESHOLD > 100 ||
    PEP_MATCH_THRESHOLD < 0 || PEP_MATCH_THRESHOLD > 100
  ) {
    throw new Error('[ConfigValidation] Sanction/PEP match thresholds must be between 0 and 100.');
  }
  if (SANCTION_MATCH_THRESHOLD < PEP_MATCH_THRESHOLD) {
    throw new Error('[ConfigValidation] SANCTION_MATCH_THRESHOLD must be greater than or equal to PEP_MATCH_THRESHOLD.');
  }
};

validateFraudConfig(config);
validateSanctionConfig(config);

export default config;
