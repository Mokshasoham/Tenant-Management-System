const bootStart = Date.now();
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';
import fs from 'fs';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import config from './config/config.js';
import logger from './utils/logger.js';
import { requestLogger, securityHeaders } from './middleware/common.js';
import { errorHandler, notFoundHandler } from './utils/errorHandling.js';
import { startCronJobs } from './utils/cronJobs.js';
import socketHandler from './socket/socketHandler.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import leaseRoutes from './routes/leaseRoutes.js';
import leaseRenewalRoutes from './routes/leaseRenewalRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import v1NotificationRoutes from './routes/v1NotificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import stripeRoutes from './routes/stripeRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js';
import propertyVisitRoutes from './routes/propertyVisitRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import billRoutes from './routes/billRoutes.js';
import leaseRenewalV1Routes from './modules/lease-renewal/routes.js';
import { handleStripeWebhook } from './controllers/stripeController.js';
import { resolveLegacyUploadAlias } from './controllers/fileController.js';
import { verifyEmailConfiguration } from './services/emailProvider.js';

// Platform Hardening Imports
import { validateEnv } from './platform/config/index.js';
import container from './platform/container.js';
import cacheProvider from './platform/cache/cacheProvider.js';
import jobDispatcher from './platform/jobs/jobDispatcher.js';
import storageProvider from './platform/storage/storageProvider.js';
import healthRoutes from './routes/healthRoutes.js';
import schedulerRoutes from './routes/schedulerRoutes.js';
import helmetConfig from './platform/security/helmetConfig.js';
import { registerLeaseRenewalSchedulers } from './modules/lease-renewal/schedulers/index.js';
import { subscribeNotificationListeners } from './modules/lease-renewal/notifications/notificationEventRegistry.js';
import v1ReminderRoutes from './routes/v1ReminderRoutes.js';
import reminderEventSubscriber from './modules/reminders/events/reminderEventSubscriber.js';
import outboxWorker from './platform/events/outboxWorker.js';
import schedulerRegistry from './platform/scheduler/SchedulerRegistry.js';

const app = express();

// Server Startup Lifecycle Pipeline
try {
  // 1. Validate Environment
  validateEnv();
  logger.info('Environment validation passed.');

  // 2. Register Providers
  container.register('cache', cacheProvider);
  container.register('jobs', jobDispatcher);
  container.register('storage', storageProvider);

  // 3. Initialize Providers
  await cacheProvider.initialize();
  await jobDispatcher.initialize();
  await storageProvider.initialize();

  // 4. Connect to database
  await connectDB();
  logger.info('Database connected successfully.');

  // 5. Register all schedulers & notification event listeners
  registerLeaseRenewalSchedulers();
  subscribeNotificationListeners();
  reminderEventSubscriber.subscribe();
  outboxWorker.start();
  logger.info('Schedulers, outbox worker, and notification event listeners registered.');

  // 6. Freeze Container (make read-only)
  Object.freeze(container);
  logger.info('Platform dependency container frozen.');

  // Verify Email API configuration
  verifyEmailConfiguration();
} catch (err) {
  logger.error('CRITICAL BOOTSTRAP FAILURE: Server startup aborted.', err);
  process.exit(1);
}

// Middleware
app.use(helmetConfig);
app.use(compression());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));

// Stripe Webhook MUST be processed before express.json() parses the body!
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ limit: '16mb', extended: true }));

// Custom middleware
app.use(requestLogger);
app.use(securityHeaders);

// DEPRECATED: /uploads alias — routes through centralized File Service for backward compatibility
// New uploads use /api/files/download/:fileId or /api/files/signed-url/:fileId
const uploadsPath = path.join(__dirname, '..', 'uploads');

