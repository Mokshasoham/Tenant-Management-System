import http from 'https'; // Use HTTPS since Render uses https

const host = 'tenant-management-backend-ohr6.onrender.com';

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: host,
      port: 443,
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
      port: 443,
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

async function runAudit() {
  try {
    console.log('Attempting to log in as Admin on remote Render backend...');
    const loginRes = await postJson('/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'Admin@1234'
    });

    if (!loginRes.success || !loginRes.data?.token) {
      console.log('Login failed on remote server:', loginRes);
      return;
    }

    const token = loginRes.data.token;
    console.log('Logged in successfully. Querying remote collections...');

    // 1. Users
    const usersRes = await getJson('/api/users/admin/all', token);
    const usersCount = usersRes.success ? (usersRes.data?.length || 0) : 'Error';

    // 2. Properties
    const propertiesRes = await getJson('/api/properties', token);
    const propertiesCount = propertiesRes.success ? (propertiesRes.pagination?.total || propertiesRes.data?.length || 0) : 'Error';

    // 3. Payments
    const paymentsRes = await getJson('/api/payments', token);
    const paymentsCount = paymentsRes.success ? (paymentsRes.pagination?.total || paymentsRes.data?.length || 0) : 'Error';

    // 4. Leases
    const leasesRes = await getJson('/api/leases', token);
    const leasesCount = leasesRes.success ? (leasesRes.pagination?.total || leasesRes.data?.length || 0) : 'Error';

    console.log('\n--- REMOTE RENDER BACKEND AUDIT COUNTS ---');
    console.log('Users:', usersCount);
    console.log('Properties:', propertiesCount);
    console.log('Payments:', paymentsCount);
    console.log('Leases:', leasesCount);

    if (paymentsRes.success && paymentsRes.data) {
      console.log('\nChecking for target Payment ID 6a68f4b4eeb90bfc897d4014 in remote payments list...');
      const targetPayment = paymentsRes.data.find(p => p._id === '6a68f4b4eeb90bfc897d4014');
      if (targetPayment) {
        console.log('FOUND Target Payment on Remote:', targetPayment);
      } else {
        console.log('Target Payment NOT found in remote payments list.');
        // Let's query by specific ID
        const specificRes = await getJson('/api/payments/6a68f4b4eeb90bfc897d4014', token);
        if (specificRes.success && specificRes.data) {
          console.log('FOUND Target Payment by direct endpoint:', specificRes.data);
        } else {
          console.log('Target Payment NOT found by direct endpoint:', specificRes);
        }
      }
    }

  } catch (err) {
    console.error('Remote audit execution failed:', err);
  }
}

runAudit();
