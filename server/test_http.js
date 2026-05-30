import http from 'http';

const data = JSON.stringify({ amount: 10000, method: 'debit_card' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/bookings/process-mock-payment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('HTTP', res.statusCode, '\n', body));
});

req.on('error', error => {
  console.error('Request failed:', error);
});

req.write(data);
req.end();
