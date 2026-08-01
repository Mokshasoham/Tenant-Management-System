import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import Counter from '../models/Counter.js';
import { emitToUser } from '../socket/socketEmitter.js';
import logger from '../utils/logger.js';

class EventService {
    constructor() {
        this.consumers = [];
        this.retryQueue = [];
        this.isProcessingQueue = false;

        // Register default out-of-the-box consumers
        this.registerConsumer({
            name: 'InboxConsumer',
            consume: async (eventData, session) => {
                // Ensure backward compatible fields (read, link, relatedId, relatedModel) are populated
                const doc = new Notification({
                    recipient: eventData.recipient,
                    type: eventData.type || eventData.category,
                    title: eventData.title,
                    message: eventData.description || eventData.message,
                    link: eventData.redirectUrl,
                    relatedId: eventData.entityId,
                    relatedModel: eventData.entityType,
                    read: eventData.isRead || false,
                    
                    eventId: eventData.eventId,
                    schemaVersion: eventData.schemaVersion || '1.0.0',
                    sourceModule: eventData.sourceModule,
                    category: eventData.category,
                    event: eventData.event,
                    priority: eventData.priority || 'medium',
                    severity: eventData.severity || 'information',
                    entityType: eventData.entityType,
                    entityId: eventData.entityId,
                    redirectUrl: eventData.redirectUrl,
                    action: eventData.action || 'view',
                    createdBy: eventData.createdBy,
                    readAt: eventData.readAt,
                    isRead: eventData.isRead || false,
                    isArchived: eventData.isArchived || false,
                    isDeleted: eventData.isDeleted || false,
                    idempotencyKey: eventData.idempotencyKey,
                    parentEventId: eventData.parentEventId,
                    previousEventId: eventData.previousEventId,
                    nextEventId: eventData.nextEventId,
                    expiresAt: eventData.expiresAt,
                    completedAt: eventData.completedAt,
                    metadata: eventData.metadata || {}
                });

                await doc.save({ session });
                logger.info(`[InboxConsumer] Saved event ${eventData.eventId} to Database.`);
                return doc;
            }
        });

        this.registerConsumer({
            name: 'SocketEmitterConsumer',
            consume: async (eventData) => {
                // Emit real-time notification update to active clients
                const emitted = emitToUser(eventData.recipient, 'new_event', eventData);
                if (!emitted) {
                    throw new Error('Socket.IO instance offline or connection unavailable');
                }
                logger.info(`[SocketEmitterConsumer] Broadcasted event ${eventData.eventId} to socket room.`);
            }
        });
    }

    /**
     * Register a new business event consumer
     * @param {object} consumer - Consumer implementation containing name and consume() function
     */
    registerConsumer(consumer) {
        this.consumers.push(consumer);
        logger.info(`[EventService] Registered consumer: ${consumer.name}`);
    }

    /**
     * Generate sequential event ID keys matching EVT-YYYY-XXXXXX
     * @param {object} [session] - Optional database session for atomic counter increments
     */
    async generateSequenceId(session) {
        const year = new Date().getFullYear();
        const counterId = `event-${year}`;
        
        const counter = await Counter.findByIdAndUpdate(
            counterId,
            { $inc: { seq: 1 } },
            { new: true, upsert: true, session }
        );

        const sequenceStr = String(counter.seq).padStart(6, '0');
        return `EVT-${year}-${sequenceStr}`;
    }

    /**
     * Centralized publishing method for all business domain events
     * @param {object} eventData - Standardized business event details
     * @param {object} [session] - Mongoose transaction session for consistent writes
     */
    async publish(eventData, session) {
        if (!eventData.recipient) {
            throw new Error('Event recipient is required');
        }
        if (!eventData.category) {
            throw new Error('Event category is required');
        }

        // 1. Generate Idempotency Key if not supplied
        let idempotencyKey = eventData.idempotencyKey;
        if (!idempotencyKey && eventData.entityType && eventData.entityId && eventData.event) {
            idempotencyKey = `${eventData.sourceModule || eventData.category}-${eventData.entityType.toLowerCase()}-${eventData.entityId}-${eventData.event}`.toLowerCase();
        }

        // 2. Perform Idempotency check to prevent duplicate executions
        if (idempotencyKey) {
            const existing = await Notification.findOne({ idempotencyKey }).session(session);
            if (existing) {
                logger.info(`[EventService] Duplicate event ignored for idempotency key: ${idempotencyKey}`);
                return existing;
            }
        }

        // 3. Increment sequence to assign unique eventId
        const eventId = await this.generateSequenceId(session);
        const enrichedEvent = {
            ...eventData,
            eventId,
            idempotencyKey,
            createdAt: new Date()
        };

        logger.info(`[EventService] Publishing event: ${eventId} [${enrichedEvent.category}.${enrichedEvent.event}]`);

        // 4. Distribute to registered consumers
        let savedDoc = null;
        for (const consumer of this.consumers) {
            try {
                const res = await consumer.consume(enrichedEvent, session);
                if (consumer.name === 'InboxConsumer') {
                    savedDoc = res;
                }
            } catch (err) {
                logger.warn(`[EventService] Consumer ${consumer.name} failed for ${eventId}. Enqueueing for retry. Error: ${err.message}`);
                this.enqueueRetry(consumer, enrichedEvent, 1);
            }
        }

        return savedDoc || enrichedEvent;
    }

    /**
     * Enqueue a failed consumer task for retry
     */
    enqueueRetry(consumer, eventData, attempt) {
        this.retryQueue.push({ consumer, eventData, attempt });
        this.processRetryQueue();
    }

    /**
     * Process retry queue with exponential backoff
     */
    async processRetryQueue() {
        if (this.isProcessingQueue || this.retryQueue.length === 0) return;
        this.isProcessingQueue = true;

        while (this.retryQueue.length > 0) {
            const task = this.retryQueue.shift();
            const { consumer, eventData, attempt } = task;

            if (attempt > 3) {
                logger.error(`[EventService Retry] Task permanently failed after 3 attempts. Consumer: ${consumer.name}, Event: ${eventData.eventId}`);
                continue;
            }

            const delay = Math.pow(2, attempt) * 1000;
            logger.info(`[EventService Retry] Scheduling retry attempt ${attempt} for consumer ${consumer.name} in ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));

            try {
                await consumer.consume(eventData);
                logger.info(`[EventService Retry] Successfully resolved consumer ${consumer.name} for event ${eventData.eventId} on attempt ${attempt}`);
            } catch (err) {
                logger.warn(`[EventService Retry] Attempt ${attempt} failed for consumer ${consumer.name}: ${err.message}`);
                this.enqueueRetry(consumer, eventData, attempt + 1);
            }
        }

        this.isProcessingQueue = false;
    }
}

export default new EventService();
