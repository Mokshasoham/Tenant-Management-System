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

export default config;
