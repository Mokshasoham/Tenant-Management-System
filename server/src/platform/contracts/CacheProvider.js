/**
 * Contract interface for Cache providers.
 * Implementations must inherit and conform to these lifecycle and data methods.
 */
export class CacheProvider {
  async initialize() {
    throw new Error('initialize() not implemented.');
  }

  async health() {
    throw new Error('health() not implemented.');
  }

  async shutdown() {
    throw new Error('shutdown() not implemented.');
  }

  async get(key) {
    throw new Error('get() not implemented.');
  }

  async set(key, value, ttlSeconds) {
    throw new Error('set() not implemented.');
  }

  async del(key) {
    throw new Error('del() not implemented.');
  }
}
