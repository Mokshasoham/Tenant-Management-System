import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
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
import paymentRoutes from './routes/paymentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import stripeRoutes from './routes/stripeRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js';
import propertyVisitRoutes from './routes/propertyVisitRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import { handleStripeWebhook } from './controllers/stripeController.js';
import { resolveLegacyUploadAlias } from './controllers/fileController.js';


const app = express();

// Connect to database
try {
  await connectDB();
} catch (err) {
  logger.error('Failed to start server:', err);
  process.exit(1);
}

// Middleware
app.use(helmet());
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
app.get('/uploads/:category/:filename', resolveLegacyUploadAlias, async (req, res, next) => {
  // Step 2: Legacy fallback — try disk (covers old seeded/existing records)
  const { category, filename } = req.params;
  const filePath = path.join(uploadsPath, category, filename);

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
app.use('/api/tenants', tenantRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
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

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start Cron Workers
startCronJobs();

const httpServer = createServer(app);

// Initialize Socket.io
socketHandler(httpServer);

const PORT = config.PORT;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

export default app;
