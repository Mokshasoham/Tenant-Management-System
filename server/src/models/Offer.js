import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
    {
        dealNumber: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
            index: true,
        },
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        originalRent: {
            type: Number,
            required: true,
        },
        offeredRent: {
            type: Number,
            required: true,
        },
        agreedRent: {
            type: Number,
        },
        currentOffer: {
            type: Number,
        },
        currentOfferedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        leasePeriod: {
            type: String,
            default: '12 Months',
        },
        moveInDate: {
            type: Date,
        },
        message: {
            type: String,
            maxlength: 1000,
        },
        startDate: Date,
        endDate: Date,
        agreedStartDate: Date,
        agreedEndDate: Date,
        acceptedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        status: {
            type: String,
            enum: ['pending', 'countered', 'accepted', 'rejected', 'cancelled', 'expired'],
            default: 'pending',
            index: true,
        },
        roundCount: {
            type: Number,
            default: 1,
            min: 1,
        },
        maxRounds: {
            type: Number,
            default: 5,
            min: 1,
        },
        counterOffer: {
            rent: Number,
            startDate: Date,
            endDate: Date,
            message: String,
            createdAt: Date,
        },
        offerHistory: [
            {
                sender: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                senderRole: {
                    type: String,
                    enum: ['tenant', 'manager', 'admin'],
                    required: true,
                },
                receiver: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                proposedAmount: {
                    type: Number,
                    required: true,
                },
                startDate: Date,
                endDate: Date,
                message: {
                    type: String,
                    maxlength: 1000,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                roundNumber: {
                    type: Number,
                },
                leasePeriod: {
                    type: String,
                },
                moveInDate: {
                    type: Date,
                },
                action: {
                    type: String,
                    enum: ['offer', 'counter', 'accept', 'reject', 'cancel', 'expired'],
                    required: true,
                },
            },
        ],
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h default
            index: true,
        },
        expiredAt: {
            type: Date,
        },
        expirationReason: {
            type: String,
        },
        acceptedAt: {
            type: Date,
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
        },
    },
    { timestamps: true }
);

offerSchema.index({ property: 1, fromUser: 1, status: 1 });
offerSchema.index({ property: 1, toUser: 1 });
offerSchema.index({ toUser: 1, status: 1 });

export default mongoose.model('Offer', offerSchema);
