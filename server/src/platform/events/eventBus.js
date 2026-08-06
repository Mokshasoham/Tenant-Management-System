import logger from '../logging/logger.js';

/**
 * Platform Domain Event Bus.
 * In-process event subscription and publishing engine.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register a subscriber listener to an event type.
   * @param {string} eventType - Dot-notated event name
   * @param {function} handler - Async callback function
   */
  subscribe(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(handler);
    logger.debug(`Subscribed handler to domain event: ${eventType}`);
  }

  /**
   * Publish a domain event.
   * @param {string} eventType - Dot-notated event name
   * @param {object} payload - Event transaction data
   */
  async publish(eventType, payload) {
    logger.info(`Publishing Domain Event: ${eventType}`, payload);
    const handlers = [
      ...(this.listeners.get(eventType) || []),
      ...(this.listeners.get('*') || [])
    ];
    
    // Execute handlers asynchronously (simulate background dispatching)
    handlers.forEach(handler => {
      Promise.resolve()
        .then(() => handler(payload, eventType))
        .catch(err => {
          logger.error(`Handler execution error for event ${eventType}:`, err);
        });
    });
  }
}

const eventBus = new EventBus();
export default eventBus;
