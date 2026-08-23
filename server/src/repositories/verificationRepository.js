import Verification from '../models/Verification.js';
import TrustScoreHistory from '../models/TrustScoreHistory.js';
import VerificationWorkflow from '../models/VerificationWorkflow.js';
import VerificationDocumentTemplate from '../models/VerificationDocumentTemplate.js';

export class VerificationRepository {
  // ── Verification CRUD ──────────────────────────────────────────

  async createVerification(data) {
    return await Verification.create(data);
  }

  async findById(id) {
    return await Verification.findOne({ _id: id, isDeleted: false })
      .populate('timeline.performedBy', 'firstName lastName email role')
      .populate('verifiedBy', 'firstName lastName email role')
      .populate('workflowId');
  }

  async findLatestByEntity(entityType, entityId) {
    return await Verification.findOne({
      entityType,
      entityId,
      isLatestVersion: true,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate('timeline.performedBy', 'firstName lastName email role')
      .populate('verifiedBy', 'firstName lastName email role')
      .populate('workflowId');
  }

  async findByVerificationNumber(verificationNumber) {
    return await Verification.findOne({
      verificationNumber,
      isDeleted: false,
    })
      .populate('timeline.performedBy', 'firstName lastName email role')
      .populate('verifiedBy', 'firstName lastName email role')
      .populate('workflowId');
  }

  async findHistoryByEntity(entityType, entityId) {
    return await Verification.find({
      entityType,
      entityId,
      isDeleted: false,
    })
      .sort({ submissionVersion: -1 })
      .populate('timeline.performedBy', 'firstName lastName email role')
      .populate('verifiedBy', 'firstName lastName email role');
  }

  async updateVerification(id, updateData) {
    return await Verification.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updateData },
      { new: true }
    )
      .populate('timeline.performedBy', 'firstName lastName email role')
      .populate('verifiedBy', 'firstName lastName email role');
  }

  async addTimelineEvent(id, timelineEvent) {
    return await Verification.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $push: { timeline: timelineEvent } },
      { new: true }
    );
  }

  async updateDocument(id, documentType, documentData) {
    return await Verification.findOneAndUpdate(
      { _id: id, 'documents.documentType': documentType, isDeleted: false },
      { $set: { 'documents.$': documentData } },
      { new: true }
    );
  }

  async softDeleteVerification(id, userId) {
    return await Verification.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      },
      { new: true }
    );
  }

  // ── Admin Queue & Analytics Queries ─────────────────────────────

  async findPendingQueue({ status, entityType, entityIds, isOverdue, slaStatus, search, page = 1, limit = 20 }) {
    const filter = { isDeleted: false };

    if (entityIds && Array.isArray(entityIds)) {
      filter.entityId = { $in: entityIds };
    }

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['SUBMITTED', 'DOCUMENTS_UPLOADED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'] };
    }

    if (entityType) {
      filter.entityType = entityType;
    }

    if (slaStatus) {
      filter['sla.slaStatus'] = slaStatus;
    }

    if (isOverdue !== undefined) {
      filter['sla.isOverdue'] = isOverdue;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { verificationNumber: searchRegex },
        { currentStep: searchRegex },
        { verificationLevel: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Verification.find(filter)
        .sort({ 'sla.isOverdue': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('entityId', 'firstName lastName email name address phone')
        .populate('verifiedBy', 'firstName lastName email'),
      Verification.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit) || 1,
        limit: Number(limit),
      },
    };
  }

  async countWithFilters(filter = {}) {
    return await Verification.countDocuments({ isDeleted: false, ...filter });
  }

  async getAdminStatsAggregates() {
    const activeFilter = { isDeleted: false };
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      total,
      pending,
      approved,
      rejected,
      approvedToday,
      rejectedToday,
      overdue,
      atRisk,
      manualReviewRequired,
    ] = await Promise.all([
      Verification.countDocuments(activeFilter),
      Verification.countDocuments({ ...activeFilter, status: { $in: ['SUBMITTED', 'DOCUMENTS_UPLOADED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'] } }),
      Verification.countDocuments({ ...activeFilter, status: 'APPROVED' }),
      Verification.countDocuments({ ...activeFilter, status: 'REJECTED' }),
      Verification.countDocuments({ ...activeFilter, status: 'APPROVED', verifiedAt: { $gte: todayStart } }),
      Verification.countDocuments({ ...activeFilter, status: 'REJECTED', rejectedAt: { $gte: todayStart } }),
      Verification.countDocuments({ ...activeFilter, 'sla.isOverdue': true }),
      Verification.countDocuments({ ...activeFilter, 'sla.slaStatus': 'AT_RISK' }),
      Verification.countDocuments({ ...activeFilter, manualReviewRequired: true }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      approvedToday,
      rejectedToday,
      overdue,
      atRisk,
      manualReviewRequired,
    };
  }

  // ── Trust Score History ─────────────────────────────────────────

  async createTrustHistory(trustData) {
    return await TrustScoreHistory.create(trustData);
  }

  async findTrustHistoryByEntity(entityType, entityId) {
    return await TrustScoreHistory.find({
      entityType,
      entityId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate('triggeredBy', 'firstName lastName email role');
  }

  async findLatestTrustHistory(entityType, entityId) {
    return await TrustScoreHistory.findOne({
      entityType,
      entityId,
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  // ── Workflows & Templates ───────────────────────────────────────

  async findWorkflowByType(workflowType) {
    return await VerificationWorkflow.findOne({
      workflowType,
      isActive: true,
      isDeleted: false,
    });
  }

  async findAllWorkflows() {
    return await VerificationWorkflow.find({ isDeleted: false }).sort({ workflowType: 1 });
  }

  async findDocumentTemplate(documentType) {
    return await VerificationDocumentTemplate.findOne({
      documentType,
      isEnabled: true,
      isDeleted: false,
    });
  }

  async findAllDocumentTemplates() {
    return await VerificationDocumentTemplate.find({ isDeleted: false }).sort({ category: 1, label: 1 });
  }
}

export default new VerificationRepository();
