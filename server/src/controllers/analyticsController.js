import Payment from '../models/Payment.js';
import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import Lease from '../models/Lease.js';
import Maintenance from '../models/Maintenance.js';
import Booking from '../models/Booking.js';
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
        const leasesOnProps = await Lease.find({ property: { $in: propIds } }).select('tenant status').lean();
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
                }))
            },
        });
    }

    const [
        totalProperties, totalTenants, totalLeases, totalPayments,
        paidPayments, overduePayments, openMaintenance,
        totalRevenue,
        maintenanceByCategory,
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
