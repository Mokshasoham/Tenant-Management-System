/**
 * server/src/controllers/workforceSchedulingController.js
 * Controller for Workforce Scheduling, Auto-Assignment & Dispatch Board endpoints.
 */

import workforceSchedulingService from '../services/workforceSchedulingService.js';
import { asyncHandler } from '../utils/errorHandling.js';

export const getScheduleCalendar = asyncHandler(async (req, res) => {
  const calendar = await workforceSchedulingService.getScheduleCalendar(req.query);
  res.status(200).json({
    success: true,
    data: calendar
  });
});

export const createShift = asyncHandler(async (req, res) => {
  const shift = await workforceSchedulingService.createShift(req.body);
  res.status(201).json({
    success: true,
    message: 'Shift created successfully',
    data: shift
  });
});

export const detectConflicts = asyncHandler(async (req, res) => {
  const { technicianId, startDate, endDate } = req.body;
  const analysis = await workforceSchedulingService.detectConflicts(technicianId, startDate, endDate);
  res.status(200).json({
    success: true,
    data: analysis
  });
});

export const autoSuggestTechnician = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const suggestions = await workforceSchedulingService.autoSuggestTechnician(ticketId);
  res.status(200).json({
    success: true,
    data: suggestions
  });
});

export const dispatchTicket = asyncHandler(async (req, res) => {
  const { ticketId, technicianId, scheduledTime } = req.body;
  const result = await workforceSchedulingService.dispatchTicket(ticketId, technicianId, scheduledTime);
  res.status(200).json({
    success: true,
    message: 'Ticket dispatched successfully',
    data: result
  });
});

export const requestLeave = asyncHandler(async (req, res) => {
  const leave = await workforceSchedulingService.requestLeave(req.body);
  res.status(201).json({
    success: true,
    message: 'Leave request submitted successfully',
    data: leave
  });
});

export const approveLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { managerNote } = req.body;
  const leave = await workforceSchedulingService.approveLeave(id, managerNote);
  res.status(200).json({
    success: true,
    message: 'Leave request approved successfully',
    data: leave
  });
});
