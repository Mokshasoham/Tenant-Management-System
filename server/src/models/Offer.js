import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
    {
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
        },
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        originalRent: { type: Number, required: true },
        offeredRent: { type: Number, required: true },
        message: { type: String, maxlength: 500 },
        startDate: Date,
        endDate: Date,
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'countered', 'expired'],
            default: 'pending',
        },
        counterOffer: {
            rent: Number,
            message: String,
            createdAt: Date,
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
        },
    },
    { timestamps: true }
);

offerSchema.index({ property: 1 });
offerSchema.index({ fromUser: 1 });
offerSchema.index({ toUser: 1 });
offerSchema.index({ status: 1 });

export default mongoose.model('Offer', offerSchema);
