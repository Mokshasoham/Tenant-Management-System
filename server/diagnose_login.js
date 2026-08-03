/**
 * diagnose_login.js  v2
 * Investigates why mokshasoham3@gmail.com cannot log in.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import validator from 'validator';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';
const TARGET_EMAIL = 'mokshasoham3@gmail.com';

const userSchema = new mongoose.Schema({
  email:                { type: String, lowercase: true, trim: true },
  password:             { type: String, select: false },
  role:                 String,
  isActive:             { type: Boolean, default: true },
  isEmailVerified:      { type: Boolean, default: false },
  twoFactorEnabled:     { type: Boolean, default: false },
  googleId:             String,
  passwordResetToken:   String,
  passwordResetExpires: Date,
  lastLogin:            Date,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function diagnose() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  LOGIN DIAGNOSTIC: mokshasoham3@gmail.com');
  console.log('══════════════════════════════════════════════\n');

  await mongoose.connect(MONGO_URI);
  console.log(`[DB] Connected\n`);

  // ── 1. User exists? ───────────────────────────────────────────────────────
  const userNoPass = await User.findOne({ email: TARGET_EMAIL });
  if (!userNoPass) {
    console.log('❌ STEP 1 FAIL: No user found for this email → 401 Invalid email or password');
    await mongoose.disconnect(); return;
  }
  console.log('✅ STEP 1: User EXISTS');
  console.log(`   _id            : ${userNoPass._id}`);
  console.log(`   email (in DB)  : ${userNoPass.email}`);
  console.log(`   role           : ${userNoPass.role}`);
  console.log(`   isActive       : ${userNoPass.isActive}`);
  console.log(`   isEmailVerified: ${userNoPass.isEmailVerified}`);
  console.log(`   twoFactorEnabled: ${userNoPass.twoFactorEnabled}`);
  console.log(`   googleId       : ${userNoPass.googleId || '(none)'}`);
  console.log(`   lastLogin      : ${userNoPass.lastLogin}`);
  console.log(`   createdAt      : ${userNoPass.createdAt}`);
  console.log(`   updatedAt      : ${userNoPass.updatedAt}`);

  // ── 2. Password hash ──────────────────────────────────────────────────────
  const userWithPass = await User.findOne({ email: TARGET_EMAIL }).select('+password');
  console.log('\n── STEP 2: Password hash ──');
  if (!userWithPass.password) {
    console.log('❌ STEP 2 FAIL: password field is NULL (OAuth-only account)');
  } else {
    const h = userWithPass.password;
    const isBcrypt = h.startsWith('$2b$') || h.startsWith('$2a$');
    console.log(`✅ STEP 2: Hash present — prefix: ${h.substring(0,10)}... length: ${h.length}`);
    console.log(`   Valid bcrypt format: ${isBcrypt}`);
    if (isBcrypt) {
      const rounds = parseInt(h.split('$')[2]);
      console.log(`   Rounds: ${rounds} ${rounds === 10 ? '✅' : '⚠️ unexpected'}`);
    } else {
      console.log('❌ Hash is NOT bcrypt — comparePassword() will always return false');
    }
  }

  // ── 3. isActive ───────────────────────────────────────────────────────────
  console.log('\n── STEP 3: isActive ──');
  console.log(userNoPass.isActive === false
    ? '❌ STEP 3 FAIL: isActive=false → 403 "Your account has been disabled"'
    : '✅ STEP 3: isActive=true');

  // ── 4. Email normalisation (express-validator normalizeEmail) ─────────────
  console.log('\n── STEP 4: Email normalisation ──');
  // express-validator's normalizeEmail uses validator.js under the hood
  // Default opts: all_lowercase:true, gmail_remove_dots:true, gmail_remove_subaddress:true
  const normalized = validator.normalizeEmail(TARGET_EMAIL, {
    all_lowercase: true,
    gmail_remove_dots: true,
    gmail_remove_subaddress: true,
    gmail_convert_googlemaildotcom: false,
  });
  console.log(`   Input:      "${TARGET_EMAIL}"`);
  console.log(`   Normalized: "${normalized}"`);
  if (normalized !== TARGET_EMAIL) {
    console.log(`⚠️  STEP 4: normalizeEmail() TRANSFORMS the email!`);
    console.log(`   The controller looks up "${normalized}" in MongoDB.`);
    const userNorm = await User.findOne({ email: normalized });
    if (!userNorm) {
      console.log(`❌ STEP 4 FAIL: No user found for normalized form "${normalized}"`);
      console.log('   → THIS IS THE LOGIN FAILURE POINT.');
    } else {
      console.log(`✅ STEP 4: User also found under normalized form.`);
    }
  } else {
    console.log('✅ STEP 4: normalizeEmail() does not change this email.');
  }

  // ── 5. 2FA ────────────────────────────────────────────────────────────────
  console.log('\n── STEP 5: 2FA ──');
  console.log(userNoPass.twoFactorEnabled
    ? '⚠️  STEP 5: 2FA ENABLED — login returns {requires2FA:true}, no JWT issued directly'
    : '✅ STEP 5: 2FA disabled');

  // ── 6. Google OAuth conflict ──────────────────────────────────────────────
  console.log('\n── STEP 6: Google OAuth conflict ──');
  if (userNoPass.googleId && !userWithPass.password) {
    console.log('❌ STEP 6 FAIL: Google-only account — no password hash stored');
    console.log('   → Must use "Sign in with Google" button');
  } else if (userNoPass.googleId) {
    console.log('⚠️  STEP 6: Has googleId AND password — both methods should work');
  } else {
    console.log('✅ STEP 6: Standard email/password account — no conflict');
  }

  // ── 7. Role check (controller has no role gate, but note it) ─────────────
  console.log('\n── STEP 7: Role ──');
  console.log(`   role = "${userNoPass.role}"`);
  if (userNoPass.role === 'user') {
    console.log('⚠️  STEP 7 NOTE: Role is "user" (not "tenant" / "admin" / "manager").');
    console.log('   The default role in schema is "tenant", but register() hardcodes role:"user".');
    console.log('   Some protected pages may behave differently based on role guards.');
    console.log('   This does NOT block login itself.');
  }

  // ── 8. Summary ────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  FINAL SUMMARY');
  console.log('══════════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('[DB] Disconnected\n');
}

diagnose().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
