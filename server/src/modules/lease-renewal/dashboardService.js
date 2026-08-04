import mongoose from 'mongoose';
import Lease from '../../models/Lease.js';
import Tenant from '../../models/Tenant.js';
import Property from '../../models/Property.js';
import Payment from '../../models/Payment.js';
import Maintenance from '../../models/Maintenance.js';
import User from '../../models/User.js';
import LeaseRenewalAudit from '../../models/LeaseRenewalAudit.js';
import LeaseRenewal from './model.js';
import { DomainError, ErrorCatalog } from '../../platform/errors/errorCatalog.js';

/**
 * Fetch aggregated Lease Renewal Dashboard payload for a tenant user.
 * 
 * @param {string} userId - User identifier
 * @returns {Promise<object>} Consolidated dashboard metrics
 */
export const getTenantDashboardData = async (userId) => {
  const user = await User.findById(userId).select('name email');
  if (!user) {
    throw new DomainError(ErrorCatalog.AUTH.UNAUTHORIZED);
  }

  // 1. Resolve Tenant record
  const tenant = await Tenant.findOne({ email: user.email });
  if (!tenant) {
    return { hasActiveLease: false, user: { name: user.name } };
  }

  // 2. Resolve Active Lease
  const lease = await Lease.findOne({ tenant: tenant._id, status: 'active' }).populate('property');
  if (!lease) {
    return { hasActiveLease: false, user: { name: user.name }, tenantId: tenant._id };
  }

  const property = lease.property;
  const unitNumber = lease.unitNumber || property?.unitNumber || 'N/A';

  // 3. Calculate remaining days
  const endDate = new Date(lease.endDate);
  const today = new Date();
  const timeDiff = endDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));

  // 4. Resolve Active Lease Renewal request
  const activeRenewal = await LeaseRenewal.findOne({
    lease: lease._id,
    status: { $ne: 'cancelled' }
  }).sort({ createdAt: -1 });

  // 5. Check Outstanding Payments
  const unpaidPayments = await Payment.find({
    lease: lease._id,
    status: { $in: ['pending', 'partially_paid', 'overdue'] }
  });
  const outstandingBalance = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const overduePaymentsCount = unpaidPayments.filter(p => p.status === 'overdue').length;

  // 6. Check Active Maintenance Requests
  const maintenanceRequests = await Maintenance.find({
    property: property?._id,
    tenant: tenant._id
  });
  const openMaintenanceCount = maintenanceRequests.filter(m => ['open', 'in_progress'].includes(m.status)).length;

  // 7. Calculate Health Score
  // Base score 100
  // Deductions:
  // - -15 per overdue payment
  // - -10 per open maintenance ticket
  // - -20 if lease is expired
  // - -10 if KYC is pending (mocked factor)
  let healthScore = 100;
  if (overduePaymentsCount > 0) healthScore -= Math.min(45, overduePaymentsCount * 15);
  if (openMaintenanceCount > 0) healthScore -= Math.min(30, openMaintenanceCount * 10);
  if (daysRemaining === 0) healthScore -= 20;
  healthScore = Math.max(10, healthScore);

  // 8. Resolve Timeline logs from LeaseRenewalAudit
  const auditLogs = activeRenewal 
    ? await LeaseRenewalAudit.find({ leaseRenewalId: activeRenewal._id }).sort({ createdAt: 1 })
    : [];

  const timeline = auditLogs.map(log => ({
    action: log.action,
    timestamp: log.createdAt,
    description: `Action ${log.action} performed by ${log.userId ? 'User' : 'System'}`
  }));

  // Add default baseline item to timeline
  timeline.unshift({
    action: 'lease_created',
    timestamp: lease.createdAt || lease.startDate,
    description: 'Current lease agreement created and activated'
  });

  // 9. Checklist for Eligibility
  const eligibility = {
    eligible: daysRemaining <= 90 && outstandingBalance === 0 && openMaintenanceCount === 0 && !activeRenewal,
    checklist: {
      withinRenewalWindow: daysRemaining <= 90,
      noOutstandingRent: outstandingBalance === 0,
      noPendingMaintenance: openMaintenanceCount === 0,
      noExistingRequest: !activeRenewal,
      leaseNotExpired: daysRemaining > 0
    }
  };

  // 10. Documents Registry
  const documents = [
    {
      id: `doc-lease-${lease._id}`,
      name: 'Current Lease Agreement.pdf',
      category: 'lease',
      uploadedAt: lease.createdAt || lease.startDate,
      version: '1.0.0'
    }
  ];
  if (activeRenewal) {
    documents.push({
      id: `doc-ren-${activeRenewal._id}`,
      name: `Renewal_Offer_${activeRenewal.renewalNumber}.pdf`,
      category: 'renewal_agreement',
      uploadedAt: activeRenewal.createdAt,
      version: `1.0.${activeRenewal.version || 0}`
    });
  }

  // 11. Recent Activities log
  const recentActivities = auditLogs.slice(-5).map(log => ({
    id: log._id,
    action: log.action,
    timestamp: log.createdAt,
    message: `Lease Renewal Status updated to ${log.action}`
  }));

  return {
    hasActiveLease: true,
    user: { name: user.name, email: user.email },
    tenant: {
      id: tenant._id,
      name: tenant.name,
      status: tenant.status
    },
    property: {
      id: property?._id,
      name: property?.name || 'N/A',
      address: property?.address || 'N/A',
      unitNumber
    },
    lease: {
      id: lease._id,
      rentAmount: lease.rentAmount,
      securityDeposit: lease.securityDeposit || 0,
      startDate: lease.startDate,
      endDate: lease.endDate,
      duration: lease.duration || '12 months',
      daysRemaining,
      status: lease.status
    },
    activeRenewal: activeRenewal ? {
      id: activeRenewal._id,
      renewalNumber: activeRenewal.renewalNumber,
      status: activeRenewal.status,
      proposedRent: activeRenewal.proposedRent,
      duration: activeRenewal.duration,
      version: activeRenewal.version,
      message: activeRenewal.message,
      requestedStartDate: activeRenewal.requestedStartDate,
      requestedEndDate: activeRenewal.requestedEndDate
    } : null,
    payments: {
      outstandingBalance,
      overdueCount: overduePaymentsCount,
      unpaidCount: unpaidPayments.length,
      historyCount: unpaidPayments.length
    },
    maintenance: {
      openCount: openMaintenanceCount,
      totalCount: maintenanceRequests.length
    },
    healthScore,
    timeline,
    eligibility,
    documents,
    recentActivities
  };
};
