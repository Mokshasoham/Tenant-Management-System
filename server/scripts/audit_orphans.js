import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env relative to script in server/scripts
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management';

console.log('Connecting to MongoDB at:', mongoUri);

// Define or Import Schemas
const FileMetadataSchema = new mongoose.Schema({}, { strict: false, collection: 'filemetadatas' });
const FileStorageSchema = new mongoose.Schema({}, { strict: false, collection: 'filestorages' });
const MessageSchema = new mongoose.Schema({}, { strict: false, collection: 'messages' });
const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const LeaseSchema = new mongoose.Schema({}, { strict: false, collection: 'leases' });
const PaymentSchema = new mongoose.Schema({}, { strict: false, collection: 'payments' });
const PropertySchema = new mongoose.Schema({}, { strict: false, collection: 'properties' });

const FileMetadata = mongoose.models.FileMetadata || mongoose.model('FileMetadata', FileMetadataSchema);
const FileStorage = mongoose.models.FileStorage || mongoose.model('FileStorage', FileStorageSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Lease = mongoose.models.Lease || mongoose.model('Lease', LeaseSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
const Property = mongoose.models.Property || mongoose.model('Property', PropertySchema);

async function runAudit() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB.');

    const metadatas = await FileMetadata.find({});
    console.log(`Found ${metadatas.length} total FileMetadata records.`);

    const orphanedMetadata = [];
    const missingBinary = [];

    // 1. Audit FileMetadata -> Database relationships & physical binary existence
    for (const meta of metadatas) {
      const { _id, relatedEntity, relatedModel, category, uploader, key, filename } = meta.toObject();
      let isOrphaned = false;
      let reason = '';

      // Check uploader existence
      if (uploader) {
        const uploaderExists = await User.findById(uploader);
        if (!uploaderExists) {
          isOrphaned = true;
          reason = `Uploader User (${uploader}) does not exist.`;
        }
      }

      // Check related entity existence
      if (relatedEntity && relatedModel) {
        let entityExists = false;
        try {
          if (relatedModel === 'User') {
            entityExists = await User.findById(relatedEntity);
          } else if (relatedModel === 'Lease') {
            entityExists = await Lease.findById(relatedEntity);
          } else if (relatedModel === 'Payment') {
            entityExists = await Payment.findById(relatedEntity);
          } else if (relatedModel === 'Property') {
            entityExists = await Property.findById(relatedEntity);
          } else if (relatedModel === 'Message') {
            entityExists = await Message.findById(relatedEntity);
          } else {
            entityExists = true;
          }
        } catch (_) {}

        if (!entityExists) {
          isOrphaned = true;
          reason = `Related Entity of model '${relatedModel}' (${relatedEntity}) does not exist.`;
        }
      }

      // Check if binary file exists in fallback FileStorage
      const cleanFilename = key ? key.split('/').pop() : filename;
      const binaryExists = await FileStorage.findOne({ filename: cleanFilename });
      if (!binaryExists && !process.env.AWS_ACCESS_KEY_ID) {
        missingBinary.push({
          fileId: _id,
          filename: cleanFilename,
          category
        });
      }

      if (isOrphaned) {
        orphanedMetadata.push({
          fileId: _id,
          filename: cleanFilename,
          category,
          reason,
          metaRecord: meta
        });
      }
    }

    console.log('\n--- ORPHANED FILE METADATA RECORDS ---');
    console.log(`Found ${orphanedMetadata.length} orphaned FileMetadata records.`);
    orphanedMetadata.forEach(o => {
      console.log(`- FileID: ${o.fileId} | Filename: ${o.filename} | Category: ${o.category} | Reason: ${o.reason}`);
    });

    // 2. Audit DB Fallback Binary Storage -> FileMetadata relations
    const binaries = await FileStorage.find({});
    console.log(`\nFound ${binaries.length} records in FileStorage fallback collection.`);

    const orphanedBinaries = [];
    for (const bin of binaries) {
      const { filename } = bin.toObject();
      const meta = await FileMetadata.findOne({
        $or: [
          { filename: filename },
          { key: new RegExp(filename + '$') }
        ]
      });
      if (!meta) {
        orphanedBinaries.push(filename);
      }
    }

    console.log('\n--- ORPHANED FILE STORAGE BINARIES (NO METADATA) ---');
    console.log(`Found ${orphanedBinaries.length} orphaned binaries.`);
    orphanedBinaries.forEach(filename => {
      console.log(`- Stored file: ${filename}`);
    });

    // 3. Option to perform cleanup
    if (process.argv.includes('--clean')) {
      console.log('\nCleaning up orphaned records...');
      let cleanMetaCount = 0;
      let cleanBinCount = 0;

      for (const o of orphanedMetadata) {
        await FileMetadata.deleteOne({ _id: o.fileId });
        await FileStorage.deleteOne({ filename: o.filename });
        cleanMetaCount++;
      }

      for (const binName of orphanedBinaries) {
        await FileStorage.deleteOne({ filename: binName });
        cleanBinCount++;
      }

      console.log(`Successfully deleted ${cleanMetaCount} orphaned metadata records and ${cleanBinCount} orphaned binary files.`);
    } else {
      console.log('\nTo clean up these orphaned files, run this script with the --clean flag.');
    }

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

runAudit();
