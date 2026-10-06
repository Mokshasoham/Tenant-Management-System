import Payment from '../models/Payment.js';
import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import Lease from '../models/Lease.js';
import Maintenance from '../models/Maintenance.js';
import Booking from '../models/Booking.js';
import LeaseRenewal from '../modules/lease-renewal/model.js';
import LeaseRenewalCampaign from '../models/LeaseRenewalCampaign.js';
import PropertyInspection from '../models/PropertyInspection.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/errorHandling.js';
import { getAuthenticatedUserId, getManagerPropertyIds } from '../utils/managerHelper.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getRevenueOverTime = asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months) || 12;
    const yearParam = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const userId = getAuthenticatedUserId(req);

    const matchFilter = { status: 'paid' };

    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        if (propIds.length === 0) {
            const emptyMonths = MONTH_NAMES.map((name, i) => ({
                _id: { year: yearParam, month: i + 1 },
                month: name,
                amount: 0,
                total: 0,
                count: 0,
            }));
            return res.status(200).json({
                success: true,
                data: emptyMonths,
                monthlyCollections: emptyMonths.map((m) => ({ month: m.month, amount: 0 })),
                monthlyCollectionsTotal: 0,
                total: 0,
            });
        }
        matchFilter.property = { $in: propIds };
    }

    const revenueAgg = await Payment.aggregate([
        { $match: matchFilter },
        {
            $project: {
                effectiveDate: {
                    $ifNull: ['$paymentDate', { $ifNull: ['$paidAt', '$createdAt'] }]
                },
                effectiveAmount: {
                    $ifNull: ['$amountPaid', '$amount']
                }
            }
        },
        {
            $project: {
                year: { $year: '$effectiveDate' },
                month: { $month: '$effectiveDate' },
                effectiveAmount: 1
            }
        },
        {
            $group: {
                _id: {
                    year: '$year',
                    month: '$month',
                },
                total: { $sum: '$effectiveAmount' },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthlyMap = new Map();
    revenueAgg.forEach((item) => {
        if (item._id && item._id.month >= 1 && item._id.month <= 12) {
            const currentTotal = monthlyMap.get(item._id.month) || 0;
            monthlyMap.set(item._id.month, currentTotal + (item.total || 0));
        }
    });

    const monthlyCollections = MONTH_NAMES.map((name, index) => {
        const monthNum = index + 1;
        const amount = monthlyMap.get(monthNum) || 0;
        return {
            _id: { year: yearParam, month: monthNum },
            month: name,
            amount,
            total: amount,
            count: revenueAgg.find((r) => r._id?.month === monthNum)?.count || 0,
        };
    });

    const monthlyCollectionsTotal = monthlyCollections.reduce((sum, item) => sum + item.amount, 0);

    res.status(200).json({
        success: true,
        data: monthlyCollections,
        monthlyCollections: monthlyCollections.map((m) => ({ month: m.month, amount: m.amount })),
        monthlyCollectionsTotal,
        total: monthlyCollectionsTotal,
    });
});

export const getOccupancyStats = asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    let filter = {};

    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        filter = { _id: { $in: propIds } };
    }

    const [total, occupied, available, maintenance] = await Promise.all([
        Property.countDocuments(filter),
        Property.countDocuments({ ...filter, status: 'occupied' }),
        Property.countDocuments({ ...filter, status: 'available' }),
        Property.countDocuments({ ...filter, status: 'maintenance' }),
    ]);

    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    res.status(200).json({
        success: true,
        data: { total, occupied, available, maintenance, occupancyRate: rate },
    });
});

