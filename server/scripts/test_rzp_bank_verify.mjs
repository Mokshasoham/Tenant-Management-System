import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('Key ID:', keyId);
const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

async function testRzp() {
  try {
    console.log('1. Testing Razorpay Fund Account Validation:');
    const res = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        account_number: '2323230034479900',
        fund_account: {
          account_type: 'bank_account',
          bank_account: {
            name: 'Mokshagna Sankabattula',
            ifsc: 'UBIN0804681',
            account_number: '046812010001363'
          }
        },
        amount: 100,
        currency: 'INR'
      })
    });
    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Response body:', JSON.stringify(data, null, 2));

    console.log('\n2. Testing Razorpay IFSC public lookup for UBIN0804681:');
    const ifscRes = await fetch('https://ifsc.razorpay.com/UBIN0804681');
    console.log('IFSC Status:', ifscRes.status, ifscRes.statusText);
    const ifscData = await ifscRes.json();
    console.log('IFSC Data:', ifscData);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testRzp();
