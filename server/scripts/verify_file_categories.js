import mongoose from 'mongoose';
import FileMetadata from '../src/models/FileMetadata.js';
import { FILE_CATEGORIES, ALLOWED_FILE_CATEGORIES } from '../src/constants/fileCategories.js';
import logger from '../src/utils/logger.js';

/**
 * Production Hardening Script for File Categories & Schema Validation
 */
async function runFileCategoryVerification() {
  console.log('\n========================================================');
  console.log('=== STARTING FILE CATEGORIES & SCHEMA HARDENING VERIFICATION ===');
  console.log('========================================================\n');

  try {
    // 1. Verify FileMetadata Schema Enum
    const schemaEnum = FileMetadata.schema.path('category').enumValues;
    console.log('[Check 1] FileMetadata Schema Category Enum Values:');
    console.log('         ', schemaEnum);

    // Verify all centralized FILE_CATEGORIES exist in schemaEnum
    const missingInSchema = ALLOWED_FILE_CATEGORIES.filter(cat => !schemaEnum.includes(cat));
    if (missingInSchema.length > 0) {
      throw new Error(`FileMetadata schema missing categories: ${missingInSchema.join(', ')}`);
    }
    console.log('✓ Passed: All centralized FILE_CATEGORIES exist in FileMetadata schema enum.\n');

    // 2. Test Mongoose Document Instantiation for Every Category
    console.log('[Check 2] Testing FileMetadata Validation for Every Category:');
    for (const cat of ALLOWED_FILE_CATEGORIES) {
      const dummyDoc = new FileMetadata({
        filename: `test-${cat}.jpg`,
        mimeType: 'image/jpeg',
        size: 1024,
        url: `/api/files/access/${cat}-test.jpg`,
        key: `${cat}/test-key-${Date.now()}-${cat}`,
        category: cat
      });

      const validationErr = dummyDoc.validateSync();
      if (validationErr) {
        throw new Error(`Validation failed for category "${cat}": ${validationErr.message}`);
      }
      console.log(`  ✓ Category "${cat}" passes FileMetadata schema validation.`);
    }
    console.log('✓ Passed: Every file category passes schema validation cleanly.\n');

    console.log('========================================================');
    console.log('=== ALL FILE CATEGORY HARDENING VERIFICATIONS PASSED ===');
    console.log('========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ HARDENING VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

runFileCategoryVerification();