export const getPaymentCollectionRate = asyncHandler(async (req, res) => {
    const months = 6;
    const results = [];
    const now = new Date();
    const userId = getAuthenticatedUserId(req);

    let propIds = null;
    if (req.user?.role === 'manager') {
        propIds = await getManagerPropertyIds(userId);
        if (propIds.length === 0) {
            for (let i = months - 1; i >= 0; i--) {
                const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
                results.push({
                    month: from.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    paid: 0,
                    total: 0,
                    rate: 0,
                });
            }
            return res.status(200).json({ success: true, data: results });
        }
    }

    for (let i = months - 1; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const baseFilter = { dueDate: { $gte: from, $lt: to } };
        if (propIds) {
            baseFilter.property = { $in: propIds };
        }

        const [paid, total] = await Promise.all([
            Payment.countDocuments({ ...baseFilter, status: 'paid' }),
            Payment.countDocuments(baseFilter),
        ]);

        results.push({
            month: from.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            paid,
            total,
            rate: total > 0 ? Math.round((paid / total) * 100) : 0,
        });
    }

    res.status(200).json({ success: true, data: results });
});

/**
 * Authoritative Lease Action Center Metrics & Previews calculation.
 * Scoped to manager property IDs if provided, or portfolio-wide if propIds is null.
 *
 * Rules:
 * 1. Pending Renewal Requests: Count all lease renewal requests in actionable status (requested, under_review, counter_offer).
 *    Unifies LeaseRenewal model, Lease.leaseDecision ('renewal_requested'), and actionable LeaseRenewalCampaigns.
 *    Deduplicated strictly by lease ID.
 * 2. Pending Move-Out Requests: Count all move-out requests in submitted/inspection/refund states until completed.
 *    Unifies Lease.moveOutStatus and Lease.leaseDecision ('moving_out') for distinct leases.
 * 3. Leases Expiring Within 7 Days: Active leases with endDate between now and now + 7 days.
 * 4. Expired Leases: Leases with status 'expired' OR (status 'active' and endDate < now).
 * 5. Outstanding Payments on Expired Leases: Find all expired leases; sum and count distinct leases with unpaid dues.
 * 6. Interactive Previews: Returns top 5 actionable records for each category with tenant/property/financial details and deep-links.
 */
