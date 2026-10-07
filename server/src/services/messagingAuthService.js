import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';
import { isLeaseAuthoritativelyActive } from '../utils/leaseLifecycle.js';

export class MessagingAuthService {
  /**
   * Retrieves all authorized chat partners for a given user based strictly on authoritative ACTIVE LEASES.
   * Business rule: Messaging is allowed ONLY when there is an active lease relationship.
   */
  async getAuthorizedPartners(userId, role) {
    if (!userId) return [];
    const isValidOid = mongoose.Types.ObjectId.isValid(String(userId));
    if (!isValidOid) return [];
    const userOid = new mongoose.Types.ObjectId(String(userId));
    const userIds = [userId, userOid];
    const now = new Date();

    // ADMIN: Can message anyone active for platform administration
    if (role === 'admin') {
      const users = await User.find({ _id: { $nin: userIds }, isActive: { $ne: false } })
        .select('firstName lastName email role avatar')
        .lean();
      return users.map(u => ({
        ...u,
        propertyId: null,
        propertyName: 'Platform Administration',
        activePropertyIds: [],
        leaseId: null,
        bookingStatus: 'Active'
      }));
    }

    // MANAGER: Can only message tenants of manager's owned/managed properties who have an authoritative ACTIVE lease
    if (role === 'manager') {
      const properties = await Property.find({
        $or: [
          { manager: { $in: userIds } },
          { owner: { $in: userIds } },
          { createdBy: { $in: userIds } }
        ]
      }).select('_id name title').lean();

      if (properties.length === 0) return [];
      const propIds = properties.map(p => p._id);
      const propMap = new Map();
      properties.forEach(p => propMap.set(String(p._id), p.name || p.title || 'Managed Property'));

      // Find active leases on these properties
      const rawLeases = await Lease.find({
        property: { $in: propIds },
        status: 'active'
      })
      .populate('property', 'name title')
      .populate('tenant')
      .lean();

      // Filter strictly by authoritative lease lifecycle engine
      const activeLeases = rawLeases.filter(l => isLeaseAuthoritativelyActive(l, now));

      const partnersMap = new Map();

      for (const l of activeLeases) {
        if (!l.tenant?.email) continue;
        const tenantUser = await User.findOne({ email: l.tenant.email.toLowerCase() })
          .select('firstName lastName email role avatar')
          .lean();
        if (tenantUser) {
          const tenantUserId = String(tenantUser._id);
          if (tenantUserId === String(userId)) continue;
          const propId = String(l.property?._id || l.property);
          const propName = l.property?.name || l.property?.title || propMap.get(propId) || 'Managed Property';

          if (!partnersMap.has(tenantUserId)) {
            partnersMap.set(tenantUserId, {
              _id: tenantUser._id,
              firstName: tenantUser.firstName,
              lastName: tenantUser.lastName,
              email: tenantUser.email,
              role: tenantUser.role || 'tenant',
              avatar: tenantUser.avatar,
              propertyId: l.property?._id || l.property,
              propertyName: propName,
              activePropertyIds: [propId],
              leaseId: l._id,
              bookingStatus: 'Active Lease'
            });
          } else {
            const existing = partnersMap.get(tenantUserId);
            if (!existing.activePropertyIds.includes(propId)) {
              existing.activePropertyIds.push(propId);
            }
          }
        }
      }

      return Array.from(partnersMap.values());
    }

    // TENANT / USER: Can only message managers of properties where they have an authoritative ACTIVE lease
    if (role === 'tenant' || role === 'user') {
      const currentUser = await User.findById(userId).select('email').lean();
      const userEmail = currentUser?.email?.toLowerCase();
      if (!userEmail) return [];

      const tenantRecords = await Tenant.find({ email: userEmail }).select('_id').lean();
      const tenantRecordIds = tenantRecords.map(t => t._id);
      if (tenantRecordIds.length === 0) return [];

      const rawLeases = await Lease.find({
        tenant: { $in: tenantRecordIds },
        status: 'active'
      })
      .populate({
        path: 'property',
        populate: { path: 'manager owner', select: 'firstName lastName email role avatar' }
      })
      .lean();

      // Filter strictly by authoritative lease lifecycle engine
      const activeLeases = rawLeases.filter(l => isLeaseAuthoritativelyActive(l, now));

      const partnersMap = new Map();

      for (const l of activeLeases) {
        let managerUser = l.property?.manager || l.property?.owner;
        if (!managerUser) continue;

        if (typeof managerUser === 'string' || mongoose.Types.ObjectId.isValid(String(managerUser._id || managerUser))) {
          if (!managerUser.email) {
            managerUser = await User.findById(managerUser._id || managerUser).select('firstName lastName email role avatar').lean();
          }
        }
        if (!managerUser) continue;
        const managerId = String(managerUser._id);
        if (managerId === String(userId)) continue;

        const propId = String(l.property?._id || l.property);
        const propName = l.property?.name || l.property?.title || 'Leased Property';

        if (!partnersMap.has(managerId)) {
          partnersMap.set(managerId, {
            _id: managerUser._id,
            firstName: managerUser.firstName,
            lastName: managerUser.lastName,
            email: managerUser.email,
            role: managerUser.role || 'manager',
            avatar: managerUser.avatar,
            propertyId: l.property?._id || l.property,
            propertyName: propName,
            activePropertyIds: [propId],
            leaseId: l._id,
            bookingStatus: 'Active Lease'
          });
        } else {
          const existing = partnersMap.get(managerId);
          if (!existing.activePropertyIds.includes(propId)) {
            existing.activePropertyIds.push(propId);
          }
        }
      }

      return Array.from(partnersMap.values());
    }

    return [];
  }

  /**
   * Verifies whether senderId and receiverId have an authorized ACTIVE LEASE relationship.
   * If propertyId is provided, also checks that the relationship matches that active property.
   */
  async verifyRelationship(senderId, receiverId, propertyId = null, senderRole = null) {
    if (!senderId || !receiverId) return { isAuthorized: false, reason: 'Sender and receiver are required.' };
    if (String(senderId) === String(receiverId)) return { isAuthorized: false, reason: 'Cannot message yourself.' };

    // Admin can always message
    if (senderRole === 'admin') {
      return { isAuthorized: true, propertyId };
    }

    const partners = await this.getAuthorizedPartners(senderId, senderRole);
    const matchedPartner = partners.find(p => String(p._id) === String(receiverId));

    if (!matchedPartner) {
      return { isAuthorized: false, reason: 'Forbidden: No active lease relationship exists between these users.' };
    }

    // Cross-property check: If propertyId is provided, verify it matches an authorized active property
    if (propertyId) {
      const targetPropId = String(propertyId);
      const propMatches = matchedPartner.activePropertyIds
        ? matchedPartner.activePropertyIds.includes(targetPropId)
        : String(matchedPartner.propertyId) === targetPropId;

      if (!propMatches) {
        return { isAuthorized: false, reason: 'Forbidden: Property does not match the active lease relationship.' };
      }
    }

    return {
      isAuthorized: true,
      propertyId: propertyId || matchedPartner.propertyId,
      leaseId: matchedPartner.leaseId,
      partner: matchedPartner
    };
  }
}

const messagingAuthService = new MessagingAuthService();
export default messagingAuthService;
