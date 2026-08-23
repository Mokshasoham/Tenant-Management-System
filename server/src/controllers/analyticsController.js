import Payment from '../models/Payment.js';
import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import Lease from '../models/Lease.js';
import Maintenance from '../models/Maintenance.js';
import { asyncHandler } from '../utils/errorHandling.js';
import { getAuthenticatedUserId, getManagerPropertyIds } from '../utils/managerHelper.js';

export const getRevenueOverTime = asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months) || 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const userId = getAuthenticatedUserId(req);

    const matchFilter = { status: 'paid', paymentDate: { $gte: since } };

    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        if (propIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }
        matchFilter.property = { $in: propIds };
    }

    const revenue = await Payment.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: {
                    year: { $year: '$paymentDate' },
                    month: { $month: '$paymentDate' },
                },
                total: { $sum: '$amountPaid' },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({ success: true, data: revenue });
});

export const getOccupancyStats = asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    let filter = {};

    if (req.user?.role === 'manager') {
        filter = { $or: [{ owner: userId }, { manager: userId }] };
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

    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        if (propIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    totalProperties: 0,
                    totalTenants: 0,
                    totalLeases: 0,
                    totalPayments: 0,
                    paidPayments: 0,
                    overduePayments: 0,
                    openMaintenance: 0,
                    totalRevenue: 0,
                    maintenanceByCategory: [],
                },
            });
        }

        const [
            totalTenants, totalLeases, totalPayments,
            paidPayments, overduePayments, openMaintenance,
            totalRevenue, maintenanceByCategory
        ] = await Promise.all([
            Tenant.countDocuments({ managedBy: userId }),
            Lease.countDocuments({ property: { $in: propIds }, status: 'active' }),
            Payment.countDocuments({ property: { $in: propIds } }),
            Payment.countDocuments({ property: { $in: propIds }, status: 'paid' }),
            Payment.countDocuments({ property: { $in: propIds }, status: 'overdue' }),
            Maintenance.countDocuments({ property: { $in: propIds }, status: { $in: ['open', 'in_progress'] } }),
            Payment.aggregate([
                { $match: { property: { $in: propIds }, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amountPaid' } } }
            ]),
            Maintenance.aggregate([
                { $match: { property: { $in: propIds } } },
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ])
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalProperties: propIds.length,
                totalTenants,
                totalLeases,
                totalPayments,
                paidPayments,
                overduePayments,
                openMaintenance,
                totalRevenue: totalRevenue[0]?.total || 0,
                maintenanceByCategory: maintenanceByCategory.map(c => ({
                    category: c._id || 'other',
                    count: c.count
                })),
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
            totalProperties,
            totalTenants,
            totalLeases,
            totalPayments,
            paidPayments,
            overduePayments,
            openMaintenance,
            totalRevenue: totalRevenue[0]?.total || 0,
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
