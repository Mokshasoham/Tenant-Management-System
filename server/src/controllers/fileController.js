import FileMetadata from '../models/FileMetadata.js';
import FileStorage from '../models/FileStorage.js';
import { 
  verifyFileAccessPermission, 
  generateSecureS3Url, 
  generateLocalOneTimeToken, 
  verifyLocalOneTimeToken 
} from '../services/fileService.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

/**
 * Endpoint to obtain a temporary secure signed URL or local fallback URL.
 * GET /api/files/signed-url/:fileId
 */
export const getSignedUrlForFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const { url, key } = req.query;

  let fileRecord;
  if (fileId && fileId !== 'resolve' && mongoose.Types.ObjectId.isValid(fileId)) {
    fileRecord = await FileMetadata.findById(fileId);
  } else if (url) {
    let relativeUrl = url;
    try {
      if (url.startsWith('http')) {
        const parsedUrl = new URL(url);
        relativeUrl = parsedUrl.pathname + parsedUrl.search;
      }
    } catch (_) {}
    
    fileRecord = await FileMetadata.findOne({ 
      $or: [
        { url: url },
        { url: relativeUrl },
        { key: url },
        { key: relativeUrl.replace(/^\//, '') }
      ]
    });
    
    if (!fileRecord) {
      const filename = url.split('/').pop();
      if (filename) {
        fileRecord = await FileMetadata.findOne({
          $or: [
            { filename },
            { key: { $regex: new RegExp(filename + '$') } }
          ]
        });
      }
    }
  } else if (key) {
    fileRecord = await FileMetadata.findOne({ key });
  }

  if (!fileRecord) {
    throw new AppError('File metadata not found', 404);
  }

  const resolvedFileId = fileRecord._id;

  // Permission Check
  const hasAccess = await verifyFileAccessPermission(req.user, fileRecord);
  if (!hasAccess) {
    logger.warn(`[FileController] Access Denied: User ${req.user.userId} attempted to access file ${resolvedFileId}`);
    throw new AppError('Forbidden: You do not have permission to access this file', 403);
  }

  // If S3 is active, generate secure presigned URL
  if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
    const signedUrl = await generateSecureS3Url(fileRecord);
    if (signedUrl) {
      logger.info(`[FileController] Secure S3 signed URL generated for fileId: ${resolvedFileId}`);
      return res.status(200).json({ success: true, url: signedUrl });
    }
  }

  // Local fallback signed URL with a temporary short-lived token
  const tempToken = generateLocalOneTimeToken(resolvedFileId.toString(), req.user.userId);
  const localSignedUrl = `/api/files/download/${resolvedFileId}?token=${tempToken}`;

  logger.info(`[FileController] Local fallback signed URL generated for fileId: ${resolvedFileId}`);
  res.status(200).json({ success: true, url: localSignedUrl });
});

/**
 * Centralized file download/streaming handler.
 * GET /api/files/download/:fileId
 */
