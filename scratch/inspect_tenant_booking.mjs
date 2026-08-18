import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tms';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  const Property = mongoose.model('Property', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));
  const Bill = mongoose.model('Bill', new mongoose.Schema({}, { strict: false }));
  const FileMetadata = mongoose.model('FileMetadata', new mongoose.Schema({}, { strict: false }));

  const booking = await Booking.findById('6a804955d1f4f3d5aa2be0df').lean();
  console.log('Booking 6a804955d1f4f3d5aa2be0df:', JSON.stringify(booking, null, 2));

  const allBookings = await Booking.find({}).lean();
  console.log(`Total bookings: ${allBookings.length}`);
  for (const b of allBookings) {
    console.log(`Booking ID: ${b._id}, status: ${b.status}, payStatus: ${b.paymentStatus}, depositAmount: ${b.depositAmount}, totalAmount: ${b.totalAmount}, prop: ${b.property}`);
  }

  const bills = await Bill.find({}).lean();
  console.log(`Total bills: ${bills.length}`);
  for (const bill of bills) {
    console.log(`Bill ID: ${bill._id}, billNumber: ${bill.billNumber}, type: ${bill.type}, status: ${bill.status}, fileId: ${bill.fileId}, invoiceUrl: ${bill.invoiceUrl}, tenant: ${bill.tenant}`);
  }

  const files = await FileMetadata.find({ category: 'invoices' }).lean();
  console.log(`Total invoice files: ${files.length}`);
  for (const f of files) {
    console.log(`File ID: ${f._id}, filename: ${f.filename}, key: ${f.key}, url: ${f.url}, relatedEntity: ${f.relatedEntity}, uploader: ${f.uploader}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
