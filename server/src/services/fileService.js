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

import FILE_CATEGORIES from '../constants/fileCategories.js';

// CENTRALIZED ALLOWED TYPES
const ALLOWED_MIME_TYPES = {
  [FILE_CATEGORIES.CHAT]: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mpeg', 'audio/mpeg', 'audio/wav', 'audio/mp3',
    'application/pdf', 'text/plain', 'application/zip', 'application/x-zip-compressed',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  [FILE_CATEGORIES.KYC]: ['image/jpeg', 'image/png', 'application/pdf'],
  [FILE_CATEGORIES.PROPERTIES]: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  [FILE_CATEGORIES.LEASES]: ['application/pdf'],
  [FILE_CATEGORIES.INVOICES]: ['application/pdf'],
  [FILE_CATEGORIES.REVIEWS]: ['image/jpeg', 'image/png'],
  [FILE_CATEGORIES.AVATARS]: ['image/jpeg', 'image/png', 'image/webp']
};

const MAX_FILE_SIZE = {
  [FILE_CATEGORIES.CHAT]: 10 * 1024 * 1024,      // 10MB
  [FILE_CATEGORIES.KYC]: 5 * 1024 * 1024,        // 5MB
  [FILE_CATEGORIES.PROPERTIES]: 25 * 1024 * 1024,// 25MB (Supports HD images & property video clips)
  [FILE_CATEGORIES.LEASES]: 10 * 1024 * 1024,    // 10MB
  [FILE_CATEGORIES.INVOICES]: 10 * 1024 * 1024,  // 10MB
  [FILE_CATEGORIES.REVIEWS]: 5 * 1024 * 1024,    // 5MB
  [FILE_CATEGORIES.AVATARS]: 5 * 1024 * 1024     // 5MB
};

/**
 * Validates and uploads a file buffer to centralized AWS S3 or Local DB Fallback.
 * Creates a FileMetadata entry in MongoDB.
 * Supports both object payload { buffer, filename, ... } and positional parameters.
 */
