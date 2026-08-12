import dotenv from 'dotenv';
import { validateProductionSecurityConfig } from '../security/productionSecurityValidator.js';
dotenv.config();

/**
 * Validates environment variables by classification:
 * - Critical: Fails startup instantly.
 * - Feature-Required: Fails startup only if the specific feature is enabled.
 * - Optional: Warns user about missing non-critical assets.
 */
export const validateEnv = () => {
  const critical = ['MONGODB_URI', 'JWT_SECRET'];
  const featureRequired = [];
  const optional = [
    'SMTP_USER', 'SMTP_PASS', 'RESEND_API_KEY', 'LOG_LEVEL',
    // Scheduler cron expressions — optional; if absent, schedulers log "Using default cron expression..."
    // and fall back to their hardcoded defaults. Never fails startup.
    'SCHEDULER_CAMPAIGN_CREATION_CRON',
    'SCHEDULER_EXPIRATION_CRON',
    'SCHEDULER_ESCALATION_CRON',
    'SCHEDULER_CAMPAIGN_CREATION_LOOKAHEAD_DAYS',
    'SCHEDULER_SLA_WARNING_HOURS',
    'SCHEDULER_SLA_ESCALATION_GRACE_HOURS',
    'SCHEDULER_TIMEZONE'
  ];

  // Critical checks
  const missingCritical = critical.filter(v => !process.env[v]);
  if (missingCritical.length > 0) {
    throw new Error(`CRITICAL CONFIGURATION ERROR: Missing required variables: ${missingCritical.join(', ')}`);
  }

  // Feature-Specific checks
  const emailEnabled = process.env.EMAIL_ENABLED !== 'false';
  if (emailEnabled) {
    if (!process.env.RESEND_API_KEY && !process.env.SMTP_PASS) {
      throw new Error(`FEATURE CONFIGURATION ERROR: Email feature is enabled but neither RESEND_API_KEY nor SMTP_PASS is defined.`);
    }
  }

  const paymentEnabled = process.env.PAYMENTS_ENABLED !== 'false';
  if (paymentEnabled) {
    if (!process.env.STRIPE_SECRET_KEY && !process.env.RAZORPAY_KEY_SECRET) {
      console.warn(`[WARN] Payments feature is enabled but no payment secrets (STRIPE_SECRET_KEY, RAZORPAY_KEY_SECRET) were detected.`);
    }
  }

  // Optional warnings
  const missingOptional = optional.filter(v => !process.env[v]);
  if (missingOptional.length > 0) {
    console.log(`[WARN] Missing optional configuration parameters: ${missingOptional.join(', ')}`);
  }

  // Production security validation
  validateProductionSecurityConfig();
};
