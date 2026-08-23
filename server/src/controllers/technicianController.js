/**
 * server/src/controllers/technicianController.js
 * Controller for Technician & Workforce Management API endpoints.
 */

import technicianService from '../services/technicianService.js';
import { asyncHandler, AppError } from '../utils/errorHandling.js';

export const getAllTechnicians = asyncHandler(async (req, res) => {
  const query = { ...req.query };
  if (req.user?.role === 'manager') {
    query.managerId = req.user.userId || req.user._id || req.user.id;
  }
  const result = await technicianService.getAllTechnicians(query);
  res.status(200).json({
    success: true,
    data: result.technicians,
    pagination: result.pagination
  });
});

export const getTechnicianById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const technician = await technicianService.getTechnicianById(id);
  res.status(200).json({
    success: true,
    data: technician
  });
});

export const createTechnician = asyncHandler(async (req, res) => {
  const creatorId = req.user?.userId || req.user?.id || req.user?._id;
  const technician = await technicianService.createTechnician(req.body, creatorId);
  res.status(201).json({
    success: true,
    message: 'Technician created successfully and invitation email sent.',
    data: technician
  });
});

export const updateTechnician = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const technician = await technicianService.updateTechnician(id, req.body);
  res.status(200).json({
    success: true,
    message: 'Technician profile updated successfully',
    data: technician
  });
});

export const deleteTechnician = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await technicianService.deleteTechnician(id);
  res.status(200).json({
    success: true,
    message: 'Technician profile deleted successfully'
  });
});

export const getWorkload = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workload = await technicianService.getTechnicianWorkload(id);
  res.status(200).json({
    success: true,
    data: workload
  });
});

export const getPerformance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performance = await technicianService.getTechnicianPerformance(id);
  res.status(200).json({
    success: true,
    data: performance
  });
});

export const getAvailableTechnicians = asyncHandler(async (req, res) => {
  const { skill } = req.query;
  const technicians = await technicianService.getAvailableTechnicians(skill);
  res.status(200).json({
    success: true,
    data: technicians
  });
});

export const searchTechnicians = asyncHandler(async (req, res) => {
  const result = await technicianService.getAllTechnicians({ ...req.query, search: req.query.q });
  res.status(200).json({
    success: true,
    data: result.technicians
  });
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const techId = req.user.userId || req.user.id || req.user._id;
  const tech = await technicianService.getTechnicianById(techId);
  res.status(200).json({
    success: true,
    data: tech
  });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const techId = req.user.userId || req.user.id || req.user._id;
  // Block technician from self-updating forbidden fields
  const forbiddenFields = ['employeeId', 'verificationStatus', 'managerId', 'createdBy', 'role'];
  const updateData = { ...req.body };
  forbiddenFields.forEach(field => delete updateData[field]);
  if (updateData.technicianProfile) {
    forbiddenFields.forEach(field => delete updateData.technicianProfile[field]);
  }

  const updated = await technicianService.updateTechnician(techId, updateData);
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updated
  });
});

export const getMyJobs = asyncHandler(async (req, res) => {
  const techId = req.user.userId || req.user.id || req.user._id;
  const maintenanceRepository = (await import('../repositories/maintenanceRepository.js')).default;
  const filter = { assignedTo: techId, ...(req.query.status ? { status: req.query.status } : {}) };
  const jobs = await maintenanceRepository.findWithFilters(filter, 0, 100);
  res.status(200).json({
    success: true,
    data: jobs
  });
});

export const getMySchedule = asyncHandler(async (req, res) => {
  const techId = req.user.userId || req.user.id || req.user._id;
  const workforceSchedulingService = (await import('../services/workforceSchedulingService.js')).default;
  const calendar = await workforceSchedulingService.getScheduleCalendar({ technicianId: techId });
  res.status(200).json({
    success: true,
    data: calendar
  });
});

