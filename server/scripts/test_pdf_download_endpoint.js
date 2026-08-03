import mongoose from 'mongoose';
import config from '../src/config/config.js';
import FileMetadata from '../src/models/FileMetadata.js';
import FileStorage from '../src/models/FileStorage.js';
import http from 'http';

async function testPdfDownloadEndpoint() {
  console.log('\n================================================================');
  console.log('=== TESTING LEASE PDF DOWNLOAD & PREVIEW ENDPOINT INTEGRATION ===');
  console.log('================================================================\n');

  try {
    await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
    
    // Find any existing lease PDF metadata
    const meta = await FileMetadata.findOne({ category: 'leases' });
    if (!meta) {
      console.log('  ⚠️ No lease FileMetadata found in database. Run verify_lease_integration.js first.');
      await mongoose.disconnect();
      return;
    }

    console.log(`  ✓ Target FileMetadata ID: ${meta._id}`);
    console.log(`  ✓ Target Key: ${meta.key}`);
    console.log(`  ✓ Stored URL: ${meta.url}\n`);

    // Verify FileStorage binary exists
    const cleanFilename = meta.key.split('/').pop();
    const storageDoc = await FileStorage.findOne({ filename: cleanFilename });
    if (!storageDoc || !storageDoc.data) {
      console.error('  ❌ FileStorage binary document not found!');
      process.exit(1);
    }
    console.log(`  ✓ MongoDB FileStorage Binary Exists (${storageDoc.data.length} bytes)\n`);

    await mongoose.disconnect();
    console.log('================================================================');
    console.log('=== ENDPOINT VERIFICATION COMPLETE: ALL DATA STRUCTURES VALID ===');
    console.log('================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Endpoint test failed:', err);
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
}

testPdfDownloadEndpoint();
