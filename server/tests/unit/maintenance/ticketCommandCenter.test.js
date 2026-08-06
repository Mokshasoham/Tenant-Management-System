import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import maintenanceService from '../../../src/services/maintenanceService.js';
import maintenanceRepository from '../../../src/repositories/maintenanceRepository.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import * as maintenanceController from '../../../src/controllers/maintenanceController.js';

describe('Phase 3.2 — Manager Ticket Command Center Unit Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Internal Notes & Audit Trail', () => {
    it('should add private internal note and publish maintenance.internal_note.created', async () => {
      jest.spyOn(maintenanceRepository, 'addInternalNote').mockResolvedValue({ _id: 't100', internalNotes: [{ text: 'Manager private note' }] });
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const user = { userId: 'mgr1', role: 'manager' };
      const res = await maintenanceService.addInternalNote('t100', 'Private note for technician', user);

      expect(maintenanceRepository.addInternalNote).toHaveBeenCalledWith('t100', 'Private note for technician', 'mgr1', null);
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.internal_note.created', expect.objectContaining({ ticketId: 't100' }));
    });

    it('should escalate ticket to emergency and append audit log', async () => {
      jest.spyOn(maintenanceRepository, 'escalateTicket').mockResolvedValue({ _id: 't100', priority: 'emergency', isEscalated: true });
      jest.spyOn(maintenanceRepository, 'addAuditLog').mockResolvedValue(true);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const user = { userId: 'mgr1', role: 'manager' };
      await maintenanceService.escalateTicket('t100', 'Active flooding risk', user);

      expect(maintenanceRepository.escalateTicket).toHaveBeenCalledWith('t100', 'Active flooding risk');
      expect(maintenanceRepository.addAuditLog).toHaveBeenCalledWith('t100', 'isEscalated', 'false', 'Escalated: Active flooding risk', 'mgr1');
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.escalated', expect.objectContaining({ ticketId: 't100', reason: 'Active flooding risk' }));
    });

    it('should merge ticket into target ticket', async () => {
      jest.spyOn(maintenanceRepository, 'mergeTicket').mockResolvedValue({ _id: 't100', mergedInto: 't200', status: 'closed' });
      jest.spyOn(maintenanceRepository, 'addAuditLog').mockResolvedValue(true);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const user = { userId: 'mgr1', role: 'manager' };
      await maintenanceService.mergeTicket('t100', 't200', user);

      expect(maintenanceRepository.mergeTicket).toHaveBeenCalledWith('t100', 't200');
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.merged', expect.objectContaining({ ticketId: 't100', targetId: 't200' }));
    });
  });

  describe('Cost Tracking & Expenses', () => {
    it('should update cost tracking and publish maintenance.cost.updated', async () => {
      const costData = { estimated: 500, actual: 450, materials: 200, labor: 250 };
      jest.spyOn(maintenanceRepository, 'updateCostTracking').mockResolvedValue({ _id: 't100', costTracking: costData });
      jest.spyOn(maintenanceRepository, 'addAuditLog').mockResolvedValue(true);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const user = { userId: 'mgr1', role: 'manager' };
      await maintenanceService.updateCostTracking('t100', costData, user);

      expect(maintenanceRepository.updateCostTracking).toHaveBeenCalledWith('t100', costData);
      expect(eventBus.publish).toHaveBeenCalledWith('maintenance.cost.updated', expect.objectContaining({ ticketId: 't100' }));
    });
  });

  describe('Controller endpoints', () => {
    it('should fetch audit trail for a ticket', async () => {
      const req = { params: { id: 't100' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      jest.spyOn(maintenanceRepository, 'findById').mockResolvedValue({ _id: 't100', auditTrail: [{ field: 'status', newValue: 'in_progress' }] });

      await maintenanceController.getAuditTrail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ field: 'status', newValue: 'in_progress' }] });
    });

    it('should fetch related tickets for duplicate detection', async () => {
      const req = { params: { id: 't100' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      jest.spyOn(maintenanceRepository, 'findById').mockResolvedValue({ _id: 't100', property: { _id: 'p1' }, unit: 'A-402', requestedBy: { _id: 'u1' } });
      jest.spyOn(maintenanceRepository, 'findWithFilters').mockResolvedValue([{ _id: 't101', title: 'Previous leak' }]);

      await maintenanceController.getRelatedTickets(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ _id: 't101', title: 'Previous leak' }] });
    });
  });
});
