import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import maintenanceService from '../../../src/services/maintenanceService.js';
import maintenanceRepository from '../../../src/repositories/maintenanceRepository.js';
import storageProvider from '../../../src/platform/storage/storageProvider.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import reminderQueue from '../../../src/modules/reminders/queue/reminderQueue.js';
import NotificationService from '../../../src/services/NotificationService.js';
import User from '../../../src/models/User.js';

describe('Enterprise MaintenanceService Unit Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('validateRequest()', () => {
    it('should pass validation for valid ticket payload', () => {
      const validPayload = {
        title: 'Leaking Pipe',
        description: 'Water dripping under sink',
        category: 'plumbing',
        priority: 'high'
      };
      const res = maintenanceService.validateRequest(validPayload);
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('should fail validation when required fields are missing', () => {
      const invalidPayload = {
        title: '',
        description: '   ',
      };
      const res = maintenanceService.validateRequest(invalidPayload);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Title is required');
      expect(res.errors).toContain('Description is required');
      expect(res.errors).toContain('Category is required');
      expect(res.errors).toContain('Priority is required');
    });
  });

  describe('createRequest() Emergency vs Standard Workflow', () => {
    it('should trigger Emergency workflow when priority is emergency', async () => {
      const mockTicket = {
        _id: 'ticket123',
        title: 'Gas Leak',
        category: 'hvac',
        priority: 'emergency',
        property: 'prop456',
        requestedVisitDate: '2026-08-10',
        requestedTimeSlot: 'morning'
      };

      jest.spyOn(maintenanceRepository, 'create').mockResolvedValue(mockTicket);
      jest.spyOn(User, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: 'mgr999', email: 'mgr@test.com' }]) });
      jest.spyOn(reminderQueue, 'enqueueReminder').mockResolvedValue({ success: true });
      jest.spyOn(NotificationService, 'notify').mockResolvedValue({ success: true });
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const userContext = { userId: 'usr111', email: 'tenant@test.com' };
      const reqMeta = { ip: '192.168.1.1', userAgent: 'Jest Test' };

      const result = await maintenanceService.createRequest(
        {
          title: 'Gas Leak',
          description: 'Strong smell of gas',
          category: 'hvac',
          priority: 'emergency',
          requestedVisitDate: '2026-08-10',
          requestedTimeSlot: 'morning'
        },
        userContext,
        reqMeta
      );

      expect(result).toEqual(mockTicket);
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.emergency.created', expect.objectContaining({
        ticketId: 'ticket123',
        priority: 'emergency'
      }));
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.visit.requested', expect.objectContaining({
        ticketId: 'ticket123',
        requestedTimeSlot: 'morning'
      }));
      expect(reminderQueue.enqueueReminder).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: 'usr111',
        entityType: 'Maintenance',
        metadata: expect.objectContaining({ slaMinutes: 30 })
      }));
      expect(NotificationService.notify).toHaveBeenCalledWith(expect.objectContaining({
        event: 'emergency_created',
        priority: 'high'
      }));
    });
  });

  describe('uploadAttachments()', () => {
    it('should throw error when max file count (10) is exceeded', async () => {
      jest.spyOn(maintenanceRepository, 'findById').mockResolvedValue({
        _id: 'ticket123',
        attachments: new Array(8).fill({ url: 'file' })
      });

      const files = [
        { originalname: '1.jpg', size: 1000, mimetype: 'image/jpeg', buffer: Buffer.from('a') },
        { originalname: '2.jpg', size: 1000, mimetype: 'image/jpeg', buffer: Buffer.from('b') },
        { originalname: '3.jpg', size: 1000, mimetype: 'image/jpeg', buffer: Buffer.from('c') }
      ];

      await expect(maintenanceService.uploadAttachments('ticket123', files)).rejects.toThrow(
        'Maximum 10 attachments allowed per maintenance request'
      );
    });

    it('should throw error when file exceeds 20MB limit', async () => {
      jest.spyOn(maintenanceRepository, 'findById').mockResolvedValue({
        _id: 'ticket123',
        attachments: []
      });

      const largeFile = [
        { originalname: 'big_video.mp4', size: 25 * 1024 * 1024, mimetype: 'video/mp4', buffer: Buffer.from('a') }
      ];

      await expect(maintenanceService.uploadAttachments('ticket123', largeFile)).rejects.toThrow(
        "File 'big_video.mp4' exceeds 20MB limit"
      );
    });

    it('should successfully upload file via StorageProvider and append metadata', async () => {
      jest.spyOn(maintenanceRepository, 'findById').mockResolvedValue({
        _id: 'ticket123',
        attachments: []
      });
      jest.spyOn(storageProvider, 'upload').mockResolvedValue({
        url: '/uploads/maintenance/maint_ticket123_1.jpg',
        filename: 'maint_ticket123_1.jpg'
      });
      jest.spyOn(maintenanceRepository, 'appendAttachment').mockResolvedValue({ _id: 'ticket123' });
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const files = [
        { originalname: 'photo.jpg', size: 500000, mimetype: 'image/jpeg', buffer: Buffer.from('img') }
      ];

      await maintenanceService.uploadAttachments('ticket123', files);

      expect(storageProvider.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('photo.jpg'),
        'image/jpeg',
        'maintenance'
      );
      expect(maintenanceRepository.appendAttachment).toHaveBeenCalledWith(
        'ticket123',
        expect.objectContaining({
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          url: '/uploads/maintenance/maint_ticket123_1.jpg'
        })
      );
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.attachment.uploaded', expect.objectContaining({
        ticketId: 'ticket123',
        fileCount: 1
      }));
    });
  });
});
