import eventBus from './eventBus.js';

/**
 * Domain Event Dispatcher helper.
 */
export const dispatchEvent = async (eventType, payload) => {
  await eventBus.publish(eventType, {
    ...payload,
    timestamp: new Date().toISOString()
  });
};
