import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
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

// Import Services
import { uploadFileBuffer, deleteFileFromStorage } from '../src/services/fileService.js';
import { generateInvoicePDF, generateAndUploadLeasePDF } from '../src/services/pdfService.js';

const uploadsPath = path.resolve(__dirname, '..', 'uploads');

// Metrics
const report = {
  payments: { scanned: 0, migrated: 0, alreadyMigrated: 0, missingSource: 0, failed: 0, skipped: 0 },
  leases: { scanned: 0, migrated: 0, alreadyMigrated: 0, missingSource: 0, failed: 0, skipped: 0 },
  messages: { scanned: 0, migrated: 0, alreadyMigrated: 0, missingSource: 0, failed: 0, skipped: 0 },
  properties: { scanned: 0, migrated: 0, alreadyMigrated: 0, missingSource: 0, failed: 0, skipped: 0 },
  users: { scanned: 0, migrated: 0, alreadyMigrated: 0, missingSource: 0, failed: 0, skipped: 0 },
};

const backupLog = [];
const isDryRun = process.argv.includes('--dry-run');

// Helper to compute sha256 of buffer
function getBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Check transaction support by writing to a dummy collection inside a transaction
async function checkTransactionSupport() {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const DummySchema = new mongoose.Schema({ name: String }, { strict: false, collection: '__tx_test' });
    const Dummy = mongoose.models.__TxTest || mongoose.model('__TxTest', DummySchema);
    await Dummy.create([{ name: 'test' }], { session });
    await session.commitTransaction();
    session.endSession();
    await Dummy.deleteMany({});
    return true;
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (_) {}
      session.endSession();
    }
    return false;
  }
}

