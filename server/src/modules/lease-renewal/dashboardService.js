import mongoose from 'mongoose';
import Lease from '../../models/Lease.js';
import Tenant from '../../models/Tenant.js';
import Property from '../../models/Property.js';
import Payment from '../../models/Payment.js';
import Maintenance from '../../models/Maintenance.js';
import User from '../../models/User.js';
import Booking from '../../models/Booking.js';
import LeaseRenewalAudit from '../../models/LeaseRenewalAudit.js';
import LeaseRenewal from './model.js';
import { DomainError, ErrorCatalog } from '../../platform/errors/errorCatalog.js';

/**
 * Fetch aggregated Lease Renewal Dashboard payload for a specific lease or single active lease.
 * 
 * @param {string} userId - User identifier
 * @param {string|null} targetLeaseId - Optional explicit lease identifier
 * @returns {Promise<object>} Consolidated dashboard metrics
 */
export const getTenantDashboardData = async (userId, targetLeaseId = null) => {
  const user = await User.findById(userId).select('name email phone firstName lastName');
  if (!user) {
    throw new DomainError(ErrorCatalog.AUTH.UNAUTHORIZED);
  }

  // 1. Resolve all tenant records & associated identities for this user
  const cleanEmail = (user.email || '').trim();
  const emailRegex = cleanEmail ? new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
  const cleanPhone = (user.phone || '').trim();
  const phoneRegex = cleanPhone ? new RegExp(`^${cleanPhone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;

  const tenants = await Tenant.find({
    $or: [
      ...(emailRegex ? [{ email: emailRegex }] : []),
      { user: userId },
      { userId: userId },
      ...(phoneRegex ? [{ phone: phoneRegex }] : []),
      ...(user.firstName && user.lastName ? [{
        firstName: new RegExp(`^${user.firstName.trim()}$`, 'i'),
        lastName: new RegExp(`^${user.lastName.trim()}$`, 'i')
      }] : [])
    ]
  });

  const tenantIds = Array.from(new Set([
    userId,
    user._id,
    ...tenants.map(t => t._id),
  ].filter(Boolean).map(id => id.toString())));

  // Collect embedded lease IDs
  const embeddedLeaseIds = [];
  for (const t of tenants) {
    if (Array.isArray(t.leases)) {
      embeddedLeaseIds.push(...t.leases.filter(Boolean));
    }
  }

  // Find all bookings with linked leases
  const userBookings = await Booking.find({
    $or: [
      { user: { $in: tenantIds } },
      { tenant: { $in: tenantIds } },
      ...(emailRegex ? [{ email: emailRegex }] : [])
    ]
  }).select('_id lease');
  const bookingLeaseIds = userBookings.map(b => b.lease).filter(Boolean);
  const allTargetLeaseIds = Array.from(new Set([...embeddedLeaseIds, ...bookingLeaseIds].map(id => id.toString())));

  // 2. Resolve the Target Lease
  let lease = null;

  if (targetLeaseId) {
    if (!mongoose.Types.ObjectId.isValid(targetLeaseId)) {
      throw new DomainError(ErrorCatalog.LEASE.NOT_FOUND);
    }

    lease = await Lease.findOne({
      _id: targetLeaseId,
      $or: [
        { tenant: { $in: tenantIds } },
        { _id: { $in: allTargetLeaseIds } },
      ]
    }).populate({
      path: 'property',
      populate: { path: 'manager', select: 'name email phone firstName lastName profilePicture' }
    });

    if (!lease) {
      // Check if lease exists globally in database to return accurate 403 vs 404
      const globalLeaseExists = await Lease.findById(targetLeaseId);
      if (globalLeaseExists) {
        throw new DomainError(ErrorCatalog.AUTH.FORBIDDEN);
      }
      throw new DomainError(ErrorCatalog.LEASE.NOT_FOUND);
    }
  } else {
    // No specific lease ID passed in query: check tenant's active leases
    const activeLeases = await Lease.find({
      status: 'active',
      $or: [
        { tenant: { $in: tenantIds } },
        { _id: { $in: allTargetLeaseIds } },
      ]
    }).populate({
      path: 'property',
      populate: { path: 'manager', select: 'name email phone firstName lastName profilePicture' }
    });

    if (activeLeases.length === 0) {
      return { hasActiveLease: false, user: { name: user.name } };
    }

    if (activeLeases.length === 1) {
      lease = activeLeases[0];
    } else {
      // Multiple active leases exist and none was specified
      return {
        hasActiveLease: false,
        multipleLeases: true,
        activeLeasesCount: activeLeases.length,
        user: { name: user.name },
        message: 'Multiple active leases found. Please select which lease you would like to renew from My Lease Agreement.'
      };
    }
  }

  const property = lease.property;
  const unitNumber = lease.unitNumber || property?.unitNumber || 'N/A';
  const managerUser = property?.manager;
  const managerInfo = managerUser ? {
    id: managerUser._id,
    name: managerUser.name || `${managerUser.firstName || ''} ${managerUser.lastName || ''}`.trim() || 'Property Manager',
    email: managerUser.email || 'manager@tms.com',
    phone: managerUser.phone || '+1 (555) 019-2834',
    profilePicture: managerUser.profilePicture
  } : {
    name: 'Property Manager',
    email: 'manager@tms.com',
    phone: '+1 (555) 019-2834'
  };

  // 3. Calculate remaining days
  const endDate = new Date(lease.endDate);
  const today = new Date();
  const timeDiff = endDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));

  // 4. Resolve Active Lease Renewal request for this specific lease
  const activeRenewal = await LeaseRenewal.findOne({
    lease: lease._id,
    status: { $ne: 'cancelled' }
  }).sort({ createdAt: -1 });

  // 5. Check Outstanding Payments for this specific lease
  const unpaidPayments = await Payment.find({
    lease: lease._id,
    status: { $in: ['pending', 'partially_paid', 'overdue'] }
  });
  const outstandingBalance = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const overduePaymentsCount = unpaidPayments.filter(p => p.status === 'overdue').length;

  // 6. Check Active Maintenance Requests for this property / tenant
  const maintenanceRequests = await Maintenance.find({
    property: property?._id,
    tenant: { $in: tenantIds }
  });
  const openMaintenanceCount = maintenanceRequests.filter(m => ['open', 'in_progress'].includes(m.status)).length;

  // 7. Calculate Health Score
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
      name: `${property?.name || 'Lease'} Agreement.pdf`,
      category: 'lease',
      uploadedAt: lease.createdAt || lease.startDate,
      version: '1.0.0'
    }
  ];
  if (activeRenewal) {
    documents.push({
      id: `doc-ren-${activeRenewal._id}`,
      name: `Renewal_Offer_${activeRenewal.renewalNumber || 'LRN'}.pdf`,
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
      id: tenantIds[0] || userId,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name,
      email: user.email
    },
    property: {
      id: property?._id,
      name: property?.name || 'Property',
      address: property?.address || 'N/A',
      propertyType: property?.propertyType,
      unitNumber
    },
    manager: managerInfo,
    lease: {
      id: lease._id,
      leaseNumber: lease.leaseNumber,
      rentAmount: lease.rentAmount,
      securityDeposit: lease.depositAmount ?? lease.securityDeposit ?? 0,
      startDate: lease.startDate,
      endDate: lease.endDate,
      duration: lease.terms || lease.duration || '12 months',
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

export default {
  getTenantDashboardData,
};
