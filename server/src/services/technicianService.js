/**
 * server/src/services/technicianService.js
 * Service layer for Technician & Workforce Management.
 */

import technicianRepository from '../repositories/technicianRepository.js';
import Maintenance from '../models/Maintenance.js';
import eventBus from '../platform/events/eventBus.js';
import NotificationService from './NotificationService.js';
import { AppError } from '../utils/errorHandling.js';

export class TechnicianService {
  async getAllTechnicians(query = {}) {
    const { page = 1, limit = 50, status, search, skill } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter['technicianProfile.employmentStatus'] = status;
    if (skill) filter['technicianProfile.skills.name'] = new RegExp(skill, 'i');
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { 'technicianProfile.employeeId': new RegExp(search, 'i') }
      ];
    }

    const [technicians, total] = await Promise.all([
      technicianRepository.findWithFilters(filter, skip, Number(limit)),
      technicianRepository.countWithFilters(filter)
    ]);

    // Enhance technicians with live workload metrics
    const enhanced = await Promise.all(technicians.map(async (tech) => {
      const techObj = tech.toObject();
      const workload = await this.getTechnicianWorkload(tech._id);
      return { ...techObj, workload };
    }));

    return {
      technicians: enhanced,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getTechnicianById(id) {
    const tech = await technicianRepository.findById(id);
    if (!tech) throw new AppError('Technician not found', 404);

    const [workload, performance] = await Promise.all([
      this.getTechnicianWorkload(id),
      this.getTechnicianPerformance(id)
    ]);

    return {
      ...tech.toObject(),
      workload,
      performance
    };
  }

  async createTechnician(data, creatorId = null) {
    // Check for duplicate email
    if (data.email) {
      const existingUser = await technicianRepository.findByEmail(data.email);
      if (existingUser) {
        throw new AppError(`A user with email "${data.email}" already exists. Please use a unique email address.`, 400);
      }
    }

    // Check for duplicate employee ID
    const empId = data.employeeId || data.technicianProfile?.employeeId;
    if (empId) {
      const existingEmp = await technicianRepository.findByEmployeeId(empId);
      if (existingEmp) {
        throw new AppError(`Employee ID "${empId}" is already assigned to technician ${existingEmp.firstName} ${existingEmp.lastName}. Please use a unique Employee ID.`, 400);
      }
    }

    const crypto = await import('crypto');
    const sendEmail = (await import('../utils/sendEmail.js')).default;
    
    // Generate raw invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const hashedInvitationToken = crypto.createHash('sha256').update(invitationToken).digest('hex');
    
    // Temporary initial random password (will be reset during activation)
    const initialPassword = crypto.randomBytes(16).toString('hex');
    const { hashPassword } = await import('../utils/password.js');
    const hashedPassword = await hashPassword(initialPassword);

    const techPayload = {
      ...data,
      password: hashedPassword,
      technicianProfile: {
        ...(data.technicianProfile || {}),
        employeeId: data.employeeId || data.technicianProfile?.employeeId,
        invitationToken: hashedInvitationToken,
        invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days TTL
      }
    };

    const tech = await technicianRepository.create(techPayload, creatorId);

    // Build activation URL
    const appOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
    const activationUrl = `${appOrigin}/activate-account/${invitationToken}`;
    const emailMessage = `Hello ${tech.firstName},\n\nYou have been invited to join the Tenant Management System as a Field Technician.\nEmployee ID: ${tech.technicianProfile.employeeId}\n\nPlease click the link below to set your password and activate your account:\n\n${activationUrl}\n\nThis link will expire in 7 days.\n\nThank you!`;

    try {
      await sendEmail({
        email: tech.email,
        subject: 'Technician Account Invitation - Action Required',
        message: emailMessage
      });
    } catch (err) {
      console.warn(`[TechnicianService] Email sending failed: ${err.message}. Activation URL: ${activationUrl}`);
    }

    try {
      await eventBus.publish('technician.invited', {
        technicianId: tech._id,
        employeeId: tech.technicianProfile?.employeeId,
        createdBy: creatorId
      });
    } catch (err) {
      console.warn(`[TechnicianService] Event publish warning: ${err.message}`);
    }

    const techObj = tech.toObject ? tech.toObject() : tech;
    return {
      ...techObj,
      activationUrl,
      invitationToken
    };
  }

  async updateTechnician(id, data) {
    const updated = await technicianRepository.update(id, data);
    if (!updated) throw new AppError('Technician not found', 404);
    await eventBus.publish('technician.updated', { technicianId: id });
    return updated;
  }

  async deleteTechnician(id) {
    const deleted = await technicianRepository.delete(id);
    if (!deleted) throw new AppError('Technician not found', 404);
    await eventBus.publish('technician.deleted', { technicianId: id });
    return deleted;
  }

  async getTechnicianWorkload(id) {
    const [currentJobs, pendingJobs, completedToday] = await Promise.all([
      Maintenance.countDocuments({ assignedTo: id, status: { $in: ['in_progress', 'work_started', 'technician_en_route'] } }),
      Maintenance.countDocuments({ assignedTo: id, status: { $in: ['technician_assigned', 'visit_scheduled'] } }),
      Maintenance.countDocuments({
        assignedTo: id,
        status: { $in: ['completed', 'resolved', 'closed'] },
        updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);

    const totalJobs = currentJobs + pendingJobs;
    const utilization = Math.min(100, Math.round((totalJobs / 5) * 100));

    return {
      currentJobs,
      pendingJobs,
      completedToday,
      totalActiveJobs: totalJobs,
      utilizationPercent: utilization
    };
  }

  async getTechnicianPerformance(id) {
    const completedTickets = await Maintenance.find({
      assignedTo: id,
      status: { $in: ['completed', 'resolved', 'closed'] }
    });

    const totalCompleted = completedTickets.length;
    let avgResolutionMins = 0;
    if (totalCompleted > 0) {
      const sum = completedTickets.reduce((acc, t) => acc + (t.actualResolutionTimeMinutes || 60), 0);
      avgResolutionMins = Math.round(sum / totalCompleted);
    }

    const techUser = await technicianRepository.findById(id);
    const rating = techUser?.technicianProfile?.rating || 4.9;

    return {
      jobsCompleted: totalCompleted,
      avgResolutionTimeMins: avgResolutionMins,
      slaMetPercent: 98,
      firstTimeFixPercent: techUser?.technicianProfile?.firstTimeFixRate || 95,
      avgRating: rating,
      reopenedTickets: techUser?.technicianProfile?.reopenedTickets || 0,
      customerSatisfaction: 96
    };
  }

  async getAvailableTechnicians(skill) {
    const filter = {
      'technicianProfile.employmentStatus': 'active',
      'technicianProfile.availabilityStatus': 'free'
    };
    if (skill) filter['technicianProfile.skills.name'] = new RegExp(skill, 'i');

    const technicians = await technicianRepository.findWithFilters(filter);
    return await Promise.all(technicians.map(async t => {
      const workload = await this.getTechnicianWorkload(t._id);
      return { ...t.toObject(), workload };
    }));
  }
}

const technicianService = new TechnicianService();
export default technicianService;
