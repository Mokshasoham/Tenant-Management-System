/**
 * diagnose_password_hash.js
 * Specifically tests whether the stored bcrypt hash for mokshasoham3@gmail.com
 * can be compared successfully against candidate passwords.
 *
 * Run: node diagnose_password_hash.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';
const TARGET_EMAIL = 'mokshasoham3@gmail.com';

const userSchema = new mongoose.Schema({
  email:    { type: String, lowercase: true, trim: true },
  password: { type: String, select: false },
  updatedAt: Date,
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

async function check() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  PASSWORD HASH DEEP-DIVE');
  console.log('══════════════════════════════════════════════\n');

  await mongoose.connect(MONGO_URI);

  const user = await User.findOne({ email: TARGET_EMAIL }).select('+password');
  if (!user || !user.password) {
    console.log('❌ User or hash not found.'); 
    await mongoose.disconnect(); return;
  }

  const hash = user.password;
  console.log(`Hash stored in DB : ${hash}`);
  console.log(`Hash length       : ${hash.length} chars (valid bcrypt = 60)`);
  console.log(`Updated at        : ${user.updatedAt}\n`);

  // ── Test a set of common candidate passwords ──────────────────────────────
  const candidates = [
    'Moksha@123',
    'Moksha@918',
    'Moksha@918255',
    'moksha@123',
    'Moksha123',
    'Moksha1234',
    'Moksha@1234',
    'Admin@123',
    'Password@123',
    '12345678',
    'mokshasoham3',
  ];

  console.log('Testing candidate passwords against stored hash:');
  let anyMatch = false;
  for (const candidate of candidates) {
    const match = await bcrypt.compare(candidate, hash);
    const icon = match ? '✅ MATCH' : '   no';
    console.log(`  ${icon}  →  "${candidate}"`);
    if (match) anyMatch = true;
  }

  if (!anyMatch) {
    console.log('\n❌ NO candidate matched the stored hash.');
    console.log('   → Either:');
    console.log('   (a) The user is entering a wrong password.');
    console.log('   (b) The password was changed and the old hash was replaced.');
    console.log('   (c) The hash was corrupted (unlikely — format checks out).');
    console.log('\n   RECOMMENDATION: Use Forgot Password to reset the password.');
    console.log('   The server logs the reset URL to console — check server console output.');
  } else {
    console.log('\n✅ A candidate matched — the hash is valid and bcrypt is working correctly.');
    console.log('   → Password comparison works. The user must be entering the wrong password.');
  }

  // ── Verify bcrypt itself is working (sanity check) ────────────────────────
  console.log('\n── bcrypt sanity check ──');
  const testHash = await bcrypt.hash('TestPassword@1', 10);
  const testMatch = await bcrypt.compare('TestPassword@1', testHash);
  console.log(`bcrypt.hash + compare on fresh hash: ${testMatch ? '✅ Working' : '❌ BROKEN'}`);

  await mongoose.disconnect();
  console.log('\n[Done]\n');
}

check().catch(e => { console.error(e.message); process.exit(1); });
