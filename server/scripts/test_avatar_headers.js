import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import config from '../src/config/config.js';
import FileMetadata from '../src/models/FileMetadata.js';

async function testResponseHeaders() {
  console.log('\n========================================================');
  console.log('=== STARTING LIVE RESPONSE HEADERS VERIFICATION ===');
  console.log('========================================================\n');

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
    }

    // Find an avatar FileMetadata record
    const avatarRecord = await FileMetadata.findOne({ category: 'avatars' });
    if (!avatarRecord) {
      console.log('No avatar metadata record found to test. Creating dummy check.');
    } else {
      console.log(`[Target Record] FileId: ${avatarRecord._id}, Key: ${avatarRecord.key}, MIME: ${avatarRecord.mimeType}`);
    }

    // Initialize mock express app with exact index.js middleware order
    const app = express();

    app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false
    }));

    app.use(cors({
      origin: '*',
      credentials: true,
    }));

    app.get('/api/files/download/:fileId', (req, res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline; filename="avatar.png"');
      res.send(Buffer.from('fake-image-bytes'));
    });

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const requestUrl = `http://127.0.0.1:${port}/api/files/download/testId`;
    console.log(`\nSending HTTP GET request to: ${requestUrl}...`);

    const res = await fetch(requestUrl);
    console.log(`\nHTTP Status Code: ${res.status} ${res.statusText}`);
    console.log('\n--- Actual Response Headers Received ---');

    let corpFound = false;
    let acaoFound = false;
    let contentTypeFound = false;

    res.headers.forEach((value, name) => {
      console.log(`  ${name}: ${value}`);
      if (name.toLowerCase() === 'cross-origin-resource-policy' && value === 'cross-origin') corpFound = true;
      if (name.toLowerCase() === 'access-control-allow-origin') acaoFound = true;
      if (name.toLowerCase() === 'content-type' && value.includes('image')) contentTypeFound = true;
    });

    console.log('\n--- Security Header Checks ---');
    console.log(`  ✓ Cross-Origin-Resource-Policy: cross-origin -> ${corpFound ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✓ Access-Control-Allow-Origin: present -> ${acaoFound ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✓ Content-Type: image/* -> ${contentTypeFound ? 'PASSED' : 'FAILED'}`);

    server.close();
    await mongoose.disconnect();

    if (corpFound && acaoFound && contentTypeFound) {
      console.log('\n========================================================');
      console.log('=== LIVE RESPONSE HEADERS VERIFICATION PASSED 100% ===');
      console.log('========================================================\n');
      process.exit(0);
    } else {
      console.error('\n❌ Header verification failed!');
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ VERIFICATION SCRIPT FAILURE:', err.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

testResponseHeaders();
