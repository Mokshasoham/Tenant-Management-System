import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    text: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
    attachmentUrl: { type: String },
});

const attachmentSchema = new mongoose.Schema({
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String },
    fileSizeBytes: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
});

const statusHistorySchema = new mongoose.Schema({
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String },
});

const ratingSchema = new mongoose.Schema({
    score: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String },
    ratedAt: { type: Date, default: Date.now },
});

const auditTrailSchema = new mongoose.Schema({
    field: { type: String, required: true },
    oldValue: { type: String },
    newValue: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
});

const invoiceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    fileUrl: { type: String },
    date: { type: Date, default: Date.now },
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
            enum: ['open', 'submitted', 'manager_review', 'technician_assigned', 'visit_scheduled', 'technician_en_route', 'work_started', 'waiting_parts', 'in_progress', 'completed', 'resolved', 'closed', 'cancelled'],
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
        room: {
            type: String,
            trim: true,
        },
        locationDescription: {
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
        contactPreference: {
            type: String,
            enum: ['phone', 'email', 'sms', 'whatsapp'],
            default: 'email',
        },
        allowPropertyAccess: {
            type: Boolean,
            default: false,
        },
        requestedVisitDate: Date,
        requestedTimeSlot: {
            type: String,
            enum: ['morning', 'afternoon', 'evening'],
        },
        scheduledDate: Date,
        scheduledSlot: {
            type: String,
            enum: ['morning', 'afternoon', 'evening'],
        },
        images: [String],
        attachments: [attachmentSchema],
        notes: [noteSchema],
        internalNotes: [noteSchema],
        statusHistory: [statusHistorySchema],
        auditTrail: [auditTrailSchema],
        rating: ratingSchema,
        completionNotes: String,
        actualResolutionTimeMinutes: Number,
        estimatedResolutionTime: String,
        estimatedCost: {
            type: Number,
            min: 0,
        },
        actualCost: {
            type: Number,
            min: 0,
        },
        costTracking: {
            estimated: { type: Number, default: 0 },
            actual: { type: Number, default: 0 },
            materials: { type: Number, default: 0 },
            labor: { type: Number, default: 0 },
            vendorCost: { type: Number, default: 0 },
            invoices: [invoiceSchema],
        },
        isEscalated: { type: Boolean, default: false },
        escalationReason: String,
        mergedInto: { type: mongoose.Schema.Types.ObjectId, ref: 'Maintenance' },
        submissionSource: {
            type: String,
            default: 'web',
        },
        deviceInfo: String,
        createdFromIP: String,
        resolvedAt: Date,
        completedAt: Date,
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
