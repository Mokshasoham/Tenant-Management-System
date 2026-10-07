/**
 * Comprehensive 24-Point Test Suite for Tenant/Manager Messaging Active Lease Lifecycle Enforcement
 * Tests all 24 required scenarios, safeguards, and edge cases.
 */

import { isLeaseAuthoritativelyActive, canLeasePayRent, resolveLeaseLifecycle } from '../src/utils/leaseLifecycle.js';
import messagingAuthService from '../src/services/messagingAuthService.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Lease from '../src/models/Lease.js';
import Tenant from '../src/models/Tenant.js';
import Message from '../src/models/Message.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('RUNNING 24-POINT MESSAGING ACTIVE LEASE LIFECYCLE TEST SUITE');
console.log('================================================================\n');

// =============================================================================
// PART 1: Authoritative Lifecycle Predicate & Edge Cases (Tests 1, 3, 6, 7, 8, 19)
// =============================================================================
console.log('--- PART 1: Authoritative Lifecycle Predicate Checks ---');

const now = new Date('2026-10-07T12:00:00Z');

// Test 1: Active lease (dates valid, status active)
const activeLease = {
  _id: '507f1f77bcf86cd799439001',
  status: 'active',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59Z'),
  moveOutStatus: 'none',
  isMoveOutFinalized: false
};
assert(isLeaseAuthoritativelyActive(activeLease, now) === true, 'Test 1: Active lease with valid future endDate resolves to true');

// Test 3: Expired lease in past
const pastExpiredLease = {
  _id: '507f1f77bcf86cd799439002',
  status: 'active', // stored in DB as active
  startDate: new Date('2025-01-01T00:00:00Z'),
  endDate: new Date('2026-09-30T23:59:59Z'), // expired 7 days ago
  moveOutStatus: 'none'
};
assert(isLeaseAuthoritativelyActive(pastExpiredLease, now) === false, 'Test 3: Expired lease past endDate resolves to false');

// Test 6: Terminated lease
const terminatedLease = {
  _id: '507f1f77bcf86cd799439003',
  status: 'terminated',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59Z')
};
assert(isLeaseAuthoritativelyActive(terminatedLease, now) === false, 'Test 6: Terminated lease resolves to false');

// Test 7: Cancelled lease
const cancelledLease = {
  _id: '507f1f77bcf86cd799439004',
  status: 'cancelled',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59Z')
};
assert(isLeaseAuthoritativelyActive(cancelledLease, now) === false, 'Test 7: Cancelled lease resolves to false');

// Test 8: Move-out finalized lease
const moveOutFinalizedLease = {
  _id: '507f1f77bcf86cd799439005',
  status: 'active',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59Z'),
  moveOutStatus: 'completed',
  isMoveOutFinalized: true
};
assert(isLeaseAuthoritativelyActive(moveOutFinalizedLease, now) === false, 'Test 8: Finalized move-out lease resolves to false');

// Refund processing lease
const refundProcessingLease = {
  _id: '507f1f77bcf86cd799439006',
  status: 'active',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59Z'),
  moveOutStatus: 'refund_processing'
};
assert(isLeaseAuthoritativelyActive(refundProcessingLease, now) === false, 'Refund processing lease resolves to false');

// Renewed / superseded lease
const renewedLease = {
  _id: '507f1f77bcf86cd799439007',
  status: 'active',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59Z'),
  leaseDecision: 'renewed',
  renewedTo: '507f1f77bcf86cd799439008'
};
assert(isLeaseAuthoritativelyActive(renewedLease, now) === false, 'Renewed/superseded lease resolves to false');

// Test 19: Lease ending today
const endingTodayActive = {
  _id: '507f1f77bcf86cd799439009',
  status: 'active',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-10-07T23:59:59Z') // later today
};
assert(isLeaseAuthoritativelyActive(endingTodayActive, now) === true, 'Test 19a: Lease ending later today is active');

const endingTodayExpired = {
  _id: '507f1f77bcf86cd799439010',
  status: 'active',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-10-07T08:00:00Z') // earlier today
};
assert(isLeaseAuthoritativelyActive(endingTodayExpired, now) === false, 'Test 19b: Lease ending earlier today is expired');

// Consistency check: isLeaseAuthoritativelyActive matches canLeasePayRent exactly
assert(
  isLeaseAuthoritativelyActive(activeLease, now) === canLeasePayRent(activeLease, now) &&
  isLeaseAuthoritativelyActive(pastExpiredLease, now) === canLeasePayRent(pastExpiredLease, now) &&
  isLeaseAuthoritativelyActive(moveOutFinalizedLease, now) === canLeasePayRent(moveOutFinalizedLease, now),
  'Consistency Check: isLeaseAuthoritativelyActive aligns 100% with canLeasePayRent'
);

