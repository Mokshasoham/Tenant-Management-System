import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import maintenanceService from '../../../src/services/maintenanceService.js';
import maintenanceRepository from '../../../src/repositories/maintenanceRepository.js';
import reminderQueue from '../../../src/modules/reminders/queue/reminderQueue.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import NotificationService from '../../../src/services/NotificationService.js';

describe('Maintenance Lifecycle Sub-Milestone 2 Unit Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('updateStatus()', () => {
    it('should transition status, push history, cancel pending SLA reminders, and publish events', async () => {
      const mockTicket = {
        _id: 'ticket789',
        title: 'Leaking Pipe',
        status: 'open',
        requestedBy: 'user123'
      };

      const mockUpdated = {
        ...mockTicket,
        status: 'in_progress',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(maintenanceRepository, 'findById').mockResolvedValue(mockTicket);
      jest.spyOn(maintenanceRepository, 'addStatusHistory').mockResolvedValue(mockUpdated);
      jest.spyOn(reminderQueue, 'cancelByEntity').mockResolvedValue({ count: 1 });
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);
      jest.spyOn(NotificationService, 'notify').mockResolvedValue({ success: true });

      const userContext = { userId: 'admin99' };
      const result = await maintenanceService.updateStatus('ticket789', 'in_progress', userContext, 'Technician dispatched');

      expect(maintenanceRepository.addStatusHistory).toHaveBeenCalledWith('ticket789', 'in_progress', 'admin99', 'Technician dispatched');
      expect(reminderQueue.cancelByEntity).toHaveBeenCalledWith('Maintenance', 'ticket789', expect.stringContaining('open to in_progress'));
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.status.changed', expect.objectContaining({
        ticketId: 'ticket789',
        oldStatus: 'open',
        newStatus: 'in_progress'
      }));
      expect(NotificationService.notify).toHaveBeenCalledWith(expect.objectContaining({
        event: 'status_updated'
      }));
    });

    it('should calculate resolution time and publish completion events when completed', async () => {
      const createdAt = new Date(Date.now() - 3600 * 1000 * 2); // 2 hours ago
      const mockTicket = {
        _id: 'ticket789',
        title: 'Fixed Heater',
        status: 'in_progress',
        createdAt,
        requestedBy: 'user123'
      };

      const mockUpdated = {
        ...mockTicket,
        status: 'completed',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(maintenanceRepository, 'findById').mockResolvedValue(mockTicket);
      jest.spyOn(maintenanceRepository, 'addStatusHistory').mockResolvedValue(mockUpdated);
      jest.spyOn(reminderQueue, 'cancelByEntity').mockResolvedValue({ count: 1 });
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const userContext = { userId: 'tech55' };
      await maintenanceService.updateStatus('ticket789', 'completed', userContext, 'All repairs finished');

      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.completed', expect.objectContaining({
        ticketId: 'ticket789'
      }));
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.feedback.requested', expect.objectContaining({
        ticketId: 'ticket789',
        tenantId: 'user123'
      }));
    });
  });

  describe('addComment() & addRating()', () => {
    it('should post comment and publish maintenance.comment.created', async () => {
      jest.spyOn(maintenanceRepository, 'addComment').mockResolvedValue({ _id: 'ticket789' });
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const userContext = { userId: 'tenant1' };
      await maintenanceService.addComment('ticket789', 'Technician arrived on time.', userContext);

      expect(maintenanceRepository.addComment).toHaveBeenCalledWith('ticket789', 'Technician arrived on time.', 'tenant1', null);
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.comment.created', expect.objectContaining({
        ticketId: 'ticket789',
        commentBy: 'tenant1'
      }));
    });

    it('should submit rating and publish maintenance.feedback.submitted', async () => {
      jest.spyOn(maintenanceRepository, 'addRating').mockResolvedValue({ _id: 'ticket789' });
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      await maintenanceService.addRating('ticket789', 5, 'Exceptional service!', { userId: 'tenant1' });

      expect(maintenanceRepository.addRating).toHaveBeenCalledWith('ticket789', 5, 'Exceptional service!');
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.feedback.submitted', expect.objectContaining({
        ticketId: 'ticket789',
        score: 5
      }));
    });
  });
});
