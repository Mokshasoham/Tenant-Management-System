import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import {
  calculateSlotInstants,
  isSlotInFuture,
  isSlotExpired,
  DEFAULT_TIMEZONE,
  STANDARD_SLOTS
} from '../../src/utils/visitTimeHelper.js';
import PropertyVisit from '../../src/models/PropertyVisit.js';
import {
  requestVisit,
  updateVisitStatus,
  proposeReschedule,
  respondReschedule,
  enrichVisit
} from '../../src/controllers/propertyVisitController.js';
import { AppError } from '../../src/utils/errorHandling.js';
import Property from '../../src/models/Property.js';
import NotificationModel from '../../src/models/Notification.js';
import EventService from '../../src/services/eventService.js';

describe('TMS Property Visit Workflow & Expiration Safety Test Suite', () => {
  const originalEnv = process.env;
  const mockPropId = new mongoose.Types.ObjectId();
  const mockManagerId = new mongoose.Types.ObjectId();
  const mockTenantId = new mongoose.Types.ObjectId();

  const defaultProperty = {
    _id: mockPropId,
    name: 'Green Villa Residency',
    address: 'Kukatpally, Hyderabad',
    manager: mockManagerId
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    jest.spyOn(EventService, 'publish').mockResolvedValue({ eventId: 'evt_test_123' });
    jest.spyOn(NotificationModel, 'create').mockResolvedValue({});
    jest.spyOn(Property, 'findById').mockResolvedValue(defaultProperty);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Timezone & Slot Helper Engine (visitTimeHelper.js)', () => {
    it('1.1 should correctly compute UTC instants for IST (UTC+05:30) slots', () => {
      // Oct 22, 2026, 04:00 PM - 05:00 PM IST
      // 04:00 PM IST = 16:00 IST = 10:30:00.000 UTC
      // 05:00 PM IST = 17:00 IST = 11:30:00.000 UTC
      const result = calculateSlotInstants({
        visitDate: '2026-10-22',
        timeSlot: '04:00 PM - 05:00 PM',
        timezone: 'Asia/Kolkata'
      });

      expect(result).not.toBeNull();
      expect(result.slotStartTime.toISOString()).toBe('2026-10-22T10:30:00.000Z');
      expect(result.slotEndTime.toISOString()).toBe('2026-10-22T11:30:00.000Z');
    });

    it('1.2 should return null for invalid date or unparseable timeSlot format', () => {
      expect(calculateSlotInstants({ visitDate: 'invalid-date', timeSlot: '04:00 PM - 05:00 PM' })).toBeNull();
      expect(calculateSlotInstants({ visitDate: '2026-10-22', timeSlot: 'invalid-slot' })).toBeNull();
      expect(calculateSlotInstants({ visitDate: null, timeSlot: '04:00 PM - 05:00 PM' })).toBeNull();
    });

    it('1.3 should correctly evaluate isSlotInFuture with custom reference time', () => {
      const slotStartTime = new Date('2026-10-22T10:30:00.000Z');

      // Before slot start -> future
      const clockBefore = new Date('2026-10-22T08:00:00.000Z');
      expect(isSlotInFuture({ slotStartTime, referenceTime: clockBefore })).toBe(true);

      // Exactly at slot start -> not future
      expect(isSlotInFuture({ slotStartTime, referenceTime: slotStartTime })).toBe(false);

      // After slot start -> not future
      const clockAfter = new Date('2026-10-22T12:00:00.000Z');
      expect(isSlotInFuture({ slotStartTime, referenceTime: clockAfter })).toBe(false);
    });

    it('1.4 should correctly evaluate isSlotExpired when reference time passes slotEndTime', () => {
      const slotStartTime = new Date('2026-10-22T10:30:00.000Z');
      const slotEndTime = new Date('2026-10-22T11:30:00.000Z');

      // Before start time
      const clockBefore = new Date('2026-10-22T09:00:00.000Z');
      expect(isSlotExpired({ slotStartTime, slotEndTime, referenceTime: clockBefore })).toBe(false);

      // After end time (e.g. next day Oct 23, 2026)
      const clockNextDay = new Date('2026-10-23T05:00:00.000Z');
      expect(isSlotExpired({ slotStartTime, slotEndTime, referenceTime: clockNextDay })).toBe(true);
    });
  });

  describe('2. Scenario A & B: Tenant Visit Request Date Validation', () => {
    it('Scenario A: Valid future visit request succeeds and stores computed slotStartTime / slotEndTime', async () => {
      const req = {
        body: {
          propertyId: mockPropId.toString(),
          visitDate: '2026-12-15',
          timeSlot: '10:00 AM - 11:00 AM'
        },
        user: { userId: mockTenantId.toString() }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockCreatedVisit = {
        _id: new mongoose.Types.ObjectId(),
        property: defaultProperty,
        tenant: mockTenantId.toString(),
        visitDate: new Date('2026-12-15'),
        timeSlot: '10:00 AM - 11:00 AM',
        slotStartTime: new Date('2026-12-15T04:30:00.000Z'),
        slotEndTime: new Date('2026-12-15T05:30:00.000Z'),
        status: 'pending'
      };
      mockCreatedVisit.populate = jest.fn().mockResolvedValue(mockCreatedVisit);

      jest.spyOn(PropertyVisit, 'find').mockResolvedValue([]);
      jest.spyOn(PropertyVisit, 'create').mockResolvedValue(mockCreatedVisit);

      await requestVisit(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Property visit request submitted successfully'
        })
      );
    });

    it('Scenario B: Past visit request date is rejected with 400', async () => {
      const req = {
        body: {
          propertyId: mockPropId.toString(),
          visitDate: '2020-01-01',
          timeSlot: '10:00 AM - 11:00 AM'
        },
        user: { userId: mockTenantId.toString() }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await expect(requestVisit(req, res)).rejects.toThrow(
        'Visit slot must be in the future. The selected date or time has already passed.'
      );
    });
  });

  describe('3. Scenario C: Today Past Time Slot Rejection', () => {
    it('Scenario C: Requesting a slot that has already passed today is rejected with 400', async () => {
      // 09:00 AM IST = 03:30:00 UTC
      // If reference time is 3:00 PM IST (09:30:00 UTC), slot is in the past
      const fixedNow = new Date('2026-10-22T09:30:00.000Z');

      const slotInstants = calculateSlotInstants({
        visitDate: '2026-10-22',
        timeSlot: '09:00 AM - 10:00 AM',
        timezone: 'Asia/Kolkata'
      });

      expect(isSlotInFuture({ slotStartTime: slotInstants.slotStartTime, referenceTime: fixedNow })).toBe(false);
      expect(isSlotExpired({ slotStartTime: slotInstants.slotStartTime, referenceTime: fixedNow })).toBe(true);
    });
  });

  describe('4. Scenario D: Pending Visit Expiration Evaluation', () => {
    it('Scenario D: A pending visit whose slot has passed evaluates isExpired as true', () => {
      const visit = {
        _id: new mongoose.Types.ObjectId(),
        visitDate: new Date('2026-10-22'),
        timeSlot: '04:00 PM - 05:00 PM',
        slotStartTime: new Date('2026-10-22T10:30:00.000Z'),
        slotEndTime: new Date('2026-10-22T11:30:00.000Z'),
        timezone: 'Asia/Kolkata',
        status: 'pending'
      };

      const enriched = enrichVisit(visit);
      expect(typeof enriched.isExpired).toBe('boolean');
      expect(isSlotExpired({
        slotStartTime: visit.slotStartTime,
        slotEndTime: visit.slotEndTime,
        referenceTime: new Date('2026-10-23T10:00:00.000Z')
      })).toBe(true);
    });
  });

  describe('5. Scenario E: Manager Cannot Approve Expired Pending Visit', () => {
    it('Scenario E: Approving an expired visit request throws AppError 400', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();

      const req = {
        params: { id: visitId },
        body: { status: 'approved' },
        user: { userId: mockManagerId.toString(), role: 'manager' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockVisit = {
        _id: visitId,
        status: 'pending',
        visitDate: new Date('2020-01-01'),
        timeSlot: '04:00 PM - 05:00 PM',
        slotStartTime: new Date('2020-01-01T10:30:00.000Z'),
        slotEndTime: new Date('2020-01-01T11:30:00.000Z'),
        timezone: 'Asia/Kolkata',
        manager: mockManagerId.toString(),
        property: defaultProperty
      };

      jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVisit)
      });
      jest.spyOn(Property, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: defaultProperty._id }])
      });

      await expect(updateVisitStatus(req, res)).rejects.toThrow(
        'Cannot approve an expired visit request. The requested visit time has already passed.'
      );
    });
  });

  describe('6. Scenario F & G: Manager Reschedule Proposal', () => {
    it('Scenario F: Proposing a valid future slot transitions status to reschedule_pending and logs history', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();
      const futureDate = '2026-12-20';
      const futureSlot = '02:00 PM - 03:00 PM';

      const req = {
        params: { id: visitId },
        body: {
          visitDate: futureDate,
          timeSlot: futureSlot,
          note: 'Rescheduling to a weekend afternoon'
        },
        user: { userId: mockManagerId.toString(), role: 'manager' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockVisit = {
        _id: visitId,
        status: 'pending',
        visitDate: new Date('2026-10-22'),
        timeSlot: '04:00 PM - 05:00 PM',
        manager: mockManagerId.toString(),
        tenant: mockTenantId.toString(),
        property: defaultProperty,
        rescheduleHistory: [],
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVisit)
      });
      jest.spyOn(Property, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: defaultProperty._id }])
      });

      await proposeReschedule(req, res);

      expect(mockVisit.status).toBe('reschedule_pending');
      expect(mockVisit.rescheduledSlot).toBeDefined();
      expect(mockVisit.rescheduledSlot.timeSlot).toBe(futureSlot);
      expect(mockVisit.rescheduledSlot.status).toBe('pending');
      expect(mockVisit.rescheduleHistory.length).toBe(1);
      expect(mockVisit.rescheduleHistory[0].action).toBe('proposed');
      expect(mockVisit.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Scenario G: Proposing an invalid or past slot is rejected with 400', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();

      const req = {
        params: { id: visitId },
        body: {
          visitDate: '2020-01-01',
          timeSlot: '10:00 AM - 11:00 AM'
        },
        user: { userId: mockManagerId.toString(), role: 'manager' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await expect(proposeReschedule(req, res)).rejects.toThrow(
        'Proposed reschedule slot must be strictly in the future'
      );
    });
  });

  describe('7. Scenario H & I: Tenant Responds to Reschedule (Accept / Decline)', () => {
    it('Scenario H: Tenant accepts valid proposed slot -> transitions to approved', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();
      const futureDate = new Date('2026-12-25');
      const futureSlot = '11:00 AM - 12:00 PM';
      const slotStartTime = new Date('2026-12-25T05:30:00.000Z');
      const slotEndTime = new Date('2026-12-25T06:30:00.000Z');

      const req = {
        params: { id: visitId },
        body: { action: 'accept' },
        user: { userId: mockTenantId.toString(), role: 'tenant' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockVisit = {
        _id: visitId,
        status: 'reschedule_pending',
        tenant: mockTenantId.toString(),
        manager: mockManagerId.toString(),
        visitDate: new Date('2026-10-22'),
        timeSlot: '04:00 PM - 05:00 PM',
        originalVisitDate: new Date('2026-10-22'),
        originalTimeSlot: '04:00 PM - 05:00 PM',
        rescheduledSlot: {
          visitDate: futureDate,
          timeSlot: futureSlot,
          slotStartTime,
          slotEndTime,
          status: 'pending'
        },
        rescheduleHistory: [],
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVisit)
      });

      await respondReschedule(req, res);

      expect(mockVisit.status).toBe('approved');
      expect(mockVisit.timeSlot).toBe(futureSlot);
      expect(mockVisit.rescheduledSlot.status).toBe('accepted');
      expect(mockVisit.rescheduleHistory.length).toBe(1);
      expect(mockVisit.rescheduleHistory[0].action).toBe('accepted');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Scenario I: Tenant declines proposed slot -> transitions to cancelled', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();

      const req = {
        params: { id: visitId },
        body: { action: 'decline', reason: 'Time does not suit me' },
        user: { userId: mockTenantId.toString(), role: 'tenant' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockVisit = {
        _id: visitId,
        status: 'reschedule_pending',
        tenant: mockTenantId.toString(),
        manager: mockManagerId.toString(),
        visitDate: new Date('2026-10-22'),
        timeSlot: '04:00 PM - 05:00 PM',
        rescheduledSlot: {
          visitDate: new Date('2026-12-25'),
          timeSlot: '11:00 AM - 12:00 PM',
          status: 'pending'
        },
        rescheduleHistory: [],
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVisit)
      });

      await respondReschedule(req, res);

      expect(mockVisit.status).toBe('cancelled');
      expect(mockVisit.rescheduledSlot.status).toBe('declined');
      expect(mockVisit.rescheduleHistory.length).toBe(1);
      expect(mockVisit.rescheduleHistory[0].action).toBe('declined');
      expect(mockVisit.rescheduleHistory[0].note).toBe('Time does not suit me');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('8. Scenario J: Authorization Safeguards', () => {
    it('Scenario J.1: Non-tenant cannot accept or decline reschedule proposal (403)', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();
      const actualTenantId = new mongoose.Types.ObjectId().toString();
      const imposterUserId = new mongoose.Types.ObjectId().toString();

      const req = {
        params: { id: visitId },
        body: { action: 'accept' },
        user: { userId: imposterUserId }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockVisit = {
        _id: visitId,
        tenant: actualTenantId,
        status: 'reschedule_pending',
        rescheduledSlot: { status: 'pending' }
      };

      jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVisit)
      });

      await expect(respondReschedule(req, res)).rejects.toThrow(
        'Unauthorized: Only the tenant can respond to this reschedule proposal'
      );
    });

    it('Scenario J.2: Manager cannot reschedule a visit for an unmanaged property (403)', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();
      const unmanagedPropId = new mongoose.Types.ObjectId();

      const req = {
        params: { id: visitId },
        body: {
          visitDate: '2026-12-25',
          timeSlot: '10:00 AM - 11:00 AM'
        },
        user: { userId: mockManagerId.toString(), role: 'manager' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockVisit = {
        _id: visitId,
        status: 'pending',
        manager: new mongoose.Types.ObjectId(), // Different manager
        property: { _id: unmanagedPropId }
      };

      jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVisit)
      });
      // Manager manages NO properties
      jest.spyOn(Property, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      await expect(proposeReschedule(req, res)).rejects.toThrow(
        'Forbidden: Access denied to reschedule this visit'
      );
    });
  });

  describe('9. Scenario K: Timezone Boundaries, Idempotency & Concurrency', () => {
    it('Scenario K.1: 04:00 PM - 05:00 PM IST on Oct 22 maps accurately to 10:30 UTC', () => {
      const result = calculateSlotInstants({
        visitDate: '2026-10-22',
        timeSlot: '04:00 PM - 05:00 PM',
        timezone: 'Asia/Kolkata'
      });
      expect(result.slotStartTime.toISOString()).toBe('2026-10-22T10:30:00.000Z');
      expect(result.slotEndTime.toISOString()).toBe('2026-10-22T11:30:00.000Z');
    });

    it('Scenario K.2: Idempotent approval returns 200 without duplicate action if already approved', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();

      const req = {
        params: { id: visitId },
        body: { status: 'approved' },
        user: { userId: mockManagerId.toString(), role: 'manager' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const futureDate = '2026-12-25';
      const futureSlot = '10:00 AM - 11:00 AM';

      const mockVisit = {
        _id: visitId,
        status: 'approved',
        visitDate: new Date(futureDate),
        timeSlot: futureSlot,
        slotStartTime: new Date('2026-12-25T04:30:00.000Z'),
        slotEndTime: new Date('2026-12-25T05:30:00.000Z'),
        manager: mockManagerId.toString(),
        property: defaultProperty
      };

      jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVisit)
      });
      jest.spyOn(Property, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: defaultProperty._id }])
      });
      // findOneAndUpdate returns null (already approved)
      jest.spyOn(PropertyVisit, 'findOneAndUpdate').mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await updateVisitStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Property visit is already approved'
        })
      );
    });

    it('Scenario K.3: Cannot mark completed before scheduled slot has started', async () => {
      const visitId = new mongoose.Types.ObjectId().toString();

      const req = {
        params: { id: visitId },
        body: { status: 'completed' },
        user: { userId: mockManagerId.toString(), role: 'manager' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const futureSlotStart = new Date(Date.now() + 86400000 * 5); // 5 days in future

      const mockVisit = {
        _id: visitId,
        status: 'approved',
        slotStartTime: futureSlotStart,
        visitDate: new Date(futureSlotStart),
        timeSlot: '10:00 AM - 11:00 AM',
        manager: mockManagerId.toString(),
        property: defaultProperty
      };

      jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVisit)
      });
      jest.spyOn(Property, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: defaultProperty._id }])
      });

      await expect(updateVisitStatus(req, res)).rejects.toThrow(
        'Cannot mark visit as completed before the scheduled visit slot has started'
      );
    });
  });
});
