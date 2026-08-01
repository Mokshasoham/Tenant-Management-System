import https from 'https';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI;

// ------- Local Atlas query -------
async function queryLocalAtlas() {
  console.log('\n=== LOCAL ATLAS CONNECTION ===');
  const maskedUri = mongoUri ? mongoUri.replace(/:([^:@]{3})[^:@]*@/, ':***@') : 'UNDEFINED';
  console.log('MONGODB_URI (masked):', maskedUri);

  if (!mongoUri) {
    console.log('ERROR: MONGODB_URI not set in .env');
    return;
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const dbName = db.databaseName;
  console.log('Connected to database:', dbName);

  const users = await db.collection('users').find({}, { projection: { email: 1, role: 1, isActive: 1, password: 1 } }).toArray();
  console.log(`\nUsers in Atlas DB (${users.length} total):`);
  users.forEach(u => {
    const hasHash = u.password && u.password.startsWith('$2');
    console.log(`  - ${u.email} [${u.role}] active=${u.isActive} bcryptHash=${hasHash}`);
  });

  await mongoose.disconnect();
}

// ------- Remote Render test -------
function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'tenant-management-backend-ohr6.onrender.com',
      port: 443,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch (_) { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'tenant-management-backend-ohr6.onrender.com',
      port: 443,
      path: urlPath,
      method: 'GET',
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch (_) { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testRenderLogin() {
  console.log('\n=== REMOTE RENDER BACKEND TESTS ===');
  
  // Health check
  const health = await getJson('/api/health');
  console.log('Health check HTTP status:', health.status);
  console.log('Health response:', JSON.stringify(health.body));

  const credentials = [
    { email: 'admin@gmail.com', password: 'Admin@1234', label: 'Admin (seeded)' },
    { email: 'manager@gmail.com', password: 'Manager@1234', label: 'Manager (seeded)' },
    { email: 'sankabaktulamoksha3soham12@gmail.com', password: 'Admin@1234', label: 'Your personal account' },
  ];

  for (const cred of credentials) {
    const res = await postJson('/api/auth/login', { email: cred.email, password: cred.password });
    console.log(`\nLogin attempt [${cred.label}]:`);
    console.log('  HTTP Status:', res.status);
    console.log('  Response:', JSON.stringify(res.body));
  }
}

(async () => {
  try {
    await queryLocalAtlas();
  } catch (err) {
    console.error('Local Atlas query failed:', err.message);
  }

  try {
    await testRenderLogin();
  } catch (err) {
    console.error('Remote Render test failed:', err.message);
  }
})();