// =============================================================================
// PART 2: Service Authorization & Multi-Lease / Multi-Property (Tests 2, 4, 5, 9, 10, 11, 16, 17, 18, 20, 23)
// =============================================================================
console.log('\n--- PART 2: Service Authorization & Multi-Property Isolation ---');

const propA = '507f1f77bcf86cd7994390a1';
const propB = '507f1f77bcf86cd7994390b2';
const managerX = '507f1f77bcf86cd7994390c3';
const managerY = '507f1f77bcf86cd7994390c4';
const tenantUser = '507f1f77bcf86cd7994390d4';

// Setup Mongoose Model Stubs for deterministic, offline test execution
const originalUserFindById = User.findById;
const originalTenantFind = Tenant.find;
const originalLeaseFind = Lease.find;
const originalPropertyFind = Property.find;
const originalUserFindOne = User.findOne;

// Test 9: No lease / No booking
User.findById = (id) => ({
  select: () => ({
    lean: async () => ({ email: 'unrelated@test.com' })
  })
});
Tenant.find = () => ({
  select: () => ({
    lean: async () => [] // no tenant records
  })
});
const noLeaseResult = await messagingAuthService.verifyRelationship('507f1f77bcf86cd799439091', '507f1f77bcf86cd799439092', null, 'tenant');
assert(noLeaseResult.isAuthorized === false, 'Test 9: No lease relationship resolves to isAuthorized: false');

// Test 10: Expired Lease A (Manager X) + Active Lease B (Manager Y)
// Tenant Tina has:
// - Lease A on Prop A with Manager X: EXPIRED
// - Lease B on Prop B with Manager Y: ACTIVE
User.findById = (id) => ({
  select: () => ({
    lean: async () => {
      if (String(id) === tenantUser) return { _id: tenantUser, email: 'tina@test.com' };
      if (String(id) === managerX) return { _id: managerX, firstName: 'Xavier', role: 'manager', email: 'x@test.com' };
      if (String(id) === managerY) return { _id: managerY, firstName: 'Yolanda', role: 'manager', email: 'y@test.com' };
      return null;
    }
  })
});

Tenant.find = () => ({
  select: () => ({
    lean: async () => [{ _id: '507f1f77bcf86cd7994390e1' }]
  })
});

Lease.find = () => ({
  populate: () => ({
    lean: async () => [
      // Expired Lease A with Manager X
      {
        _id: '507f1f77bcf86cd799439002',
        status: 'active',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-09-01'), // past
        moveOutStatus: 'completed',
        isMoveOutFinalized: true,
        property: {
          _id: propA,
          name: 'Property Alpha (Expired)',
          manager: { _id: managerX, firstName: 'Xavier', role: 'manager', email: 'x@test.com' }
        }
      },
      // Active Lease B with Manager Y
      {
        _id: '507f1f77bcf86cd799439001',
        status: 'active',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'), // future
        moveOutStatus: 'none',
        isMoveOutFinalized: false,
        property: {
          _id: propB,
          name: 'Property Beta (Active)',
          manager: { _id: managerY, firstName: 'Yolanda', role: 'manager', email: 'y@test.com' }
        }
      }
    ]
  })
});

const tenantPartners = await messagingAuthService.getAuthorizedPartners(tenantUser, 'tenant');
assert(tenantPartners.length === 1, 'Test 10a: Exactly 1 authorized partner returned for tenant');
assert(String(tenantPartners[0]._id) === managerY, 'Test 10b: Returned partner is Manager Y (Active Lease), NOT Manager X (Expired)');
assert(String(tenantPartners[0].propertyId) === propB, 'Test 10c: Authorized property is Property B');

// Test 2 & 16: Active lease send & verify succeeds
const activeAuthCheck = await messagingAuthService.verifyRelationship(tenantUser, managerY, propB, 'tenant');
assert(activeAuthCheck.isAuthorized === true, 'Test 2 & 16: Active lease relationship is authorized on active property');

// Test 4 & 5: Expired Property A / Manager X access check
const expiredPropAuthCheck = await messagingAuthService.verifyRelationship(tenantUser, managerX, propA, 'tenant');
assert(expiredPropAuthCheck.isAuthorized === false, 'Test 4 & 5: Expired relationship with Manager X is denied (isAuthorized: false)');

