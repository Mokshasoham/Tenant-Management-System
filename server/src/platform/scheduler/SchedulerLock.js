/**
 * src/platform/scheduler/SchedulerLock.js
 *
 * Lightweight execution lock backed by the platform cacheProvider.
 *
 * Features:
 *   1. Prevents overlapping executions of the same scheduler.
 *   2. Auto-expires (TTL) so a crashed instance never deadlocks.
 *   3. Ownership tracking (`instanceId`, `executionId`, `acquiredAt`, `expiresAt`).
 *   4. Active Heartbeat Renewal — extends lock TTL while long batch jobs are running.
 *   5. Clean Redis migration interface: `acquire()`, `release()`, `renew()`, `isHeld()`, `startHeartbeat()`, `stopHeartbeat()`.
 */

import cacheProvider from '../cache/cacheProvider.js';
import logger from '../logging/logger.js';
import { randomUUID } from 'crypto';

export const INSTANCE_ID = process.env.INSTANCE_ID || `instance-${process.pid}-${randomUUID().slice(0, 8)}`;

export class SchedulerLock {
  /**
   * @param {string} schedulerName  - Used as part of the cache key
   * @param {number} ttlSeconds     - Lock TTL; auto-released if process crashes
   */
  constructor(schedulerName, ttlSeconds = 120) {
    this.schedulerName = schedulerName;
    this.key = `scheduler:lock:${schedulerName}`;
    this.ttlSeconds = ttlSeconds;
    this._held = false;
    this._currentExecutionId = null;
    this._heartbeatHandle = null;
  }

  /**
   * Attempt to acquire the lock.
   *
   * @param {string} executionId  - The ID of the execution requesting the lock
   * @returns {Promise<boolean>}
   */
  async acquire(executionId) {
    const existing = await cacheProvider.get(this.key);
    if (existing) {
      logger.warn(`[SchedulerLock] Lock "${this.key}" is already held.`, {
        heldBy: existing.executionId,
        instanceId: existing.instanceId,
        lockedAt: existing.lockedAt
      });
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000).toISOString();

    const lockValue = {
      lockKey: this.key,
      schedulerName: this.schedulerName,
      instanceId: INSTANCE_ID,
      executionId,
      acquiredAt: now.toISOString(),
      expiresAt
    };

    await cacheProvider.set(this.key, lockValue, this.ttlSeconds);

    this._held = true;
    this._currentExecutionId = executionId;
    return true;
  }

  /**
   * Renew the lock TTL to prevent expiry during long-running executions.
   */
  async renew() {
    if (!this._held || !this._currentExecutionId) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000).toISOString();

    await cacheProvider.set(
      this.key,
      {
        lockKey: this.key,
        schedulerName: this.schedulerName,
        instanceId: INSTANCE_ID,
        executionId: this._currentExecutionId,
        acquiredAt: now.toISOString(),
        expiresAt
      },
      this.ttlSeconds
    );
    logger.debug(`[SchedulerLock] Heartbeat renewed lock TTL for "${this.key}"`);
  }

  /**
   * Start a periodic heartbeat to maintain lock ownership during long tasks.
   * @param {number} [intervalMs=15000] - Heartbeat frequency
   */
  startHeartbeat(intervalMs = 15000) {
    if (this._heartbeatHandle) return;
    this._heartbeatHandle = setInterval(() => {
      this.renew().catch(err => {
        logger.warn(`[SchedulerLock] Heartbeat failed for "${this.key}":`, err.message);
      });
    }, intervalMs);
  }

  /**
   * Stop the active lock heartbeat.
   */
  stopHeartbeat() {
    if (this._heartbeatHandle) {
      clearInterval(this._heartbeatHandle);
      this._heartbeatHandle = null;
    }
  }

  /**
   * Release the lock.
   * @returns {Promise<void>}
   */
  async release() {
    this.stopHeartbeat();
    await cacheProvider.del(this.key);
    this._held = false;
    this._currentExecutionId = null;
  }

  /**
   * Check if this lock instance currently holds the lock.
   * @returns {boolean}
   */
  isHeld() {
    return this._held;
  }

  /**
   * Get current lock owner information.
   * @returns {Promise<object|null>}
   */
  async getOwner() {
    return await cacheProvider.get(this.key);
  }
}
