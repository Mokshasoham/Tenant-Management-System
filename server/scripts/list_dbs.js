import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

async function listDbs() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const adminDb = mongoose.connection.client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Available databases:');
    console.log(JSON.stringify(dbs.databases, null, 2));

    for (const dbInfo of dbs.databases) {
      const db = mongoose.connection.client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      console.log(`Database '${dbInfo.name}' collections:`, collections.map(c => c.name));
    }

  } catch (err) {
    console.error('List DBs failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

listDbs();
