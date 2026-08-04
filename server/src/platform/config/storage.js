import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  localPath: path.join(__dirname, '..', '..', '..', 'uploads'),
  s3: {
    bucketName: process.env.S3_BUCKET_NAME,
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  },
  maxFileSize: 10 * 1024 * 1024, // 10MB default
  allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.docx']
};
