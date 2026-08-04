import LeaseRenewalCampaign from '../../models/LeaseRenewalCampaign.js';

export const create = async (payload) => {
  return await LeaseRenewalCampaign.create(payload);
};

export const findById = async (id) => {
  return await LeaseRenewalCampaign.findOne({ _id: id, isDeleted: false });
};

export const findByIdWithRelations = async (id) => {
  return await LeaseRenewalCampaign.findOne({ _id: id, isDeleted: false })
    .populate('lease tenant property manager');
};

export const findForDashboard = async (query = {}) => {
  return await LeaseRenewalCampaign.find({ ...query, isDeleted: false })
    .select('campaignNumber status priority riskScore expiryDate slaLimitDate slaStatus snapshot')
    .sort({ expiryDate: 1 });
};

export const update = async (id, updates, expectedVersion) => {
  const query = { _id: id, isDeleted: false };
  if (expectedVersion !== undefined) {
    query.version = expectedVersion;
  }
  
  const updatedDoc = await LeaseRenewalCampaign.findOneAndUpdate(
    query,
    { $set: updates, $inc: { version: 1 } },
    { new: true }
  );

  if (!updatedDoc && expectedVersion !== undefined) {
    const exists = await LeaseRenewalCampaign.findById(id);
    if (exists) {
      throw new Error('Version conflict detected: Document modified by another session.');
    }
  }

  return updatedDoc;
};

export const findPaginated = async ({ 
  page = 1, 
  limit = 10, 
  sort = 'createdAt', 
  order = 'desc',
  filters = {}
}) => {
  const skip = (page - 1) * limit;
  const sortOrder = order === 'desc' ? -1 : 1;

  const records = await LeaseRenewalCampaign.find({ ...filters, isDeleted: false })
    .populate('lease tenant property manager')
    .sort({ [sort]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await LeaseRenewalCampaign.countDocuments({ ...filters, isDeleted: false });
  return { records, total, page, limit };
};
