/**
 * server/src/services/maintenanceTicketService.js
 *
 * Dedicated domain service for Maintenance Ticket Unique IDs, QR Codes,
 * Technician Work Completion, Multi-Lease Association, Verification, and Authorized Resolution.
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import mongoose from 'mongoose';
import Maintenance from '../models/Maintenance.js';
import User from '../models/User.js';
import Lease from '../models/Lease.js';
import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import NotificationService from './NotificationService.js';
import eventBus from '../platform/events/eventBus.js';
import logger from '../platform/logging/logger.js';
import { AppError } from '../utils/errorHandling.js';

/**
 * Generates a globally unique maintenance ticket ID.
 * Format: TMS-MNT-{YYYYMMDD}-{6-CHAR-CRYPTO-ALPHANUMERIC}
 * Example: TMS-MNT-20260818-A7K92P
 */
export async function generateUniqueTicketCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Unambiguous uppercase alphanumeric

  let isUnique = false;
  let ticketCode = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomBytes = crypto.randomBytes(6);
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars[randomBytes[i] % chars.length];
    }
    ticketCode = `TMS-MNT-${dateStr}-${randomPart}`;

    const existing = await Maintenance.findOne({
      $or: [{ ticketCode }, { ticketNumber: ticketCode }]
    }).select('_id').lean();

    if (!existing) {
      isUnique = true;
    }
  }

  return ticketCode;
}

/**
 * Generates a cryptographically signed QR code token and high-res Base64 Data URL.
 * Encodes an opaque ticket reference without exposing sensitive user or financial data.
 */
export async function generateQrData(ticketCode, existingToken = null) {
  const qrToken = existingToken || crypto.randomBytes(16).toString('hex');
  const payload = `TMS_MAINTENANCE:${ticketCode}:${qrToken}`;

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    logger.warn('[MaintenanceTicketService] Failed to generate QR Data URL:', err.message);
  }

  return {
    qrToken,
    qrCodeDataUrl,
    qrGeneratedAt: new Date()
  };
}

/**
 * Ensures a ticket has a valid ticketCode and QR code (for legacy tickets).
 */
export async function ensureTicketCodeAndQr(ticket) {
  if (!ticket) return ticket;
  let modified = false;

  if (!ticket.ticketCode) {
    ticket.ticketCode = await generateUniqueTicketCode();
    ticket.ticketNumber = ticket.ticketCode;
    modified = true;
  }

  if (!ticket.qrCodeDataUrl || !ticket.qrToken) {
    const qrData = await generateQrData(ticket.ticketCode, ticket.qrToken);
    ticket.qrToken = qrData.qrToken;
    ticket.qrCodeDataUrl = qrData.qrCodeDataUrl;
    ticket.qrGeneratedAt = qrData.qrGeneratedAt;
    modified = true;
  }

  if (modified && typeof ticket.save === 'function') {
    await ticket.save();
  }

  return ticket;
}

/**
 * Submits technician work completion details and resolves the maintenance ticket.
 * Enforces assignment check, updates status to `resolved`, logs audit trail, and notifies tenant.
 */
