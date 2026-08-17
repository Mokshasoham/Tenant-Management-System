/**
 * server/src/repositories/maintenanceRepository.js
 *
 * Repository Layer for Maintenance Model.
 * Provides abstracted data access methods for Maintenance requests, status transitions, comments, and ratings.
 */

import Maintenance from '../models/Maintenance.js';

export class MaintenanceRepository {
  async create(data) {
    const doc = await Maintenance.create(data);
    // Push initial status history entry
    doc.statusHistory.push({
      status: doc.status || 'open',
      changedBy: doc.requestedBy,
      changedAt: doc.createdAt || new Date(),
      note: 'Ticket Submitted'
    });
    await doc.save();
    return doc;
  }

  async findById(id) {
    return await Maintenance.findById(id)
      .populate('requestedBy', 'firstName lastName email role phone')
      .populate('assignedTo', 'firstName lastName email role phone rating experience')
      .populate('property', 'name address')
      .populate('lease', 'leaseNumber startDate endDate status')
      .populate('notes.addedBy', 'firstName lastName role')
      .populate('internalNotes.addedBy', 'firstName lastName role')
      .populate('statusHistory.changedBy', 'firstName lastName role')
      .populate('auditTrail.changedBy', 'firstName lastName role');
  }

  async update(id, data) {
    return await Maintenance.findByIdAndUpdate(id, data, { new: true })
      .populate('requestedBy', 'firstName lastName email role phone')
      .populate('assignedTo', 'firstName lastName email role phone rating experience')
      .populate('property', 'name address')
      .populate('lease', 'leaseNumber startDate endDate status')
      .populate('notes.addedBy', 'firstName lastName role')
      .populate('internalNotes.addedBy', 'firstName lastName role')
      .populate('statusHistory.changedBy', 'firstName lastName role')
      .populate('auditTrail.changedBy', 'firstName lastName role');
  }

  async addStatusHistory(id, status, changedBy, note = '') {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            changedBy,
            changedAt: new Date(),
            note
          }
        }
      },
      { new: true }
    )
      .populate('requestedBy', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName email role')
      .populate('statusHistory.changedBy', 'firstName lastName role');
  }

  async addComment(id, text, addedBy, attachmentUrl = null) {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $push: {
          notes: {
            text,
            addedBy,
            addedAt: new Date(),
            attachmentUrl
          }
        }
      },
      { new: true }
    ).populate('notes.addedBy', 'firstName lastName role');
  }

  async addInternalNote(id, text, addedBy, attachmentUrl = null) {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $push: {
          internalNotes: {
            text,
            addedBy,
            addedAt: new Date(),
            attachmentUrl
          }
        }
      },
      { new: true }
    ).populate('internalNotes.addedBy', 'firstName lastName role');
  }

  async addAuditLog(id, field, oldValue, newValue, changedBy) {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $push: {
          auditTrail: {
            field,
            oldValue: String(oldValue || ''),
            newValue: String(newValue || ''),
            changedBy,
            changedAt: new Date()
          }
        }
      },
      { new: true }
    ).populate('auditTrail.changedBy', 'firstName lastName role');
  }

  async updateCostTracking(id, costData) {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $set: {
          costTracking: costData,
          estimatedCost: costData.estimated || 0,
          actualCost: costData.actual || 0
        }
      },
      { new: true }
    );
  }

  async escalateTicket(id, reason) {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $set: {
          isEscalated: true,
          escalationReason: reason,
          priority: 'emergency'
        }
      },
      { new: true }
    );
  }

  async mergeTicket(id, targetId) {
    return await Maintenance.findByIdAndUpdate(
      id,
      {
        $set: {
          mergedInto: targetId,
          status: 'closed'
        }
      },
      { new: true }
    );
  }

  async addRating(id, ratingData) {
    const { score, rating, feedback, comment, tags, wouldRecommend, submittedBy } = ratingData || {};
    const finalScore = Number(rating || score || 5);
    const finalComment = String(comment || feedback || '').trim();
    const finalTags = Array.isArray(tags) ? tags : [];

    const ratingObj = {
      score: finalScore,
      rating: finalScore,
      feedback: finalComment,
      comment: finalComment,
      tags: finalTags,
      wouldRecommend: typeof wouldRecommend === 'boolean' ? wouldRecommend : true,
      submittedBy: submittedBy || undefined,
      ratedAt: new Date(),
      submittedAt: new Date()
    };

    return await Maintenance.findByIdAndUpdate(
      id,
      { $set: { rating: ratingObj } },
      { new: true }
    )
      .populate('requestedBy', 'firstName lastName email role phone')
      .populate('assignedTo', 'firstName lastName email role phone rating experience')
      .populate('property', 'name address city');
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
      .populate('assignedTo', 'firstName lastName role rating experience phone')
      .populate('property', 'name address')
      .populate('lease', 'leaseNumber startDate endDate status');
  }

  async countWithFilters(filter = {}) {
    return await Maintenance.countDocuments(filter);
  }

  async aggregateByPriority(filter = {}) {
    return await Maintenance.aggregate([
      { $match: { ...filter, status: { $in: ['open', 'submitted', 'in_progress', 'visit_scheduled', 'technician_assigned'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
  }

  async delete(id) {
    return await Maintenance.findByIdAndDelete(id);
  }
}

const maintenanceRepositorySingleton = new MaintenanceRepository();
export default maintenanceRepositorySingleton;
