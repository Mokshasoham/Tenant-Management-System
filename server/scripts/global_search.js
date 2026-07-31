import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = 'mongodb://localhost:27017';

async function globalSearch() {
  let client = null;
  try {
    client = await mongoose.mongo.MongoClient.connect(mongoUri);
    console.log('Connected to MongoDB client.');

    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();

    const searchStr1 = '6a68f4b4eeb90bfc897d4014';
    const searchStr2 = '1785341820904';

    for (const dbInfo of dbs.databases) {
      const dbName = dbInfo.name;
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();

      for (const collInfo of collections) {
        const collName = collInfo.name;
        const collection = db.collection(collName);

        // 1. Search for docs matching ObjectID or containing string anywhere
        const allDocs = await collection.find({}).toArray();
        for (const doc of allDocs) {
          const docStr = JSON.stringify(doc);
          if (docStr.includes(searchStr1) || docStr.includes(searchStr2)) {
            console.log(`\n[FOUND MATCH] Db: '${dbName}', Collection: '${collName}'`);
            console.log(JSON.stringify(doc, null, 2));
          }
        }
      }
    }

    console.log('\nSearch completed.');
  } catch (err) {
    console.error('Global search failed:', err);
  } finally {
    if (client) await client.close();
  }
}

globalSearch();