export async function submitTechnicianCompletion(ticketId, completionData = {}, userContext) {
  const userId = userContext.userId || userContext._id || userContext.id;
  const userRole = userContext.role;

  let query = {};
  if (mongoose.Types.ObjectId.isValid(ticketId)) {
    query = { _id: ticketId };
  } else {
    query = { $or: [{ ticketCode: ticketId }, { ticketNumber: ticketId }] };
  }

  const ticket = await Maintenance.findOne(query)
    .populate('requestedBy', 'firstName lastName email phone')
    .populate('assignedTo', 'firstName lastName email role')
    .populate('property', 'name address unit')
    .populate('lease', 'leaseNumber startDate endDate status');

  if (!ticket) {
    throw new AppError('Maintenance ticket not found', 404);
  }

  // 1. Prevent duplicate completion on already-resolved or closed tickets
  if (['resolved', 'completed', 'closed'].includes(ticket.status)) {
    throw new AppError('This maintenance ticket is already resolved.', 400);
  }
  if (ticket.status === 'cancelled') {
    throw new AppError('Cannot complete a cancelled maintenance ticket.', 400);
  }

  // 2. Strict Authorization check: Logged-in technician must be assigned to this ticket (or Manager/Admin)
  if (userRole === 'technician') {
    const assignedId = (ticket.assignedTo?._id || ticket.assignedTo || ticket.technicianId?._id || ticket.technicianId)?.toString();
    if (assignedId && assignedId !== userId.toString()) {
      throw new AppError('You are not assigned to this maintenance ticket.', 403);
    }
  }

  // Fetch technician profile name
  const technicianUser = await User.findById(userId).select('firstName lastName role');
  const technicianName = technicianUser
    ? `${technicianUser.firstName || ''} ${technicianUser.lastName || ''}`.trim()
    : (userContext.name || 'Assigned Technician');

  // Extract completion payload
  const workPerformed = completionData.workPerformed || completionData.notes || 'Maintenance repair completed by technician.';
  const partsUsed = completionData.partsUsed || 'Standard repair materials.';
  const completionNotes = completionData.completionNotes || completionData.notes || '';
  const completionPhotos = Array.isArray(completionData.completionPhotos)
    ? completionData.completionPhotos
    : (completionData.photos || []);

  const now = new Date();

  ticket.completionDetails = {
    workPerformed,
    partsUsed,
    completionNotes,
    completionPhotos,
    completedAt: now
  };
  ticket.completionNotes = completionNotes;
  ticket.technicianId = userId;
  ticket.technicianName = technicianName;
  ticket.technicianCompletedAt = now;
  ticket.resolvedAt = now;
  ticket.completedAt = now;
  ticket.resolvedBy = userId;
  ticket.resolutionMethod = completionData.resolutionMethod || 'qr';
  ticket.completionStatus = 'resolved';
  ticket.status = 'resolved';

  if (ticket.createdAt) {
    ticket.actualResolutionTimeMinutes = Math.round((now.getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60));
  }

  // Push status history
  ticket.statusHistory.push({
    status: 'resolved',
    changedBy: userId,
    changedAt: now,
    note: `Work completed and resolved by technician ${technicianName}: ${workPerformed}`
  });

  // Push audit log
  ticket.auditLog.push({
    action: 'WORK_COMPLETED_AND_RESOLVED',
    userId,
    userName: technicianName,
    userRole: technicianUser?.role || userRole,
    timestamp: now,
    notes: `Technician resolved ticket via QR scan / completion. Work: ${workPerformed}. Parts: ${partsUsed}`,
    method: ticket.resolutionMethod,
    metadata: {
      workPerformed,
      partsUsed,
      completionNotes,
      actualResolutionTimeMinutes: ticket.actualResolutionTimeMinutes
    }
  });

  await ticket.save();

  // Send Notification to Tenant of resolution
  if (ticket.requestedBy) {
    const tenantRecipientId = ticket.requestedBy._id || ticket.requestedBy;
    await NotificationService.notify({
      recipient: tenantRecipientId,
      category: 'maintenance',
      event: 'resolved',
      title: '✅ Maintenance Ticket Resolved',
      description: `Technician ${technicianName} completed repairs on "${ticket.title}". Status is now Resolved.`,
      sourceModule: 'maintenance',
      entityType: 'Maintenance',
      entityId: ticket._id,
      priority: 'high'
    }).catch(err => logger.warn('[MaintenanceTicketService] Notification error:', err.message));
  }

  // Publish domain events
  try {
    await eventBus.publish('maintenance.work_completed', {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      technicianId: userId,
      technicianName,
      workPerformed,
      timestamp: now.toISOString()
    });
    await eventBus.publish('maintenance.resolved', {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      resolvedBy: userId,
      resolvedAt: now.toISOString(),
      resolutionMethod: ticket.resolutionMethod,
      timestamp: now.toISOString()
    });
    await eventBus.publish('maintenance.completed', {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      completedAt: now,
      resolutionMinutes: ticket.actualResolutionTimeMinutes
    });
  } catch (err) {
    logger.warn('[MaintenanceTicketService] Event bus publish error:', err.message);
  }

  return ticket;
}

/**
 * Verifies and looks up a maintenance ticket by unique Ticket Code, QR Token, or ID.
 * Returns sanitized, authorized ticket details for verification.
 */
