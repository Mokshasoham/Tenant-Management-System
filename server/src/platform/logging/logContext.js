import { AsyncLocalStorage } from 'async_hooks';

/**
 * Thread-safe log context container utilizing Node.js AsyncLocalStorage.
 */
export const logContextStore = new AsyncLocalStorage();
export default logContextStore;
