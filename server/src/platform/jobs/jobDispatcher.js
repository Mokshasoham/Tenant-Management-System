import { JobDispatcher } from '../contracts/JobDispatcher.js';
import logger from '../logging/logger.js';
import { PLATFORM_VERSION } from '../version.js';

/**
 * Immediate Execution Job Dispatcher implementing the stable contract.
 */
class LocalJobDispatcher extends JobDispatcher {
  constructor() {
    super();
    this.handlers = new Map();
  }

  async initialize() {
    logger.info('Initializing Local Job Dispatcher...');
    return true;
  }

  async health() {
    return {
      status: 'UP',
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
      version: PLATFORM_VERSION,
      details: { registeredHandlers: this.handlers.size }
    };
  }

  async shutdown() {
    logger.info('Shutting down Local Job Dispatcher...');
    return true;
  }

  /**
   * Register a local execution handler callback for a specific job name.
   */
  registerHandler(jobName, handler) {
    this.handlers.set(jobName, handler);
  }

  /**
   * Dispatches the job. Executes immediately locally (BullMQ ready).
   */
  async dispatch(jobName, payload, options = {}) {
    const jobMetadata = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: jobName,
      priority: options.priority || 'medium',
      retry: options.retry || 3,
      delay: options.delay || 0,
      payload,
      timestamp: new Date().toISOString()
    };

    logger.info(`Dispatching Job: ${jobName}`, jobMetadata);

    const handler = this.handlers.get(jobName);
    if (!handler) {
      logger.warn(`No registered handler found for job: ${jobName}`);
      return false;
    }

    // Simulate async/background queue execution
    if (jobMetadata.delay > 0) {
      setTimeout(() => {
        this.runJob(handler, jobMetadata);
      }, jobMetadata.delay);
    } else {
      Promise.resolve().then(() => this.runJob(handler, jobMetadata));
    }

    return true;
  }

  async runJob(handler, jobMetadata) {
    try {
      logger.info(`Running Job Process: ${jobMetadata.type} (ID: ${jobMetadata.id})`);
      await handler(jobMetadata.payload);
      logger.info(`Completed Job Process Successfully: ${jobMetadata.type} (ID: ${jobMetadata.id})`);
    } catch (err) {
      logger.error(`Failed executing job: ${jobMetadata.type} (ID: ${jobMetadata.id}):`, err);
    }
  }
}

const jobDispatcher = new LocalJobDispatcher();
export default jobDispatcher;
export { LocalJobDispatcher };
