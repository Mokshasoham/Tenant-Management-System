import mongoose from 'mongoose';
import config from '../src/config/config.js';
import Lease from '../src/models/Lease.js';
import FileMetadata from '../src/models/FileMetadata.js';

async function inspectAllLeases() {
  console.log('\n================================================================');
  console.log('=== INSPECTING ALL LEASE DOCUMENTS & URLS IN MONGODB ===');
  console.log('================================================================\n');

  try {
    await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
    const leases = await Lease.find({});
    console.log(`Total Lease Records Found: ${leases.length}\n`);

    let legacyCount = 0;

    for (const lease of leases) {
      console.log(`Lease ID: ${lease._id} | Number: ${lease.leaseNumber} | Status: ${lease.status}`);
      console.log(`  - pdfUrl: ${lease.pdfUrl || 'N/A'}`);
      console.log(`  - fileId: ${lease.fileId || 'N/A'}`);
      console.log(`  - documents count: ${lease.documents ? lease.documents.length : 0}`);

      if (lease.documents && lease.documents.length > 0) {
        lease.documents.forEach((d, i) => {
          console.log(`    [Doc ${i + 1}] name: ${d.name} | fileId: ${d.fileId} | url: ${d.url}`);
        });
      }

      if ((lease.pdfUrl && lease.pdfUrl.includes('/uploads/')) || (lease.documents && lease.documents.some(d => d.url && d.url.includes('/uploads/')))) {
        legacyCount++;
      }
      console.log('---');
    }

    console.log(`\nLegacy /uploads/ paths found in DB: ${legacyCount} leases.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Inspection error:', err);
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
}

inspectAllLeases();
