import mongoose from 'mongoose';
import Lease from '../../models/Lease.js';
import User from '../../models/User.js';
import Notification from '../../models/Notification.js';
import { generateAndStoreLeasePDF } from './leaseDocumentService.js';
import logger from '../../utils/logger.js';

class LeaseLifecycleService {
  /**
   * Event Dispatcher for Lease Lifecycle Pipeline
   */
  async dispatch(event, payload) {
    logger.info(`[leaseLifecycleService] Event dispatched: ${event} for leaseId: ${payload.leaseId}`);

    switch (event) {
      case 'LEASE_ACTIVATED':
      case 'LEASE_REGENERATION_REQUESTED':
        return this.handleLeaseActivated(payload);
      default:
        logger.warn(`[leaseLifecycleService] Unhandled lifecycle event: ${event}`);
        return null;
    }
  }

  /**
   * Handles LEASE_ACTIVATED extensible pipeline:
   * 1. Status Update (pending -> generating)
   * 2. Enterprise PDF Generation & Storage (with idempotency check)
   * 3. Document Versioning & SHA256 registration
   * 4. In-App Notification Delivery
   * 5. Audit Logging & Fault-Tolerant Error Queueing
   */
  async handleLeaseActivated({ leaseId, user = null, forceRegenerate = false }) {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      logger.error(`[leaseLifecycleService] Cannot process activation: Lease ${leaseId} not found.`);
      return null;
    }

    // Step 1: Update status to 'generating'
    lease.documentGeneration = lease.documentGeneration || {};
    lease.documentGeneration.status = 'generating';
    lease.documentGeneration.lastAttempt = new Date();
    lease.documentGeneration.lastError = null;
    await lease.save();

    try {
      // Step 2: Generate & Store Enterprise PDF
      const pdfResult = await generateAndStoreLeasePDF({
        leaseId,
        user,
        forceRegenerate,
      });

      // Step 3: Update status to 'completed'
      lease.documentGeneration.status = 'completed';
      lease.documentGeneration.completedAt = new Date();
      await lease.save();

      // Step 4: Deliver In-App Notification to Tenant
      try {
        const tenantModel = mongoose.model('Tenant');
        const tenant = await tenantModel.findById(lease.tenant);
        if (tenant && tenant.email) {
          const tenantUser = await User.findOne({ email: tenant.email });
          if (tenantUser) {
            await Notification.create({
              recipient: tenantUser._id,
              sender: user ? user._id : lease.createdBy,
              title: 'Lease Agreement Generated Successfully',
              message: `Your official enterprise lease agreement (${lease.leaseNumber}) has been generated and is ready for download and preview.`,
              type: 'success',
              link: `/api/files/download/${pdfResult.fileId}`,
            });
            logger.info(`[leaseLifecycleService] Delivered lease PDF notification to tenant ${tenantUser.email}`);
          }
        }
      } catch (notifErr) {
        logger.error(`[leaseLifecycleService] Notification delivery failed (non-blocking): ${notifErr.message}`);
      }

      logger.info(`[leaseLifecycleService] Pipeline completed cleanly for lease ${lease.leaseNumber}`);
      return pdfResult;
    } catch (err) {
      logger.error(`[leaseLifecycleService] PDF generation failed for lease ${lease.leaseNumber}: ${err.message}`);

      // Fault Tolerance: Update documentGeneration status to 'failed' without breaking lease activation
      lease.documentGeneration.status = 'failed';
      lease.documentGeneration.retryCount = (lease.documentGeneration.retryCount || 0) + 1;
      lease.documentGeneration.lastError = err.message;
      await lease.save();

      return null;
    }
  }
}

export const leaseLifecycleService = new LeaseLifecycleService();
export default leaseLifecycleService;