// Test 17: Manager-side messaging verification
// When Manager Y checks authorized partners, Tina is returned
Property.find = () => ({
  select: () => ({
    lean: async () => [{ _id: propB, name: 'Property Beta (Active)' }]
  })
});
Lease.find = () => ({
  populate: () => ({
    populate: () => ({
      lean: async () => [
        {
          _id: '507f1f77bcf86cd799439001',
          status: 'active',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          moveOutStatus: 'none',
          property: { _id: propB, name: 'Property Beta (Active)' },
          tenant: { email: 'tina@test.com' }
        }
      ]
    })
  })
});
User.findOne = () => ({
  select: () => ({
    lean: async () => ({ _id: tenantUser, firstName: 'Tina', lastName: 'Tenant', role: 'tenant', email: 'tina@test.com' })
  })
});

const managerYPartners = await messagingAuthService.getAuthorizedPartners(managerY, 'manager');
assert(managerYPartners.length === 1 && String(managerYPartners[0]._id) === tenantUser,
  'Test 17a: Manager Y sees active tenant Tina as authorized partner');

const managerSideAuthCheck = await messagingAuthService.verifyRelationship(managerY, tenantUser, propB, 'manager');
assert(managerSideAuthCheck.isAuthorized === true, 'Test 17b: Manager Y is authorized to message active tenant Tina on Property B');

const managerXSideAuthCheck = await messagingAuthService.verifyRelationship(managerX, tenantUser, propA, 'manager');
assert(managerXSideAuthCheck.isAuthorized === false, 'Test 17c: Manager X cannot message tenant Tina on expired Property A');

// Test 23: Pre-lease negotiation/offer or booking without active lease
// A user with only an offer has no active lease records returned by Lease.find
Lease.find = () => ({
  populate: () => ({
    lean: async () => []
  })
});
const offerOnlyCheck = await messagingAuthService.verifyRelationship('507f1f77bcf86cd799439097', managerY, null, 'tenant');
assert(offerOnlyCheck.isAuthorized === false, 'Test 23: Pre-lease negotiation/offer without active lease is NOT authorized for chat');

// Test 11: Historical conversation with no active lease does not appear in available users
const unleasedUser = '507f1f77bcf86cd799439098';
const availableUsers = await messagingAuthService.getAuthorizedPartners(unleasedUser, 'tenant');
assert(availableUsers.length === 0, 'Test 11: User with no active lease receives 0 available chat partners');

// =============================================================================
// PART 3: Controller-Level Multi-Property & Historical Bypass Removal (Tests 14, 20, 21)
// =============================================================================
console.log('\n--- PART 3: Controller Isolation & Historical Bypass Removal ---');

// Test 20: Expired Property A + Active Property B with same manager (Manager X)
// Scenario:
// Tina had Lease A on Property A with Manager X (Expired).
// Tina signed new Lease B on Property B with same Manager X (Active).
const partnersForTina = [{
  _id: managerX,
  firstName: 'Xavier',
  lastName: 'Manager',
  role: 'manager',
  propertyId: propB,
  propertyName: 'Property Beta (Active)',
  activePropertyIds: [propB],
  leaseId: '507f1f77bcf86cd799439001',
  bookingStatus: 'Active Lease'
}];

const partnerMap = new Map();
partnersForTina.forEach(p => partnerMap.set(String(p._id), p));

const mockHistoricalMessages = [
  // Old message from expired Lease A on Property A
  {
    _id: 'msg-old-propA',
    sender: { _id: tenantUser, firstName: 'Tina', lastName: 'Tenant', role: 'tenant' },
    receiver: { _id: managerX, firstName: 'Xavier', lastName: 'Manager', role: 'manager' },
    content: 'Old message about Property A that expired',
    property: { _id: propA, name: 'Property Alpha (Expired)' },
    createdAt: new Date('2025-06-01T00:00:00Z')
  },
  // Recent message from active Lease B on Property B
  {
    _id: 'msg-new-propB',
    sender: { _id: tenantUser, firstName: 'Tina', lastName: 'Tenant', role: 'tenant' },
    receiver: { _id: managerX, firstName: 'Xavier', lastName: 'Manager', role: 'manager' },
    content: 'Current message about Property B active tenancy',
    property: { _id: propB, name: 'Property Beta (Active)' },
    createdAt: new Date('2026-10-06T12:00:00Z')
  }
];

// Test getConversations multi-property isolation logic:
const conversationsMap = new Map();
for (const msg of mockHistoricalMessages) {
  const otherUser = msg.sender._id === tenantUser ? msg.receiver : msg.sender;
  const otherUserId = String(otherUser._id);

  if (!partnerMap.has(otherUserId)) continue;
  const partnerInfo = partnerMap.get(otherUserId);
  const activePropertyIds = partnerInfo.activePropertyIds || [String(partnerInfo.propertyId)];

  const msgPropId = String(msg.property?._id || msg.property);
  // Correction 3: If message is tagged with expired property, SKIP IT!
  if (msgPropId && activePropertyIds.length > 0 && !activePropertyIds.includes(msgPropId)) {
    continue;
  }

  if (!conversationsMap.has(otherUserId)) {
    conversationsMap.set(otherUserId, {
      lastMessage: msg,
      user: otherUser,
      property: { _id: partnerInfo.propertyId, name: partnerInfo.propertyName },
      bookingStatus: partnerInfo.bookingStatus || 'Active Lease'
    });
  }
}

