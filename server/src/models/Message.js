import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: [true, 'Message content is required'],
            trim: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
        },
        attachments: [
            {
                fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMetadata' },
                url: String,
                legacyUrl: String,
                fileType: String,
                fileName: String,
            }
        ],
        readAt: {
            type: Date,
            default: null,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    },
    {
        timestamps: true,
    }
);

// Index for fast query of conversations between two users
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, sender: 1 });

/**
 * Post-delete hook: clean up FileMetadata records and S3/DB storage for all attachments.
 * Triggered when a message document is hard-deleted (deleteOne / findOneAndDelete).
 */
messageSchema.post('deleteOne', { document: true, query: false }, async function () {
    if (this.attachments && this.attachments.length > 0) {
        try {
            const FileMetadata = mongoose.model('FileMetadata');
            const { deleteFileFromStorage } = await import('../services/fileService.js');
            for (const att of this.attachments) {
                if (att.fileId) {
                    const meta = await FileMetadata.findByIdAndDelete(att.fileId);
                    if (meta) {
                        const cleanFilename = meta.key.split('/').pop();
                        await deleteFileFromStorage(meta.key, cleanFilename);
                    }
                }
            }
        } catch (err) {
            console.error('[Message.post(deleteOne)] File cleanup error:', err);
        }
    }
});

export default mongoose.model('Message', messageSchema);

