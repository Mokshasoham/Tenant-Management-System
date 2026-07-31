import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

async function searchId() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const targetId = '6a68f4b4eeb90bfc897d4014';
    const collections = await mongoose.connection.db.listCollections().toArray();

    for (const collInfo of collections) {
      const collName = collInfo.name;
      const collection = mongoose.connection.db.collection(collName);
      
      const docById = await collection.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
      if (docById) {
        console.log(`[FOUND BY ID] Collection '${collName}' has doc with ID ${targetId}:`, docById);
      }

      // Also search string fields or subdocuments for this string
      const docByString = await collection.find({
        $or: [
          { invoiceUrl: new RegExp(targetId) },
          { url: new RegExp(targetId) },
          { attachments: { $elemMatch: { url: new RegExp(targetId) } } }
        ]
      }).toArray();
      if (docByString.length > 0) {
        console.log(`[FOUND BY STRING] Collection '${collName}' has ${docByString.length} matching docs:`, docByString);
      }
    }
  } catch (err) {
    console.error('Search failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

searchId();
