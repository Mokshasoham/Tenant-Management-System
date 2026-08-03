import mongoose from 'mongoose';
import config from '../src/config/config.js';
import Lease from '../src/models/Lease.js';
import FileMetadata from '../src/models/FileMetadata.js';

import dotenv from 'dotenv';
dotenv.config();

async function fixLegacyLeaseUrls() {
  console.log('\n================================================================');
  console.log('=== STARTING LEGACY LEASE URL CLEANUP & INTEGRATION AUDIT ===');
  console.log('================================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system');
    const leases = await Lease.find({});
    let updatedCount = 0;

    for (const lease of leases) {
      let modified = false;

      // Check main lease pdfUrl
      if (lease.pdfUrl && lease.pdfUrl.includes('/uploads/')) {
        const cleanFilename = lease.pdfUrl.split('/').pop();
        const meta = await FileMetadata.findOne({
          $or: [{ key: `leases/${cleanFilename}` }, { filename: cleanFilename }]
        });
        if (meta) {
          lease.pdfUrl = `/api/files/download/${meta._id}`;
          lease.fileId = meta._id;
          modified = true;
          console.log(`  ✓ Upgraded lease ${lease.leaseNumber} pdfUrl to /api/files/download/${meta._id}`);
        } else if (lease.fileId) {
          lease.pdfUrl = `/api/files/download/${lease.fileId}`;
          modified = true;
        }
      }

      // Check documents array
      if (lease.documents && Array.isArray(lease.documents) && lease.documents.length > 0) {
        const cleanDocs = [];
        for (const doc of lease.documents) {
          if (doc.legacyUrl) {
            doc.legacyUrl = undefined;
            modified = true;
          }
          if (doc.url && doc.url.includes('/uploads/')) {
            if (doc.fileId) {
              doc.url = `/api/files/download/${doc.fileId}`;
              modified = true;
              cleanDocs.push(doc);
              console.log(`  ✓ Upgraded lease ${lease.leaseNumber} document "${doc.name}" from legacy URL to /api/files/download/${doc.fileId}`);
            } else {
              const cleanFilename = doc.url.split('/').pop();
              const meta = await FileMetadata.findOne({
                $or: [{ key: `leases/${cleanFilename}` }, { filename: cleanFilename }, { filename: { $regex: new RegExp(cleanFilename + '$') } }]
              });
              if (meta) {
                doc.fileId = meta._id;
                doc.url = `/api/files/download/${meta._id}`;
                modified = true;
                cleanDocs.push(doc);
                console.log(`  ✓ Upgraded lease ${lease.leaseNumber} document "${doc.name}" to /api/files/download/${meta._id}`);
              } else {
                console.log(`  ✓ Removed unbacked legacy document "${doc.name}" (${doc.url}) from lease ${lease.leaseNumber}`);
                modified = true;
              }
            }
          } else {
            cleanDocs.push(doc);
          }
        }
        lease.documents = cleanDocs;
      }

      if (modified) {
        await lease.save();
        updatedCount++;
      }
    }

    console.log(`\n================================================================`);
    console.log(`=== LEGACY LEASE URL CLEANUP FINISHED. Updated ${updatedCount} leases ===`);
    console.log(`================================================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Legacy lease URL cleanup failed:', err);
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
}

fixLegacyLeaseUrls();
