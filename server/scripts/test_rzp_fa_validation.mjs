import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

async function testValidation(name, ifsc, accountNumber) {
  console.log(`\nTesting validation for: ${name}, IFSC: ${ifsc}, Acc: ${accountNumber}`);
  try {
    // 1. Create or get Razorpay contact
    const contactRes = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        name: name,
        email: 'manager@example.com',
        type: 'vendor'
      })
    });
    const contactData = await contactRes.json();
    if (!contactRes.ok) {
      console.log('Contact creation failed:', contactData);
      return { success: false, error: contactData.error?.description };
    }

    // 2. Create Razorpay Fund Account
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
          name: name,
          ifsc: ifsc,
          account_number: accountNumber
        }
      })
    });
    const faData = await faRes.json();
    console.log('Fund Account HTTP Status:', faRes.status);
    console.log('Fund Account Data:', JSON.stringify(faData, null, 2));

    if (!faRes.ok) {
      return { success: false, error: faData.error?.description };
    }

    // 3. Attempt Penny Drop Validation via Razorpay validations API
    const valRes = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
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
    const valData = await valRes.json();
    console.log('Validation HTTP Status:', valRes.status);
    console.log('Validation Data:', JSON.stringify(valData, null, 2));

    return {
      success: true,
      fundAccount: faData,
      validation: valData
    };
  } catch (err) {
    console.error('Error:', err);
    return { success: false, error: err.message };
  }
}

async function run() {
  console.log('--- Test 1: Real Union Bank account ---');
  await testValidation('Mokshagna Sankabattula', 'UBIN0804681', '046812010001363');

  console.log('\n--- Test 2: Invalid IFSC ---');
  await testValidation('Fake User', 'FAKE0123456', '046812010001363');
}

run();
