import multer from 'multer';
import { AppError } from '../utils/errorHandling.js';

const kycFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPG, PNG and PDF are allowed.', 400), false);
  }
};

export const uploadKYC = multer({
  storage: multer.memoryStorage(),
  fileFilter: kycFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadChat = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const mimePrefixes = ['image/', 'video/', 'audio/', 'text/'];
    const mimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    const isAllowedPrefix = mimePrefixes.some(prefix => file.mimetype.startsWith(prefix));
    const isAllowedMime = mimeTypes.includes(file.mimetype);
    
    if (isAllowedPrefix || isAllowedMime) {
      cb(null, true);
    } else {
      cb(new AppError('File type not supported for chat. Allowed: Images, Videos, Audio, PDFs, Documents, Text, ZIP', 400), false);
    }
  }
});

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new AppError('Format restricted. Only images and videos allowed.', 400), false);
    }
  }
});

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile avatars
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid image format. Only JPG, PNG, and WEBP image files are allowed for profile photos.', 400), false);
    }
  }
});
