import mongoose from 'mongoose';
import config from './config.js';
import logger from '../utils/logger.js';

const redactMongoError = (message) => String(message || 'Unknown MongoDB error')
  .replace(/(mongodb(?:\\+srv)?:\\/\\/)[^@\\s]+@/gi, '$1[REDACTED]@');

const connectDB = async () => {
  try {
    logger.info('Connecting to the configured MongoDB database...');

    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected successfully');

    // Enforce MongoDB Replica Set transaction support in production
    if (config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
      try {
        await verifyClusterTransactionCapability(mongoose);
        logger.info('Production MongoDB Replica Set transaction capability verified successfully (write, read, commit, and cleanup verified).');
      } catch (err) {
        logger.error(`CRITICAL: Production MongoDB transaction-support probe failed: ${err.message}. A MongoDB Replica Set is strictly required in production. Refusing startup.`);
        process.exit(1);
      }
    }

    // Connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', {
        name: err?.name || 'MongoDBError',
        code: err?.code || null,
        message: redactMongoError(err?.message),
      });
    });

    return mongoose;
  } catch (err) {
    logger.error('MongoDB connection failed:', { name: err?.name || 'MongoDBError', code: err?.code || null, message: redactMongoError(err?.message) });
    process.exit(1);
  }
};

/**
 * Verifies that the connected MongoDB deployment genuinely supports multi-document ACID transactions.
 * Exercises real write, read, and commit operations on an ephemeral system probe collection,
 * guarantees best-effort cleanup in a finally block without masking primary errors,
 * and throws an error if transactions are unsupported or uncommitted.
 */
export const verifyClusterTransactionCapability = async (mongooseInstance = mongoose) => {
  const probeCollectionName = '__tms_cluster_capabilities';
  const db = mongooseInstance.connection.db;

  // 1. Ensure probe collection exists prior to starting transaction (MongoDB 4.0/4.2+ compatible)
  await db.createCollection(probeCollectionName).catch((createErr) => {
    if (createErr.code !== 48 && !createErr.message?.includes('already exists')) {
      throw createErr;
    }
  });

  const probeCollection = db.collection(probeCollectionName);
  const probeId = new mongooseInstance.Types.ObjectId();
  const probeTimestamp = new Date();

  let session = null;
  let transactionCommitted = false;
  let primaryError = null;

  try {
    session = await mongooseInstance.startSession();

    await session.withTransaction(async () => {
      // Real transactional write
      await probeCollection.insertOne(
        { _id: probeId, probe: 'tx_capability_verification', timestamp: probeTimestamp },
        { session }
      );

      // Real transactional read within session
      const inTxDoc = await probeCollection.findOne(
        { _id: probeId },
        { session }
      );

      if (!inTxDoc) {
        throw new Error('Transaction capability probe read returned null inside transaction session.');
      }
    });

    transactionCommitted = true;

    // 2. Verify transactional durability outside the session
    const committedDoc = await probeCollection.findOne({ _id: probeId });
    if (!transactionCommitted || !committedDoc) {
      throw new Error('Transaction capability probe was not durable after transaction commit.');
    }

    return true;
  } catch (err) {
    primaryError = err;
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch((sessionErr) => {
        logger.warn(`[Cluster Capability Probe] Session end warning: ${sessionErr.message}`);
      });
    }

    // 3. Best-effort cleanup strictly isolated to this unique probe document
    try {
      await probeCollection.deleteOne({ _id: probeId });
    } catch (cleanupErr) {
      logger.warn(`[Cluster Capability Probe] Failed to delete probe document ${probeId}: ${cleanupErr.message}`);
      // If no primary error occurred, a cleanup failure MUST fail the capability check to prevent false positives
      if (!primaryError) {
        throw new Error(`Transaction capability check failed during probe cleanup: ${cleanupErr.message}`);
      }
      // If primaryError already exists, do not mask it; allow the primary error to propagate
    }
  }
};

export default connectDB;