async function computeLeaseActionCenterMetrics({ propIds = null }) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const propFilter = propIds ? { property: { $in: propIds } } : {};

    // 1. Pending Renewal Requests (Deduplicated across models and fields)
    const [
        pendingLeaseRenewals,
        pendingDecisionLeases,
        actionableCampaigns
    ] = await Promise.all([
        LeaseRenewal.find({
            ...propFilter,
            status: { $in: ['requested', 'under_review', 'pending', 'counter_offer'] },
            isDeleted: false
        })
        .sort({ createdAt: -1 })
        .populate('lease tenant property')
        .lean(),

        Lease.find({
            ...propFilter,
            leaseDecision: 'renewal_requested',
            status: { $ne: 'terminated' }
        })
        .sort({ updatedAt: -1 })
        .populate('tenant property')
        .lean(),

        LeaseRenewalCampaign.find({
            ...propFilter,
            status: { $in: ['waiting_for_manager', 'negotiating', 'requested'] },
            isDeleted: false
        })
        .sort({ updatedAt: -1 })
        .populate('lease tenant property')
        .lean()
    ]);

    const renewalMap = new Map();

    // 1a. Explicit LeaseRenewal records (primary tenant requests)
    pendingLeaseRenewals.forEach(r => {
        const lid = r.lease?._id?.toString() || r.lease?.toString();
        if (lid && !renewalMap.has(lid)) {
            renewalMap.set(lid, {
                id: r._id,
                leaseId: lid,
                leaseNumber: r.lease?.leaseNumber || '—',
                tenant: {
                    id: r.tenant?._id,
                    name: `${r.tenant?.firstName || ''} ${r.tenant?.lastName || ''}`.trim() || r.tenant?.name || 'Unknown',
                    email: r.tenant?.email || '',
                    phone: r.tenant?.phone || ''
                },
                property: {
                    id: r.property?._id,
                    name: r.property?.name || '—',
                    address: r.property?.address || ''
                },
                status: r.status,
                requestedDuration: r.duration || 'Standard',
                requestedStartDate: r.requestedStartDate,
                requestedEndDate: r.requestedEndDate,
                proposedRent: r.proposedRent || r.lease?.rentAmount,
                currentRent: r.lease?.rentAmount || 0,
                requestDate: r.createdAt,
                actionUrl: `/leases?leaseId=${lid}&tab=renewals`
            });
        }
    });

    // 1b. Leases where tenant marked leaseDecision === 'renewal_requested'
    pendingDecisionLeases.forEach(l => {
        const lid = l._id.toString();
        if (!renewalMap.has(lid)) {
            renewalMap.set(lid, {
                id: l._id,
                leaseId: lid,
                leaseNumber: l.leaseNumber || '—',
                tenant: {
                    id: l.tenant?._id,
                    name: `${l.tenant?.firstName || ''} ${l.tenant?.lastName || ''}`.trim() || 'Unknown',
                    email: l.tenant?.email || '',
                    phone: l.tenant?.phone || ''
                },
                property: {
                    id: l.property?._id,
                    name: l.property?.name || '—',
                    address: l.property?.address || ''
                },
                status: 'requested',
                requestedDuration: 'Standard',
                requestedStartDate: l.endDate,
                proposedRent: l.rentAmount || 0,
                currentRent: l.rentAmount || 0,
                requestDate: l.updatedAt || l.createdAt,
                actionUrl: `/leases?leaseId=${lid}&tab=renewals`
            });
        }
    });

    // 1c. Actionable LeaseRenewalCampaign records (only if tenant response submitted)
    actionableCampaigns.forEach(c => {
        const lid = c.lease?._id?.toString() || c.lease?.toString();
        if (lid && !renewalMap.has(lid)) {
            renewalMap.set(lid, {
                id: c._id,
                leaseId: lid,
                leaseNumber: c.snapshot?.leaseNumber || c.lease?.leaseNumber || '—',
                tenant: {
                    id: c.tenant?._id,
                    name: c.snapshot?.tenantName || `${c.tenant?.firstName || ''} ${c.tenant?.lastName || ''}`.trim() || 'Unknown',
                    email: c.tenant?.email || '',
                    phone: c.tenant?.phone || ''
                },
                property: {
                    id: c.property?._id,
                    name: c.snapshot?.propertyName || c.property?.name || '—',
                    address: c.snapshot?.propertyAddress || c.property?.address || ''
                },
                status: c.status,
                requestedDuration: 'Standard',
                currentRent: c.lease?.rentAmount || 0,
                requestDate: c.lifecycle?.waitingTenantAt || c.updatedAt || c.createdAt,
                actionUrl: `/leases?leaseId=${lid}&tab=renewals`
            });
        }
    });

    const pendingRenewalRequests = renewalMap.size;
    const renewalPreviews = Array.from(renewalMap.values()).slice(0, 5);

    // 2. Pending Move-Out Requests (Unified moveOutStatus and leaseDecision until completed)
    const pendingMoveOutDocs = await Lease.find({
        ...propFilter,
        $and: [
            { moveOutStatus: { $ne: 'completed' } },
            {
                $or: [
                    { moveOutStatus: { $in: ['requested', 'inspection_scheduled', 'inspection_completed', 'refund_processing'] } },
                    { leaseDecision: 'moving_out' }
                ]
            }
        ]
    })
    .sort({ moveOutNoticeDate: -1, updatedAt: -1 })
    .populate('tenant property')
    .lean();

    const pendingMoveOutRequests = pendingMoveOutDocs.length;
    const moveOutLeaseIds = pendingMoveOutDocs.map(l => l._id);
    const moveOutInspections = await PropertyInspection.find({
        lease: { $in: moveOutLeaseIds },
        isArchived: false
    }).sort({ createdAt: -1 }).lean();
    const moveOutInspectionByLease = new Map();
    moveOutInspections.forEach(insp => {
        const lid = insp.lease?.toString();
        if (!moveOutInspectionByLease.has(lid)) {
            moveOutInspectionByLease.set(lid, insp);
        }
    });

    const moveOutPreviews = pendingMoveOutDocs.slice(0, 5).map(l => {
        const matchedInspection = moveOutInspectionByLease.get(l._id.toString());
        return {
            id: l._id,
            leaseId: l._id,
            inspectionId: matchedInspection ? matchedInspection._id.toString() : null,
            leaseNumber: l.leaseNumber || '—',
            tenant: {
                id: l.tenant?._id,
                name: `${l.tenant?.firstName || ''} ${l.tenant?.lastName || ''}`.trim() || 'Unknown',
                email: l.tenant?.email || '',
                phone: l.tenant?.phone || ''
            },
            property: {
                id: l.property?._id,
                name: l.property?.name || '—',
                address: l.property?.address || ''
            },
            status: l.moveOutStatus && l.moveOutStatus !== 'none' ? l.moveOutStatus : 'requested',
            noticeDate: l.moveOutNoticeDate || l.updatedAt || l.createdAt,
            expectedDepartureDate: l.expectedMoveOutDate || l.endDate,
            reason: l.moveOutReason || 'Relocation',
            comments: l.moveOutComments || '',
            currentRent: l.rentAmount || 0,
            actionUrl: `/leases?leaseId=${l._id}&tab=moveouts`
        };
    });

    // 3. Leases Expiring Within 7 Days
    const expiringSoonDocs = await Lease.find({
        ...propFilter,
        status: 'active',
        endDate: { $gte: now, $lte: sevenDaysFromNow }
    })
    .sort({ endDate: 1 })
    .populate('tenant property')
    .lean();

    const leasesExpiringWithin7Days = expiringSoonDocs.length;
    const expiringSoonPreviews = expiringSoonDocs.slice(0, 5).map(l => {
        const daysLeft = Math.max(0, Math.ceil((new Date(l.endDate) - now) / (1000 * 60 * 60 * 24)));
        return {
            id: l._id,
            leaseId: l._id,
            leaseNumber: l.leaseNumber || '—',
            tenant: {
                id: l.tenant?._id,
                name: `${l.tenant?.firstName || ''} ${l.tenant?.lastName || ''}`.trim() || 'Unknown',
                email: l.tenant?.email || '',
                phone: l.tenant?.phone || ''
            },
            property: {
                id: l.property?._id,
                name: l.property?.name || '—',
                address: l.property?.address || ''
            },
            status: 'expiring_soon',
            daysLeft,
            endDate: l.endDate,
            currentRent: l.rentAmount || 0,
            actionUrl: `/leases?leaseId=${l._id}&filter=expiring_soon`
        };
    });

    // 4. Expired Leases (explicitly expired OR active past end date)
    const allExpiredLeaseDocs = await Lease.find({
        ...propFilter,
        $or: [
            { status: 'expired' },
            { status: 'active', endDate: { $lt: now } }
        ]
    })
    .sort({ endDate: -1 })
    .populate('tenant property')
    .lean();

    const expiredLeases = allExpiredLeaseDocs.length;
    const expiredLeasePreviews = allExpiredLeaseDocs.slice(0, 5).map(l => ({
        id: l._id,
        leaseId: l._id,
        leaseNumber: l.leaseNumber || '—',
        tenant: {
            id: l.tenant?._id,
            name: `${l.tenant?.firstName || ''} ${l.tenant?.lastName || ''}`.trim() || 'Unknown',
            email: l.tenant?.email || '',
            phone: l.tenant?.phone || ''
        },
        property: {
            id: l.property?._id,
            name: l.property?.name || '—',
            address: l.property?.address || ''
        },
        status: 'expired',
        startDate: l.startDate,
        endDate: l.endDate,
        currentRent: l.rentAmount || 0,
        actionUrl: `/leases?leaseId=${l._id}&status=expired`
    }));

    // 5. Outstanding Payments on Expired Leases
    const expiredLeaseIds = allExpiredLeaseDocs.map(l => l._id);
    let outstandingPaymentsOnExpiredLeasesCount = 0;
    let outstandingPaymentsOnExpiredLeasesAmount = 0;
    const expiredDuesMap = new Map();

    if (expiredLeaseIds.length > 0) {
        const unpaidPaymentsOnExpired = await Payment.find({
            lease: { $in: expiredLeaseIds },
            status: { $in: ['pending', 'partially_paid', 'overdue'] }
        })
        .populate({
            path: 'lease',
            select: 'leaseNumber startDate endDate rentAmount property tenant',
            populate: [
                { path: 'property', select: 'name address' },
                { path: 'tenant', select: 'firstName lastName email phone' }
            ]
        })
        .sort({ dueDate: 1 })
        .lean();

        let totalUnpaid = 0;
        unpaidPaymentsOnExpired.forEach(p => {
            const lid = p.lease?._id?.toString() || p.lease?.toString();
            if (!lid) return;
            const due = (Number(p.amount) || 0) - (Number(p.amountPaid) || 0);
            if (due > 0) {
                totalUnpaid += due;
                if (!expiredDuesMap.has(lid)) {
                    expiredDuesMap.set(lid, {
                        id: lid,
                        leaseId: lid,
                        leaseNumber: p.lease?.leaseNumber || '—',
                        tenant: {
                            id: p.lease?.tenant?._id,
                            name: `${p.lease?.tenant?.firstName || ''} ${p.lease?.tenant?.lastName || ''}`.trim() || 'Unknown',
                            email: p.lease?.tenant?.email || '',
                            phone: p.lease?.tenant?.phone || ''
                        },
                        property: {
                            id: p.lease?.property?._id,
                            name: p.lease?.property?.name || '—',
                            address: p.lease?.property?.address || ''
                        },
                        totalDue: 0,
                        unpaidPaymentCount: 0,
                        oldestDueDate: p.dueDate,
                        actionUrl: `/leases?leaseId=${lid}&filter=unpaid_expired`
                    });
                }
                const item = expiredDuesMap.get(lid);
                item.totalDue += due;
                item.unpaidPaymentCount += 1;
            }
        });

        outstandingPaymentsOnExpiredLeasesCount = expiredDuesMap.size;
        outstandingPaymentsOnExpiredLeasesAmount = totalUnpaid;
    }

    const expiredDuesPreviews = Array.from(expiredDuesMap.values()).slice(0, 5);

    return {
        pendingRenewalRequests,
        pendingMoveOutRequests,
        leasesExpiringWithin7Days,
        expiredLeases,
        outstandingPaymentsOnExpiredLeasesCount,
        outstandingPaymentsOnExpiredLeasesAmount,
        previews: {
            renewalRequests: renewalPreviews,
            moveOutRequests: moveOutPreviews,
            expiringSoon: expiringSoonPreviews,
            expiredLeases: expiredLeasePreviews,
            expiredDues: expiredDuesPreviews,
            renewals: renewalPreviews,
            moveouts: moveOutPreviews,
            expiring: expiringSoonPreviews,
            expired: expiredLeasePreviews,
            dues: expiredDuesPreviews
        }
    };
}

