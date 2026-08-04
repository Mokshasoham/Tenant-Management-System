import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        link: {
            type: String,
            trim: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
        },
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        relatedModel: {
            type: String,
        },
        read: {
            type: Boolean,
            default: false,
        },
        // --- Extended Action Center Event Metadata ---
        eventId: {
            type: String,
            trim: true,
        },
        schemaVersion: {
            type: String,
            default: '1.0.0',
        },
        sourceModule: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            enum: [
                'booking',
                'billing',
                'payments',
                'lease',
                'renewal',
                'move-out',
                'inspection',
                'deposit_settlement',
                'maintenance',
                'documents',
                'messages',
                'announcements',
                'security',
                'system'
            ],
            default: 'system',
        },
        event: {
            type: String,
            trim: true,
        },
        priority: {
            type: String,
            enum: ['critical', 'high', 'medium', 'low'],
            default: 'medium',
        },
        severity: {
            type: String,
            enum: ['information', 'success', 'warning', 'critical'],
            default: 'information',
        },
        entityType: {
            type: String,
            trim: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        source: {
            type: String,
            trim: true,
        },
        actionUrl: {
            type: String,
            trim: true,
        },
        redirectUrl: {
            type: String,
            trim: true,
        },
        action: {
            type: String,
            default: 'view',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        readAt: {
            type: Date,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        idempotencyKey: {
            type: String,
            sparse: true,
        },
        parentEventId: {
            type: String,
            trim: true,
        },
        previousEventId: {
            type: String,
            trim: true,
        },
        nextEventId: {
            type: String,
            trim: true,
        },
        expiresAt: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// High-performance query indexes
notificationSchema.index({ recipient: 1, isDeleted: 1, isArchived: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, category: 1 });
notificationSchema.index({ title: 'text', message: 'text' });
notificationSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ eventId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Notification', notificationSchema);
