import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Maintenance from '../src/models/Maintenance.js';
import technicianService from '../src/services/technicianService.js';
import { getAvailableTechnicians } from '../src/controllers/userController.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  // Find all managers
  const managers = await User.find({ role: 'manager' }).select('email firstName lastName');
  console.log('Managers in DB:', managers.map(m => `${m.firstName} ${m.lastName} (${m.email}) [${m._id}]`));

  // Find Madhu (or new manager) and Manager with technicians
  const madhu = managers.find(m => (m.firstName && m.firstName.toLowerCase().includes('madhu')) || m.email.includes('madhu')) || managers[1];
  const otherManager = managers.find(m => m._id.toString() !== madhu?._id?.toString());

  console.log('Selected Test Manager A (New Manager):', madhu?.firstName, madhu?._id?.toString());
  console.log('Selected Test Manager B (Other Manager):', otherManager?.firstName, otherManager?._id?.toString());

  // Test 1: technicianService.getAllTechnicians for Madhu
  const madhuTechs = await technicianService.getAllTechnicians({ managerId: madhu._id.toString() });
  console.log(`[TEST 1] Madhu's Total Technicians: ${madhuTechs.technicians.length}`);
  if (madhuTechs.technicians.length !== 0) {
    console.error('FAILED TEST 1: Madhu should have 0 technicians!');
    process.exit(1);
  }

  // Test 2: technicianService.getAvailableTechnicians for Madhu
  const madhuAvailTechs = await technicianService.getAvailableTechnicians(null, madhu._id.toString());
  console.log(`[TEST 2] Madhu's Available Technicians: ${madhuAvailTechs.length}`);
  if (madhuAvailTechs.length !== 0) {
    console.error('FAILED TEST 2: Madhu should have 0 available technicians!');
    process.exit(1);
  }

  // Test 3: userController.getAvailableTechnicians mock request for Madhu
  let madhuReqResult = null;
  const mockReq = {
    user: { role: 'manager', userId: madhu._id.toString() }
  };
  await new Promise((resolve, reject) => {
    const mockRes = {
      status: () => mockRes,
      json: (data) => { madhuReqResult = data; resolve(); return mockRes; }
    };
    getAvailableTechnicians(mockReq, mockRes, (err) => {
      if (err) {
        console.error('getAvailableTechnicians error:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
  console.log(`[TEST 3] GET /api/users/technicians/available for Madhu: ${madhuReqResult?.data?.length}`);
  if (madhuReqResult?.data?.length !== 0) {
    console.error('FAILED TEST 3: Madhu userController.getAvailableTechnicians should return 0!');
    process.exit(1);
  }

  // Test 4: Other Manager's Technicians
  if (otherManager) {
    const otherTechs = await technicianService.getAllTechnicians({ managerId: otherManager._id.toString() });
    console.log(`[TEST 4] Other Manager Total Technicians: ${otherTechs.technicians.length}`);
  }

  console.log('\n✅ ALL TECHNICIAN ISOLATION TESTS PASSED CLEANLY WITH ZERO LEAKAGE!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
