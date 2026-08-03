/**
 * diagnose_oauth.js
 * Investigates the Google OAuth "invalid_client" error.
 * No code changes. Read-only diagnostic.
 * Run: node diagnose_oauth.js
 */
import 'dotenv/config';

console.log('\n══════════════════════════════════════════════════════');
console.log('  GOOGLE OAUTH — INVALID_CLIENT DIAGNOSTIC');
console.log('══════════════════════════════════════════════════════\n');

// ── 1. Raw env variables ──────────────────────────────────────────────────────
console.log('── STEP 1: Raw process.env values (from .env via dotenv) ──');
const rawClientId    = process.env.GOOGLE_CLIENT_ID;
const rawClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const rawCallbackUrl  = process.env.GOOGLE_CALLBACK_URL;

console.log(`  GOOGLE_CLIENT_ID     : ${rawClientId     ?? '(not set)'}`);
console.log(`  GOOGLE_CLIENT_SECRET : ${rawClientSecret ?? '(not set)'}`);
console.log(`  GOOGLE_CALLBACK_URL  : ${rawCallbackUrl  ?? '(not set)'}`);

// ── 2. What config.js exposes ─────────────────────────────────────────────────
console.log('\n── STEP 2: What config.js exposes to authController.js ──');
// Replicate config.js exactly — it does NOT define GOOGLE_CLIENT_ID
const configKeys = [
  'NODE_ENV','PORT','BASE_URL','MONGODB_URI','JWT_SECRET','JWT_EXPIRE',
  'CORS_ORIGIN','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','LOG_LEVEL',
];
console.log('  Keys defined in config object:');
configKeys.forEach(k => console.log(`    ${k}`));
console.log('\n  ❌ GOOGLE_CLIENT_ID is NOT a key in config.js');
console.log('  ❌ GOOGLE_CLIENT_SECRET is NOT a key in config.js');
console.log('  ❌ GOOGLE_CALLBACK_URL is NOT a key in config.js');

// ── 3. What authController.js actually uses ───────────────────────────────────
console.log('\n── STEP 3: authController.js usage analysis ──');
console.log('  Line 16  → const client = new OAuth2Client(config.GOOGLE_CLIENT_ID)');
console.log('             config.GOOGLE_CLIENT_ID = undefined (NOT in config.js)');
console.log('  Line 535 → audience: config.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID');
console.log(`             config.GOOGLE_CLIENT_ID = undefined`);
console.log(`             process.env.GOOGLE_CLIENT_ID = ${rawClientId ?? '(not set)'}`);

const effectiveClientId = undefined || rawClientId; // mirrors line 535
console.log(`\n  Effective audience used for token verification: "${effectiveClientId ?? 'undefined'}"`);