export const getSummaryStats = asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const isValidOid = mongoose.Types.ObjectId.isValid(String(userId));
    const userIds = [userId, isValidOid ? new mongoose.Types.ObjectId(String(userId)) : null].filter(Boolean);

    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        if (propIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    managedProperties: 0,
                    totalProperties: 0,
                    availableProperties: 0,
                    occupiedProperties: 0,
                    maintenanceProperties: 0,
                    activeTenants: 0,
                    totalTenants: 0,
                    bookingRequests: 0,
                    totalLeases: 0,
                    activeLeases: 0,
                    totalPayments: 0,
                    paidPayments: 0,
                    pendingPayments: 0,
                    pendingPaymentsAmount: 0,
                    monthlyCollections: 0,
                    totalRevenue: 0,
                    occupancyRate: 0,
                    openMaintenance: 0,
                    maintenanceByCategory: [],
                    pendingRenewalRequests: 0,
                    pendingMoveOutRequests: 0,
                    leasesExpiringWithin7Days: 0,
                    expiredLeases: 0,
                    outstandingPaymentsOnExpiredLeasesCount: 0,
                    outstandingPaymentsOnExpiredLeasesAmount: 0,
                    previews: {
                        renewalRequests: [],
                        moveOutRequests: [],
                        expiringSoon: [],
                        expiredLeases: [],
                        expiredDues: []
                    }
                },
            });
        }

        // 1. Property stats
        const [
            totalProperties,
            availableProperties,
            occupiedProperties,
            maintenanceProperties
        ] = await Promise.all([
            Property.countDocuments({ _id: { $in: propIds } }),
            Property.countDocuments({ _id: { $in: propIds }, status: 'available' }),
            Property.countDocuments({ _id: { $in: propIds }, status: 'occupied' }),
            Property.countDocuments({ _id: { $in: propIds }, status: 'maintenance' })
        ]);

        // 2. Tenants count (via managedBy or Leases or Bookings on manager's properties)
        const leasesOnProps = await Lease.find({ property: { $in: propIds } }).select('tenant status endDate moveOutStatus').lean();
        const leaseTenantIds = leasesOnProps.map(l => l.tenant).filter(Boolean);
        const bookingsOnProps = await Booking.find({ property: { $in: propIds } }).select('user status').lean();
        const pendingBookingsCount = bookingsOnProps.filter(b => b.status === 'pending').length;

        const tenantQuery = {
            $or: [
                { managedBy: { $in: userIds } },
                { _id: { $in: leaseTenantIds } }
            ]
        };
        const [totalTenants, activeTenants] = await Promise.all([
            Tenant.countDocuments(tenantQuery),
            Tenant.countDocuments({ ...tenantQuery, status: 'active' })
        ]);

        // 3. Leases
        const activeLeases = leasesOnProps.filter(l => l.status === 'active' || l.status === 'signed').length;

        // 4. Payments
        const [
            totalPayments,
            paidPayments,
            pendingPayments,
            overduePayments,
            revenueAgg,
            pendingAmountAgg
        ] = await Promise.all([
            Payment.countDocuments({ property: { $in: propIds } }),
            Payment.countDocuments({ property: { $in: propIds }, status: 'paid' }),
            Payment.countDocuments({ property: { $in: propIds }, status: 'pending' }),
            Payment.countDocuments({ property: { $in: propIds }, status: 'overdue' }),
            Payment.aggregate([
                { $match: { property: { $in: propIds }, status: 'paid' } },
                { $group: { _id: null, total: { $sum: { $ifNull: ['$amountPaid', '$amount'] } } } }
            ]),
            Payment.aggregate([
                { $match: { property: { $in: propIds }, status: { $in: ['pending', 'overdue'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        // 5. Maintenance
        const [openMaintenance, maintenanceByCategory] = await Promise.all([
            Maintenance.countDocuments({ property: { $in: propIds }, status: { $in: ['open', 'in_progress'] } }),
            Maintenance.aggregate([
                { $match: { property: { $in: propIds } } },
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ])
        ]);

        // 6. Authoritative Lease Action Center Metrics & Previews (scoped to manager's properties)
        const actionCenter = await computeLeaseActionCenterMetrics({ propIds });

        const totalRevenue = revenueAgg[0]?.total || 0;
        const pendingPaymentsAmount = pendingAmountAgg[0]?.total || 0;
        const occupancyTotal = occupiedProperties + availableProperties;
        const occupancyRate = occupancyTotal > 0 ? Math.round((occupiedProperties / occupancyTotal) * 100) : 0;

        return res.status(200).json({
            success: true,
            data: {
                managedProperties: totalProperties,
                totalProperties,
                availableProperties,
                occupiedProperties,
                maintenanceProperties,
                activeTenants: activeTenants || totalTenants,
                totalTenants,
                bookingRequests: pendingBookingsCount,
                totalLeases: leasesOnProps.length,
                activeLeases,
                totalPayments,
                paidPayments,
                pendingPayments: pendingPaymentsAmount || (pendingPayments + overduePayments),
                pendingPaymentsAmount,
                monthlyCollections: totalRevenue,
                totalRevenue,
                occupancyRate,
                openMaintenance,
                maintenanceByCategory: maintenanceByCategory.map(c => ({
                    category: c._id || 'other',
                    count: c.count
                })),
                pendingRenewalRequests: actionCenter.pendingRenewalRequests,
                pendingMoveOutRequests: actionCenter.pendingMoveOutRequests,
                leasesExpiringWithin7Days: actionCenter.leasesExpiringWithin7Days,
                expiredLeases: actionCenter.expiredLeases,
                outstandingPaymentsOnExpiredLeasesCount: actionCenter.outstandingPaymentsOnExpiredLeasesCount,
                outstandingPaymentsOnExpiredLeasesAmount: actionCenter.outstandingPaymentsOnExpiredLeasesAmount,
                previews: actionCenter.previews,
            },
        });
    }

    // Admin branch (Portfolio-wide calculation)
    const [
        totalProperties, totalTenants, totalLeases, totalPayments,
        paidPayments, overduePayments, openMaintenance,
        totalRevenue,
        maintenanceByCategory,
        actionCenter
    ] = await Promise.all([
        Property.countDocuments(),
        Tenant.countDocuments({ status: 'active' }),
        Lease.countDocuments({ status: 'active' }),
        Payment.countDocuments(),
        Payment.countDocuments({ status: 'paid' }),
        Payment.countDocuments({ status: 'overdue' }),
        Maintenance.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
        Maintenance.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        computeLeaseActionCenterMetrics({ propIds: null })
    ]);

    res.status(200).json({
        success: true,
        data: {
            managedProperties: totalProperties,
            totalProperties,
            totalTenants,
            activeTenants: totalTenants,
            totalLeases,
            totalPayments,
            paidPayments,
            pendingPayments: overduePayments,
            openMaintenance,
            totalRevenue: totalRevenue[0]?.total || 0,
            monthlyCollections: totalRevenue[0]?.total || 0,
            maintenanceByCategory: maintenanceByCategory.map(c => ({
                category: c._id || 'other',
                count: c.count
            })),
            pendingRenewalRequests: actionCenter.pendingRenewalRequests,
            pendingMoveOutRequests: actionCenter.pendingMoveOutRequests,
            leasesExpiringWithin7Days: actionCenter.leasesExpiringWithin7Days,
            expiredLeases: actionCenter.expiredLeases,
            outstandingPaymentsOnExpiredLeasesCount: actionCenter.outstandingPaymentsOnExpiredLeasesCount,
            outstandingPaymentsOnExpiredLeasesAmount: actionCenter.outstandingPaymentsOnExpiredLeasesAmount,
            previews: actionCenter.previews,
        },
    });
});

export const getTopProperties = asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const matchFilter = { status: 'paid' };

    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        if (propIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }
        matchFilter.property = { $in: propIds };
    }

    const top = await Payment.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$property', totalRevenue: { $sum: '$amountPaid' }, paymentCount: { $sum: 1 } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'properties',
                localField: '_id',
                foreignField: '_id',
                as: 'property',
            },
        },
        { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                propertyName: '$property.name',
                propertyAddress: '$property.address',
                totalRevenue: 1,
                paymentCount: 1,
            },
        },
    ]);

    res.status(200).json({ success: true, data: top });
});