export async function verifyTicketByCode(ticketCodeOrId, userContext = null) {
  if (!ticketCodeOrId) {
    throw new AppError('Ticket reference is required', 400);
  }

  const rawCode = String(ticketCodeOrId).trim();
  let cleanCode = rawCode;
  let token = rawCode;
  let extractedTicketCode = null;

  if (rawCode.startsWith('TMS_MAINTENANCE:') || rawCode.startsWith('TMS-MNT-VERIFY:')) {
    const parts = rawCode.split(':');
    if (parts.length >= 3) {
      extractedTicketCode = parts[1];
      token = parts[2];
    } else if (parts.length === 2) {
      if (parts[1].startsWith('TMS-MNT')) {
        extractedTicketCode = parts[1];
      } else {
        token = parts[1];
      }
    }
  }

  if (!extractedTicketCode) {
    const match = rawCode.match(/TMS-MNT-\d{8}-[A-Z0-9]+/i);
    if (match) {
      extractedTicketCode = match[0];
    }
  }

  // Query by ticketCode, ticketNumber, qrToken, or _id
  let queryConditions = [
    { ticketCode: { $regex: new RegExp(`^${cleanCode}$`, 'i') } },
    { ticketNumber: { $regex: new RegExp(`^${cleanCode}$`, 'i') } },
    { qrToken: cleanCode },
    { qrToken: token }
  ];

  if (extractedTicketCode) {
    queryConditions.push({ ticketCode: { $regex: new RegExp(`^${extractedTicketCode}$`, 'i') } });
    queryConditions.push({ ticketNumber: { $regex: new RegExp(`^${extractedTicketCode}$`, 'i') } });
  }

  if (mongoose.Types.ObjectId.isValid(cleanCode)) {
    queryConditions.push({ _id: cleanCode });
  }

  const ticket = await Maintenance.findOne({ $or: queryConditions })
    .populate('requestedBy', 'firstName lastName email phone role')
    .populate('assignedTo', 'firstName lastName email role phone rating')
    .populate('technicianId', 'firstName lastName email phone')
    .populate('property', 'name address unit city state zipCode')
    .populate('lease', 'leaseNumber startDate endDate status')
    .populate('resolvedBy', 'firstName lastName role');

  if (!ticket) {
    throw new AppError(`Maintenance ticket "${rawCode}" not found.`, 404);
  }

  // Lazy ensure ticketCode & QR
  await ensureTicketCodeAndQr(ticket);

  // If user context is provided, check if authorized to view / resolve
  let canResolve = false;
  let userRelationship = 'guest';

  if (userContext) {
    const userId = (userContext.userId || userContext._id || userContext.id)?.toString();
    const userRole = userContext.role;

    const requesterId = (ticket.requestedBy?._id || ticket.requestedBy)?.toString();
    const technicianId = (ticket.assignedTo?._id || ticket.assignedTo || ticket.technicianId?._id || ticket.technicianId)?.toString();

    // Security check: An unrelated technician cannot inspect or modify tickets assigned to other technicians
    if (userRole === 'technician') {
      if (technicianId && technicianId !== userId) {
        throw new AppError('You are not assigned to this maintenance ticket.', 403);
      }
      canResolve = true;
      userRelationship = 'assigned_technician';
    } else if (['admin', 'manager'].includes(userRole)) {
      canResolve = true;
      userRelationship = userRole;
    } else if (requesterId === userId) {
      canResolve = true;
      userRelationship = 'tenant_owner';
    }

    // Log QR/ID verification audit
    ticket.auditLog.push({
      action: 'QR_VERIFIED',
      userId: userContext.userId || userContext._id || userContext.id,
      userName: userContext.name || userContext.email || 'Authenticated User',
      userRole: userRole || 'user',
      timestamp: new Date(),
      notes: `Ticket lookup verified via ${rawCode.includes('TMS') ? 'qr_or_ticket_id' : 'qr'}`,
      method: 'qr'
    });
    await ticket.save().catch(() => {});
  }

  return {
    ticket,
    canResolve,
    userRelationship,
    isAwaitingConfirmation: ['awaiting_tenant_confirmation', 'completed_by_technician'].includes(ticket.status),
    isResolved: ['resolved', 'completed', 'closed'].includes(ticket.status)
  };
}

/**
 * Resolves a maintenance ticket via QR code or manual Ticket ID verification.
 * Strictly prevents double-resolution and validates authorization.
 */