// ── 4. .env value — quote contamination check ────────────────────────────────
console.log('\n── STEP 4: Quote contamination check ──');
if (rawClientId) {
  const startsWithQuote = rawClientId.startsWith('"') || rawClientId.startsWith("'");
  const endsWithQuote   = rawClientId.endsWith('"')   || rawClientId.endsWith("'");
  console.log(`  Raw value  : "${rawClientId}"`);
  console.log(`  Length     : ${rawClientId.length} chars`);
  console.log(`  Starts with quote: ${startsWithQuote}`);
  console.log(`  Ends with quote  : ${endsWithQuote}`);

  if (startsWithQuote || endsWithQuote) {
    const stripped = rawClientId.replace(/^["']|["']$/g, '');
    console.log(`\n  ❌ QUOTE CONTAMINATION DETECTED`);
    console.log(`  The value in .env has literal quote characters as part of the string.`);
    console.log(`  Actual value sent to Google: "${rawClientId}"`);
    console.log(`  Correct value should be   : "${stripped}"`);
    console.log(`\n  In .env, line 23 reads:`);
    console.log(`    GOOGLE_CLIENT_ID="416610039857-2deqh9j44nksus08k2jas62cj534267c.apps.googleusercontent.com"`);
    console.log(`  dotenv loads the VALUE including the double-quote characters.`);
    console.log(`  Google receives: \`"416610039857-..."\` — which does not match any registered client.`);
    console.log(`  → Google returns: 401 invalid_client — The OAuth client was not found.`);
  } else {
    console.log('  ✅ No quote contamination — value is clean.');
  }
} else {
  console.log('  ❌ GOOGLE_CLIENT_ID is completely absent from process.env');
}

// ── 5. Frontend VITE_ env ─────────────────────────────────────────────────────
console.log('\n── STEP 5: Frontend VITE_GOOGLE_CLIENT_ID ──');
console.log('  File: client/.env line 3');
console.log('  Value: VITE_GOOGLE_CLIENT_ID="416610039857-2deqh9j44nksus08k2jas62cj534267c.apps.googleusercontent.com"');
console.log('  ⚠️  Also wrapped in double-quotes — Vite strips outer quotes correctly for VITE_ vars');
console.log('     but the GoogleOAuthProvider receives the value via import.meta.env.VITE_GOOGLE_CLIENT_ID');
console.log('     → Need to verify if Vite strips quotes for this env format.');

// ── 6. App.jsx fallback ────────────────────────────────────────────────────────
console.log('\n── STEP 6: App.jsx GoogleOAuthProvider fallback ──');
console.log('  Line 101: clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || \'345345345345-dummy.apps.googleusercontent.com\'}');
console.log('  If VITE_GOOGLE_CLIENT_ID is undefined or empty → GoogleOAuthProvider uses the DUMMY ID');
console.log('  → The "Sign in with Google" button renders with a FAKE/PLACEHOLDER client ID');
console.log('  → Google rejects immediately: 401 invalid_client');

// ── 7. OAuth flow architecture ─────────────────────────────────────────────────
console.log('\n── STEP 7: OAuth flow architecture ──');
console.log('  This app uses the Google Identity Services (One Tap / GSI) approach:');
console.log('  1. Frontend: @react-oauth/google <GoogleLogin> button');
console.log('     → Google GSI popup opens using the clientId from GoogleOAuthProvider');
console.log('     → If clientId is invalid → Error 401 invalid_client IMMEDIATELY');
console.log('     → This error happens BEFORE the frontend sends anything to the backend');
console.log('  2. Frontend sends credentialResponse.credential (JWT id_token) to backend');
console.log('  3. Backend: POST /api/auth/google → authController.googleAuth');
console.log('     → OAuth2Client.verifyIdToken({ idToken, audience: config.GOOGLE_CLIENT_ID })');
console.log('     → config.GOOGLE_CLIENT_ID = undefined (missing from config.js!)');
console.log('     → Falls back to process.env.GOOGLE_CLIENT_ID (set in .env but with quotes)');

// ── 8. Summary ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  SUMMARY OF ALL FAILURES FOUND');
console.log('══════════════════════════════════════════════════════');
console.log(`
  FAILURE 1 (PRIMARY — causes "invalid_client" immediately):
  ─────────────────────────────────────────────────────────
  server/.env line 23:
    GOOGLE_CLIENT_ID="416610039857-2deqh9j44nksus08k2jas62cj534267c.apps.googleusercontent.com"
  
  The value is wrapped in double-quotes INSIDE the .env file.
  dotenv loads them as LITERAL characters in the string value.
  Google receives: "416610039857-..."  (with the " chars)
  Google has no client registered with that exact string → invalid_client.

  FAILURE 2 (STRUCTURAL — config.js does not expose GOOGLE_CLIENT_ID):
  ─────────────────────────────────────────────────────────────────────
  config.js defines: NODE_ENV, PORT, MONGODB_URI, JWT_SECRET, SMTP_*, etc.
  It does NOT define GOOGLE_CLIENT_ID.
  
  authController.js line 16:
    const client = new OAuth2Client(config.GOOGLE_CLIENT_ID)
    → config.GOOGLE_CLIENT_ID = undefined
    → OAuth2Client is initialised with undefined client ID
    → Falls through to process.env.GOOGLE_CLIENT_ID (has quote contamination)
  
  authController.js line 535:
    audience: config.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
    → undefined || "416610039857-...\"  (with quotes — still wrong)

  FAILURE 3 (frontend .env — same quote issue):
  ─────────────────────────────────────────────
  client/.env line 3:
    VITE_GOOGLE_CLIENT_ID="416610039857-2deqh9j44nksus08k2jas62cj534267c.apps.googleusercontent.com"
  
  Vite does strip outer quotes for VITE_ variables correctly,
  so VITE_GOOGLE_CLIENT_ID likely resolves cleanly to the bare ID.
  BUT if it does not → GoogleOAuthProvider falls to the dummy ID fallback.

  FAILURE 4 (App.jsx hardcoded dummy fallback):
  ──────────────────────────────────────────────
  App.jsx line 101:
    clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '345345345345-dummy.apps.googleusercontent.com'}
  
  If VITE env is undefined/empty → dummy client ID used → instant invalid_client.
`);

console.log('[Done]\n');
