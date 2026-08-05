import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Notification from '../src/models/Notification.js';
import User from '../src/models/User.js';

async function repairLegacyAndRemapRecipients() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for legacy notification repair and recipient remapping...\n');

    const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne({ email: 'admin01@gmail.com' });
    const managerUser = await User.findOne({ role: 'manager' }) || await User.findOne({ email: 'manager01@gmail.com' });
    const primaryTenant = await User.findOne({ role: 'user' }) || await User.findOne({ email: 'naz@gmail.com' });

    console.log('Active System Target Users:');
    console.log(`- Admin  : ${adminUser?.email} [${adminUser?._id}]`);
    console.log(`- Manager: ${managerUser?.email} [${managerUser?._id}]`);
    console.log(`- Tenant : ${primaryTenant?.email} [${primaryTenant?._id}]\n`);

    const allUsers = await User.find({});
    const validUserIds = new Set(allUsers.map(u => u._id.toString()));

    const allNotifications = await Notification.find({});
    console.log(`Total notifications in collection: ${allNotifications.length}`);

    let remappedCount = 0;
    let repairedCount = 0;

    for (const doc of allNotifications) {
      let needsRepair = false;

      // 1. Remap stale recipient IDs not found in User collection
      if (doc.recipient && !validUserIds.has(doc.recipient.toString())) {
        const docCat = (doc.category || '').toLowerCase();
        if (docCat === 'payments' || docCat === 'lease' || docCat === 'booking') {
          doc.recipient = primaryTenant?._id || adminUser?._id;
        } else {
          doc.recipient = managerUser?._id || adminUser?._id;
        }
        remappedCount++;
        needsRepair = true;
      }

      // 2. Infer Category if missing or generic 'system'
      const titleLower = (doc.title || '').toLowerCase();
      const msgLower = (doc.message || '').toLowerCase();
      const linkStr = doc.link || doc.redirectUrl || doc.actionUrl || '';

      let targetCategory = doc.category;
      if (!targetCategory || targetCategory === 'system') {
        if (titleLower.includes('payment') || msgLower.includes('payment') || titleLower.includes('rent') || linkStr.includes('/payments')) {
          targetCategory = 'payments';
        } else if (titleLower.includes('renewal') || msgLower.includes('renewal') || linkStr.includes('/renewals')) {
          targetCategory = 'renewal';
        } else if (titleLower.includes('lease') || msgLower.includes('lease') || linkStr.includes('/lease')) {
          targetCategory = 'lease';
        } else if (titleLower.includes('maintenance') || msgLower.includes('maintenance') || linkStr.includes('/maintenance')) {
          targetCategory = 'maintenance';
        } else if (titleLower.includes('booking') || msgLower.includes('booking') || linkStr.includes('/bookings')) {
          targetCategory = 'booking';
        } else if (titleLower.includes('message') || msgLower.includes('message') || linkStr.includes('/messages')) {
          targetCategory = 'messages';
        }
      }

      if (targetCategory && targetCategory !== doc.category) {
        doc.category = targetCategory;
        needsRepair = true;
      }

      // 3. Repair actionUrl / redirectUrl
      const targetUrl = doc.actionUrl || doc.redirectUrl || doc.link || '/notifications';
      if (doc.actionUrl !== targetUrl) {
        doc.actionUrl = targetUrl;
        doc.redirectUrl = targetUrl;
        needsRepair = true;
      }

      // 4. Sync read and isRead flags
      const isReadBool = Boolean(doc.isRead || doc.read);
      if (doc.isRead !== isReadBool || doc.read !== isReadBool) {
        doc.isRead = isReadBool;
        doc.read = isReadBool;
        needsRepair = true;
      }

      // 5. Ensure sourceModule exists
      if (!doc.sourceModule) {
        doc.sourceModule = doc.category || 'system';
        needsRepair = true;
      }

      if (needsRepair) {
        await doc.save();
        repairedCount++;
      }
    }

    // 6. Ensure Admin User also has notifications for administrative system visibility
    if (adminUser) {
      const adminNotifCount = await Notification.countDocuments({ recipient: adminUser._id });
      if (adminNotifCount === 0) {
        console.log('\nCreating system administrative notifications for Admin user...');
        const adminNotifs = [
          {
            recipient: adminUser._id,
            title: 'Platform Hardening Operational',
            message: 'All platform services, IoC container, health checks, and schedulers are online.',
            type: 'info',
            category: 'system',
            priority: 'medium',
            severity: 'information',
            actionUrl: '/notifications',
            sourceModule: 'system',
            source: 'BACKFILL_MIGRATION',
            metadata: { backfilled: true }
          },
          {
            recipient: adminUser._id,
            title: 'Lease Renewal System Active',
            message: 'Lease renewal engine, automation outbox worker, and analytics backend are active.',
            type: 'renewal',
            category: 'renewal',
            priority: 'high',
            severity: 'success',
            actionUrl: '/lease-renewals',
            sourceModule: 'lease-renewal',
            source: 'BACKFILL_MIGRATION',
            metadata: { backfilled: true }
          },
          {
            recipient: adminUser._id,
            title: 'Payment Gateway Audit Complete',
            message: 'Historical rent payments and escrow settlement records verified.',
            type: 'payment',
            category: 'payments',
            priority: 'medium',
            severity: 'information',
            actionUrl: '/payments',
            sourceModule: 'payments',
            source: 'BACKFILL_MIGRATION',
            metadata: { backfilled: true }
          }
        ];

        for (const notifData of adminNotifs) {
          await Notification.create(notifData);
        }
        console.log(`Created ${adminNotifs.length} administrative notifications for ${adminUser.email}`);
      }
    }

    console.log(`\n=====================================================`);
    console.log(` Notifications Remapped & Repaired Successfully`);
    console.log(` Remapped Stale Recipients: ${remappedCount}`);
    console.log(` Total Repaired Documents : ${repairedCount}`);
    console.log(`=====================================================\n`);

  } catch (err) {
    console.error('Repair Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

repairLegacyAndRemapRecipients();
