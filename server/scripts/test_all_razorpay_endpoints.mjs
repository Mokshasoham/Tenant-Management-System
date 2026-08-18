import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('Testing Razorpay Credentials:');
console.log('Key ID:', keyId);
console.log('Key Secret:', keySecret ? keySecret.substring(0, 4) + '...' : 'NONE');

const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

async function testEndpoints() {
  console.log('\n--- 1. Testing POST /v1/contacts ---');
  try {
    const contactRes = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        name: 'Mokshagna Sankabattula',
        email: 'mokshagnasoham1@gmail.com',
        contact: '9182550000',
        type: 'vendor'
      })
    });
    console.log('Contact HTTP Status:', contactRes.status);
    const contactData = await contactRes.json();
    console.log('Contact Response:', JSON.stringify(contactData, null, 2));

    if (contactRes.ok && contactData.id) {
      console.log('\n--- 2. Testing POST /v1/fund_accounts ---');
      const faRes = await fetch('https://api.razorpay.com/v1/fund_accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          contact_id: contactData.id,
          account_type: 'bank_account',
          bank_account: {
            name: 'Mokshagna Sankabattula',
            ifsc: 'UBIN0804681',
            account_number: '046812010001363'
          }
        })
      });
      console.log('Fund Account HTTP Status:', faRes.status);
      const faData = await faRes.json();
      console.log('Fund Account Response:', JSON.stringify(faData, null, 2));

      if (faRes.ok && faData.id) {
        console.log('\n--- 3. Testing POST /v1/fund_accounts/validations with Fund Account ID ---');
        const vRes = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            account_number: '2323230034479900',
            fund_account: {
              id: faData.id
            },
            amount: 100,
            currency: 'INR'
          })
        });
        console.log('Validation HTTP Status:', vRes.status);
        const vData = await vRes.json();
        console.log('Validation Response:', JSON.stringify(vData, null, 2));
      }
    }
  } catch (err) {
    console.error('Contact/FA Error:', err);
  }

  console.log('\n--- 4. Testing Composite POST /v1/fund_accounts/validations (with contact inline) ---');
  try {
    const compRes = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
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
          },
          contact: {
            name: 'Mokshagna Sankabattula',
            email: 'mokshagnasoham1@gmail.com',
            contact: '9182550000',
            type: 'vendor'
          }
        },
        amount: 100,
        currency: 'INR'
      })
    });
    console.log('Composite Validation HTTP Status:', compRes.status);
    const compData = await compRes.json();
    console.log('Composite Validation Response:', JSON.stringify(compData, null, 2));
  } catch (err) {
    console.error('Composite Error:', err);
  }

  console.log('\n--- 5. Testing POST /v1/accounts (Route Linked Accounts) ---');
  try {
    const routeRes = await fetch('https://api.razorpay.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        email: 'manager_test@example.com',
        phone: '9876543210',
        type: 'route',
        legal_business_name: 'Mokshagna Property Management',
        business_type: 'individual',
        contact_name: 'Mokshagna Sankabattula'
      })
    });
    console.log('Route Linked Account HTTP Status:', routeRes.status);
    const routeData = await routeRes.json();
    console.log('Route Response:', JSON.stringify(routeData, null, 2));
  } catch (err) {
    console.error('Route Error:', err);
  }
}

testEndpoints();
