import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', 'server', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

async function checkUsersKYC() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
    const User = mongoose.model('User', UserSchema);

    const users = await User.find({ kycDocuments: { $exists: true, $ne: [] } }).toArray ? 
      await User.find({ kycDocuments: { $exists: true, $ne: [] } }) :
      await User.find({ kycDocuments: { $exists: true, $ne: [] } });

    console.log(`Found ${users.length} users with KYC documents.`);
    users.forEach(u => {
      console.log(`User ID: ${u._id} | Email: ${u.email} | KYC Documents:`, u.kycDocuments, `| Status: ${u.kycStatus}`);
    });
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsersKYC();
