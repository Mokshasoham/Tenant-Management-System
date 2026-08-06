/**
 * server/src/services/workforceSchedulingService.js
 * Service layer for Workforce Scheduling, Auto-Assignment Engine, Conflict Detection & Calendar Management.
 */

import workforceSchedulingRepository from '../repositories/workforceSchedulingRepository.js';
import technicianService from './technicianService.js';
import Maintenance from '../models/Maintenance.js';
import User from '../models/User.js';
import eventBus from '../platform/events/eventBus.js';
import NotificationService from './NotificationService.js';
import { AppError } from '../utils/errorHandling.js';

export class WorkforceSchedulingService {
  async getScheduleCalendar(query = {}) {
    const { startDate = new Date(Date.now() - 7 * 86400000), endDate = new Date(Date.now() + 30 * 86400000), technicianId } = query;
    return await workforceSchedulingRepository.findByRange(startDate, endDate, technicianId);
  }

  async createShift(data) {
    // 5. Conflict Detection
    const conflicts = await workforceSchedulingRepository.checkConflicts(data.technician, data.startDate, data.endDate);
    if (conflicts.length > 0) {
      throw new AppError(`Schedule Conflict Detected: Technician already has ${conflicts.length} overlapping shift/leave entry.`, 400);
    }

    const shift = await workforceSchedulingRepository.create(data);
    await eventBus.publish('workforce.shift.created', { shiftId: shift._id, technicianId: data.technician });
    return shift;
  }

  async detectConflicts(technicianId, startDate, endDate) {
    const conflicts = await workforceSchedulingRepository.checkConflicts(technicianId, startDate, endDate);
    const tech = await User.findById(technicianId);
    const workload = await technicianService.getTechnicianWorkload(technicianId);

    const warnings = [];
    if (conflicts.length > 0) {
      warnings.push(`Overlap Warning: ${conflicts.length} existing shift(s)/leave request(s) during this slot.`);
    }
    if (workload.currentJobs >= (tech?.technicianProfile?.maxCapacity || 5)) {
      warnings.push(`Capacity Warning: Technician is at maximum workload (${workload.currentJobs}/${tech?.technicianProfile?.maxCapacity || 5}).`);
    }

    return {
      hasConflict: warnings.length > 0,
      warnings,
      overlappingSchedules: conflicts
    };
  }

  async autoSuggestTechnician(ticketId) {
    const ticket = await Maintenance.findById(ticketId);
    if (!ticket) throw new AppError('Ticket not found', 404);

    const availableTechs = await User.find({
      role: 'technician',
      'technicianProfile.employmentStatus': 'active'
    });

    const scored = await Promise.all(availableTechs.map(async (tech) => {
      const workload = await technicianService.getTechnicianWorkload(tech._id);
      const profile = tech.technicianProfile || {};
      
      let score = 50; // base score

      // Skill match (+30)
      const hasSkill = profile.skills?.some(s => new RegExp(ticket.category, 'i').test(s.name));
      if (hasSkill) score += 30;

      // Rating (+20 max)
      score += (profile.rating || 4.5) * 4;

      // Workload capacity penalty (-15 per job)
      score -= (workload.currentJobs || 0) * 15;

      return {
        technician: {
          _id: tech._id,
          name: `${tech.firstName} ${tech.lastName}`,
          rating: profile.rating || 4.9,
          employeeId: profile.employeeId
        },
        workload,
        score: Math.max(0, score),
        recommendationReason: hasSkill
          ? `High skill match for ${ticket.category} with ${workload.currentJobs} active jobs.`
          : `General technician with capacity (${workload.currentJobs} active jobs).`
      };
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  async dispatchTicket(ticketId, technicianId, scheduledTime = new Date()) {
    const ticket = await Maintenance.findById(ticketId);
    if (!ticket) throw new AppError('Maintenance ticket not found', 404);

    ticket.assignedTo = technicianId;
    ticket.status = 'technician_assigned';
    ticket.statusHistory.push({
      status: 'technician_assigned',
      note: `Dispatched to technician via Workforce Dispatch Engine.`,
      updatedAt: new Date()
    });
    await ticket.save();

    // Create schedule dispatch entry
    const dispatchEntry = await workforceSchedulingRepository.create({
      technician: technicianId,
      ticket: ticketId,
      type: 'dispatch',
      title: `Visit: ${ticket.title}`,
      startDate: scheduledTime,
      endDate: new Date(new Date(scheduledTime).getTime() + 2 * 3600000),
      travelTimeMinutes: 20,
      distanceKm: 4.5
    });

    await eventBus.publish('workforce.dispatched', { ticketId, technicianId });

    return { ticket, dispatchEntry };
  }

  async requestLeave(data) {
    const leave = await workforceSchedulingRepository.create({
      ...data,
      type: 'leave',
      title: `Leave: ${data.leaveType?.toUpperCase() || 'ANNUAL'}`,
      leaveStatus: 'pending'
    });

    await NotificationService.notify({
      recipient: data.technician,
      type: 'LEAVE_REQUESTED',
      title: 'Leave Request Submitted',
      message: `Your ${data.leaveType} leave request has been submitted for manager approval.`
    });

    return leave;
  }

  async approveLeave(leaveId, managerNote = '') {
    const leave = await workforceSchedulingRepository.update(leaveId, { leaveStatus: 'approved', managerNote });
    if (!leave) throw new AppError('Leave request not found', 404);

    await NotificationService.notify({
      recipient: leave.technician,
      type: 'LEAVE_APPROVED',
      title: 'Leave Approved',
      message: `Your leave request for ${leave.title} has been approved.`
    });

    return leave;
  }
}

const workforceSchedulingService = new WorkforceSchedulingService();
export default workforceSchedulingService;
