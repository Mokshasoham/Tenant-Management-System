import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const props = await mongoose.connection.db.collection('properties').find({ isTest: { $ne: true }, publishStatus: 'published' }).toArray();
  console.log('Real Properties:', props.length);
  for (const p of props) {
    console.log({
      id: p._id.toString(),
      name: p.name,
      city: p.city,
      address: p.address,
      lat: p.location?.lat,
      lng: p.location?.lng,
      geo: p.geo?.coordinates,
      type: p.type,
      rent: p.rentAmount,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.squareFeet
    });
  }
  await mongoose.disconnect();
}
run();
