/**
 * diagnose_smtp.js
 * Tests the SMTP connection and send path used by forgotPassword.
 * Does NOT send any real email — uses nodemailer verify() only.
 * Run: node diagnose_smtp.js
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

console.log('\n══════════════════════════════════════════════════');
console.log('  FORGOT PASSWORD — EMAIL DELIVERY TRACE');
console.log('══════════════════════════════════════════════════\n');

// ── STEP 1: .env variable presence ─────────────────────────────────────────
console.log('── STEP 1: .env SMTP variables ──');
console.log(`  SMTP_HOST : ${SMTP_HOST || '(not set)'}`);
console.log(`  SMTP_PORT : ${SMTP_PORT}`);
console.log(`  SMTP_USER : ${SMTP_USER || '(not set)'}`);
console.log(`  SMTP_PASS : ${SMTP_PASS ? `${'*'.repeat(SMTP_PASS.length)} (${SMTP_PASS.length} chars)` : '(not set)'}`);

const allSet = SMTP_HOST && SMTP_USER && SMTP_PASS;
if (!allSet) {
  console.log('\n❌ STEP 1 FAIL: One or more SMTP variables are missing from .env');
} else {
  console.log('\n✅ STEP 1 PASS: All SMTP variables are present in .env');
}

// ── STEP 2: sendEmail.js credential guard check ─────────────────────────────
console.log('\n── STEP 2: sendEmail.js credential guard (utils/sendEmail.js line 7) ──');
const guardFails = !SMTP_USER || !SMTP_PASS || SMTP_USER.includes('your_email');
if (guardFails) {
  console.log('❌ STEP 2 FAIL: Guard condition is TRUE → sendEmail() throws immediately');
  console.log(`   Condition: !SMTP_USER=${!SMTP_USER} | !SMTP_PASS=${!SMTP_PASS} | includes('your_email')=${SMTP_USER?.includes('your_email')}`);
  console.log('   → sendEmail() is called but throws BEFORE creating a transport.');
  console.log('   → forgotPassword catches the error (try/catch), swallows it, returns 200.');
  console.log('   → User sees "Reset link sent" — NO email is ever attempted.');
} else {
  console.log('✅ STEP 2 PASS: Credential guard will NOT block sendEmail()');
}

// ── STEP 3: Gmail App Password format check ─────────────────────────────────
console.log('\n── STEP 3: Gmail App Password format check ──');
if (SMTP_PASS) {
  const parts = SMTP_PASS.split(' ');
  const isAppPasswordFormat = parts.length === 4 && parts.every(p => p.length === 4);
  if (isAppPasswordFormat) {
    console.log(`✅ STEP 3: App Password looks correct (4×4 format: "${SMTP_PASS.replace(/./g, '*')}")`);
  } else {
    console.log(`⚠️  STEP 3: App Password format unexpected — expected 4 groups of 4 chars separated by spaces.`);
    console.log(`   Got: ${parts.length} parts, lengths: [${parts.map(p => p.length).join(', ')}]`);
  }
}

// ── STEP 4: nodemailer.createTransport().verify() ───────────────────────────
console.log('\n── STEP 4: Live SMTP connection test (nodemailer verify) ──');
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

try {
  await transporter.verify();
  console.log('✅ STEP 4 PASS: SMTP connection verified! Nodemailer can reach the server and authenticate.');
} catch (err) {
  console.log('❌ STEP 4 FAIL: SMTP connection FAILED.');
  console.log(`   Error code    : ${err.code || '(none)'}`);
  console.log(`   Error message : ${err.message}`);
  if (err.message?.includes('Invalid login') || err.message?.includes('Username and Password')) {
    console.log('\n   ROOT CAUSE: Gmail rejected the credentials.');
    console.log('   Possible reasons:');
    console.log('   (a) App Password is wrong or has been revoked in Google Account settings.');
    console.log('   (b) Less secure app access is off and no App Password configured.');
    console.log('   (c) SMTP_USER email address is incorrect.');
    console.log('   (d) Gmail 2-Step Verification is off (App Passwords require 2SV to be on).');
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    console.log('\n   ROOT CAUSE: Cannot reach smtp.gmail.com.');
    console.log('   → Check firewall / internet connectivity.');
  } else if (err.message?.includes('self signed') || err.message?.includes('certificate')) {
    console.log('\n   ROOT CAUSE: TLS certificate error.');
  }
}

// ── STEP 5: forgotPassword controller flow summary ───────────────────────────
console.log('\n── STEP 5: forgotPassword controller flow (authController.js lines 413-460) ──');
console.log(`
  POST /api/auth/forgot-password
    → validateForgotPassword middleware (normalizeEmail) ✅
    → authController.forgotPassword()
        1. User.findOne({ email })                       ← if not found → 404 (NOT our case)
        2. crypto.randomBytes(32) → resetToken           ← token generated ✅
        3. sha256(resetToken) → passwordResetToken       ← hashed & saved to DB ✅
        4. passwordResetExpires = now + 10min            ← saved to DB ✅
        5. user.save({ validateBeforeSave: false })      ← DB persisted ✅
        6. console.log(resetURL + resetToken)            ← ALWAYS printed ✅
        7. try { await sendEmail(...) }                  
              └─ sendEmail() in utils/sendEmail.js
                    → GUARD CHECK (line 7):
                      !SMTP_USER || !SMTP_PASS || SMTP_USER.includes('your_email')
                      If TRUE → throws error immediately
              └─ catch(err) { logger.error(err.message) } ← ERROR SWALLOWED
        8. res.status(200).json({ success: true, ... }) ← ALWAYS returns 200
  
  RESULT: User sees "Reset link sent" regardless of whether email was sent.
  The reset TOKEN and URL ARE in the server console. Email is NOT sent.
`);

console.log('══════════════════════════════════════════════════');
console.log('  SUMMARY OF FAILURE POINTS (in order)');
console.log('══════════════════════════════════════════════════');
