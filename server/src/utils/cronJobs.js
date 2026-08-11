import cron from 'node-cron';
import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import NotificationModel from '../models/Notification.js';
import EventService from '../services/eventService.js';

// Backward-compatible Event proxy
const Notification = {
    create: async (data) => {
        try {
            let category = 'system';
            let event = 'cron_alert';
            let priority = 'medium';
            let severity = 'information';

            const titleLower = (data.title || '').toLowerCase();

            if (titleLower.includes('expired') || titleLower.includes('booking')) {
                category = 'booking';
                event = 'cancelled';
                priority = 'high';
                severity = 'warning';
            } else if (titleLower.includes('overdue') || titleLower.includes('late fee') || titleLower.includes('penalty')) {
                category = 'payments';
                event = 'payment_overdue';
                priority = 'critical';
                severity = 'critical';
            } else if (titleLower.includes('reminder') || titleLower.includes('rent') || titleLower.includes('due')) {
                category = 'billing';
                event = 'payment_due';
                priority = 'high';
                severity = 'warning';
            }

            return await EventService.publish({
                recipient: data.recipient,
                category,
                event,
                title: data.title,
                description: data.message,
                sourceModule: category,
                entityType: data.relatedModel || 'System',
                entityId: data.relatedId,
                redirectUrl: data.link || '/dashboard',
                action: 'view',
                priority,
                severity,
                metadata: {
                    relatedId: data.relatedId
                }
            });
        } catch (err) {
            logger.error('[Notification Wrapper] Failed: ' + err.message);
            return await NotificationModel.create(data);
        }
    },
    find: (...args) => NotificationModel.find(...args),
    findOne: (...args) => NotificationModel.findOne(...args),
    findOneAndUpdate: (...args) => NotificationModel.findOneAndUpdate(...args),
    updateMany: (...args) => NotificationModel.updateMany(...args),
    countDocuments: (...args) => NotificationModel.countDocuments(...args),
    findOneAndDelete: (...args) => NotificationModel.findOneAndDelete(...args)
};
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';
import { sendLateFeeAppliedEmail, sendRentReminderEmail } from '../services/emailService.js';
import verificationService from '../services/verificationService.js';
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

    // Run every midnight to check for overdue bills and apply late fees
    cron.schedule('0 0 * * *', async () => {
        logger.info('[CRON] Initializing Daily Late Fee assessment sweep...');
        try {
            const Bill = (await import('../models/Bill.js')).default;
            const now = new Date();
            
            // Find bills that are past due date + gracePeriodDays and don't have lateFeeApplied
            const overdueBills = await Bill.find({
                status: { $in: ['generated', 'sent', 'viewed', 'partially_paid', 'overdue'] },
                dueDate: { $lt: now },
                lateFeeApplied: false
            }).populate('property').populate('tenant');

            for (const bill of overdueBills) {
                // Check if grace period is active
                const graceLimit = new Date(bill.dueDate);
                graceLimit.setDate(graceLimit.getDate() + (bill.gracePeriodDays || 0));
                
                if (graceLimit >= now) {
                    logger.debug(`[CRON] Bill ${bill.billNumber} is past due but within grace period. Skipping.`);
                    continue;
                }

                logger.info(`[CRON] Applying Late Fee to Bill: ${bill.billNumber}`);

                const lateFeeAmount = Math.round(bill.amountDue * 0.05); // 5% late fee

                // Update bill breakdown
                bill.breakdown.push({
                    label: 'Late Fee (5%)',
                    amount: lateFeeAmount
                });
                
                bill.lateFeeApplied = true;
                bill.status = 'overdue';
                bill.timeline.push({
                    status: 'overdue',
                    note: `Overdue! Applied 5% late fee of ₹${lateFeeAmount}`
                });

                await bill.save();

                // Sync to shadow payment if linked
                if (bill.payment) {
                    const payment = await Payment.findById(bill.payment);
                    if (payment) {
                        payment.amount = bill.amountDue;
                        payment.status = 'overdue';
                        payment.lateFeeApplied = true;
                        await payment.save();
                    }
                }

                // Notify Tenant in-app
                const tenantUser = await User.findOne({ email: bill.tenant.email });
                if (tenantUser) {
                    await Notification.create({
                        recipient: tenantUser._id,
                        title: '⚠️ Late Fee Applied',
                        message: `A 5% late fee (₹${lateFeeAmount}) has been applied to your overdue ${bill.type} bill on ${bill.property.name}.`,
                        type: 'alert',
                        link: '/bills'
                    });

                    // Send email alert
                    try {
                        await sendLateFeeAppliedEmail(tenantUser, bill.payment ? { _id: bill.payment } : bill, bill.property, lateFeeAmount);
                    } catch (emailErr) {
                        logger.error(`Failed to send late fee email to ${tenantUser.email}: ${emailErr.message}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Late Fee daemon exception: ${error.message}`);
        }
    });

    // Run every midnight to generate Rent Bills automatically
    cron.schedule('0 0 * * *', async () => {
        logger.info('[CRON] Initializing Daily Rent Bill Generation sweep...');
        try {
            const activeLeases = await Lease.find({ status: 'active' }).populate('tenant property');
            const Bill = (await import('../models/Bill.js')).default;
            const Counter = (await import('../models/Counter.js')).default;
            const { generateInvoicePDF, buildInvoiceViewModel } = await import('../services/pdfService.js');

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            for (const lease of activeLeases) {
                // Check if rent bill already exists for this lease in the current month
                const existingBill = await Bill.findOne({
                    lease: lease._id,
                    type: 'rent',
                    billingPeriodStart: { $gte: startOfMonth, $lte: endOfMonth }
                });

                if (!existingBill) {
                    logger.info(`[CRON] Generating automatic Rent Bill for Lease: ${lease.leaseNumber}`);
                    
                    // Generate sequential bill number atomically
                    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                    const counter = await Counter.findOneAndUpdate(
                        { _id: `BILL-RENT-${dateStr}` },
                        { $inc: { seq: 1 } },
                        { upsert: true, new: true }
                    );
                    const seqStr = String(counter.seq).padStart(4, '0');
                    const billNumber = `BILL-RENT-${dateStr}-${seqStr}`;

                    const dueDate = new Date(now.getFullYear(), now.getMonth(), 5); // default to 5th

                    const bill = await Bill.create({
                        billNumber,
                        type: 'rent',
                        lease: lease._id,
                        tenant: lease.tenant._id,
                        property: lease.property._id,
                        status: 'generated',
                        dueDate,
                        billingPeriodStart: startOfMonth,
                        billingPeriodEnd: endOfMonth,
                        breakdown: [{ label: 'Monthly Rent', amount: lease.rentAmount }],
                        timeline: [
                            { status: 'draft', note: 'Rent bill drafted automatically.' },
                            { status: 'generated', note: 'Rent bill generated automatically.' }
                        ]
                    });

                    // Create shadow payment with bidirectional linking
                    const payment = await Payment.create({
                        type: 'rent',
                        lease: lease._id,
                        tenant: lease.tenant._id,
                        property: lease.property._id,
                        amount: lease.rentAmount,
                        dueDate,
                        status: 'pending',
                        notes: `Automatic monthly rent invoice - Ref: ${billNumber}`,
                        bill: bill._id
                    });

                    bill.payment = payment._id;
                    await bill.save();

                    // Generate Invoice PDF
                    const viewModel = buildInvoiceViewModel(bill, payment);
                    const pdfData = await generateInvoicePDF(viewModel, lease.tenant, lease.property, lease);

                    bill.invoiceUrl = pdfData.Location;
                    bill.fileId = pdfData.fileId;
                    await bill.save();

                    payment.invoiceUrl = pdfData.Location;
                    payment.fileId = pdfData.fileId;
                    await payment.save();

                    // Notify tenant
                    const tenantUser = await User.findOne({ email: lease.tenant.email });
                    if (tenantUser) {
                        await Notification.create({
                            recipient: tenantUser._id,
                            title: '📄 Rent Bill Generated',
                            message: `Your rent invoice for ${startOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} has been generated. Due on ${dueDate.toLocaleDateString('en-IN')}.`,
                            type: 'info',
                            link: '/bills'
                        });
                        
                        try {
                            const { sendPaymentReceiptEmail } = await import('../services/emailService.js');
                            await sendPaymentReceiptEmail(lease.tenant, payment, lease.property, pdfData);
                        } catch (emailErr) {
                            logger.error(`Failed to send rent bill email to ${tenantUser.email}: ${emailErr.message}`);
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Rent Bill Generation sweep exception: ${error.message}`);
        }
    });

    // Run every midnight to check for upcoming rent due dates and send reminders
    cron.schedule('0 0 * * *', async () => {
        logger.info('[CRON] Initializing Daily Payment Reminder sweep...');
        try {
            const Bill = (await import('../models/Bill.js')).default;
            const now = new Date();
            
            const activeBills = await Bill.find({
                status: { $in: ['generated', 'sent', 'viewed', 'partially_paid', 'overdue'] }
            }).populate('property').populate('tenant');

            for (const bill of activeBills) {
                if (!bill.tenant) continue;
                const tenantUser = await User.findOne({ email: bill.tenant.email });
                if (!tenantUser) continue;

                let reminderType = null;
                const billDueDate = new Date(bill.dueDate);
                
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const due = new Date(billDueDate.getFullYear(), billDueDate.getMonth(), billDueDate.getDate());
                
                const diffTime = due - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 3 && !bill.remindersSent.includes('T-3')) {
                    reminderType = 'T-3';
                } else if (diffDays === 0 && !bill.remindersSent.includes('T-0')) {
                    reminderType = 'T-0';
                } else if (bill.status === 'overdue' && !bill.remindersSent.includes('overdue')) {
                    reminderType = 'overdue';
                }

                if (reminderType) {
                    logger.info(`[CRON] Sending payment reminder (${reminderType}) to: ${tenantUser.email} for bill ${bill.billNumber}`);

                    let title = '⏰ Payment Reminder';
                    let message = `Reminder: Your ${bill.type} bill of ₹${bill.amountDue} is due on ${billDueDate.toLocaleDateString()}.`;

                    if (reminderType === 'T-0') {
                        title = '⚡ Bill Due Today';
                        message = `Friendly reminder: Your ${bill.type} bill of ₹${bill.amountDue} is due today! Please pay to avoid late fees.`;
                    } else if (reminderType === 'overdue') {
                        title = '⚠️ Overdue Bill Notice';
                        message = `Urgent: Your ${bill.type} bill of ₹${bill.amountDue} is overdue. Please settle it immediately.`;
                    }

                    // Create Notification
                    await Notification.create({
                        recipient: tenantUser._id,
                        title,
                        message,
                        type: reminderType === 'overdue' ? 'alert' : 'info',
                        link: '/bills'
                    });

                    // Email reminder
                    try {
                        await sendRentReminderEmail(tenantUser, bill.payment ? { amount: bill.amountDue, dueDate: bill.dueDate } : bill, bill.property);
                    } catch (emailErr) {
                        logger.error(`Failed to send reminder email to ${tenantUser.email}: ${emailErr.message}`);
                    }

                    bill.remindersSent.push(reminderType);
                    await bill.save();
                }
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Payment Reminder sweep exception: ${error.message}`);
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

    // Daily sweep for Lease Expiry Reminders and Rollover/Activation
    cron.schedule('0 0 * * *', async () => {
        logger.info('[CRON] Initializing daily Lease Expiry and Rollover sweep...');
        try {
            const now = new Date();
            const activeLeases = await Lease.find({ status: 'active' });
            for (const lease of activeLeases) {
                const diffTime = new Date(lease.endDate) - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Reminders at 30, 15, 7, 1 days
                const intervals = [30, 15, 7, 1];
                if (intervals.includes(diffDays)) {
                    if (!lease.sentReminders.includes(diffDays)) {
                        const tenantRecord = await Tenant.findById(lease.tenant);
                        const tenantUser = await User.findOne({ email: tenantRecord?.email });
                        const propertyRecord = await Property.findById(lease.property);
                        const propName = propertyRecord?.name || 'residence';

                        // Notify Tenant
                        if (tenantUser) {
                            await Notification.create({
                                recipient: tenantUser._id,
                                sender: lease.createdBy,
                                title: 'Lease Expiry Warning',
                                message: `Your lease for ${propName} will expire on ${new Date(lease.endDate).toLocaleDateString()}. Please choose whether you want to Renew your lease or Move Out.`,
                                type: 'warning',
                                link: '/my-lease'
                            });
                        }

                        // Notify Manager
                        await Notification.create({
                            recipient: lease.createdBy,
                            sender: lease.createdBy,
                            title: 'Lease Approaching Expiry',
                            message: `Tenant's lease for ${propName} will expire soon. Awaiting tenant response.`,
                            type: 'info',
                            link: '/leases'
                        });

                        lease.sentReminders.push(diffDays);
                        lease.lastReminderSent = now;
                        
                        const idx = intervals.indexOf(diffDays);
                        if (idx !== -1 && idx < intervals.length - 1) {
                            const nextInterval = intervals[idx + 1];
                            const nextDate = new Date(lease.endDate);
                            nextDate.setDate(nextDate.getDate() - nextInterval);
                            lease.nextReminderDate = nextDate;
                        }
                        await lease.save();
                    }
                }

                // Daily Expiry Check
                if (diffDays <= 0) {
                    lease.status = 'expired';
                    lease.leaseDecision = 'expired';
                    await lease.save();

                    logger.info(`[CRON] Lease ${lease.leaseNumber} expired.`);

                    // If a pending future lease exists for this property, activate it!
                    const futureLease = await Lease.findOne({
                        property: lease.property,
                        status: 'pending',
                        renewedFrom: lease._id
                    });

                    if (futureLease) {
                        futureLease.status = 'active';
                        await futureLease.save();

                        const tenantRecord = await Tenant.findById(futureLease.tenant);
                        const tenantUser = await User.findOne({ email: tenantRecord?.email });
                        if (tenantUser) {
                            const booking = await Booking.findOne({
                                property: lease.property,
                                user: tenantUser._id,
                                status: 'approved'
                            });
                            if (booking) {
                                booking.status = 'completed';
                                booking.completedDate = new Date();
                                await booking.save();
                            }
                        }
                        logger.info(`[CRON] Future lease ${futureLease.leaseNumber} activated automatically upon expiry of old lease.`);
                    } else {
                        const propertyRecord = await Property.findById(lease.property);
                        if (propertyRecord) {
                            propertyRecord.currentTenant = null;
                            propertyRecord.status = 'available';
                            propertyRecord.leases = propertyRecord.leases.filter(l => l.toString() !== lease._id.toString());
                            await propertyRecord.save();
                        }
                    }
                }
            }
        } catch (err) {
            logger.error(`[CRON ERROR] Daily lease expiry runner exception: ${err.message}`);
        }
    });

    // Run every midnight to perform Verification Retention & Reconciliation Maintenance
    cron.schedule('0 0 * * *', async () => {
        logger.info('[CRON] Initializing Daily Verification Maintenance & Retention Purge sweep...');
        try {
            const result = await verificationService.runVerificationMaintenanceJobs();
            if (result.skipped) {
                logger.warn('[CRON] Verification maintenance sweep skipped due to active overlapping execution.');
            } else {
                logger.info(`[CRON] Verification maintenance sweep completed. Reconciled: ${result.abandonedSessionsReconciled}, Video KYC Purged: ${result.videoKycMetadataPurged}, Facial Purged: ${result.facialMetadataPurged}`);
            }
        } catch (error) {
            logger.error(`[CRON ERROR] Verification Maintenance daemon exception: ${error.message}`);
        }
    });

};
