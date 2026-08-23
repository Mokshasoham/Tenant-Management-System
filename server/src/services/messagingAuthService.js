import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';

export class MessagingAuthService {
  /**
   * Retrieves all authorized chat partners for a given user based on Property/Booking/Lease relationships.
   */
  async getAuthorizedPartners(userId, role) {
    if (!userId) return [];
    const isValidOid = mongoose.Types.ObjectId.isValid(String(userId));
    const userOid = isValidOid ? new mongoose.Types.ObjectId(String(userId)) : null;
    const userIds = [userId, userOid].filter(Boolean);

    // ADMIN: Can message anyone active
    if (role === 'admin') {
      const users = await User.find({ _id: { $nin: userIds }, isActive: { $ne: false } })
        .select('firstName lastName email role avatar')
        .lean();
      return users.map(u => ({
        ...u,
        propertyId: null,
        propertyName: 'Platform Administration',
        bookingId: null,
        bookingStatus: 'Active'
      }));
    }

    // MANAGER: Can only message tenants of manager's owned/managed properties who have a valid booking/lease
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

      // Find valid bookings on these properties
      const bookings = await Booking.find({
        $or: [
          { property: { $in: propIds } },
          { manager: { $in: userIds } }
        ],
        status: { $in: ['confirmed', 'active', 'completed', 'approved'] }
      })
      .populate('user', 'firstName lastName email role avatar')
      .populate('property', 'name title')
      .lean();

      // Find active leases on these properties
      const leases = await Lease.find({
        property: { $in: propIds },
        status: { $in: ['active', 'signed'] }
      })
      .populate('property', 'name title')
      .populate('tenant')
      .lean();

      const partnersMap = new Map();

      // Add from bookings
      for (const b of bookings) {
        if (!b.user) continue;
        const tenantUserId = String(b.user._id);
        if (tenantUserId === String(userId)) continue;
        if (!partnersMap.has(tenantUserId)) {
          const propName = b.property?.name || b.property?.title || propMap.get(String(b.property?._id || b.property)) || 'Managed Property';
          partnersMap.set(tenantUserId, {
            _id: b.user._id,
            firstName: b.user.firstName,
            lastName: b.user.lastName,
            email: b.user.email,
            role: b.user.role || 'tenant',
            avatar: b.user.avatar,
            propertyId: b.property?._id || b.property,
            propertyName: propName,
            bookingId: b._id,
            bookingStatus: b.status === 'confirmed' || b.status === 'active' ? 'Active Booking' : (b.status === 'approved' ? 'Approved Booking' : 'Past Booking')
          });
        }
      }

      // Add from leases
      for (const l of leases) {
        if (!l.tenant?.email) continue;
        const tenantUser = await User.findOne({ email: l.tenant.email.toLowerCase() })
          .select('firstName lastName email role avatar')
          .lean();
        if (tenantUser) {
          const tenantUserId = String(tenantUser._id);
          if (tenantUserId === String(userId)) continue;
          if (!partnersMap.has(tenantUserId)) {
            const propName = l.property?.name || l.property?.title || propMap.get(String(l.property?._id || l.property)) || 'Managed Property';
            partnersMap.set(tenantUserId, {
              _id: tenantUser._id,
              firstName: tenantUser.firstName,
              lastName: tenantUser.lastName,
              email: tenantUser.email,
              role: tenantUser.role || 'tenant',
              avatar: tenantUser.avatar,
              propertyId: l.property?._id || l.property,
              propertyName: propName,
              bookingId: null,
              leaseId: l._id,
              bookingStatus: 'Active Lease'
            });
          }
        }
      }

      return Array.from(partnersMap.values());
    }

