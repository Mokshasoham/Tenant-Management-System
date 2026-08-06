/**
 * server/src/repositories/maintenanceRepository.js
 *
 * Repository Layer for Maintenance Model.
 * Provides abstracted data access methods for Maintenance requests and attachments.
 */

import Maintenance from '../models/Maintenance.js';

export class MaintenanceRepository {
  async create(data) {
    return await Maintenance.create(data);
  }

  async findById(id) {
    return await Maintenance.findById(id)
      .populate('requestedBy', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName email')
      .populate('property', 'name address')
      .populate('notes.addedBy', 'firstName lastName role');
  }

  async update(id, data) {
    return await Maintenance.findByIdAndUpdate(id, data, { new: true })
      .populate('requestedBy', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName email')
      .populate('property', 'name address');
  }

  async appendAttachment(id, attachmentData) {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $push: {
          attachments: attachmentData,
          images: attachmentData.url
        }
      },
      { new: true }
    );
  }

  async deleteAttachment(id, attachmentUrl) {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $pull: {
          attachments: { url: attachmentUrl },
          images: attachmentUrl
        }
      },
      { new: true }
    );
  }

  async findWithFilters(filter = {}, skip = 0, limit = 20) {
    return await Maintenance.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('requestedBy', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName')
      .populate('property', 'name address');
  }

  async countWithFilters(filter = {}) {
    return await Maintenance.countDocuments(filter);
  }

  async aggregateByPriority(filter = {}) {
    return await Maintenance.aggregate([
      { $match: { ...filter, status: { $in: ['open', 'in_progress'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
  }

  async delete(id) {
    return await Maintenance.findByIdAndDelete(id);
  }
}

const maintenanceRepositorySingleton = new MaintenanceRepository();
export default maintenanceRepositorySingleton;
