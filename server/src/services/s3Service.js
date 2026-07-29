import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../utils/errorHandling.js';
import fs from 'fs';
import path from 'path';
import FileStorage from '../models/FileStorage.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let s3Client;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export const uploadBufferToStorage = async (buffer, filename, mimeType) => {
  // Fallback to local disk if S3 isn't formally wired up
  if (!s3Client || !process.env.AWS_S3_BUCKET_NAME) {
    const localDir = path.join(__dirname, '..', '..', 'uploads', 'properties');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    
    const localPath = path.join(localDir, filename);
    await fs.promises.writeFile(localPath, buffer);
    
    // Save to Mongoose FileStorage as persistent database backup fallback
    try {
      await FileStorage.findOneAndUpdate(
        { filename },
        { filename, mimeType, data: buffer },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('[FileStorage Fallback] Failed to persist file in MongoDB:', err.message);
    }
    
    return {
      Location: `/uploads/properties/${filename}`,
      Key: filename,
      filePath: localPath
    };
  }

  // Else, push directly to remote S3
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `properties/${filename}`,
    Body: buffer,
    ContentType: mimeType,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return {
      Location: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/properties/${filename}`,
      Key: `properties/${filename}`
    };
  } catch (error) {
    throw new AppError(`Failed to upload data to S3: ${error.message}`, 500);
  }
};
