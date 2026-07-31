import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const port = 5000;
const host = 'localhost';

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: host,
      port,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (_) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(urlPath, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port,
      path: urlPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (_) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testApi() {
  try {
    console.log('Logging in as Admin...');
    const loginRes = await postJson('/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'Admin@1234'
    });

    if (!loginRes.success || !loginRes.data?.token) {
      console.log('Login failed:', loginRes);
      return;
    }

    const token = loginRes.data.token;
    console.log('Token acquired. Querying payments list...');

    const paymentsRes = await getJson('/api/payments', token);
    console.log('\n--- PAYMENTS API RESPONSE ---');
    console.log(JSON.stringify(paymentsRes, null, 2));

    console.log('\nQuerying messages list...');
    const conversationsRes = await getJson('/api/messages/conversations', token);
    console.log('\n--- CONVERSATIONS API RESPONSE ---');
    console.log(JSON.stringify(conversationsRes, null, 2));

  } catch (err) {
    console.error('API request failed:', err);
  }
}

testApi();
