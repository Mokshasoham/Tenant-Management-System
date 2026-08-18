import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('Key ID:', keyId);
const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

async function testRzp() {
  try {
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
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testRzp();
