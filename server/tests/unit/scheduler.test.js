/**
 * tests/unit/scheduler.test.js
 *
 * Phase 2.3.3.1 — Scheduler Infrastructure Unit Tests
 *
 * Test inventory (15 tests across 5 suites):
 *   Suite 1: SchedulerMetrics  (3 tests) — rolling window, KPIs, lastExecution
 *   Suite 2: SchedulerLock     (4 tests) — acquire, double-acquire, release, isHeld
 *   Suite 3: Scheduler base    (5 tests) — start/stop lifecycle, runNow, lock-skip, error recovery
 *   Suite 4: SchedulerRegistry (2 tests) — duplicate guard, health aggregation
 *   Suite 5: Concrete stubs    (3 tests) — CampaignCreation, Expiration, Escalation _process stubs
 *
 * All tests run without a real MongoDB connection or real cron timers.
 * The concrete scheduler tests mock their Mongoose model dependencies.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';

// ─── Module imports ────────────────────────────────────────────────────────

import { SchedulerMetrics }  from '../../src/platform/scheduler/SchedulerMetrics.js';
import { SchedulerLock }     from '../../src/platform/scheduler/SchedulerLock.js';
import { Scheduler, SchedulerState } from '../../src/platform/scheduler/Scheduler.js';
import { SchedulerRegistry } from '../../src/platform/scheduler/SchedulerRegistry.js';
import { CampaignCreationScheduler }  from '../../src/modules/lease-renewal/schedulers/CampaignCreationScheduler.js';
import { CampaignExpirationScheduler } from '../../src/modules/lease-renewal/schedulers/CampaignExpirationScheduler.js';
import { EscalationScheduler } from '../../src/modules/lease-renewal/schedulers/EscalationScheduler.js';

// ─── Shared helpers ────────────────────────────────────────────────────────

/** Minimal no-op logger that suppresses output in test runs */
const silentLogger = {
  info:  () => {},
  warn:  () => {},
  error: () => {},
  debug: () => {},
  fatal: () => {}
};

/** A concrete Scheduler whose _process() is injectable via a jest mock */
class TestScheduler extends Scheduler {
  constructor(options = {}) {
    super({ name: 'test-scheduler', tickMs: 60_000, logger: silentLogger, ...options });
    this._processMock = options.processMock || jest.fn();
  }
  async _process(metrics) {
    return this._processMock(metrics);
  }
}

/** Build a SchedulerLock whose cacheProvider is fully stubbed */
const buildFakeLock = ({ acquireResult = true } = {}) => {
  const store = new Map();
  const fakeCacheProvider = {
    get: jest.fn(async (key) => store.get(key) || null),
    set: jest.fn(async (key, value) => { store.set(key, value); return true; }),
    del: jest.fn(async (key) => { store.delete(key); return true; })
  };
  const lock = new SchedulerLock('test-scheduler', 120);
  // Replace internal cacheProvider calls by injecting
  // (SchedulerLock imports cacheProvider directly, so we patch acquire/release directly)
  lock.acquire = jest.fn(async (executionId) => {
    if (!acquireResult) return false;
    lock._held = true;
    lock._currentExecutionId = executionId;
    return true;
  });
  lock.release = jest.fn(async () => {
    lock._held = false;
    lock._currentExecutionId = null;
  });
  lock.renew = jest.fn(async () => {});
  return lock;
};

