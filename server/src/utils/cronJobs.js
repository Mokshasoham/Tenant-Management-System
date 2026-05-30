import cron from 'node-cron';
import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import logger from './logger.js';

export const startCronJobs = () => {
    // Run exactly at minute 0 of every hour
    cron.schedule('0 * * * *', async () => {
        logger.info('[CRON] Initializing precise hourly active-booking expiration check...');
        try {
            // Compute the exact threshold for 48 hours ago
            const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
            
            const expiredBookings = await Booking.find({
                status: 'approved',
                paymentStatus: 'pending',
                updatedAt: { $lt: threshold }
            });

            if (expiredBookings.length === 0) {
                logger.debug('[CRON] No stagnant bookings detected. Sleeping.');
            } else {
                for (const booking of expiredBookings) {
                    logger.info(`[CRON] Executing TTL Expiration protocol on stagnant booking: ${booking._id}`);
                    
                    // Formally cancel the legal holding
                    booking.status = 'cancelled';
                    booking.timeline.push({ 
                        event: 'cancelled', 
                        timestamp: new Date(), 
                        note: 'Mechanical booking expiration applied automatically due to severe non-payment within 48-hour compliance window.' 
                    });
                    await booking.save();

                    // Mechanically decouple the target property calendar lock
                    if (booking.property) {
                        await Property.updateOne(
                            { _id: booking.property },
                            { $pull: { bookedDates: { bookingId: booking._id } } }
                        );
                    }

                    // Notify User dynamically
                    await Notification.create({
                        recipient: booking.user,
                        sender: booking.manager,
                        title: 'Escrow Lock Expired',
                        message: `Your approved property holding period has legally expired mechanically because the physical security deposit escrow was not engaged within the 48-hour window. The property has been returned into the marketplace pool.`,
                        type: 'alert',
                        link: '/dashboard'
                    });
                }
                logger.info(`[CRON] Successfully decoupled ${expiredBookings.length} stagnant bookings.`);
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Severe exception encountered during expiration scrubbing daemon iteration: ${error.message}`);
        }
    });

    // Run every midnight to check for overdue rent and apply late fees
    cron.schedule('0 0 * * *', async () => {
        logger.info('[CRON] Initializing Daily Late Fee assessment sweep...');
        try {
            const overdueRent = await Payment.find({
                type: 'rent',
                status: { $in: ['pending', 'partially_paid'] },
                dueDate: { $lt: new Date() },
                lateFeeApplied: false
            }).populate('property').populate('tenant');

            for (const payment of overdueRent) {
                logger.info(`[CRON] Generating Late Fee for Lease: ${payment.lease}`);
                
                const lateFeeAmount = Math.round(payment.amount * 0.05); // 5% late fee

                await Payment.create({
                    type: 'late_fee',
                    lease: payment.lease,
                    tenant: payment.tenant._id,
                    property: payment.property._id,
                    amount: lateFeeAmount,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
                    status: 'pending',
                    reference: `LATEFEE-${payment._id}`,
                    notes: `Automatic 5% late fee applied for overdue rent on ${payment.property.name}`
                });

                payment.lateFeeApplied = true;
                payment.status = 'overdue';
                await payment.save();

                // Notify Tenant
                await Notification.create({
                    recipient: payment.tenant.user, // tenant.user is the userId
                    title: '⚠️ Late Fee Applied',
                    message: `A 5% late fee (₹${lateFeeAmount}) has been applied to your account for overdue rent on ${payment.property.name}.`,
                    type: 'alert',
                    link: '/payments'
                });
            }
            if (overdueRent.length > 0) {
               logger.info(`[CRON] Successfully applied late fees to ${overdueRent.length} overdue accounts.`);
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Late Fee daemon exception: ${error.message}`);
        }
    });
};
