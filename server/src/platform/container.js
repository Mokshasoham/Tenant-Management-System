/**
 * Frozen Dependency Injection / Inversion of Control Container.
 * Holds registered platform provider implementations.
 * Read-only once bootstrap is complete.
 */

const registry = new Map();

const container = {
  /**
   * Register a provider instance.
   * Only allowed during bootstrap execution.
   */
  register(key, provider) {
    if (Object.isFrozen(this)) {
      throw new Error(`Cannot register provider "${key}" on frozen container.`);
    }
    registry.set(key, provider);
  },

  /**
   * Resolve a registered provider.
   */
  resolve(key) {
    const provider = registry.get(key);
    if (!provider) {
      throw new Error(`Platform provider "${key}" is not registered in container.`);
    }
    return provider;
  },

  /**
   * Get all registered keys.
   */
  keys() {
    return Array.from(registry.keys());
  },

  // Typed service resolvers for autocomplete and validation
  resolveCache() {
    return this.resolve('cache');
  },

  resolveLogger() {
    return this.resolve('logger');
  },

  resolveStorage() {
    return this.resolve('storage');
  },

  resolveJobs() {
    return this.resolve('jobs');
  },

  resolveEmail() {
    return this.resolve('email');
  },

  resolveSequence() {
    return this.resolve('sequence');
  },

  resolveAudit() {
    return this.resolve('audit');
  }
};

export default container;