export const uploadFileBuffer = async (
  optionsOrBuffer = {},
  filenameParam = null,
  mimeTypeParam = null,
  categoryParam = null,
  uploaderIdParam = null,
  relatedEntityIdParam = null,
  relatedModelNameParam = null
) => {
  let buffer, filename, mimeType, category, uploaderId, relatedEntityId, relatedModelName;

  if (Buffer.isBuffer(optionsOrBuffer)) {
    buffer = optionsOrBuffer;
    filename = typeof filenameParam === 'string' ? filenameParam : 'uploaded-file.bin';
    mimeType = typeof mimeTypeParam === 'string' ? mimeTypeParam : 'application/octet-stream';
    category = typeof categoryParam === 'string' ? categoryParam : 'chat';
    uploaderId = uploaderIdParam || null;
    relatedEntityId = relatedEntityIdParam || null;
    relatedModelName = relatedModelNameParam || null;
  } else {
    buffer = optionsOrBuffer?.buffer;
    filename = typeof optionsOrBuffer?.filename === 'string' ? optionsOrBuffer.filename : 'uploaded-file.bin';
    mimeType = typeof optionsOrBuffer?.mimeType === 'string' ? optionsOrBuffer.mimeType : 'application/octet-stream';
    category = typeof optionsOrBuffer?.category === 'string' ? optionsOrBuffer.category : 'chat';
    uploaderId = optionsOrBuffer?.uploaderId || null;
    relatedEntityId = optionsOrBuffer?.relatedEntityId || null;
    relatedModelName = optionsOrBuffer?.relatedModelName || null;
  }

  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('File content buffer is required', 400);
  }

  // 1. Validation & Deduplication Check
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if (uploaderId) {
    const existingMetadata = await FileMetadata.findOne({ sha256, uploader: uploaderId, category });
    if (existingMetadata) {
      const cleanName = existingMetadata.key ? existingMetadata.key.split('/').pop() : existingMetadata.filename;
      const storageExists = await FileStorage.findOne({ filename: cleanName });
      if (storageExists || (s3Client && process.env.AWS_S3_BUCKET_NAME)) {
        logger.info(`[FileService Deduplication] Identical file found for uploader ${uploaderId} (SHA256: ${sha256}). Reusing existing file URL.`);
        return existingMetadata;
      } else {
        logger.warn(`[FileService Deduplication] Found stale FileMetadata ${existingMetadata._id} without storage content. Removing stale metadata.`);
        await FileMetadata.deleteOne({ _id: existingMetadata._id });
      }
    }
  }

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
  const safeFilename = typeof filename === 'string' ? filename : 'file.bin';
  const ext = path.extname(safeFilename) || '';
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

  // 5. Store Metadata record in MongoDB with immediate storage rollback on failure
  try {
    const fileRecord = await FileMetadata.create({
      filename,
      mimeType,
      size: buffer.length,
      url,
      key,
      sha256,
      category,
      uploader: uploaderId,
      relatedEntity: relatedEntityId,
      relatedModel: relatedModelName,
    });

    if (!s3Client || !process.env.AWS_S3_BUCKET_NAME) {
      fileRecord.url = `/api/files/download/${fileRecord._id}`;
      await fileRecord.save();
    }

    return fileRecord;
  } catch (dbErr) {
    logger.error(`[FileService Rollback] FileMetadata creation failed for ${key}. Rolling back uploaded storage file: ${dbErr.message}`);
    await deleteFileFromStorage(key, cleanFilename);
    throw new AppError(`File metadata record creation failed: ${dbErr.message}`, 500);
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
  if (!user) return false;
  if (user.role === 'admin') return true;

  const currentUserId = user.userId || user._id;
  const { category, uploader, relatedEntity } = fileRecord;

  // Uploader always has access
  if (uploader && uploader.toString() === currentUserId?.toString()) {
    return true;
  }

  // Public categories
  if (['properties', 'reviews'].includes(category)) {
    return true;
  }

  const User = mongoose.model('User');
  const Tenant = mongoose.model('Tenant');

  // Load User record to get email and role
  const currentUserRecord = await User.findById(currentUserId).select('email role');
  if (!currentUserRecord) return false;

  // Resolve corresponding Tenant profile (if exists)
  const tenantRecord = await Tenant.findOne({ email: currentUserRecord.email });

  if (category === 'chat') {
    const Message = mongoose.model('Message');
    const msg = await Message.findOne({
      $or: [
        { attachments: { $elemMatch: { url: fileRecord.url } } },
        { attachments: { $elemMatch: { key: fileRecord.key } } }
      ]
    });
    if (msg) {
      if (msg.sender.toString() === currentUserId.toString() || msg.receiver.toString() === currentUserId.toString()) {
        return true;
      }
    }
    return false;
  }

  if (category === 'kyc') {
    // KYC relates to the User ID
    return relatedEntity && relatedEntity.toString() === currentUserId.toString();
  }

  if (category === 'leases') {
    const Lease = mongoose.model('Lease');
    const lease = await Lease.findById(relatedEntity);
    if (!lease) return false;

    // Tenant Check (compares Tenant IDs or email)
    const leaseTenantId = (lease.tenant?._id || lease.tenant)?.toString();
    if (tenantRecord && leaseTenantId === tenantRecord._id.toString()) {
      return true;
    }

    if (currentUserRecord && currentUserRecord.email) {
      const tenantDoc = await Tenant.findById(lease.tenant);
      if (tenantDoc && tenantDoc.email === currentUserRecord.email) {
        return true;
      }
    }

    // Manager/Owner Check
    if (currentUserRecord && currentUserRecord.role === 'manager') {
      if (lease.createdBy && lease.createdBy.toString() === currentUserId.toString()) return true;

      const Property = mongoose.model('Property');
      const property = await Property.findById(lease.property);
      if (property && (property.manager?.toString() === currentUserId.toString() || property.owner?.toString() === currentUserId.toString())) {
        return true;
      }
    }
    return false;
  }

  if (category === 'invoices') {
    const Payment = mongoose.model('Payment');
    const payment = await Payment.findById(relatedEntity);
    if (!payment) return false;

    // Tenant Check (compares Tenant IDs)
    if (tenantRecord && payment.tenant.toString() === tenantRecord._id.toString()) {
      return true;
    }

    // Manager/Owner Check
    if (currentUserRecord.role === 'manager') {
      if (payment.createdBy?.toString() === currentUserId.toString()) return true;

      const Property = mongoose.model('Property');
      const property = await Property.findById(payment.property);
      if (property && (property.manager?.toString() === currentUserId.toString() || property.owner?.toString() === currentUserId.toString())) {
        return true;
      }
    }
    return false;
  }

  return false;
};

/**
 * Deletes file from S3 bucket and local fallback storages.
 */
export const deleteFileFromStorage = async (key, filename) => {
  if (key && s3Client && process.env.AWS_S3_BUCKET_NAME) {
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
    const targetFilename = typeof filename === 'string' ? filename : (typeof key === 'string' ? path.basename(key) : null);
    if (targetFilename) {
      await FileStorage.deleteOne({ filename: targetFilename });
      await FileMetadata.deleteMany({
        $or: [
          { key },
          { filename: targetFilename },
          { url: `/api/files/access/${targetFilename}` }
        ]
      });
      const categoryDir = typeof key === 'string' && key.includes('/') ? key.split('/')[0] : 'avatars';
      const localDir = path.join(__dirname, '..', '..', 'uploads', categoryDir);
      const localPath = path.join(localDir, targetFilename);
      if (typeof localPath === 'string' && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
  } catch (err) {
    logger.error(`[FileService Local Delete Error] Filename: ${filename}:`, err);
  }
};