    // TENANT / USER: Can only message managers of properties they have booked or leased
    if (role === 'tenant' || role === 'user') {
      const currentUser = await User.findById(userId).select('email').lean();
      const userEmail = currentUser?.email?.toLowerCase();

      // Find tenant's valid bookings
      const bookings = await Booking.find({
        user: { $in: userIds },
        status: { $in: ['confirmed', 'active', 'completed', 'approved'] }
      })
      .populate('manager', 'firstName lastName email role avatar')
      .populate('property', 'name title manager owner')
      .lean();

      // Find tenant's active leases
      let leaseManagers = [];
      if (userEmail) {
        const tenantRecords = await Tenant.find({ email: userEmail }).select('_id').lean();
        const tenantRecordIds = tenantRecords.map(t => t._id);
        if (tenantRecordIds.length > 0) {
          const leases = await Lease.find({
            tenant: { $in: tenantRecordIds },
            status: { $in: ['active', 'signed'] }
          })
          .populate({
            path: 'property',
            populate: { path: 'manager owner', select: 'firstName lastName email role avatar' }
          })
          .lean();

          for (const l of leases) {
            const propManager = l.property?.manager || l.property?.owner;
            if (propManager) {
              leaseManagers.push({
                manager: propManager,
                property: l.property,
                leaseId: l._id
              });
            }
          }
        }
      }

      const partnersMap = new Map();

      // Add from bookings
      for (const b of bookings) {
        let managerUser = b.manager;
        if (!managerUser && b.property) {
          managerUser = b.property.manager || b.property.owner;
          if (managerUser && (typeof managerUser === 'string' || mongoose.Types.ObjectId.isValid(String(managerUser)))) {
            managerUser = await User.findById(managerUser).select('firstName lastName email role avatar').lean();
          }
        }
        if (!managerUser) continue;
        const managerId = String(managerUser._id);
        if (managerId === String(userId)) continue;
        if (!partnersMap.has(managerId)) {
          const propName = b.property?.name || b.property?.title || 'Booked Property';
          partnersMap.set(managerId, {
            _id: managerUser._id,
            firstName: managerUser.firstName,
            lastName: managerUser.lastName,
            email: managerUser.email,
            role: managerUser.role || 'manager',
            avatar: managerUser.avatar,
            propertyId: b.property?._id || b.property,
            propertyName: propName,
            bookingId: b._id,
            bookingStatus: b.status === 'confirmed' || b.status === 'active' ? 'Active Booking' : (b.status === 'approved' ? 'Approved Booking' : 'Past Booking')
          });
        }
      }

      // Add from leases
      for (const lm of leaseManagers) {
        const managerId = String(lm.manager._id);
        if (managerId === String(userId)) continue;
        if (!partnersMap.has(managerId)) {
          const propName = lm.property?.name || lm.property?.title || 'Leased Property';
          partnersMap.set(managerId, {
            _id: lm.manager._id,
            firstName: lm.manager.firstName,
            lastName: lm.manager.lastName,
            email: lm.manager.email,
            role: lm.manager.role || 'manager',
            avatar: lm.manager.avatar,
            propertyId: lm.property?._id || lm.property,
            propertyName: propName,
            bookingId: null,
            leaseId: lm.leaseId,
            bookingStatus: 'Active Lease'
          });
        }
      }

      return Array.from(partnersMap.values());
    }

    return [];
  }

  /**
   * Verifies whether senderId and receiverId have an authorized relationship.
   * If propertyId is provided, also checks that the relationship is on that property.
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
      return { isAuthorized: false, reason: 'Forbidden: No active booking or lease relationship exists between these users.' };
    }

    // Cross-property check: If propertyId is provided, verify it matches
    if (propertyId) {
      const propMatches = partners.some(p => String(p._id) === String(receiverId) && String(p.propertyId) === String(propertyId));
      if (!propMatches) {
        return { isAuthorized: false, reason: 'Forbidden: Property does not match the authorized booking relationship.' };
      }
    }

    return {
      isAuthorized: true,
      propertyId: propertyId || matchedPartner.propertyId,
      bookingId: matchedPartner.bookingId,
      leaseId: matchedPartner.leaseId,
      partner: matchedPartner
    };
  }
}

const messagingAuthService = new MessagingAuthService();
export default messagingAuthService;