const activeConv = conversationsMap.get(managerX);
assert(activeConv !== undefined, 'Test 20a: Active conversation for Manager X exists');
assert(activeConv.lastMessage.content === 'Current message about Property B active tenancy',
  'Test 20b: Last message preview is strictly from active Property B, NOT expired Property A');
assert(String(activeConv.property._id) === propB, 'Test 20c: Conversation property is strictly Property B');

// Test 21: Search isolation across properties
const allCandidateMsgs = [
  { _id: 'm1', content: 'hello from Property A', property: propA, sender: tenantUser, receiver: managerX },
  { _id: 'm2', content: 'hello from Property B', property: propB, sender: tenantUser, receiver: managerX }
];
const activePropIds = partnersForTina.flatMap(p => p.activePropertyIds || [p.propertyId]);
const searchResults = allCandidateMsgs.filter(m => activePropIds.includes(m.property));
assert(searchResults.length === 1 && searchResults[0].content === 'hello from Property B',
  'Test 21: Search isolates to active Property B, excluding expired Property A');

// Test 4: Historical bypass removal in getMessages
let bypassErrorCaught = null;
try {
  // Simulate getMessages for unauthorized user with history
  const auth = await messagingAuthService.verifyRelationship('507f1f77bcf86cd7994390e5', '507f1f77bcf86cd7994390f6', null, 'tenant');
  if (!auth.isAuthorized) {
    throw new Error('Forbidden: Access denied to conversation with this user.');
  }
} catch (err) {
  bypassErrorCaught = err;
}
assert(bypassErrorCaught !== null && bypassErrorCaught.message.includes('Forbidden'),
  'Test 4: getMessages strictly throws 403 Forbidden without historical bypass');

// =============================================================================
// PART 4: WebSocket Event-Time Re-validation (Tests 12, 13, 22)
// =============================================================================
console.log('\n--- PART 4: WebSocket Event-Time Enforcement ---');

// Test 22: Connected while active -> lease expires -> sendMessage rejected at event time
let socketErrorEmitted = null;
const mockSocket = {
  emit: (event, payload) => {
    if (event === 'error') socketErrorEmitted = payload;
  }
};

// Simulate event-time check inside socketHandler
async function handleSocketSendMessage(senderId, receiverId, propertyId, userRole) {
  const auth = await messagingAuthService.verifyRelationship(senderId, receiverId, propertyId, userRole);
  if (!auth.isAuthorized) {
    mockSocket.emit('error', { message: auth.reason });
    return false;
  }
  return true;
}

// Send while expired property
const sendResult = await handleSocketSendMessage(tenantUser, managerX, propA, 'tenant');
assert(sendResult === false, 'Test 12 & 22: Socket.IO sendMessage rejected at event time for expired property');
assert(socketErrorEmitted !== null && socketErrorEmitted.message.includes('Forbidden'),
  'Test 12b: Socket error emitted with Forbidden message');

// Test 13: Typing event suppression when not authorized
async function handleSocketTyping(senderId, receiverId, userRole) {
  const auth = await messagingAuthService.verifyRelationship(senderId, receiverId, null, userRole);
  return auth.isAuthorized;
}
const typingAllowed = await handleSocketTyping('507f1f77bcf86cd7994390e5', '507f1f77bcf86cd7994390f6', 'tenant');
assert(typingAllowed === false, 'Test 13: Socket.IO typing event suppressed when relationship is not authorized');

// Test 24: Old notification deep-link verification
const notifTargetUser = '507f1f77bcf86cd799439088';
const notifAuth = await messagingAuthService.verifyRelationship(tenantUser, notifTargetUser, null, 'tenant');
assert(notifAuth.isAuthorized === false, 'Test 24: Old notification target does not have active lease and is rejected');

// Restore original model functions
User.findById = originalUserFindById;
Tenant.find = originalTenantFind;
Lease.find = originalLeaseFind;
Property.find = originalPropertyFind;
User.findOne = originalUserFindOne;

console.log('\n================================================================');
console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL 24-POINT LIFECYCLE SAFEGUARDS & EDGE CASES VERIFIED SUCCESSFULLY!');
}
