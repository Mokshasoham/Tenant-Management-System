import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Notification from '../src/models/Notification.js';

async function repairLegacyNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for legacy notification repair...\n');

    const allNotifications = await Notification.find({});
    console.log(`Total notifications in collection: ${allNotifications.length}`);

    let repairedCount = 0;

    for (const doc of allNotifications) {
      let needsRepair = false;

      const titleLower = (doc.title || '').toLowerCase();
      const msgLower = (doc.message || '').toLowerCase();
      const linkStr = doc.link || doc.redirectUrl || doc.actionUrl || '';

      // 1. Infer Category if missing or generic 'system'
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

      // 2. Repair actionUrl / redirectUrl if missing but link exists
      const targetUrl = doc.actionUrl || doc.redirectUrl || doc.link || '/action-center';
      if (doc.actionUrl !== targetUrl) {
        doc.actionUrl = targetUrl;
        doc.redirectUrl = targetUrl;
        needsRepair = true;
      }

      // 3. Sync read and isRead flags
      const isReadBool = Boolean(doc.isRead || doc.read);
      if (doc.isRead !== isReadBool || doc.read !== isReadBool) {
        doc.isRead = isReadBool;
        doc.read = isReadBool;
        needsRepair = true;
      }

      // 4. Ensure sourceModule exists
      if (!doc.sourceModule) {
        doc.sourceModule = doc.category || 'system';
        needsRepair = true;
      }

      if (needsRepair) {
        await doc.save();
        repairedCount++;
      }
    }

    console.log(`\n=====================================================`);
    console.log(` Legacy Notifications Repaired: ${repairedCount} / ${allNotifications.length}`);
    console.log(`=====================================================\n`);

  } catch (err) {
    console.error('Repair Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

repairLegacyNotifications();
