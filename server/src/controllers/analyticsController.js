import Payment from '../models/Payment.js';
import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import Lease from '../models/Lease.js';
import Maintenance from '../models/Maintenance.js';
import { asyncHandler } from '../utils/errorHandling.js';

export const getRevenueOverTime = asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months) || 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const revenue = await Payment.aggregate([
        { $match: { status: 'paid', paymentDate: { $gte: since } } },
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
    const [total, occupied, available, maintenance] = await Promise.all([
        Property.countDocuments(),
        Property.countDocuments({ status: 'occupied' }),
        Property.countDocuments({ status: 'available' }),
        Property.countDocuments({ status: 'maintenance' }),
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

    for (let i = months - 1; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const [paid, total] = await Promise.all([
            Payment.countDocuments({ dueDate: { $gte: from, $lt: to }, status: 'paid' }),
            Payment.countDocuments({ dueDate: { $gte: from, $lt: to } }),
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
    const top = await Payment.aggregate([
        { $match: { status: 'paid' } },
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
