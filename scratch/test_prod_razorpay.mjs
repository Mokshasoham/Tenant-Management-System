/**
 * Production diagnostic: test what Render's /api/bookings/razorpay/create-order returns
 * Run this with: node scratch/test_prod_razorpay.mjs
 */
import https from 'https';

// Test against production endpoint without auth (expect 401, NOT 400)
// This verifies Render is running the new code that no longer has "Booking is not approved"
const PROD_URL = 'https://tenant-management-backend-ohr6.onrender.com';

function httpsPost(path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const url = new URL(PROD_URL + path);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
            }
        }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, body }); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    console.log('===== PRODUCTION RAZORPAY DIAGNOSTIC =====');
    console.log('Target:', PROD_URL);
    console.log();

    // Test 1: No auth token — should get 401 (not 400 "Booking is not approved")
    console.log('Test 1: POST /api/bookings/razorpay/create-order WITHOUT auth token');
    const res1 = await httpsPost('/api/bookings/razorpay/create-order', { bookingId: '6a801df9af67486cad3dcb23' });
    console.log('  HTTP Status:', res1.status);
    console.log('  Response:', JSON.stringify(res1.body, null, 2));
    console.log();

    if (res1.status === 401) {
        console.log('✅ GOOD: 401 means Render is running new code that enforces auth BEFORE booking lookup.');
        console.log('   The OLD code returned 400 "Booking is not approved" even before auth checked.');
    } else if (res1.status === 400 && res1.body?.message?.includes('not approved')) {
        console.log('❌ BAD: 400 "Booking is not approved" means Render is running OLD code!');
        console.log('   The new deployment has NOT taken effect yet.');
        console.log('   Check Render dashboard for deploy status.');
    } else {
        console.log('ℹ️  Unexpected response — check Render deployment status.');
    }

    // Test 2: GET health check
    const healthRes = await new Promise((resolve, reject) => {
        https.get(PROD_URL + '/health', (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, body }); }
            });
        }).on('error', reject);
    });
    console.log('Test 2: GET /health');
    console.log('  HTTP Status:', healthRes.status);
    console.log('  Response:', JSON.stringify(healthRes.body, null, 2));
}

run().catch(console.error);
