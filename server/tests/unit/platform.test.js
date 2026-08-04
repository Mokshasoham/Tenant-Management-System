import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import container from '../../src/platform/container.js';
import cacheProvider from '../../src/platform/cache/cacheProvider.js';
import { canTransition } from '../../src/modules/lease-renewal/service.js';
import { RenewalStatus } from '../../src/modules/lease-renewal/constants.js';
import { validateUpload } from '../../src/platform/storage/fileValidator.js';
import eventBus from '../../src/platform/events/eventBus.js';
import logger from '../../src/platform/logging/logger.js';
import { generateSequenceNumber } from '../../src/platform/sequence/sequenceService.js';
import { logRenewalAudit } from '../../src/platform/audit/auditService.js';
import Counter from '../../src/models/Counter.js';
import LeaseRenewalAudit from '../../src/models/LeaseRenewalAudit.js';

describe('1. Platform IoC Container Tests', () => {
  it('should successfully register, resolve, and list keys', () => {
    const dummyService = { name: 'test-service' };
    container.register('dummy', dummyService);
    expect(container.resolve('dummy')).toBe(dummyService);
    expect(container.keys()).toContain('dummy');
  });

  it('should resolve typed services correctly', () => {
    container.register('cache', { name: 'cache' });
    container.register('storage', { name: 'storage' });
    container.register('jobs', { name: 'jobs' });
    container.register('email', { name: 'email' });
    container.register('sequence', { name: 'sequence' });
    container.register('audit', { name: 'audit' });

    expect(container.resolveCache().name).toBe('cache');
    expect(container.resolveStorage().name).toBe('storage');
    expect(container.resolveJobs().name).toBe('jobs');
    expect(container.resolveEmail().name).toBe('email');
    expect(container.resolveSequence().name).toBe('sequence');
    expect(container.resolveAudit().name).toBe('audit');
  });

  it('should throw error when resolving non-registered keys', () => {
    expect(() => {
      container.resolve('non-existent');
    }).toThrow();
  });

  it('should prevent modifications once the container is frozen', () => {
    Object.freeze(container);
    expect(() => {
      container.register('new-service', {});
    }).toThrow();
  });
});

describe('2. Memory Cache Provider Tests', () => {
  beforeEach(async () => {
    await cacheProvider.initialize();
  });

  afterEach(async () => {
    await cacheProvider.shutdown();
  });

  it('should set and get cache values correctly', async () => {
    await cacheProvider.set('key1', 'value1', 10);
    const val = await cacheProvider.get('key1');
    expect(val).toBe('value1');
  });

  it('should return null for expired cache keys', async () => {
    await cacheProvider.set('expkey', 'expval', -1); // expired instantly
    const val = await cacheProvider.get('expkey');
    expect(val).toBeNull();
  });

  it('should delete key from cache store', async () => {
    await cacheProvider.set('delkey', 'delval', 10);
    await cacheProvider.del('delkey');
    const val = await cacheProvider.get('delkey');
    expect(val).toBeNull();
  });

  it('should return standard health metrics', async () => {
    const health = await cacheProvider.health();
    expect(health.status).toBe('UP');
    expect(health.latencyMs).toBeDefined();
    expect(health.lastChecked).toBeDefined();
    expect(health.version).toBeDefined();
  });
});

describe('3. Lease Renewal State Machine Transitions', () => {
  it('should allow valid status progressions', () => {
    expect(canTransition(RenewalStatus.REQUESTED, RenewalStatus.UNDER_REVIEW)).toBe(true);
    expect(canTransition(RenewalStatus.UNDER_REVIEW, RenewalStatus.APPROVED)).toBe(true);
    expect(canTransition(RenewalStatus.APPROVED, RenewalStatus.SIGNED)).toBe(true);
    expect(canTransition(RenewalStatus.SIGNED, RenewalStatus.COMPLETED)).toBe(true);
  });

  it('should reject invalid status progressions', () => {
    expect(canTransition(RenewalStatus.REQUESTED, RenewalStatus.COMPLETED)).toBe(false);
    expect(canTransition(RenewalStatus.COMPLETED, RenewalStatus.REQUESTED)).toBe(false);
    expect(canTransition(RenewalStatus.REJECTED, RenewalStatus.APPROVED)).toBe(false);
  });
});

describe('4. File Storage Upload Validations', () => {
  const dummyBuffer = Buffer.from('dummy file data block');

  it('should approve valid file properties', () => {
    const result = validateUpload(dummyBuffer, 'document.pdf', 'application/pdf');
    expect(result).toBe(true);
  });

  it('should reject empty or zero size buffers', () => {
    expect(() => {
      validateUpload(Buffer.from(''), 'document.pdf', 'application/pdf');
    }).toThrow('Empty file block submitted.');
  });

  it('should reject unpermitted file extensions', () => {
    expect(() => {
      validateUpload(dummyBuffer, 'malicious.exe', 'application/octet-stream');
    }).toThrow();
  });

  it('should reject unpermitted mime types', () => {
    expect(() => {
      validateUpload(dummyBuffer, 'document.pdf', 'application/octet-stream');
    }).toThrow('File MIME type "application/octet-stream" is not permitted.');
  });
});

describe('5. Domain Event Bus Tests', () => {
  it('should subscribe and publish events locally', async () => {
    let triggered = false;
    let receivedPayload = null;

    eventBus.subscribe('test.event', (payload) => {
      triggered = true;
      receivedPayload = payload;
    });

    await eventBus.publish('test.event', { data: 'hello' });
    
    // Allow macro-task queue resolution
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(triggered).toBe(true);
    expect(receivedPayload).toEqual({ data: 'hello' });
  });
});

describe('6. Platform Logger Tests', () => {
  let spyLog, spyWarn, spyError;

  beforeAll(() => {
    spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    spyError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    spyLog.mockRestore();
    spyWarn.mockRestore();
    spyError.mockRestore();
  });

  it('should format and write logs at different levels', () => {
    logger.trace('trace log');
    logger.debug('debug log');
    logger.info('info log');
    logger.warn('warn log');
    logger.error('error log');
    logger.fatal('fatal log');

    expect(spyLog).toHaveBeenCalled();
    expect(spyWarn).toHaveBeenCalled();
    expect(spyError).toHaveBeenCalled();
  });
});

describe('7. Platform Core Services', () => {
  describe('Sequence Service', () => {
    it('should query and increment counter atomically', async () => {
      const spy = jest.spyOn(Counter, 'findByIdAndUpdate').mockResolvedValue({ seq: 42 });
      const seqNum = await generateSequenceNumber('LRN', 'leaserenewal');
      expect(seqNum).toBe(`LRN-${new Date().getFullYear()}-000042`);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Audit Service', () => {
    it('should create audit log entries asynchronously', async () => {
      const spy = jest.spyOn(LeaseRenewalAudit, 'create').mockResolvedValue({ success: true });
      const audit = await logRenewalAudit({
        leaseRenewalId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        action: 'CREATE',
        oldValue: null,
        newValue: { test: true },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Windows NT 10.0'
      });
      expect(audit).toBeDefined();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
