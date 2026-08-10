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
    score: { type: Number, min: 1, max: 5 },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, maxlength: 500 },
    comment: { type: String, maxlength: 500 },
    tags: [{ type: String }],
    wouldRecommend: { type: Boolean, default: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: Date.now },
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
        beforePhotos: [attachmentSchema],
        duringPhotos: [attachmentSchema],
        afterPhotos: [attachmentSchema],
        completionChecklist: {
            workCompleted: { type: Boolean, default: false },
            photosUploaded: { type: Boolean, default: false },
            materialsRecorded: { type: Boolean, default: false },
            costEntered: { type: Boolean, default: false },
            tenantNotified: { type: Boolean, default: false },
            ratingRequested: { type: Boolean, default: false }
        },

        // --- Phase 3.3.4.2: Field Operations ---
        checkIn: {
            time: { type: Date },
            latitude: { type: Number },
            longitude: { type: Number },
            accuracy: { type: Number },                 // GPS accuracy in meters
            propertyLatitude: { type: Number },         // property's known GPS lat
            propertyLongitude: { type: Number },        // property's known GPS lng
            distanceFromProperty: { type: Number },     // calculated distance in meters
            allowedRadiusMeters: { type: Number, default: 100 },
            isGpsVerified: { type: Boolean, default: false },
            gpsVerificationStatus: {
                type: String,
                enum: ['VERIFIED', 'OUTSIDE_RADIUS', 'GPS_UNAVAILABLE', 'MANUAL_OVERRIDE'],
                default: 'GPS_UNAVAILABLE'
            },
            manualOverrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            manualOverrideReason: { type: String },
            manualOverrideAt: { type: Date }
        },
        checkOut: {
            time: { type: Date },
            latitude: { type: Number },
            longitude: { type: Number },
            durationMinutes: { type: Number }
        },
        signature: {
            technicianSignature: {
                dataUrl: { type: String },
                signedAt: { type: Date }
            },
            tenantSignature: {
                dataUrl: { type: String },
                signedBy: { type: String },
                signedAt: { type: Date }
            },
            gpsAtSigning: {
                latitude: { type: Number },
                longitude: { type: Number },
                accuracy: { type: Number }
            },
            deviceId: { type: String },
            ipAddress: { type: String }
        },
        partsUsed: [{
            name: { type: String, required: true },
            quantity: { type: Number, default: 1 },
            unitCost: { type: Number, default: 0 },
            totalCost: { type: Number },
            partNumber: { type: String },
            category: {
                type: String,
                enum: ['pipe', 'valve', 'filter', 'motor', 'electrical', 'hardware', 'other'],
                default: 'other'
            }
        }],
        voiceNotes: [{
            url: { type: String, required: true },
            filename: { type: String },
            mimeType: { type: String },
            fileSizeBytes: { type: Number },
            durationSeconds: { type: Number, default: 0 },
            transcript: { type: String, default: '' },
            uploadedAt: { type: Date, default: Date.now }
        }],
        qrScannedAt: { type: Date },
        fieldChecklist: {
            arrived: { done: { type: Boolean, default: false }, at: { type: Date } },
            inspected: { done: { type: Boolean, default: false }, at: { type: Date } },
            partsRecorded: { done: { type: Boolean, default: false }, at: { type: Date } },
            repairCompleted: { done: { type: Boolean, default: false }, at: { type: Date } },
            photosTaken: { done: { type: Boolean, default: false }, at: { type: Date } },
            signatureCollected: { done: { type: Boolean, default: false }, at: { type: Date } },
            notesAdded: { done: { type: Boolean, default: false }, at: { type: Date } },
            jobCompleted: { done: { type: Boolean, default: false }, at: { type: Date } }
        },
        technicianETA: {
            estimatedMinutes: { type: Number },
            distanceKm: { type: Number },
            updatedAt: { type: Date }
        },

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