export const downloadFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    throw new AppError('Invalid file ID format', 400);
  }

  const fileRecord = await FileMetadata.findById(fileId);
  if (!fileRecord) {
    throw new AppError('File not found', 404);
  }

  // Authenticate user from standard req.user, Authorization header, or token query string
  let currentUser = req.user;

  const rawToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : (req.query.token || req.query.authorization);

  if (!currentUser && rawToken) {
    try {
      const decoded = verifyToken(rawToken);
      currentUser = decoded;
    } catch (_) {
      // Fallback check if it's a signed one-time file token
      const isValidOneTime = verifyLocalOneTimeToken(rawToken, fileId);
      if (isValidOneTime) {
        try {
          const decodedPayload = jwt.decode(rawToken);
          currentUser = { userId: decodedPayload?.userId, role: decodedPayload?.role || 'user' };
        } catch (_) {}
      }
    }
  }

  const PUBLIC_CATEGORIES = ['properties', 'reviews', 'avatars'];

  if (!currentUser && !PUBLIC_CATEGORIES.includes(fileRecord.category)) {
    throw new AppError('Unauthorized access: Authentication is required', 401);
  }

  // Permission Check
  if (currentUser && !PUBLIC_CATEGORIES.includes(fileRecord.category)) {
    const hasAccess = await verifyFileAccessPermission(currentUser, fileRecord);
    if (!hasAccess) {
      throw new AppError('Forbidden: Access denied to this file resource', 403);
    }
  }

  // Audit access
  fileRecord.downloadCount += 1;
  fileRecord.lastAccessedAt = new Date();
  await fileRecord.save();

  logger.info(`[FileController Auditing] Access logged for fileId: ${fileId}, MIME: ${fileRecord.mimeType}`);

  // If S3 is active, stream from S3 or redirect
  if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileRecord.key,
      });
      const s3Url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      return res.redirect(s3Url);
    } catch (err) {
      logger.error('[FileController S3 Download Error] Falling back to MongoDB:', err);
    }
  }

  // Fallback streaming from MongoDB FileStorage collection
  const cleanFilename = fileRecord.key.split('/').pop();
  const dbFile = await FileStorage.findOne({ filename: cleanFilename });
  if (!dbFile) {
    throw new AppError('File binary content not found in database', 404);
  }

  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', fileRecord.mimeType || 'application/pdf');

  const isDownload = req.query.download === 'true' || req.query.disposition === 'attachment';
  const disposition = isDownload ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileRecord.filename || 'document.pdf'}"`);

  res.send(dbFile.data);
});

/**
 * Access file directly by filename (supporting /api/files/access/:filename)
 */
export const accessFileByFilename = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  // 1. Try FileStorage lookup directly
  const dbFile = await FileStorage.findOne({ filename });
  if (dbFile) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', dbFile.mimeType || 'image/webp');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(dbFile.data);
  }

  // 2. Try FileMetadata lookup
  const meta = await FileMetadata.findOne({
    $or: [
      { filename },
      { key: new RegExp(filename + '$', 'i') },
      { key: `properties/${filename}` },
      { key: `chat/${filename}` },
      { key: `avatars/${filename}` },
    ]
  });

  if (meta) {
    const cleanName = meta.key ? meta.key.split('/').pop() : meta.filename;
    const fileData = await FileStorage.findOne({ filename: cleanName });
    if (fileData) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', meta.mimeType || fileData.mimeType || 'image/webp');
      res.setHeader('Content-Disposition', `inline; filename="${meta.filename || filename}"`);
      return res.send(fileData.data);
    }
  }

  throw new AppError('File not found', 404);
});

/**
 * Temporary backward-compatible alias resolver.
 * Handles old pathing (/uploads/:category/:filename) internally.
 */
export const resolveLegacyUploadAlias = asyncHandler(async (req, res, next) => {
  const { category, filename } = req.params;
  const key = `${category}/${filename}`;

  const fileRecord = await FileMetadata.findOne({ $or: [{ key }, { filename }] });
  if (!fileRecord) {
    // If not found in metadata, let index.js next handler check filesystem or regenerate
    return next();
  }

  const PUBLIC_CATEGORIES = ['properties', 'reviews', 'avatars'];

  // If it's a public asset, serve it directly
  if (PUBLIC_CATEGORIES.includes(fileRecord.category)) {
    // Audit access
    fileRecord.downloadCount += 1;
    fileRecord.lastAccessedAt = new Date();
    await fileRecord.save();

    if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileRecord.key,
        });
        const s3Url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        return res.redirect(s3Url);
      } catch (err) {
        logger.error('[LegacyAlias S3 Error]:', err);
      }
    }

    const dbFile = await FileStorage.findOne({ filename: fileRecord.key.split('/').pop() });
    if (dbFile) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', fileRecord.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileRecord.filename}"`);
      return res.send(dbFile.data);
    }
  }

  // For private files, redirect them to access route via query authorization if token present
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (token) {
    // Map request parameters to run through standard download logic
    req.params.fileId = fileRecord._id.toString();
    return downloadFile(req, res, next);
  }

  res.status(403).json({
    success: false,
    message: 'Forbidden: Private file access requires permission headers or temporary signed tokens'
  });
});
