import mongoose from 'mongoose';
import Property from './src/models/Property.js';
import Tenant from './src/models/Tenant.js';
import Lease from './src/models/Lease.js';
import Payment from './src/models/Payment.js';
import Maintenance from './src/models/Maintenance.js';
import 'dotenv/config';

async function testAnalytics() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

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

        console.log("Summary stats:");
        console.log("totalProperties:", totalProperties);
        console.log("totalTenants:", totalTenants);
        console.log("totalLeases:", totalLeases);
        console.log("totalPayments:", totalPayments);
        console.log("paidPayments:", paidPayments);
        console.log("overduePayments:", overduePayments);
        console.log("openMaintenance:", openMaintenance);
        console.log("totalRevenue:", totalRevenue[0]?.total || 0);
        console.log("maintenanceByCategory:", maintenanceByCategory);

        const revenue = await Payment.aggregate([
            { $match: { status: 'paid' } },
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
        console.log("Revenue Over Time data:", revenue);

        const occupancy = await Property.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        console.log("Occupancy statuses:", occupancy);

        const collection = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const [paid, total] = await Promise.all([
                Payment.countDocuments({ dueDate: { $gte: from, $lt: to }, status: 'paid' }),
                Payment.countDocuments({ dueDate: { $gte: from, $lt: to } }),
            ]);
            collection.push({
                month: from.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                paid,
                total,
                rate: total > 0 ? Math.round((paid / total) * 100) : 0,
            });
        }
        console.log("Collection Rate data:", collection);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

testAnalytics();
