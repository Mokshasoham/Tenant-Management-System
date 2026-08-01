import logger from '../utils/logger.js';

let ioInstance = null;

/**
 * Register the main Socket.IO server instance
 * @param {object} io - Socket.IO server instance
 */
export const setIoInstance = (io) => {
    ioInstance = io;
    logger.info('[SocketEmitter] Socket.IO instance registered successfully');
};

/**
 * Emit a real-time event to a specific user room
 * @param {string} userId - Target user ID
 * @param {string} eventName - Custom event key (e.g. 'newNotification' or 'new_event')
 * @param {object} data - Event payload
 */
export const emitToUser = (userId, eventName, data) => {
    if (!ioInstance) {
        logger.warn(`[SocketEmitter] Emitter called before Socket.IO instance was registered. Event: ${eventName}`);
        return false;
    }
    try {
        ioInstance.to(userId.toString()).emit(eventName, data);
        logger.info(`[SocketEmitter] Emitted event '${eventName}' to user ${userId}`);
        return true;
    } catch (err) {
        logger.error(`[SocketEmitter] Failed to emit event to user ${userId}: ${err.message}`);
        return false;
    }
};
