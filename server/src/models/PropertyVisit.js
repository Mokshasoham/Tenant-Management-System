import mongoose from 'mongoose';

const propertyVisitSchema = new mongoose.Schema(
    {
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
        },
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        visitDate: {
            type: Date,
            required: true,
        },
        timeSlot: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
            default: 'pending',
        },
        notInterested: {
            type: Boolean,
            default: false,
        },
        feedback: {
            rating: { type: Number, min: 1, max: 5 },
            propertyCondition: { type: Number, min: 1, max: 5 },
            managerExperience: { type: Number, min: 1, max: 5 },
            cleanliness: { type: Number, min: 1, max: 5 },
            locationSatisfaction: { type: Number, min: 1, max: 5 },
            comments: { type: String, maxlength: 1000 },
            recommend: { type: Boolean },
            submittedAt: { type: Date }
        }
    },
    { timestamps: true }
);

propertyVisitSchema.index({ property: 1 });
propertyVisitSchema.index({ tenant: 1 });
propertyVisitSchema.index({ manager: 1 });

export default mongoose.model('PropertyVisit', propertyVisitSchema);