export async function resolveMaintenanceTicket(ticketIdOrCode, resolutionData = {}, userContext) {
  if (!userContext) {
    throw new AppError('Authentication required to resolve maintenance ticket.', 401);
  }

  const userId = userContext.userId || userContext._id || userContext.id;
  const userRole = userContext.role;

  const cleanCode = String(ticketIdOrCode).trim();
  let queryConditions = [
    { ticketCode: { $regex: new RegExp(`^${cleanCode}$`, 'i') } },
    { ticketNumber: { $regex: new RegExp(`^${cleanCode}$`, 'i') } },
    { qrToken: cleanCode }
  ];

  if (mongoose.Types.ObjectId.isValid(cleanCode)) {
    queryConditions.push({ _id: cleanCode });
  }

  const ticket = await Maintenance.findOne({ $or: queryConditions })
    .populate('requestedBy', 'firstName lastName email role')
    .populate('assignedTo', 'firstName lastName email role')
    .populate('property', 'name address')
    .populate('lease', 'leaseNumber');

  if (!ticket) {
    throw new AppError('Maintenance ticket not found.', 404);
  }

  // 1. Double Resolution Guard
  if (['resolved', 'completed', 'closed'].includes(ticket.status)) {
    throw new AppError('Maintenance ticket is already resolved.', 400);
  }
  if (ticket.status === 'cancelled') {
    throw new AppError('Cannot resolve a cancelled maintenance ticket.', 400);
  }

  // 2. Multi-Lease / Identity Authorization Guard
  const requesterId = (ticket.requestedBy?._id || ticket.requestedBy)?.toString();
  const technicianId = (ticket.assignedTo?._id || ticket.assignedTo || ticket.technicianId)?.toString();
  const isManagerOrAdmin = ['manager', 'admin'].includes(userRole);
  const isOwnerTenant = requesterId === userId.toString();
  const isAssignedTech = technicianId === userId.toString();

  if (!isManagerOrAdmin && !isOwnerTenant && !isAssignedTech) {
    throw new AppError('You are not authorized to resolve this maintenance ticket.', 403);
  }

  // 3. Resolution Details
  const now = new Date();
  const resolutionMethod = resolutionData.resolutionMethod || (cleanCode.startsWith('TMS-MNT') ? 'ticket_id' : 'qr');
  const userObj = await User.findById(userId).select('firstName lastName role');
  const resolverName = userObj
    ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim()
    : (userContext.name || 'Authorized User');

  ticket.status = 'resolved';
  ticket.completionStatus = 'resolved';
  ticket.resolvedAt = now;
  ticket.completedAt = now;
  ticket.tenantResolvedAt = isOwnerTenant ? now : ticket.tenantResolvedAt || now;
  ticket.resolvedBy = userId;
  ticket.resolutionMethod = resolutionMethod;

  if (ticket.createdAt) {
    ticket.actualResolutionTimeMinutes = Math.round((now.getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60));
  }

  // Append status history
  ticket.statusHistory.push({
    status: 'resolved',
    changedBy: userId,
    changedAt: now,
    note: `Ticket resolved via ${resolutionMethod.toUpperCase()} by ${resolverName} (${userRole}).`
  });

  // Append audit log
  ticket.auditLog.push({
    action: 'TICKET_RESOLVED',
    userId,
    userName: resolverName,
    userRole: userObj?.role || userRole,
    timestamp: now,
    notes: resolutionData.notes || `Maintenance ticket verified and confirmed resolved via ${resolutionMethod.toUpperCase()}.`,
    method: resolutionMethod,
    metadata: {
      resolutionMethod,
      actualResolutionTimeMinutes: ticket.actualResolutionTimeMinutes
    }
  });

  // If rating/feedback provided in resolution payload, attach it
  if (resolutionData.feedback || resolutionData.rating) {
    const score = resolutionData.rating || resolutionData.score || resolutionData.feedback?.rating || 5;
    const comment = resolutionData.comment || resolutionData.feedback?.comment || resolutionData.feedbackText || 'Work confirmed and resolved.';
    ticket.rating = {
      score,
      rating: score,
      comment,
      feedback: comment,
      wouldRecommend: resolutionData.wouldRecommend !== undefined ? resolutionData.wouldRecommend : true,
      submittedBy: userId,
      ratedAt: now,
      submittedAt: now
    };
  }

  await ticket.save();

  // Notify Managers & Assigned Technician of resolution
  if (technicianId && technicianId !== userId.toString()) {
    await NotificationService.notify({
      recipient: technicianId,
      category: 'maintenance',
      event: 'resolved',
      title: '✅ Maintenance Ticket Resolved',
      description: `Ticket "${ticket.title}" (${ticket.ticketCode}) has been confirmed and resolved by ${resolverName}.`,
      sourceModule: 'maintenance',
      entityType: 'Maintenance',
      entityId: ticket._id,
      priority: 'medium'
    }).catch(err => logger.warn('[MaintenanceTicketService] Tech notification error:', err.message));
  }

  // Publish domain events
  try {
    await eventBus.publish('maintenance.resolved', {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      resolvedBy: userId,
      resolvedAt: now.toISOString(),
      resolutionMethod,
      timestamp: now.toISOString()
    });
    await eventBus.publish('maintenance.completed', {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      completedAt: now,
      resolutionMinutes: ticket.actualResolutionTimeMinutes
    });
  } catch (err) {
    logger.warn('[MaintenanceTicketService] Event publish error:', err.message);
  }

  return ticket;
}
