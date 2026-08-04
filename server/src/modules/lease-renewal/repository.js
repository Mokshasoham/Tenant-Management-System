import LeaseRenewal from './model.js';

/**
 * Repository layer for LeaseRenewal model.
 * Handles database read and write operations.
 */

export const findById = async (id) => {
  return await LeaseRenewal.findOne({ _id: id, isDeleted: false })
    .populate('lease tenant property manager');
};

export const findByLeaseId = async (leaseId) => {
  return await LeaseRenewal.find({ lease: leaseId, isDeleted: false })
    .populate('lease tenant property manager');
};

export const findPendingByLeaseId = async (leaseId) => {
  return await LeaseRenewal.findOne({
    lease: leaseId,
    status: { $in: ['requested', 'under_review', 'counter_offer', 'pending', 'approved'] },
    isDeleted: false
  });
};

export const findByTenantId = async (tenantId) => {
  return await LeaseRenewal.find({ tenant: tenantId, isDeleted: false })
    .populate('lease property manager')
    .sort({ createdAt: -1 });
};

export const findByManagerId = async (managerId) => {
  return await LeaseRenewal.find({ manager: managerId, isDeleted: false })
    .populate('lease tenant property manager')
    .sort({ createdAt: -1 });
};

export const save = async (leaseRenewal) => {
  return await leaseRenewal.save();
};

export const create = async (payload) => {
  return await LeaseRenewal.create(payload);
};

export const findPaginated = async ({ query = {}, page = 1, limit = 10, sort = 'createdAt', order = 'desc' }) => {
  const skip = (page - 1) * limit;
  const sortOrder = order === 'desc' ? -1 : 1;
  
  const records = await LeaseRenewal.find({ ...query, isDeleted: false })
    .populate('lease tenant property manager')
    .sort({ [sort]: sortOrder })
    .skip(skip)
    .limit(limit);
    
  const total = await LeaseRenewal.countDocuments({ ...query, isDeleted: false });
  return { records, total, page, limit };
};
