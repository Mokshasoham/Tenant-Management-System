import cron from 'node-cron';
import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';
import { sendLateFeeAppliedEmail, sendRentReminderEmail } from '../services/emailService.js';
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
                if (!payment.tenant) continue;
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

                // Find matching User by tenant email to retrieve user id for notifications & emails
                const tenantUser = await User.findOne({ email: payment.tenant.email });
                if (tenantUser) {
                    // Notify Tenant in-app
                    await Notification.create({
                        recipient: tenantUser._id,
                        title: '⚠️ Late Fee Applied',
                        message: `A 5% late fee (₹${lateFeeAmount}) has been applied to your account for overdue rent on ${payment.property.name}.`,
                        type: 'alert',
                        link: '/payments'
                    });

                    // Send email alert
                    await sendLateFeeAppliedEmail(tenantUser, payment, payment.property, lateFeeAmount);
                }
            }
            if (overdueRent.length > 0) {
               logger.info(`[CRON] Successfully applied late fees to ${overdueRent.length} overdue accounts.`);
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Late Fee daemon exception: ${error.message}`);
        }
    });

    // Run every midnight to check for upcoming rent due dates and send reminders
    cron.schedule('0 0 * * *', async () => {
        logger.info('[CRON] Initializing Daily Rent Reminder check...');
        try {
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            // Find all pending rent payments that are due within 3 days or already overdue but not handled
            const upcomingRent = await Payment.find({
                type: 'rent',
                status: 'pending',
                dueDate: { $lte: threeDaysFromNow }
            }).populate('property').populate('tenant');

            for (const payment of upcomingRent) {
                if (!payment.tenant) continue;
                const tenantUser = await User.findOne({ email: payment.tenant.email });
                if (tenantUser) {
                    logger.info(`[CRON] Sending rent reminder to tenant: ${tenantUser.email} for property: ${payment.property.name}`);
                    
                    // In-app Notification
                    await Notification.create({
                        recipient: tenantUser._id,
                        title: '⏰ Rent Due Soon',
                        message: `Friendly reminder: Your rent payment of ₹${payment.amount.toLocaleString('en-IN')} for ${payment.property.name} is due on ${new Date(payment.dueDate).toLocaleDateString()}.`,
                        type: 'info',
                        link: '/payments'
                    });

                    // Email reminder
                    await sendRentReminderEmail(tenantUser, payment, payment.property);
                }
            }
            if (upcomingRent.length > 0) {
                logger.info(`[CRON] Successfully dispatched ${upcomingRent.length} rent reminders.`);
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Rent Reminder sweep exception: ${error.message}`);
        }
    });

    // Sweep hourly for expired active leases to release properties back to market
    cron.schedule('0 * * * *', async () => {
        logger.info('[CRON] Initializing precise hourly Lease Expiration check sweep...');
        try {
            const now = new Date();
            const expiredLeases = await Lease.find({
                status: 'active',
                endDate: { $lte: now }
            });

            if (expiredLeases.length > 0) {
                logger.info(`[CRON] Detected ${expiredLeases.length} expired leases. Expirating...`);
                for (const lease of expiredLeases) {
                    lease.status = 'expired';
                    await lease.save();

                    // Update property status to available
                    await Property.findByIdAndUpdate(lease.property, {
                        $set: { status: 'available', currentTenant: null }
                    });

                    logger.info(`[CRON] Lease ${lease.leaseNumber} expired automatically. Property set to available.`);
                }
            } else {
                logger.debug('[CRON] No expired leases detected.');
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Lease Expiration daemon exception: ${error.message}`);
        }
    });

    // Sweep every 5 minutes for pending leases whose start date has arrived to activate them
    cron.schedule('*/5 * * * *', async () => {
        logger.info('[CRON] Initializing precise 5-minute Lease Activation check sweep...');
        try {
            const now = new Date();
            // Find all pending leases where the start date is <= now AND the lease has been signed
            const upcomingLeases = await Lease.find({
                status: 'pending',
                startDate: { $lte: now },
                signature: { $exists: true, $ne: null },
            });

            if (upcomingLeases.length > 0) {
                logger.info(`[CRON] Detected ${upcomingLeases.length} candidate leases for activation.`);
                for (const lease of upcomingLeases) {

                    // ── Checklist Guard 1: Security deposit must be paid ──
                    const booking = await Booking.findOne({
                        property: lease.property,
                        status: { $in: ['approved', 'active', 'completed'] },
                    }).sort({ createdAt: -1 });

                    if (!booking || booking.paymentStatus !== 'paid') {
                        logger.debug(`[CRON] Skipping lease ${lease.leaseNumber}: deposit not paid.`);
                        continue;
                    }

                    // ── Checklist Guard 2: Tenant profile + KYC ──
                    // Find User record for this tenant
                    const tenantDoc = await Tenant.findById(lease.tenant).select('email');
                    if (!tenantDoc) {
                        logger.debug(`[CRON] Skipping lease ${lease.leaseNumber}: tenant record not found.`);
                        continue;
                    }
                    const tenantUser = await User.findOne({ email: tenantDoc.email })
                        .select('firstName lastName phone kycDocuments');

                    if (!tenantUser || !tenantUser.firstName || !tenantUser.lastName || !tenantUser.phone) {
                        logger.debug(`[CRON] Skipping lease ${lease.leaseNumber}: tenant profile incomplete.`);
                        continue;
                    }

                    if (!tenantUser.kycDocuments || tenantUser.kycDocuments.length === 0) {
                        logger.debug(`[CRON] Skipping lease ${lease.leaseNumber}: KYC documents missing.`);
                        continue;
                    }

                    // ── All checklist items passed — activate the lease ──
                    lease.status = 'active';
                    await lease.save();

                    // Update property status to occupied and set currentTenant
                    await Property.findByIdAndUpdate(lease.property, {
                        $set: { status: 'occupied', currentTenant: lease.tenant }
                    });

                    // Find and complete the corresponding booking
                    const approvedBooking = await Booking.findOne({
                        property: lease.property,
                        user: tenantUser._id,
                        status: 'approved',
                    }).sort({ createdAt: -1 });

                    if (approvedBooking) {
                        approvedBooking.status = 'completed';
                        approvedBooking.completedDate = new Date();
                        approvedBooking.timeline.push({
                            event: 'completed',
                            timestamp: new Date(),
                            note: 'Lease activated. Booking formally marked completed.'
                        });
                        await approvedBooking.save();
                        logger.info(`[CRON] Booking ${approvedBooking._id} set to completed as lease started.`);

                        // Send Booking Completed notification
                        await Notification.create({
                            recipient: approvedBooking.user,
                            sender: lease.createdBy,
                            title: 'Booking Completed',
                            message: `Your booking for property under lease ${lease.leaseNumber} has been successfully completed.`,
                            type: 'success',
                            link: `/bookings/${approvedBooking._id}`
                        });
                    }

                    // Send notification to Tenant
                    await Notification.create({
                        recipient: tenantUser._id,
                        title: '🎉 Lease Activated!',
                        message: `Your lease ${lease.leaseNumber} has officially started today and is now active.`,
                        type: 'success',
                        link: '/my-lease'
                    });

                    logger.info(`[CRON] Lease ${lease.leaseNumber} activated automatically. Property set to occupied.`);
                }
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Lease Activation daemon exception: ${error.message}`);
        }
    });

};
