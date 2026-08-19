import crypto from 'crypto';
import QRCode from 'qrcode';
import Lease from '../models/Lease.js';
import Property from '../models/Property.js';
import Maintenance from '../models/Maintenance.js';
import logger from '../platform/logging/logger.js';

/**
 * Generates an uppercase alphanumeric verification code.
 * Example: TMS-PROP-A8F73X
 */
export function generatePropertyVerificationCode(seed = '') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hash = crypto.createHash('sha256').update(String(seed) || crypto.randomBytes(16)).digest();
  let code = 'TMS-PROP-';
  for (let i = 0; i < 8; i++) {
    code += chars[hash[i] % chars.length];
  }
  return code;
}

/**
 * Generates or retrieves a secure Property QR pass for a given lease/property.
 */
export async function getOrCreatePropertyQr(leaseId, hostUrl = '') {
  const lease = await Lease.findById(leaseId).populate('property');
  if (!lease) {
    throw new Error('Lease record not found');
  }

  const propId = lease.property?._id || lease.property;
  let verificationId = lease.propertyVerificationId;
  let qrToken = lease.propertyQrToken;

  if (!verificationId || !qrToken) {
    verificationId = generatePropertyVerificationCode(`${lease._id}-${propId}`);
    qrToken = crypto.createHash('sha256').update(`${lease._id}-${propId}-TMS_SECURE_PROP_KEY_V1`).digest('hex');
    
    lease.propertyVerificationId = verificationId;
    lease.propertyQrToken = qrToken;
    await lease.save();
  }

  const baseUrl = hostUrl || process.env.CLIENT_URL || 'https://main.d1fq6q7ihzuzlq.amplifyapp.com';
  const verifyUrl = `${baseUrl.replace(/\/$/, '')}/property/verify/${qrToken}`;

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      scale: 10,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    logger.warn('[PropertyQrService] Failed to generate QR Data URL:', err.message);
  }

  const prop = lease.property || {};

  return {
    verificationId,
    qrToken,
    qrCodeDataUrl,
    verifyUrl,
    propertyName: prop.name || 'Property',
    location: prop.address ? `${prop.address}${prop.city ? ', ' + prop.city : ''}`.trim() : 'Location Unavailable',
    address: prop.address || '',
    city: prop.city || '',
    leaseNumber: lease.leaseNumber,
    leaseStatus: lease.status,
    maintenanceEnabled: Boolean(lease.maintenanceEnabled),
    maintenancePlan: lease.maintenanceEnabled ? 'Comprehensive Maintenance' : 'Not Included',
    generatedAt: new Date().toISOString()
  };
}

/**
 * Publicly verifies a property verification token or ID.
 * Returns ONLY safe, public-facing property & maintenance coverage verification details.
 * Absolutely NO tenant names, phone numbers, emails, bank accounts, or private lease documents.
 */
export async function verifyPropertyPublic(token) {
  if (!token) return null;
  const cleanToken = String(token).trim();

  // 1. Direct query by token or verification ID
  let lease = await Lease.findOne({
    $or: [
      { propertyQrToken: cleanToken },
      { propertyVerificationId: cleanToken }
    ]
  }).populate('property');

  // 2. Deterministic match fallback
  if (!lease) {
    const allLeases = await Lease.find({ status: { $in: ['active', 'pending'] } }).populate('property');
    for (const l of allLeases) {
      const propId = l.property?._id || l.property;
      const computedToken = crypto.createHash('sha256').update(`${l._id}-${propId}-TMS_SECURE_PROP_KEY_V1`).digest('hex');
      const computedCode = generatePropertyVerificationCode(`${l._id}-${propId}`);
      if (cleanToken === computedToken || cleanToken === computedCode) {
        l.propertyVerificationId = computedCode;
        l.propertyQrToken = computedToken;
        await l.save();
        lease = l;
        break;
      }
    }
  }

  if (!lease) return null;

  const prop = lease.property || {};

  // Check for active maintenance ticket for technician info without exposing private details
  let activeTicket = null;
  try {
    const ticket = await Maintenance.findOne({
      lease: lease._id,
      status: { $in: ['open', 'submitted', 'in_progress', 'technician_assigned', 'visit_scheduled', 'technician_en_route', 'work_started'] }
    }).select('ticketCode title category priority status scheduledDate').lean();

    if (ticket) {
      activeTicket = {
        ticketCode: ticket.ticketCode,
        title: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        scheduledDate: ticket.scheduledDate
      };
    }
  } catch (e) {
    logger.debug('No active maintenance ticket found for property verification:', e.message);
  }

  return {
    verificationId: lease.propertyVerificationId || generatePropertyVerificationCode(`${lease._id}-${prop._id}`),
    propertyName: prop.name || 'Property',
    location: prop.address ? `${prop.address}${prop.city ? ', ' + prop.city : ''}`.trim() : 'Location Unavailable',
    address: prop.address || '',
    city: prop.city || '',
    state: prop.state || '',
    zipCode: prop.zipCode || '',
    unit: prop.unit || 'Unit N/A',
    propertyType: prop.type || 'Residential',
    leaseNumber: lease.leaseNumber,
    leaseStatus: lease.status,
    maintenanceEnabled: Boolean(lease.maintenanceEnabled),
    maintenancePlan: lease.maintenanceEnabled ? 'Comprehensive Maintenance' : 'Not Included',
    activeTicket,
    verifiedAt: new Date().toISOString()
  };
}
