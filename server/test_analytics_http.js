import http from 'http';

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });
        req.on('error', (err) => reject(err));
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testHttp() {
    try {
        console.log("Attempting login as manager...");
        const loginData = JSON.stringify({ email: 'manager@gmail.com', password: 'Manager@1234' });
        const loginRes = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        }, loginData);

        console.log("Login HTTP Status:", loginRes.status);
        if (loginRes.status !== 200 || !loginRes.data?.data?.token) {
            console.error("Login failed:", loginRes.data);
            return;
        }

        const token = loginRes.data.data.token;
        console.log("Token retrieved successfully.");

        const endpoints = [
            '/api/analytics/revenue?months=12',
            '/api/analytics/occupancy',
            '/api/analytics/collection-rate',
            '/api/analytics/summary',
            '/api/analytics/top-properties'
        ];

        for (const ep of endpoints) {
            console.log(`Querying endpoint: ${ep}...`);
            const res = await makeRequest({
                hostname: 'localhost',
                port: 5000,
                path: ep,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log(`Endpoint ${ep} returned status ${res.status}`);
            if (res.status !== 200) {
                console.error("Error Response:", res.data || res.raw);
            } else {
                console.log("Success data preview:", JSON.stringify(res.data).slice(0, 100));
            }
        }

    } catch (err) {
        console.error("HTTP request failed:", err);
    }
}

testHttp();
