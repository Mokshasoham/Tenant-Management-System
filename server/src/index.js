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
import path from 'path';
import { createServer } from 'http';
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
import { handleStripeWebhook } from './controllers/stripeController.js';


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

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
