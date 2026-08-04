import LeaseRenewalCampaign from '../../models/LeaseRenewalCampaign.js';

export const create = async (payload, options = {}) => {
  if (options.session) {
    const docs = await LeaseRenewalCampaign.create([payload], { session: options.session });
    return docs[0];
  }
  return await LeaseRenewalCampaign.create(payload);
};

export const findById = async (id, options = {}) => {
  return await LeaseRenewalCampaign.findOne({ _id: id, isDeleted: false }, null, { session: options.session });
};

export const findByIdWithRelations = async (id, options = {}) => {
  return await LeaseRenewalCampaign.findOne({ _id: id, isDeleted: false }, null, { session: options.session })
    .populate('lease tenant property manager');
};

export const findForDashboard = async (query = {}, options = {}) => {
  return await LeaseRenewalCampaign.find({ ...query, isDeleted: false }, null, { session: options.session })
    .select('campaignNumber status priority riskScore expiryDate slaLimitDate slaStatus snapshot')
    .sort({ expiryDate: 1 });
};

export const update = async (id, updates, expectedVersion, options = {}) => {
  const query = { _id: id, isDeleted: false };
  if (expectedVersion !== undefined) {
    query.version = expectedVersion;
  }
  
  const updatedDoc = await LeaseRenewalCampaign.findOneAndUpdate(
    query,
    { $set: updates, $inc: { version: 1 } },
    { new: true, session: options.session }
  );

  if (!updatedDoc && expectedVersion !== undefined) {
    const exists = await LeaseRenewalCampaign.findById(id, null, { session: options.session });
    if (exists) {
      throw new Error('Version conflict detected: Document modified by another session.');
    }
  }

  return updatedDoc;
};

/**
 * Perform an atomic status transition query-and-update.
 * Prevents double-processing and race conditions.
 *
 * @param {string} id                           - Campaign ID
 * @param {string|string[]} currentStatuses    - Allowed status(es) to transition from
 * @param {string} nextStatus                   - Target status
 * @param {object} [updates={}]                 - Extra field updates (e.g. lifecycle fields)
 * @param {object} [options={}]                 - Mongoose options (e.g. session)
 * @returns {Promise<object|null>} Updated document or null if condition wasn't met
 */
export const transitionIfCurrentStatus = async (id, currentStatuses, nextStatus, updates = {}, options = {}) => {
  const validCurrent = Array.isArray(currentStatuses) ? currentStatuses : [currentStatuses];
  
  return await LeaseRenewalCampaign.findOneAndUpdate(
    {
      _id: id,
      status: { $in: validCurrent },
      isDeleted: false
    },
    {
      $set: {
        status: nextStatus,
        lastActivityAt: new Date(),
        ...updates
      },
      $inc: { version: 1 }
    },
    { new: true, session: options.session }
  );
};

export const findPaginated = async ({ 
  page = 1, 
  limit = 10, 
  sort = 'createdAt', 
  order = 'desc',
  filters = {}
}, options = {}) => {
  const skip = (page - 1) * limit;
  const sortOrder = order === 'desc' ? -1 : 1;

  const records = await LeaseRenewalCampaign.find({ ...filters, isDeleted: false }, null, { session: options.session })
    .populate('lease tenant property manager')
    .sort({ [sort]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await LeaseRenewalCampaign.countDocuments({ ...filters, isDeleted: false }, null, { session: options.session });
  return { records, total, page, limit };
};
