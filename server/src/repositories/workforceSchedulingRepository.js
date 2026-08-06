/**
 * server/src/repositories/workforceSchedulingRepository.js
 * Repository layer for Workforce Scheduling & Shift Management.
 */

import ShiftSchedule from '../models/ShiftSchedule.js';

export class WorkforceSchedulingRepository {
  async create(data) {
    return await ShiftSchedule.create(data);
  }

  async findById(id) {
    return await ShiftSchedule.findById(id)
      .populate('technician', 'firstName lastName email technicianProfile')
      .populate('ticket', 'title category priority status property unit');
  }

  async findByRange(startDate, endDate, technicianId = null) {
    const query = {
      startDate: { $gte: new Date(startDate) },
      endDate: { $lte: new Date(endDate) }
    };
    if (technicianId) query.technician = technicianId;

    return await ShiftSchedule.find(query)
      .sort({ startDate: 1 })
      .populate('technician', 'firstName lastName email technicianProfile')
      .populate('ticket', 'title category priority status property unit');
  }

  async update(id, data) {
    return await ShiftSchedule.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async delete(id) {
    return await ShiftSchedule.findByIdAndDelete(id);
  }

  async checkConflicts(technicianId, startDate, endDate, excludeId = null) {
    const query = {
      technician: technicianId,
      $or: [
        { startDate: { $lt: new Date(endDate) }, endDate: { $gt: new Date(startDate) } }
      ]
    };
    if (excludeId) query._id = { $ne: excludeId };
    return await ShiftSchedule.find(query);
  }
}

const workforceSchedulingRepository = new WorkforceSchedulingRepository();
export default workforceSchedulingRepository;
