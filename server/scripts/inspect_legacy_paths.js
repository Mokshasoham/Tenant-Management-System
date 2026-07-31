import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', 'server', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

async function inspectLegacyPaths() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const collection = mongoose.connection.db.collection(collName);
      
      // We will search for any document containing '/uploads/' as a substring in any of its values (recursively if possible)
      // For simplicity, we can inspect a few documents or do a text/regex search on known fields or all string fields
      const docs = await collection.find({}).toArray();
      
      let foundCount = 0;
      docs.forEach(doc => {
        const str = JSON.stringify(doc);
        if (str.includes('/uploads/')) {
          foundCount++;
          // Parse out and print the occurrences of '/uploads/'
          const matches = str.match(/"[^"]*\/uploads\/[^"]*"/g);
          if (matches) {
            console.log(`[Collection: ${collName}] Found doc ${doc._id} with uploads:`, matches);
          }
        }
      });
      
      if (foundCount > 0) {
        console.log(`Collection '${collName}': Found ${foundCount} documents referencing legacy uploads.`);
      }
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

inspectLegacyPaths();