export const updateMyAvailability = asyncHandler(async (req, res) => {
  const techId = req.user.userId || req.user.id || req.user._id;
  const { availabilityStatus, liveStatus } = req.body;
  const updated = await technicianService.updateTechnician(techId, {
    'technicianProfile.availabilityStatus': availabilityStatus,
    ...(liveStatus ? { 'technicianProfile.liveStatus': liveStatus } : {})
  });
  
  const eventBus = (await import('../platform/events/eventBus.js')).default;
  await eventBus.publish('technician.availability.updated', {
    technicianId: techId,
    availabilityStatus,
    liveStatus
  });

  res.status(200).json({
    success: true,
    message: 'Availability status updated',
    data: updated
  });
});

export const getMyKPIs = asyncHandler(async (req, res) => {
  const techId = req.user.userId || req.user.id || req.user._id;
  const performance = await technicianService.getTechnicianPerformance(techId);
  const workload = await technicianService.getTechnicianWorkload(techId);
  res.status(200).json({
    success: true,
    data: { ...performance, workload }
  });
});

function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const checkInToJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, accuracy, allowedRadiusMeters = 100 } = req.body;
  const techId = req.user.userId || req.user.id || req.user._id;

  const Maintenance = (await import('../models/Maintenance.js')).default;
  const eventBus = (await import('../platform/events/eventBus.js')).default;

  const ticket = await Maintenance.findById(id).populate('property');
  if (!ticket) throw new AppError('Job ticket not found', 404);

  let propLat = ticket.property?.location?.lat;
  let propLng = ticket.property?.location?.lng;
  if (!propLat && ticket.property?.geo?.coordinates?.length === 2) {
    propLng = ticket.property.geo.coordinates[0];
    propLat = ticket.property.geo.coordinates[1];
  }

  let distanceFromProperty = null;
  let gpsVerificationStatus = 'GPS_UNAVAILABLE';
  let isGpsVerified = false;

  if (latitude && longitude && propLat && propLng) {
    distanceFromProperty = calculateHaversineDistanceMeters(latitude, longitude, propLat, propLng);
    if (distanceFromProperty !== null && distanceFromProperty <= allowedRadiusMeters) {
      gpsVerificationStatus = 'VERIFIED';
      isGpsVerified = true;
    } else {
      gpsVerificationStatus = 'OUTSIDE_RADIUS';
      isGpsVerified = false;
    }
  }

  ticket.checkIn = {
    time: new Date(),
    latitude,
    longitude,
    accuracy,
    propertyLatitude: propLat,
    propertyLongitude: propLng,
    distanceFromProperty,
    allowedRadiusMeters,
    isGpsVerified,
    gpsVerificationStatus
  };

  if (!ticket.fieldChecklist) ticket.fieldChecklist = {};
  ticket.fieldChecklist.arrived = { done: true, at: new Date() };

  if (['technician_assigned', 'visit_scheduled', 'technician_en_route', 'open'].includes(ticket.status)) {
    ticket.status = 'work_started';
    ticket.statusHistory.push({
      status: 'work_started',
      changedBy: techId,
      changedAt: new Date(),
      note: `Technician checked in. GPS status: ${gpsVerificationStatus}`
    });
  }

  await ticket.save();

  await eventBus.publish('technician.job.checked_in', {
    ticketId: id,
    technicianId: techId,
    checkInTime: ticket.checkIn.time,
    gpsVerificationStatus,
    distanceFromProperty
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: `Checked in successfully (${gpsVerificationStatus})`,
    data: ticket
  });
});