// ══════════════════════════════════════════════════════════════════════════════
// Suite 1 — SchedulerMetrics
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite 1 — SchedulerMetrics', () => {
  let metrics;

  beforeEach(() => {
    metrics = new SchedulerMetrics(5); // maxHistory = 5
  });

  it('1.1 — rolling window discards oldest entry after maxHistory is reached', () => {
    for (let i = 0; i < 6; i++) {
      metrics.record({
        runId: `run-${i}`,
        trigger: 'cron',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 100 + i,
        processed: i,
        created: 0,
        skipped: 0,
        failed: 0,
        error: null
      });
    }
    expect(metrics.executions.length).toBe(5);
    // Oldest (run-0) should be dropped
    expect(metrics.executions[0].runId).toBe('run-1');
  });

  it('1.2 — KPIs: successRate, averageDurationMs, consecutiveFailures, lastSuccessAt', () => {
    const makeEntry = (error = null, durationMs = 200) => ({
      runId: 'x',
      trigger: 'cron',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs,
      processed: 1,
      created: 0,
      skipped: 0,
      failed: 0,
      error
    });

    metrics.record(makeEntry(null, 100));     // success
    metrics.record(makeEntry('boom', 50));    // failure
    metrics.record(makeEntry(null, 300));     // success

    const s = metrics.summary();
    expect(s.successRate).toBe(67);           // 2/3 ≈ 67%
    expect(s.averageDurationMs).toBe(200);    // (100+300)/2
    expect(s.consecutiveFailures).toBe(0);    // resets on success
    expect(s.lastSuccessAt).not.toBeNull();
    expect(s.lastFailureAt).not.toBeNull();
  });

  it('1.3 — lastExecution() returns the most recent entry', () => {
    expect(metrics.lastExecution()).toBeNull();
    const entry = {
      runId: 'last',
      trigger: 'manual',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 42,
      processed: 3,
      created: 1,
      skipped: 2,
      failed: 0,
      error: null
    };
    metrics.record(entry);
    expect(metrics.lastExecution().runId).toBe('last');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 2 — SchedulerLock (using real cacheProvider in-memory)
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite 2 — SchedulerLock', () => {
  let lock;

  beforeEach(async () => {
    lock = new SchedulerLock('test-lock-suite', 60);
    // Ensure key is clean
    const { default: cacheProvider } = await import('../../src/platform/cache/cacheProvider.js');
    await cacheProvider.del('scheduler:lock:test-lock-suite');
  });

  afterEach(async () => {
    const { default: cacheProvider } = await import('../../src/platform/cache/cacheProvider.js');
    await cacheProvider.del('scheduler:lock:test-lock-suite');
  });

  it('2.1 — acquire() returns true when lock is free', async () => {
    const result = await lock.acquire('exec-001');
    expect(result).toBe(true);
    expect(lock.isHeld()).toBe(true);
  });

  it('2.2 — acquire() returns false when lock is already held', async () => {
    await lock.acquire('exec-001');
    const second = await lock.acquire('exec-002');
    expect(second).toBe(false);
  });

  it('2.3 — release() clears the lock and isHeld() returns false', async () => {
    await lock.acquire('exec-001');
    await lock.release();
    expect(lock.isHeld()).toBe(false);
    // A new acquire should succeed after release
    const reAcquired = await lock.acquire('exec-002');
    expect(reAcquired).toBe(true);
    await lock.release();
  });

  it('2.4 — renew() does not throw (documented no-op in memory mode)', async () => {
    await lock.acquire('exec-001');
    await expect(lock.renew()).resolves.toBeUndefined();
    await lock.release();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 3 — Scheduler base class (5 tests)
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite 3 — Scheduler base class', () => {
  let scheduler;
  let fakeLock;

  beforeEach(() => {
    fakeLock = buildFakeLock({ acquireResult: true });
    scheduler = new TestScheduler({
      name: 'test-scheduler',
      tickMs: 60_000,    // Very long — we never actually let the timer fire in tests
      logger: silentLogger,
      lock: fakeLock,
      metrics: new SchedulerMetrics()
    });
  });

  afterEach(async () => {
    await scheduler.stop();
  });

  it('3.1 — start() transitions state to RUNNING; second call is a noop', () => {
    expect(scheduler._state).toBe(SchedulerState.IDLE);
    scheduler.start();
    expect(scheduler._state).toBe(SchedulerState.RUNNING);

    // Second call — state stays RUNNING (no double-registration)
    scheduler.start();
    expect(scheduler._state).toBe(SchedulerState.RUNNING);
  });

  it('3.2 — stop() transitions state to STOPPED and clears timer handle', async () => {
    scheduler.start();
    await scheduler.stop();
    expect(scheduler._state).toBe(SchedulerState.STOPPED);
    expect(scheduler._intervalHandle).toBeNull();
  });

  it('3.3 — runNow() calls _process() exactly once and returns last execution metrics', async () => {
    scheduler._processMock = jest.fn(async (m) => { m.processed = 5; m.created = 2; });
    const result = await scheduler.runNow({ requestedBy: 'admin-user' });

    expect(scheduler._processMock).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(result.trigger).toBe('manual');
    expect(result.requestedBy).toBe('admin-user');
    expect(result.processed).toBe(5);
    expect(result.created).toBe(2);
  });

  it('3.4 — _execute() skips and records nothing when lock cannot be acquired', async () => {
    // Replace lock with one that always denies
    const deniedLock = buildFakeLock({ acquireResult: false });
    scheduler._lock = deniedLock;

    await scheduler._execute('cron');

    // Lock was never released (wasn't acquired)
    expect(deniedLock.release).not.toHaveBeenCalled();
    // No execution recorded
    expect(scheduler._metrics.lastExecution()).toBeNull();
  });

  it('3.5 — _execute() catches _process() errors, records error, releases lock, does not rethrow', async () => {
    scheduler._processMock = jest.fn(async () => { throw new Error('processing failed'); });

    // Should not throw
    await expect(scheduler._execute('cron')).resolves.toBeUndefined();

    // Lock must be released even after failure
    expect(fakeLock.release).toHaveBeenCalled();

    // Error is recorded in metrics
    const last = scheduler._metrics.lastExecution();
    expect(last.error).toBe('processing failed');
    expect(scheduler._metrics.consecutiveFailures).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 4 — SchedulerRegistry (2 tests)
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite 4 — SchedulerRegistry', () => {
  let registry;
  let schedulerA;
  let schedulerB;

  beforeEach(() => {
    registry = new SchedulerRegistry();

    const fakeLockA = buildFakeLock();
    const fakeLockB = buildFakeLock();

    schedulerA = new TestScheduler({ name: 'sched-a', tickMs: 60_000, logger: silentLogger, lock: fakeLockA });
    schedulerB = new TestScheduler({ name: 'sched-b', tickMs: 60_000, logger: silentLogger, lock: fakeLockB });
  });

  afterEach(async () => {
    await registry.stopAll();
  });

  it('4.1 — register() throws on duplicate name', () => {
    registry.register(schedulerA);
    expect(() => registry.register(schedulerA)).toThrow(/already registered/);
  });

  it('4.2 — health() aggregates all schedulers; DEGRADED when any is DEGRADED', async () => {
    registry.register(schedulerA);
    registry.register(schedulerB);

    await registry.startAll();

    const health = await registry.health();
    expect(health.count).toBe(2);
    expect(health.schedulers).toHaveLength(2);
    expect(health.status).toBe('UP');

    // Force schedulerA into FAILED state
    schedulerA._state = SchedulerState.FAILED;
    const degradedHealth = await registry.health();
    expect(degradedHealth.status).toBe('DEGRADED');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 5 — Concrete scheduler stubs (3 tests)
// Run _process() stubs against mocked Mongoose models
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite 5 — Concrete scheduler stubs (_process)', () => {
  /** Helper to build a mocked Mongoose Model.find chain */
  const mockFind = (docs) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation(() => Promise.resolve(docs)),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(docs),
      then: (onfulfilled, onrejected) => Promise.resolve(docs).then(onfulfilled, onrejected)
    };
    return jest.fn().mockReturnValue(chain);
  };

  let Lease, Campaign, Counter, OutboxEvent, Audit;

  beforeEach(async () => {
    if (!Lease) {
      const leaseModule    = await import('../../src/models/Lease.js');
      const campaignModule = await import('../../src/models/LeaseRenewalCampaign.js');
      const counterModule  = await import('../../src/models/Counter.js');
      const outboxModule   = await import('../../src/models/OutboxEvent.js');
      const auditModule    = await import('../../src/models/LeaseRenewalAudit.js');
      Lease    = leaseModule.default;
      Campaign = campaignModule.default;
      Counter  = counterModule.default;
      OutboxEvent = outboxModule.default;
      Audit    = auditModule.default;
    }

    OutboxEvent.create = jest.fn().mockResolvedValue([{}]);
    Counter.findOneAndUpdate = jest.fn().mockResolvedValue({ seq: 1 });
    Audit.create = jest.fn().mockResolvedValue([{}]);
  });

  it('5.1 — CampaignCreationScheduler._process() runs without throwing; records processed+skipped', async () => {
    const leaseId = new mongoose.Types.ObjectId().toString();
    const mockLeaseDoc = {
      _id: leaseId,
      leaseNumber: 'L-001',
      endDate: new Date(),
      tenant: new mongoose.Types.ObjectId().toString(),
      createdBy: new mongoose.Types.ObjectId().toString(),
      property: new mongoose.Types.ObjectId().toString()
    };

    const tenantModule = await import('../../src/models/Tenant.js');
    const userModule   = await import('../../src/models/User.js');
    tenantModule.default.findOne = jest.fn().mockResolvedValue({ _id: mockLeaseDoc.tenant, name: 'Tenant' });
    userModule.default.findOne = jest.fn().mockResolvedValue({ _id: mockLeaseDoc.createdBy, name: 'Manager' });

    Lease.find = mockFind([{ _id: leaseId, leaseNumber: 'L-001', endDate: new Date() }]);
    Lease.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockLeaseDoc)
    });
    Campaign.find = mockFind([]); // no existing campaigns
    const validCmpId = new mongoose.Types.ObjectId().toString();
    Campaign.create = jest.fn().mockResolvedValue([{ _id: validCmpId, campaignNumber: 'LCP-1', toObject: () => ({ _id: validCmpId }) }]);

    const scheduler = new CampaignCreationScheduler({ tickMs: 60_000 });
    scheduler._logger = silentLogger;

    const metrics = { processed: 0, created: 0, skipped: 0, failed: 0 };
    await expect(scheduler._process(metrics)).resolves.toBeUndefined();

    expect(metrics.processed).toBe(1); // 1 lease found
    expect(metrics.created).toBe(1);   // 1 campaign created
  });

  it('5.2 — CampaignExpirationScheduler._process() runs without throwing; records processed', async () => {
    const validCmpId = new mongoose.Types.ObjectId().toString();
    const cmp = { _id: validCmpId, campaignNumber: 'CMP-001', status: 'waiting_for_tenant', expiryDate: new Date('2020-01-01'), lifecycle: {}, toObject: () => ({ _id: validCmpId }) };
    Campaign.find = mockFind([cmp]);
    Campaign.findOne = jest.fn().mockResolvedValue(cmp);
    Campaign.findOneAndUpdate = jest.fn().mockResolvedValue({ ...cmp, status: 'expired' });

    const scheduler = new CampaignExpirationScheduler({ tickMs: 60_000 });
    scheduler._logger = silentLogger;

    const metrics = { processed: 0, created: 0, expired: 0, updated: 0, skipped: 0, failed: 0 };
    await expect(scheduler._process(metrics)).resolves.toBeUndefined();

    expect(metrics.processed).toBe(1);
    expect(metrics.expired).toBe(1);
  });

  it('5.3 — EscalationScheduler._process() runs without throwing; categorizes campaigns correctly', async () => {
    const now = new Date();
    const past2h    = new Date(now.getTime() - 2  * 60 * 60 * 1000);
    const future12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const c1Id = new mongoose.Types.ObjectId().toString();
    const c2Id = new mongoose.Types.ObjectId().toString();
    const c3Id = new mongoose.Types.ObjectId().toString();

    const c1 = { _id: c1Id, campaignNumber: 'CMP-001', status: 'negotiating', slaLimitDate: future12h, slaStatus: 'within_sla', toObject: () => ({ _id: c1Id }) };
    const c2 = { _id: c2Id, campaignNumber: 'CMP-002', status: 'negotiating', slaLimitDate: past2h,    slaStatus: 'within_sla', toObject: () => ({ _id: c2Id }) };
    const c3 = { _id: c3Id, campaignNumber: 'CMP-003', status: 'negotiating', slaLimitDate: null,       slaStatus: 'within_sla', toObject: () => ({ _id: c3Id }) };

    Campaign.find = mockFind([c1, c2, c3]);
    Campaign.findOneAndUpdate = jest.fn().mockResolvedValue(c2);

    const scheduler = new EscalationScheduler({ tickMs: 60_000 });
    scheduler._logger = silentLogger;

    const metrics = { processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
    await expect(scheduler._process(metrics)).resolves.toBeUndefined();

    expect(metrics.processed).toBe(3);
    expect(metrics.skipped).toBe(1); // c3 has no slaLimitDate
  });
});
