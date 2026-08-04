/**
 * Maps a Mongoose Notification document into a clean, stable NotificationDTO object.
 * Decouples internal database schemas from external API contracts.
 * 
 * @param {Object} doc - Mongoose document or plain JS object
 * @returns {Object} NotificationDTO
 */
export function toNotificationDTO(doc) {
    if (!doc) return null;

    const raw = typeof doc.toObject === 'function' ? doc.toObject() : doc;

    return {
        id: raw._id ? raw._id.toString() : raw.id,
        recipientId: raw.recipient ? raw.recipient.toString() : null,
        title: raw.title || '',
        message: raw.message || '',
        category: raw.category || 'system',
        priority: raw.priority || 'medium',
        severity: raw.severity || 'information',
        type: raw.type || 'info',
        event: raw.event || null,
        eventId: raw.eventId || null,
        sourceModule: raw.sourceModule || null,
        isRead: Boolean(raw.isRead || raw.read),
        readAt: raw.readAt ? new Date(raw.readAt).toISOString() : null,
        isArchived: Boolean(raw.isArchived),
        actionUrl: raw.actionUrl || raw.redirectUrl || raw.link || null,
        entityType: raw.entityType || raw.relatedModel || null,
        entityId: raw.entityId ? raw.entityId.toString() : (raw.relatedId ? raw.relatedId.toString() : null),
        metadata: raw.metadata || {},
        createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : null,
        updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : null,
        version: raw.__v !== undefined ? raw.__v : 0,
    };
}

/**
 * Maps an array of Notification documents to an array of NotificationDTOs.
 * 
 * @param {Array} list 
 * @returns {Array} List of NotificationDTOs
 */
export function toNotificationDTOList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(toNotificationDTO).filter(Boolean);
}
