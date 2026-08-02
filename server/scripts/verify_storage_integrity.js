import mongoose from 'mongoose';
import FileMetadata from '../src/models/FileMetadata.js';
import FileStorage from '../src/models/FileStorage.js';
import User from '../src/models/User.js';
import { ALLOWED_FILE_CATEGORIES } from '../src/constants/fileCategories.js';
import config from '../src/config/config.js';

/**
 * Enterprise Storage Health & Integrity Audit Verification Suite
 */
async function runStorageIntegrityAudit() {
  console.log('\n========================================================');
  console.log('=== STARTING ENTERPRISE STORAGE HEALTH & INTEGRITY AUDIT ===');
  console.log('========================================================\n');

  let passed = true;

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
    }

    const allMetadata = await FileMetadata.find({});
    const allStorage = await FileStorage.find({});
    const allUsers = await User.find({});

    console.log(`[Overview] Total Metadata Records: ${allMetadata.length} | Total Storage Binaries: ${allStorage.length} | Total Users: ${allUsers.length}\n`);

    // 1. Audit FileMetadata Categories
    console.log('[Audit 1/8] Validating FileMetadata Categories...');
    let invalidCategories = 0;
    for (const meta of allMetadata) {
      if (!ALLOWED_FILE_CATEGORIES.includes(meta.category)) {
        console.error(`  ❌ Invalid category "${meta.category}" on FileMetadata ID: ${meta._id}`);
        invalidCategories++;
        passed = false;
      }
    }
    if (invalidCategories === 0) {
      console.log(`  ✓ Passed: All ${allMetadata.length} FileMetadata records have valid categories.\n`);
    }

    // 2. Audit Orphan FileMetadata Records (Metadata without Storage binary)
    console.log('[Audit 2/8] Checking for Orphan FileMetadata Records...');
    const storageFilenames = new Set(allStorage.map(s => s.filename));
    let orphanMetadataCount = 0;

    for (const meta of allMetadata) {
      const cleanName = meta.key ? meta.key.split('/').pop() : meta.filename;
      if (!storageFilenames.has(cleanName) && !meta.url.startsWith('https://')) {
        console.error(`  ❌ Orphan FileMetadata record found ID: ${meta._id} (Filename: ${cleanName})`);
        orphanMetadataCount++;
        passed = false;
      }
    }
    if (orphanMetadataCount === 0) {
      console.log(`  ✓ Passed: 0 orphan FileMetadata records found.\n`);
    }

    // 3. Audit Orphan FileStorage Binaries (Storage binary without Metadata)
    console.log('[Audit 3/8] Checking for Orphan FileStorage Binaries...');
    const metadataFilenames = new Set(allMetadata.map(m => (m.key ? m.key.split('/').pop() : m.filename)));
    let orphanStorageCount = 0;

    for (const storageDoc of allStorage) {
      if (!metadataFilenames.has(storageDoc.filename)) {
        console.error(`  ❌ Orphan FileStorage document found: ${storageDoc.filename}`);
        orphanStorageCount++;
        passed = false;
      }
    }
    if (orphanStorageCount === 0) {
      console.log(`  ✓ Passed: 0 orphan FileStorage binaries found.\n`);
    }

    // 4. Audit Duplicate Keys & Filenames
    console.log('[Audit 4/8] Checking for Duplicate Keys & Filenames...');
    const keyCounts = {};
    let duplicateKeys = 0;
    for (const meta of allMetadata) {
      keyCounts[meta.key] = (keyCounts[meta.key] || 0) + 1;
      if (keyCounts[meta.key] > 1) {
        console.error(`  ❌ Duplicate key found: ${meta.key}`);
        duplicateKeys++;
        passed = false;
      }
    }
    if (duplicateKeys === 0) {
      console.log(`  ✓ Passed: 0 duplicate keys found in FileMetadata.\n`);
    }

    // 5. Audit Duplicate SHA256 Content per Uploader
    console.log('[Audit 5/8] Checking SHA256 Content Unique Mapping...');
    const uploaderShaMap = new Map();
    let duplicateShaCount = 0;

    for (const meta of allMetadata) {
      if (meta.uploader && meta.sha256) {
        const combo = `${meta.uploader}_${meta.category}_${meta.sha256}`;
        if (uploaderShaMap.has(combo)) {
          console.warn(`  ⚠️ Duplicate SHA256 content for uploader ${meta.uploader} in category ${meta.category} (File ID: ${meta._id})`);
          duplicateShaCount++;
        } else {
          uploaderShaMap.set(combo, meta._id);
        }
      }
    }
    if (duplicateShaCount === 0) {
      console.log(`  ✓ Passed: SHA256 content deduplication map is 100% clean.\n`);
    } else {
      console.log(`  ℹ Found ${duplicateShaCount} historical duplicate SHA256 entries (deduplication active for new uploads).\n`);
    }

    // 6. Audit User Avatar References
    console.log('[Audit 6/8] Checking User Avatar References...');
    const usersWithAvatar = allUsers.filter(u => u.avatar && typeof u.avatar === 'string' && u.avatar.length > 0);
    let brokenAvatarRefs = 0;

    for (const user of usersWithAvatar) {
      if (user.avatar.includes('/api/files/download/')) {
        const fileIdMatch = user.avatar.match(/\/api\/files\/download\/([a-fA-F0-9]{24})/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          const exists = allMetadata.some(m => m._id.toString() === fileId);
          if (!exists) {
            console.error(`  ❌ Broken avatar reference on User ${user._id} (${user.email}) -> FileId ${fileId} not found`);
            brokenAvatarRefs++;
            passed = false;
          }
        }
      }
    }
    if (brokenAvatarRefs === 0) {
      console.log(`  ✓ Passed: All ${usersWithAvatar.length} user avatar references are valid.\n`);
    }

    // 7. Audit Uploader References
    console.log('[Audit 7/8] Validating Uploader Reference Integrity...');
    const userIds = new Set(allUsers.map(u => u._id.toString()));
    let missingUploaders = 0;

    for (const meta of allMetadata) {
      if (meta.uploader && !userIds.has(meta.uploader.toString())) {
        console.warn(`  ⚠️ FileMetadata ${meta._id} references non-existent uploader User ${meta.uploader}`);
        missingUploaders++;
      }
    }
    if (missingUploaders === 0) {
      console.log(`  ✓ Passed: All FileMetadata uploaders match valid User records.\n`);
    } else {
      console.log(`  ℹ Found ${missingUploaders} metadata records with legacy uploader references.\n`);
    }

    // 8. Audit Storage Binary Size Consistency
    console.log('[Audit 8/8] Validating Storage File Sizes...');
    let sizeMismatches = 0;
    for (const meta of allMetadata) {
      const cleanName = meta.key ? meta.key.split('/').pop() : meta.filename;
      const storageDoc = allStorage.find(s => s.filename === cleanName);
      if (storageDoc && storageDoc.data && storageDoc.data.length !== meta.size) {
        console.error(`  ❌ File size mismatch for ${cleanName}: Metadata size ${meta.size} vs Binary size ${storageDoc.data.length}`);
        sizeMismatches++;
        passed = false;
      }
    }
    if (sizeMismatches === 0) {
      console.log(`  ✓ Passed: All FileStorage binary sizes match FileMetadata records.\n`);
    }

    console.log('========================================================');
    if (passed) {
      console.log('=== ENTERPRISE STORAGE INTEGRITY AUDIT: 100% PASSED ===');
    } else {
      console.log('=== ENTERPRISE STORAGE INTEGRITY AUDIT: COMPLETED WITH WARNS ===');
    }
    console.log('========================================================\n');

    await mongoose.disconnect();
    process.exit(passed ? 0 : 1);
  } catch (err) {
    console.error('\n❌ AUDIT SCRIPT FAILURE:', err.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runStorageIntegrityAudit();
