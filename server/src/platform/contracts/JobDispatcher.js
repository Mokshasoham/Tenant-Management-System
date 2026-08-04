/**
 * Contract interface for Background Job dispatchers.
 */
export class JobDispatcher {
  async initialize() {
    throw new Error('initialize() not implemented.');
  }

  async health() {
    throw new Error('health() not implemented.');
  }

  async shutdown() {
    throw new Error('shutdown() not implemented.');
  }

  /**
   * Dispatch background tasks
   * @param {string} jobName - Job identifier name
   * @param {object} payload - Job input parameters
   * @param {object} [options] - priority, retry, delay rules
   */
  async dispatch(jobName, payload, options = {}) {
    throw new Error('dispatch() not implemented.');
  }
}
