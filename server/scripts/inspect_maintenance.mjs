import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Offer from '../src/models/Offer.js';
import Booking from '../src/models/Booking.js';
import Property from '../src/models/Property.js';
import PlatformSetting from '../src/models/PlatformSetting.js';

async function inspectAll() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- PLATFORM SETTING ---');
  const setting = await PlatformSetting.findOne().lean();
  console.log({
    maintenanceFeatureEnabled: setting?.maintenanceFeatureEnabled,
    maintenanceFeeType: setting?.maintenanceFeeType,
    maintenanceFee: setting?.maintenanceFee,
    maintenanceFeeFrequency: setting?.maintenanceFeeFrequency,
    maintenanceTermsVersion: setting?.maintenanceTermsVersion
  });

  console.log('\n--- PROPERTY 6a8ea6f263cf9e3ad5195552 ---');
  const property = await Property.findById('6a8ea6f263cf9e3ad5195552').lean();
  console.log({
    _id: property?._id,
    name: property?.name,
    rentAmount: property?.rentAmount,
    depositAmount: property?.depositAmount,
    bookingType: property?.bookingType,
    maintenanceFee: property?.maintenanceFee
  });

  console.log('\n--- DEAL-2026-000025 ---');
  const deal = await Offer.findOne({ dealNumber: 'DEAL-2026-000025' }).lean();
  console.log({
    dealNumber: deal?.dealNumber,
    status: deal?.status,
    agreedRent: deal?.agreedRent,
    booking: deal?.booking,
    offerHistoryNotes: deal?.offerHistory?.map(h => ({ action: h.action, message: h.message, amount: h.proposedAmount || h.amount }))
  });

  console.log('\n--- BOOKINGS FOR PROPERTY & TENANT ---');
  const bookings = await Booking.find({ property: property?._id, user: deal?.fromUser }).lean();
  console.log('Found ' + bookings.length + ' bookings:');
  for (const b of bookings) {
    console.log({
      _id: b._id,
      status: b.status,
      offer: b.offer,
      agreedRent: b.agreedRent,
      maintenanceSelected: b.maintenanceSelected,
      maintenanceFeeAtBooking: b.maintenanceFeeAtBooking,
      totalAmount: b.totalAmount,
      depositAmount: b.depositAmount,
      rejectionReason: b.rejectionReason,
      createdAt: b.createdAt
    });
  }

  await mongoose.disconnect();
}
inspectAll().catch(console.error);