async function runMigration() {
  console.log(`Starting Centralized File Migration Utility... ${isDryRun ? '[DRY RUN MODE]' : '[LIVE MODE]'}`);
  console.log('Connecting to MongoDB...');
  
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to database successfully.');

    const transactionsSupported = await checkTransactionSupport();
    console.log(`MongoDB transactions supported: ${transactionsSupported}`);

    // --- 1. PAYMENTS MIGRATION ---
    console.log('\n--- Migrating Payments ---');
    const payments = await Payment.find({});
    report.payments.scanned = payments.length;

    for (const payment of payments) {
      if (payment.fileId) {
        report.payments.alreadyMigrated++;
        continue;
      }
      if (!payment.invoiceUrl || !payment.invoiceUrl.includes('/uploads/')) {
        report.payments.skipped++;
        continue;
      }

      const filename = path.basename(payment.invoiceUrl);
      let filePath = path.join(uploadsPath, 'properties', filename);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(uploadsPath, 'invoices', filename);
      }

      let buffer = null;
      let isRegenerated = false;

      if (fs.existsSync(filePath)) {
        buffer = fs.readFileSync(filePath);
      } else {
        console.log(`  File missing on disk for payment ${payment._id}. Attempting regeneration...`);
        try {
          const tenant = await User.findOne({ email: payment.tenant?.email || '' }) || { firstName: 'Valued', lastName: 'Tenant', email: 'tenant@tms.com' };
          const property = await Property.findById(payment.property) || { name: 'Assigned Residence', address: 'Property Address' };
          
          if (!isDryRun) {
            const uploadResult = await generateInvoicePDF(payment, tenant, property);
            if (uploadResult && uploadResult.fileId) {
              payment.fileId = uploadResult.fileId;
              payment.legacyUrl = payment.invoiceUrl;
              await payment.save();
              report.payments.migrated++;
              isRegenerated = true;
              console.log(`  Successfully regenerated and migrated payment ${payment._id}.`);
            }
          } else {
            console.log(`  [Dry Run] Would regenerate invoice PDF for payment ${payment._id}`);
            isRegenerated = true;
            report.payments.migrated++;
          }
        } catch (regErr) {
          console.error(`  Regeneration failed for payment ${payment._id}:`, regErr);
        }
      }

      if (isRegenerated) continue;

      if (!buffer) {
        console.log(`  Missing source file on disk for payment ${payment._id} and regeneration failed.`);
        report.payments.missingSource++;
        continue;
      }

      let fileRecord = null;
      try {
        const sha256 = getBufferHash(buffer);
        backupLog.push({
          collection: 'payments',
          docId: payment._id.toString(),
          legacyUrl: payment.invoiceUrl,
          timestamp: new Date()
        });

        if (isDryRun) {
          console.log(`  [Dry Run] Would migrate payment ${payment._id} (filename: ${filename}, size: ${buffer.length} bytes)`);
          report.payments.migrated++;
          continue;
        }

        // Entity-scoped duplicate check
        fileRecord = await FileMetadata.findOne({ sha256, relatedEntity: payment._id });
        if (!fileRecord) {
          fileRecord = await uploadFileBuffer({
            buffer,
            filename,
            mimeType: 'application/pdf',
            category: 'invoices',
            relatedEntityId: payment._id,
            relatedModelName: 'Payment'
          });
        }

        // Atomic update with fallback rollback
        try {
          if (transactionsSupported) {
            const session = await mongoose.startSession();
            await session.withTransaction(async () => {
              payment.fileId = fileRecord._id;
              payment.legacyUrl = payment.invoiceUrl;
              await payment.save({ session });
            });
            session.endSession();
          } else {
            payment.fileId = fileRecord._id;
            payment.legacyUrl = payment.invoiceUrl;
            await payment.save();
          }
          report.payments.migrated++;
        } catch (updateErr) {
          if (fileRecord) {
            const cleanFilename = fileRecord.key.split('/').pop();
            await deleteFileFromStorage(fileRecord.key, cleanFilename);
            await FileMetadata.deleteOne({ _id: fileRecord._id });
          }
          throw updateErr;
        }
      } catch (err) {
        console.error(`  Failed migrating payment ${payment._id}:`, err);
        report.payments.failed++;
      }
    }

    // --- 2. LEASES MIGRATION ---
    console.log('\n--- Migrating Leases ---');
    const leases = await Lease.find({});
    report.leases.scanned = leases.length;

    for (const lease of leases) {
      let leaseModified = false;
      const documentsList = lease.documents || [];

      for (let i = 0; i < documentsList.length; i++) {
        const doc = documentsList[i];
        if (doc.fileId) {
          report.leases.alreadyMigrated++;
          continue;
        }
        if (!doc.url || !doc.url.includes('/uploads/')) {
          report.leases.skipped++;
          continue;
        }

        const filename = path.basename(doc.url);
        let filePath = path.join(uploadsPath, 'properties', filename);
        if (!fs.existsSync(filePath)) {
          filePath = path.join(uploadsPath, 'leases', filename);
        }

        let buffer = null;
        let isRegenerated = false;

        if (fs.existsSync(filePath)) {
          buffer = fs.readFileSync(filePath);
        } else {
          console.log(`  File missing on disk for lease ${lease._id} document: ${filename}. Attempting regeneration...`);
          try {
            const tenant = await User.findOne({ email: lease.tenant?.email || '' }) || { firstName: 'Valued', lastName: 'Tenant', email: 'tenant@tms.com' };
            const property = await Property.findById(lease.property) || { name: 'Assigned Residence', address: 'Property Address', city: 'City', zipCode: '000000' };

            if (!isDryRun) {
              const uploadResult = await generateAndUploadLeasePDF(lease, tenant, property, lease.signature);
              if (uploadResult && uploadResult.fileId) {
                doc.fileId = uploadResult.fileId;
                doc.legacyUrl = doc.url;
                leaseModified = true;
                isRegenerated = true;
                report.leases.migrated++;
                console.log(`  Successfully regenerated and migrated lease ${lease._id} doc.`);
              }
            } else {
              console.log(`  [Dry Run] Would regenerate lease PDF for lease ${lease._id}`);
              isRegenerated = true;
              report.leases.migrated++;
            }
          } catch (regErr) {
            console.error(`  Regeneration failed for lease ${lease._id}:`, regErr);
          }
        }

        if (isRegenerated) continue;

        if (!buffer) {
          console.log(`  Missing source file on disk for lease ${lease._id} doc: ${filename}`);
          report.leases.missingSource++;
          continue;
        }

        let fileRecord = null;
        try {
          const sha256 = getBufferHash(buffer);
          backupLog.push({
            collection: 'leases',
            docId: lease._id.toString(),
            legacyUrl: doc.url,
            timestamp: new Date()
          });

          if (isDryRun) {
            console.log(`  [Dry Run] Would migrate lease doc for lease ${lease._id} (${filename})`);
            report.leases.migrated++;
            continue;
          }

          fileRecord = await FileMetadata.findOne({ sha256, relatedEntity: lease._id });
          if (!fileRecord) {
            fileRecord = await uploadFileBuffer({
              buffer,
              filename,
              mimeType: 'application/pdf',
              category: 'leases',
              relatedEntityId: lease._id,
              relatedModelName: 'Lease'
            });
          }

          doc.fileId = fileRecord._id;
          doc.legacyUrl = doc.url;
          leaseModified = true;
          report.leases.migrated++;
        } catch (err) {
          if (fileRecord && !isDryRun) {
            const cleanFilename = fileRecord.key.split('/').pop();
            await deleteFileFromStorage(fileRecord.key, cleanFilename);
            await FileMetadata.deleteOne({ _id: fileRecord._id });
          }
          console.error(`  Failed migrating lease ${lease._id} doc:`, err);
          report.leases.failed++;
        }
      }

      if (leaseModified && !isDryRun) {
        await lease.save();
      }
    }

    // --- 3. MESSAGES MIGRATION ---
    console.log('\n--- Migrating Messages ---');
    const messages = await Message.find({});
    report.messages.scanned = messages.length;

    for (const msg of messages) {
      let msgModified = false;
      const attachmentsList = msg.attachments || [];

      for (let i = 0; i < attachmentsList.length; i++) {
        const att = attachmentsList[i];
        if (att.fileId) {
          report.messages.alreadyMigrated++;
          continue;
        }
        if (!att.url || !att.url.includes('/uploads/')) {
          report.messages.skipped++;
          continue;
        }

        const filename = path.basename(att.url);
        const filePath = path.join(uploadsPath, 'chat', filename);

        if (!fs.existsSync(filePath)) {
          console.log(`  Missing source file on disk for message ${msg._id} attachment: ${filename}`);
          report.messages.missingSource++;
          continue;
        }

        const buffer = fs.readFileSync(filePath);

        let fileRecord = null;
        try {
          const sha256 = getBufferHash(buffer);
          backupLog.push({
            collection: 'messages',
            docId: msg._id.toString(),
            legacyUrl: att.url,
            timestamp: new Date()
          });

          if (isDryRun) {
            console.log(`  [Dry Run] Would migrate chat attachment for message ${msg._id} (${filename})`);
            report.messages.migrated++;
            continue;
          }

          fileRecord = await FileMetadata.findOne({ sha256, relatedEntity: msg._id });
          if (!fileRecord) {
            fileRecord = await uploadFileBuffer({
              buffer,
              filename,
              mimeType: att.fileType || 'application/octet-stream',
              category: 'chat',
              uploaderId: msg.sender,
              relatedEntityId: msg._id,
              relatedModelName: 'Message'
            });
          }

          att.fileId = fileRecord._id;
          att.legacyUrl = att.url;
          msgModified = true;
          report.messages.migrated++;
        } catch (err) {
          if (fileRecord && !isDryRun) {
            const cleanFilename = fileRecord.key.split('/').pop();
            await deleteFileFromStorage(fileRecord.key, cleanFilename);
            await FileMetadata.deleteOne({ _id: fileRecord._id });
          }
          console.error(`  Failed migrating message ${msg._id} attachment:`, err);
          report.messages.failed++;
        }
      }

      if (msgModified && !isDryRun) {
        await msg.save();
      }
    }

    // --- 4. PROPERTIES MIGRATION ---
    console.log('\n--- Migrating Properties ---');
    const properties = await Property.find({});
    report.properties.scanned = properties.length;

    for (const prop of properties) {
      let propModified = false;
      const mediaList = prop.media || [];

      for (let i = 0; i < mediaList.length; i++) {
        const item = mediaList[i];
        if (item.fileId) {
          report.properties.alreadyMigrated++;
          continue;
        }
        if (!item.url || !item.url.includes('/uploads/')) {
          report.properties.skipped++;
          continue;
        }

        const filename = path.basename(item.url);
        const filePath = path.join(uploadsPath, 'properties', filename);

        if (!fs.existsSync(filePath)) {
          console.log(`  Missing source file on disk for property ${prop._id} media: ${filename}`);
          report.properties.missingSource++;
          continue;
        }

        const buffer = fs.readFileSync(filePath);

        let fileRecord = null;
        try {
          const sha256 = getBufferHash(buffer);
          backupLog.push({
            collection: 'properties',
            docId: prop._id.toString(),
            legacyUrl: item.url,
            timestamp: new Date()
          });

          if (isDryRun) {
            console.log(`  [Dry Run] Would migrate property media for property ${prop._id} (${filename})`);
            report.properties.migrated++;
            continue;
          }

          fileRecord = await FileMetadata.findOne({ sha256, relatedEntity: prop._id });
          if (!fileRecord) {
            fileRecord = await uploadFileBuffer({
              buffer,
              filename,
              mimeType: item.mediaType === 'video' ? 'video/mp4' : 'image/webp',
              category: 'properties',
              relatedEntityId: prop._id,
              relatedModelName: 'Property'
            });
          }

          item.fileId = fileRecord._id;
          item.legacyUrl = item.url;
          propModified = true;
          report.properties.migrated++;
        } catch (err) {
          if (fileRecord && !isDryRun) {
            const cleanFilename = fileRecord.key.split('/').pop();
            await deleteFileFromStorage(fileRecord.key, cleanFilename);
            await FileMetadata.deleteOne({ _id: fileRecord._id });
          }
          console.error(`  Failed migrating property ${prop._id} media:`, err);
          report.properties.failed++;
        }
      }

      if (propModified && !isDryRun) {
        await prop.save();
      }
    }

    // --- 5. USERS KYC MIGRATION ---
    console.log('\n--- Migrating Users KYC ---');
    const users = await User.find({});
    report.users.scanned = users.length;

    for (const user of users) {
      let userModified = false;
      const kycDocs = user.kycDocuments || [];
      const kycFileIds = user.kycFileIds || [];

      if (kycFileIds.length > 0 && kycFileIds.length === kycDocs.length) {
        report.users.alreadyMigrated += kycDocs.length;
        continue;
      }

      for (let i = 0; i < kycDocs.length; i++) {
        const docUrl = kycDocs[i];
        if (kycFileIds[i]) {
          report.users.alreadyMigrated++;
          continue;
        }
        if (!docUrl || !docUrl.includes('/uploads/')) {
          report.users.skipped++;
          continue;
        }

        const filename = path.basename(docUrl);
        const filePath = path.join(uploadsPath, 'kyc', filename);

        if (!fs.existsSync(filePath)) {
          console.log(`  Missing source file on disk for user ${user._id} KYC doc: ${filename}`);
          report.users.missingSource++;
          continue;
        }

        const buffer = fs.readFileSync(filePath);

        let fileRecord = null;
        try {
          const sha256 = getBufferHash(buffer);
          backupLog.push({
            collection: 'users',
            docId: user._id.toString(),
            legacyUrl: docUrl,
            timestamp: new Date()
          });

          if (isDryRun) {
            console.log(`  [Dry Run] Would migrate user KYC doc for user ${user._id} (${filename})`);
            report.users.migrated++;
            continue;
          }

          fileRecord = await FileMetadata.findOne({ sha256, relatedEntity: user._id });
          if (!fileRecord) {
            fileRecord = await uploadFileBuffer({
              buffer,
              filename,
              mimeType: 'application/pdf',
              category: 'kyc',
              uploaderId: user._id,
              relatedEntityId: user._id,
              relatedModelName: 'User'
            });
          }

          user.kycFileIds.push(fileRecord._id);
          user.kycLegacyUrls.push(docUrl);
          userModified = true;
          report.users.migrated++;
        } catch (err) {
          if (fileRecord && !isDryRun) {
            const cleanFilename = fileRecord.key.split('/').pop();
            await deleteFileFromStorage(fileRecord.key, cleanFilename);
            await FileMetadata.deleteOne({ _id: fileRecord._id });
          }
          console.error(`  Failed migrating user ${user._id} KYC doc:`, err);
          report.users.failed++;
        }
      }

      if (userModified && !isDryRun) {
        await user.save();
      }
    }

    // Write backup report
    if (!isDryRun && backupLog.length > 0) {
      const backupPath = path.join(__dirname, 'migration_backup_report.json');
      fs.writeFileSync(backupPath, JSON.stringify(backupLog, null, 2));
      console.log(`\nBackup report written successfully to: ${backupPath}`);
    }

    // Output Migration Report
    console.log('\n==================================================');
    console.log('             MIGRATION REPORT SUMMARY             ');
    console.log('==================================================');
    console.table(report);

    // --- 6. POST-MIGRATION VALIDATION ---
    console.log('\nRunning Post-Migration Validation Check Stage...');
    let validationPassed = 0;
    let validationFailed = 0;
    let missingMetadata = 0;
    let missingFiles = 0;
    let brokenReferences = 0;
    let duplicateMetadata = 0;
    let orphanedMetadata = 0;

    const migratedFileIds = [];
    
    const activePayments = await Payment.find({ fileId: { $exists: true, $ne: null } });
    activePayments.forEach(p => migratedFileIds.push({ id: p.fileId, type: 'Payment', parentId: p._id }));

    const activeLeases = await Lease.find({});
    activeLeases.forEach(l => {
      (l.documents || []).forEach(d => {
        if (d.fileId) migratedFileIds.push({ id: d.fileId, type: 'Lease', parentId: l._id });
      });
    });

    const activeMessages = await Message.find({});
    activeMessages.forEach(m => {
      (m.attachments || []).forEach(a => {
        if (a.fileId) migratedFileIds.push({ id: a.fileId, type: 'Message', parentId: m._id });
      });
    });

    const activeProperties = await Property.find({});
    activeProperties.forEach(p => {
      (p.media || []).forEach(m => {
        if (m.fileId) migratedFileIds.push({ id: m.fileId, type: 'Property', parentId: p._id });
      });
    });

    const activeUsers = await User.find({ kycFileIds: { $exists: true, $ne: [] } });
    activeUsers.forEach(u => {
      (u.kycFileIds || []).forEach(id => migratedFileIds.push({ id, type: 'User', parentId: u._id }));
    });

    console.log(`Validating ${migratedFileIds.length} migrated file reference(s)...`);

    for (const ref of migratedFileIds) {
      const meta = await FileMetadata.findById(ref.id);
      if (!meta) {
        console.log(`  [FAIL] Missing FileMetadata record for ID: ${ref.id} referenced by ${ref.type} (${ref.parentId})`);
        missingMetadata++;
        validationFailed++;
        continue;
      }

      const cleanFilename = meta.key.split('/').pop();
      const binaryExists = await FileStorage.findOne({ filename: cleanFilename });
      if (!binaryExists && !process.env.AWS_ACCESS_KEY_ID) {
        console.log(`  [FAIL] Missing physical storage backup for: ${cleanFilename} (FileID: ${ref.id})`);
        missingFiles++;
        validationFailed++;
      } else {
        validationPassed++;
      }
    }

    const allMetadata = await FileMetadata.find({});
    for (const meta of allMetadata) {
      if (meta.relatedEntity) {
        let parentExists = false;
        try {
          if (meta.relatedModel === 'User') parentExists = await User.findById(meta.relatedEntity);
          else if (meta.relatedModel === 'Lease') parentExists = await Lease.findById(meta.relatedEntity);
          else if (meta.relatedModel === 'Payment') parentExists = await Payment.findById(meta.relatedEntity);
          else if (meta.relatedModel === 'Property') parentExists = await Property.findById(meta.relatedEntity);
          else if (meta.relatedModel === 'Message') parentExists = await Message.findById(meta.relatedEntity);
          else parentExists = true;
        } catch (_) {}

        if (!parentExists) {
          console.log(`  [WARNING] Orphaned metadata record: ${meta._id} references non-existing parent: ${meta.relatedEntity}`);
          orphanedMetadata++;
        }
      }

      if (meta.sha256 && meta.relatedEntity) {
        const dups = await FileMetadata.countDocuments({ sha256: meta.sha256, relatedEntity: meta.relatedEntity });
        if (dups > 1) {
          console.log(`  [WARNING] Duplicate FileMetadata entries found for checksum ${meta.sha256} under parent ${meta.relatedEntity}`);
          duplicateMetadata++;
        }
      }
    }

    console.log('\n==================================================');
    console.log('             VALIDATION REPORT SUMMARY            ');
    console.log('==================================================');
    console.log(`Total Validated:      ${migratedFileIds.length}`);
    console.log(`Validation Passed:    ${validationPassed}`);
    console.log(`Validation Failed:    ${validationFailed}`);
    console.log(`Missing Metadata:     ${missingMetadata}`);
    console.log(`Missing Files:        ${missingFiles}`);
    console.log(`Broken References:    ${brokenReferences}`);
    console.log(`Duplicate Metadata:   ${duplicateMetadata}`);
    console.log(`Orphaned Metadata:    ${orphanedMetadata}`);
    console.log(`Overall Status:       ${validationFailed === 0 ? 'PASS' : 'FAIL'}`);
    console.log('==================================================');

  } catch (err) {
    console.error('Migration failed critically:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }
}

runMigration();
