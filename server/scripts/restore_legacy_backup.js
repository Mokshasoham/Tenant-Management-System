import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

// Import Models
import FileMetadata from '../src/models/FileMetadata.js';
import FileStorage from '../src/models/FileStorage.js';
import Payment from '../src/models/Payment.js';
import Lease from '../src/models/Lease.js';
import Message from '../src/models/Message.js';
import Property from '../src/models/Property.js';
import User from '../src/models/User.js';

const backupPath = path.join(__dirname, 'migration_backup_report.json');

async function restoreBackup() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // 1. Revert manually run first payment
    const payment1 = await Payment.findById('69c3c8851464ead1c0424db9');
    if (payment1 && payment1.fileId) {
      console.log('Restoring first payment 69c3c8851464ead1c0424db9');
      await FileMetadata.deleteOne({ _id: payment1.fileId });
      payment1.fileId = undefined;
      payment1.invoiceUrl = 'http://localhost:5000/uploads/properties/invoice_69c3c8851464ead1c0424db9.pdf';
      payment1.legacyUrl = undefined;
      await payment1.save();
    }

    if (!fs.existsSync(backupPath)) {
      console.log('No backup file found at:', backupPath);
      return;
    }

    const backupLog = JSON.parse(fs.readFileSync(backupPath));
    console.log(`Loaded ${backupLog.length} backup entries.`);

    for (const entry of backupLog) {
      const { collection, docId, legacyUrl } = entry;
      console.log(`Restoring ${collection} document: ${docId}`);

      if (collection === 'payments') {
        const doc = await Payment.findById(docId);
        if (doc) {
          if (doc.fileId) await FileMetadata.deleteOne({ _id: doc.fileId });
          doc.fileId = undefined;
          doc.invoiceUrl = legacyUrl;
          doc.legacyUrl = undefined;
          await doc.save();
        }
      } else if (collection === 'leases') {
        const doc = await Lease.findById(docId);
        if (doc) {
          doc.documents.forEach(d => {
            if (d.legacyUrl === legacyUrl || d.url.includes(path.basename(legacyUrl))) {
              d.fileId = undefined;
              d.url = legacyUrl;
              d.legacyUrl = undefined;
            }
          });
          await doc.save();
        }
      } else if (collection === 'messages') {
        const doc = await Message.findById(docId);
        if (doc) {
          doc.attachments.forEach(a => {
            if (a.legacyUrl === legacyUrl || a.url.includes(path.basename(legacyUrl))) {
              a.fileId = undefined;
              a.url = legacyUrl;
              a.legacyUrl = undefined;
            }
          });
          await doc.save();
        }
      } else if (collection === 'properties') {
        const doc = await Property.findById(docId);
        if (doc) {
          doc.media.forEach(m => {
            if (m.legacyUrl === legacyUrl || m.url.includes(path.basename(legacyUrl))) {
              m.fileId = undefined;
              m.url = legacyUrl;
              m.legacyUrl = undefined;
            }
          });
          await doc.save();
        }
      }
    }

    // Clean up created fallback files in FileStorage
    const deletedFiles = await FileStorage.deleteMany({
      filename: { $regex: /^(chat|invoices|leases|properties|kyc)-/ }
    });
    console.log(`Deleted fallback file records from DB:`, deletedFiles);

    // Clean up FileMetadata records
    const deletedMetadata = await FileMetadata.deleteMany({
      key: { $regex: /^(chat|invoices|leases|properties|kyc)\// }
    });
    console.log(`Deleted FileMetadata records:`, deletedMetadata);

    console.log('Restore completed successfully.');
  } catch (err) {
    console.error('Restore failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

restoreBackup();