// Step 1: Try centralized FileMetadata lookup (covers all new uploads)
// Step 1: Try centralized FileMetadata lookup (covers all new uploads)
app.get(/^\/+(?:uploads)\/+(properties|leases|invoices|chat|kyc|avatars)\/+(.+)$/i, async (req, res, next) => {
  const category = req.params[0];
  const filename = req.params[1];
  
  req.params.category = category;
  req.params.filename = filename;

  return resolveLegacyUploadAlias(req, res, async () => {
    // Step 2: Legacy fallback — try disk (covers old seeded/existing records)
    let resolvedCategory = category;
    if (filename.startsWith('invoice_')) {
      resolvedCategory = 'invoices';
    } else if (filename.startsWith('lease_')) {
      resolvedCategory = 'leases';
    }
    
    const filePath = path.join(uploadsPath, resolvedCategory, filename);

    if (fs.existsSync(filePath)) {
      logger.info(`[Legacy Uploads Alias] Serving from disk: ${filePath}`);
      return res.sendFile(filePath);
    }

    // Step 3: Try MongoDB FileStorage binary backup
    try {
      const FileStorage = mongoose.model('FileStorage');
      const storedFile = await FileStorage.findOne({ filename });
      if (storedFile) {
        const targetDir = path.dirname(filePath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        await fs.promises.writeFile(filePath, storedFile.data);
        res.setHeader('Content-Type', storedFile.mimeType);
        return res.send(storedFile.data);
      }
    } catch (err) {
      logger.error(`[Legacy Uploads Alias] DB FileStorage lookup error for ${filename}:`, err);
    }

    // Step 4: On-the-fly PDF regeneration (invoices & leases only)
    try {
      if (filename.startsWith('invoice_') && filename.endsWith('.pdf')) {
        const paymentId = filename.replace('invoice_', '').replace('.pdf', '');
        if (mongoose.Types.ObjectId.isValid(paymentId)) {
          const Payment = mongoose.model('Payment');
          const Tenant = mongoose.model('Tenant');
          const Property = mongoose.model('Property');
          const payment = await Payment.findById(paymentId);
          if (payment) {
            const tenant = await Tenant.findById(payment.tenant) || { firstName: 'Valued', lastName: 'Tenant', email: 'tenant@tms.com' };
            const property = await Property.findById(payment.property) || { name: 'Assigned Residence', address: 'Property Address' };
            logger.info(`[Legacy Uploads Alias] On-the-fly regenerating invoice: ${filename}`);
            const { generateInvoicePDF } = await import('./services/pdfService.js');
            await generateInvoicePDF(payment, tenant, property);
            if (fs.existsSync(filePath)) return res.sendFile(filePath);
          }
        }
      } else if (filename.startsWith('lease_') && filename.endsWith('.pdf')) {
        const leaseRef = filename.replace('lease_', '').replace('.pdf', '');
        const Lease = mongoose.model('Lease');
        const Tenant = mongoose.model('Tenant');
        const Property = mongoose.model('Property');
        let lease = await Lease.findOne({ leaseNumber: leaseRef });
        if (!lease && mongoose.Types.ObjectId.isValid(leaseRef)) lease = await Lease.findById(leaseRef);
        if (lease) {
          const tenant = await Tenant.findById(lease.tenant) || { firstName: 'Valued', lastName: 'Tenant', email: 'tenant@tms.com' };
          const property = await Property.findById(lease.property) || { name: 'Assigned Residence', address: 'Property Address', city: 'City', zipCode: '000000' };
          logger.info(`[Legacy Uploads Alias] On-the-fly regenerating lease: ${filename}`);
          const { generateAndUploadLeasePDF } = await import('./services/pdfService.js');
          await generateAndUploadLeasePDF(lease, tenant, property, lease.signature);
          if (fs.existsSync(filePath)) return res.sendFile(filePath);
        }
      }
    } catch (err) {
      logger.error(`[Legacy Uploads Alias] On-the-fly regeneration error for ${filename}:`, err);
    }

    next();
  });
});

// Legacy static fallback for any remaining seeded files
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/', healthRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api', leaseRenewalRoutes);
app.use('/api/v1/lease-renewals', leaseRenewalV1Routes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', v1NotificationRoutes);
app.use('/api/v1/reminders', v1ReminderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/visits', propertyVisitRoutes);
app.use('/api/files', fileRoutes);

// General auth-protected Stripe routes
app.use('/api/stripe', stripeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/v1/schedulers', schedulerRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start Cron Workers
startCronJobs();

// Start Platform Schedulers
await schedulerRegistry.startAll();
logger.info('Platform schedulers started.');

const httpServer = createServer(app);

// Initialize Socket.io
socketHandler(httpServer);

const PORT = config.PORT || 5000;

// Track active connections for graceful socket closing
const activeConnections = new Set();
httpServer.on('connection', (conn) => {
  activeConnections.add(conn);
  conn.on('close', () => {
    activeConnections.delete(conn);
  });
});

httpServer.listen(PORT, async () => {
  const startupTime = ((Date.now() - bootStart) / 1000).toFixed(2);

  // Dynamic status check details
  const dbStatus = mongoose.connection.readyState === 1 ? '✓ Connected' : '✗ Disconnected';
  
  let cacheStatus = '✓ Ready';
  try { if (!container.resolveCache()) cacheStatus = '✗ Unavailable'; } catch { cacheStatus = '✗ Unavailable'; }

  let storageStatus = '✓ Ready';
  try { if (!container.resolveStorage()) storageStatus = '✗ Unavailable'; } catch { storageStatus = '✗ Unavailable'; }

  let emailStatus = '✓ Ready';
  try { if (!container.resolveEmail()) emailStatus = '✗ Unavailable'; } catch { emailStatus = '✗ Unavailable'; }

  let jobsStatus = '✓ Ready';
  try { if (!container.resolveJobs()) jobsStatus = '✗ Unavailable'; } catch { jobsStatus = '✗ Unavailable'; }

  // Expose versions
  const { PLATFORM_VERSION, APPLICATION_VERSION, NODE_VERSION, GIT_COMMIT } = await import('./platform/version.js');

  console.log(`
=========================================================
  Tenant Management SaaS Platform

  Application Version : ${APPLICATION_VERSION}
  Platform Version    : ${PLATFORM_VERSION}
  Environment         : ${config.APP_ENV || config.NODE_ENV}
  Node                : ${NODE_VERSION}
  Git Commit          : ${GIT_COMMIT}

  MongoDB             ${dbStatus}
  Cache               ${cacheStatus}
  Storage             ${storageStatus}
  Email               ${emailStatus}
  Jobs                ${jobsStatus}
  Events              ✓ Ready

  API                 Listening on port :${PORT}
  Startup Time        :${startupTime}s
=========================================================
  `);
});

// Idempotent Graceful Shutdown Sequence
let shuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);

  // Force exit timer
  const forceExit = setTimeout(() => {
    logger.fatal('Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, shutdownTimeout);

  // 1. Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed. No longer accepting requests.');

    // 2. Close active HTTP keep-alive connections
    for (const conn of activeConnections) {
      conn.destroy();
    }
    logger.info('Closed active HTTP keep-alive connections.');

    // 3. Shutdown providers in sequence
    try {
      const email = container.resolveEmail();
      if (email && typeof email.shutdown === 'function') await email.shutdown();
    } catch {}

    // 3a. Stop platform schedulers & outbox worker (before jobs — schedulers may dispatch jobs)
    try {
      await schedulerRegistry.stopAll();
      outboxWorker.stop();
    } catch {}

    try {
      const cache = container.resolveCache();
      if (cache && typeof cache.shutdown === 'function') await cache.shutdown();
    } catch {}

    try {
      const storage = container.resolveStorage();
      if (storage && typeof storage.shutdown === 'function') await storage.shutdown();
    } catch {}

    try {
      const jobs = container.resolveJobs();
      if (jobs && typeof jobs.shutdown === 'function') await jobs.shutdown();
    } catch {}

    // 4. Disconnect from database
    try {
      await mongoose.disconnect();
      logger.info('Database connection closed.');
    } catch (err) {
      logger.error('Error closing database connection:', err);
    }

    logger.info('Graceful shutdown completed successfully.');
    clearTimeout(forceExit);
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

export default app;
