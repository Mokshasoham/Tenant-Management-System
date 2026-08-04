import { CacheProvider } from '../contracts/CacheProvider.js';
import logger from '../logging/logger.js';
import { PLATFORM_VERSION } from '../version.js';

/**
 * In-memory Cache Provider implementing the stable CacheProvider contract.
 */
class MemoryCacheProvider extends CacheProvider {
  constructor() {
    super();
    this.store = new Map();
  }

  async initialize() {
    logger.info('Initializing Memory Cache Provider...');
    return true;
  }

  async health() {
    const start = Date.now();
    // Simulate cache read write ping operation
    this.store.set('__health_ping__', 1);
    this.store.get('__health_ping__');
    this.store.delete('__health_ping__');
    const latency = Date.now() - start;

    return {
      status: 'UP',
      latencyMs: latency,
      lastChecked: new Date().toISOString(),
      version: PLATFORM_VERSION,
      details: { storeSize: this.store.size }
    };
  }

  async shutdown() {
    logger.info('Shutting down Memory Cache Provider...');
    this.store.clear();
    return true;
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 3600) {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return true;
  }

  async del(key) {
    return this.store.delete(key);
  }
}

const cacheProvider = new MemoryCacheProvider();
export default cacheProvider;
export { MemoryCacheProvider };
