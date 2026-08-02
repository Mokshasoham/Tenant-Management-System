/**
 * Centralized Upload Policies & Limits for Tenant Management System.
 */
import { FILE_CATEGORIES } from './fileCategories.js';

export const UPLOAD_POLICIES = {
  [FILE_CATEGORIES.AVATARS]: {
    maxSize: 5 * 1024 * 1024, // 5MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxWidth: 1024,
    maxHeight: 1024,
    minWidth: 100,
    minHeight: 100,
    rateLimitMax: 15, // max 15 uploads
    rateLimitWindowMs: 60 * 60 * 1000 // per 1 hour
  },
  [FILE_CATEGORIES.CHAT]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'audio/mpeg', 'audio/wav', 'audio/mp3',
      'application/pdf', 'text/plain', 'application/zip', 'application/x-zip-compressed',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  },
  [FILE_CATEGORIES.KYC]: {
    maxSize: 5 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
  },
  [FILE_CATEGORIES.PROPERTIES]: {
    maxSize: 15 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
  },
  [FILE_CATEGORIES.LEASES]: {
    maxSize: 10 * 1024 * 1024,
    mimeTypes: ['application/pdf']
  },
  [FILE_CATEGORIES.INVOICES]: {
    maxSize: 10 * 1024 * 1024,
    mimeTypes: ['application/pdf']
  },
  [FILE_CATEGORIES.REVIEWS]: {
    maxSize: 5 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png']
  }
};

export default UPLOAD_POLICIES;
