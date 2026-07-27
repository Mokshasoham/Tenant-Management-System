import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    text: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
});

const maintenanceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
        },
        category: {
            type: String,
            enum: ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'cleaning', 'other'],
            default: 'other',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'emergency'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
            default: 'open',
        },
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
        },
        unit: {
            type: String,
            trim: true,
        },
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        images: [String],
        notes: [noteSchema],
        estimatedCost: {
            type: Number,
            min: 0,
        },
        actualCost: {
            type: Number,
            min: 0,
        },
        scheduledDate: Date,
        scheduledSlot: {
            type: String,
            enum: ['morning', 'afternoon', 'evening'],
        },
        resolvedAt: Date,
    },
    {
        timestamps: true,
    }
);

maintenanceSchema.index({ requestedBy: 1 });
maintenanceSchema.index({ property: 1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ priority: 1 });

export default mongoose.model('Maintenance', maintenanceSchema);