export const checkOutFromJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  const techId = req.user.userId || req.user.id || req.user._id;

  const Maintenance = (await import('../models/Maintenance.js')).default;
  const eventBus = (await import('../platform/events/eventBus.js')).default;

  const ticket = await Maintenance.findById(id);
  if (!ticket) throw new AppError('Job ticket not found', 404);

  const checkInTime = ticket.checkIn?.time ? new Date(ticket.checkIn.time) : new Date();
  const durationMinutes = Math.max(1, Math.round((Date.now() - checkInTime.getTime()) / 60000));

  ticket.checkOut = {
    time: new Date(),
    latitude,
    longitude,
    durationMinutes
  };

  if (!ticket.fieldChecklist) ticket.fieldChecklist = {};
  ticket.fieldChecklist.jobCompleted = { done: true, at: new Date() };

  ticket.actualResolutionTimeMinutes = durationMinutes;

  await ticket.save();

  await eventBus.publish('technician.job.checked_out', {
    ticketId: id,
    technicianId: techId,
    durationMinutes,
    checkOutTime: ticket.checkOut.time
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: `Checked out successfully (${durationMinutes} mins on site)`,
    data: ticket
  });
});

export const updateLocation = asyncHandler(async (req, res) => {
  const techId = req.user.userId || req.user.id || req.user._id;
  const { latitude, longitude, speed, heading, accuracy, batteryLevel } = req.body;

  const User = (await import('../models/User.js')).default;
  await User.findByIdAndUpdate(techId, {
    'technicianProfile.currentLatitude': latitude,
    'technicianProfile.currentLongitude': longitude,
    'technicianProfile.batteryLevel': batteryLevel,
    'technicianProfile.lastKnownLocation': `${latitude},${longitude}`,
    'technicianProfile.onlineStatus': 'online'
  });

  const eventBus = (await import('../platform/events/eventBus.js')).default;
  await eventBus.publish('technician.location.updated', {
    technicianId: techId,
    latitude,
    longitude,
    speed,
    heading,
    accuracy,
    batteryLevel,
    updatedAt: new Date().toISOString()
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: 'Location telemetry updated'
  });
});

export const lookupPropertyByQR = asyncHandler(async (req, res) => {
  const { qrCode } = req.query;
  if (!qrCode?.trim()) throw new AppError('qrCode query parameter is required', 400);

  const Maintenance = (await import('../models/Maintenance.js')).default;
  const Property = (await import('../models/Property.js')).default;

  // Search by unit number or title matching qrCode
  const property = await Property.findOne({
    $or: [
      { code: { $regex: qrCode, $options: 'i' } },
      { name: { $regex: qrCode, $options: 'i' } }
    ]
  });

  const filter = {
    $or: [
      { unit: { $regex: qrCode, $options: 'i' } },
      ...(property ? [{ property: property._id }] : [])
    ]
  };

  const tickets = await Maintenance.find(filter)
    .sort({ createdAt: -1 })
    .populate('assignedTo', 'name email technicianProfile')
    .populate('property', 'name address location')
    .limit(10);

  const pastRepairs = tickets.map(t => ({
    id: t._id,
    title: t.title,
    category: t.category,
    status: t.status,
    completedAt: t.completedAt || t.updatedAt,
    technicianName: t.assignedTo?.name || 'Unassigned',
    partsUsed: t.partsUsed || []
  }));

  const mockAssetInfo = {
    qrCode,
    assetName: `HVAC / Unit ${qrCode.replace(/[^0-9a-zA-Z]/g, '') || 'A-101'}`,
    installedDate: '2024-01-15',
    lastRepairDate: pastRepairs[0]?.completedAt || '2026-05-10',
    lastTechnician: pastRepairs[0]?.technicianName || 'Mike Johnson',
    warrantyStatus: 'Active (Expires Jan 2027)',
    manualPdfUrl: '/documents/equipment-manual-hvac-v1.pdf',
    pastRepairs,
    totalRepairsCount: pastRepairs.length,
    partsUsedHistory: pastRepairs.flatMap(p => p.partsUsed)
  };

  res.status(200).json({
    success: true,
    data: {
      qrCode,
      property: property || (tickets[0]?.property || null),
      assetInfo: mockAssetInfo,
      openTickets: tickets.filter(t => !['completed', 'closed', 'resolved', 'cancelled'].includes(t.status)),
      pastRepairs
    }
  });
});


