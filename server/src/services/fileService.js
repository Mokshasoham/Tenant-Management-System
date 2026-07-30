import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../utils/errorHandling.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import FileMetadata from '../models/FileMetadata.js';
import FileStorage from '../models/FileStorage.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';
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

// CENTRALIZED ALLOWED TYPES
const ALLOWED_MIME_TYPES = {
  chat: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mpeg', 'audio/mpeg', 'audio/wav', 'audio/mp3',
    'application/pdf', 'text/plain', 'application/zip', 'application/x-zip-compressed',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  kyc: ['image/jpeg', 'image/png', 'application/pdf'],
  properties: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
  leases: ['application/pdf'],
  invoices: ['application/pdf'],
  reviews: ['image/jpeg', 'image/png']
};

const MAX_FILE_SIZE = {
  chat: 10 * 1024 * 1024,      // 10MB
  kyc: 5 * 1024 * 1024,        // 5MB
  properties: 15 * 1024 * 1024,// 15MB
  leases: 10 * 1024 * 1024,    // 10MB
  invoices: 10 * 1024 * 1024,  // 10MB
  reviews: 5 * 1024 * 1024     // 5MB
};

/**
 * Validates and uploads a file buffer to centralized AWS S3 or Local DB Fallback.
 * Creates a FileMetadata entry in MongoDB.
 */
export const uploadFileBuffer = async ({
  buffer,
  filename,
  mimeType,
  category,
  uploaderId = null,
  relatedEntityId = null,
  relatedModelName = null
}) => {
  if (!buffer || buffer.length === 0) {
    throw new AppError('File content buffer is required', 400);
  }

  // 1. Validation
  const allowedTypes = ALLOWED_MIME_TYPES[category] || [];
  const maxSize = MAX_FILE_SIZE[category] || 10 * 1024 * 1024;

  if (allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
    throw new AppError(`Mime type "${mimeType}" is not supported for ${category} uploads.`, 400);
  }

  if (buffer.length > maxSize) {
    throw new AppError(`File size exceeds the limit of ${maxSize / (1024 * 1024)}MB for ${category}.`, 400);
  }

  // 2. Generate Unique S3 Key
  const uniqueId = crypto.randomUUID();
  const ext = path.extname(filename) || '';
  const cleanFilename = `${category}-${uniqueId}${ext}`;
  const key = `${category}/${cleanFilename}`;

  let url = '';

  // 3. Upload to S3 if configured
  if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
    logger.info(`[FileService] Uploading ${filename} to AWS S3 key: ${key}`);
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    };
    try {
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    } catch (err) {
      logger.error('[FileService S3 Error] Upload failed, falling back to database storage:', err);
      s3Client = null; 
    }
  }

  // 4. Local DB Fallback storage (Eliminates disk dependencies)
  if (!url) {
    logger.info(`[FileService] S3 not configured or failed. Storing ${filename} to MongoDB FileStorage.`);
    try {
      await FileStorage.findOneAndUpdate(
        { filename: cleanFilename },
        { filename: cleanFilename, mimeType, data: buffer },
        { upsert: true, new: true }
      );
      url = `/api/files/access/${cleanFilename}`;
      
      // Mirror to disk uploads directory for fast local static serving if directory exists
      const localDir = path.join(__dirname, '..', '..', 'uploads', category);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      fs.writeFileSync(path.join(localDir, cleanFilename), buffer);
    } catch (err) {
      logger.error('[FileService Local Fallback Error] Failed to persist file:', err);
      throw new AppError('File storage persistence failure', 500);
    }
  }

  // 5. Store Metadata record in MongoDB
  const fileRecord = await FileMetadata.create({
    filename,
    mimeType,
    size: buffer.length,
    url,
    key,
    uploader: uploaderId,
    relatedEntity: relatedEntityId,
    relatedModel: relatedModelName,
    category
  });

  // Fix local fallback URL to use the MongoDB _id for metadata-driven access
  if (!s3Client || !process.env.AWS_S3_BUCKET_NAME) {
    fileRecord.url = `/api/files/download/${fileRecord._id}`;
    await fileRecord.save();
  }

  logger.info(`[FileService Success] Centralized metadata created for key: ${key}, fileId: ${fileRecord._id}`);
  return fileRecord;
};

/**
 * Generates secure temporary signed S3 URL.
 */
export const generateSecureS3Url = async (fileRecord) => {
  if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileRecord.key,
      ResponseContentType: fileRecord.mimeType,
      ResponseContentDisposition: `inline; filename="${fileRecord.filename}"`
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15m
  }
  return null;
};

/**
 * Generates short-lived local access token for DB fallbacks.
 */
export const generateLocalOneTimeToken = (fileId, userId) => {
  return jwt.sign({ fileId, userId }, config.JWT_SECRET, { expiresIn: '15m' });
};

/**
 * Verifies short-lived local token.
 */
export const verifyLocalOneTimeToken = (token, fileId) => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return decoded.fileId === fileId;
  } catch (err) {
    return false;
  }
};

/**
 * Centralized permissions checker.
 */
export const verifyFileAccessPermission = async (user, fileRecord) => {
  if (user.role === 'admin') return true;

  const { category, uploader, relatedEntity } = fileRecord;
  const currentUserId = user.userId || user._id;

  if (uploader && uploader.toString() === currentUserId?.toString()) {
    return true;
  }

  if (['properties', 'reviews'].includes(category)) {
    return true;
  }

  if (user.role === 'manager' && category !== 'chat') {
    return true;
  }

  if (category === 'chat') {
    const Message = mongoose.model('Message');
    const msg = await Message.findOne({
      $or: [
        { attachments: { $elemMatch: { url: fileRecord.url } } },
        { attachments: { $elemMatch: { key: fileRecord.key } } }
      ]
    });
    if (msg) {
      if (msg.sender.toString() === currentUserId?.toString() || msg.receiver.toString() === currentUserId?.toString()) {
        return true;
      }
    }
    return false;
  }

  if (category === 'kyc') {
    return relatedEntity && relatedEntity.toString() === currentUserId?.toString();
  }

  if (category === 'leases') {
    const Lease = mongoose.model('Lease');
    const lease = await Lease.findById(relatedEntity);
    if (lease && lease.tenant.toString() === currentUserId?.toString()) {
      return true;
    }
    return false;
  }

  if (category === 'invoices') {
    const Payment = mongoose.model('Payment');
    const payment = await Payment.findById(relatedEntity);
    if (payment && payment.tenant.toString() === currentUserId?.toString()) {
      return true;
    }
    return false;
  }

  return false;
};

/**
 * Deletes file from S3 bucket and local fallback storages.
 */
export const deleteFileFromStorage = async (key, filename) => {
  if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
    logger.info(`[FileService] Deleting S3 key: ${key}`);
    try {
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key
      });
      await s3Client.send(command);
    } catch (err) {
      logger.error(`[FileService S3 Delete Error] Key: ${key}:`, err);
    }
  }

  try {
    await FileStorage.deleteOne({ filename });
    const localDir = path.join(__dirname, '..', '..', 'uploads', key.split('/')[0]);
    const localPath = path.join(localDir, filename);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  } catch (err) {
    logger.error(`[FileService Local Delete Error] Filename: ${filename}:`, err);
  }
};
