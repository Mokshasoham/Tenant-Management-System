import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
        },
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        totalAmount: { type: Number, required: true, min: 0 },
        depositAmount: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        managerEarnings: { type: Number, default: 0 },
        ownerEarnings: { type: Number, default: 0 },

        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed', 'active'],
            default: 'pending',
        },

        // Payment
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'refunded', 'failed', 'held'],
            default: 'pending',
        },
        paymentReference: String,

        // Razorpay fields
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,

        // Escrow
        escrowStatus: {
            type: String,
            enum: ['not_started', 'held', 'released', 'refunded'],
            default: 'not_started',
        },

        // Rejection
        rejectionReason: String,
        approvalDate: Date,
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        // Cancellation
        cancellationReason: String,
        cancellationFeedback: String,
        cancellationDate: Date,
        bookingDate: { type: Date, default: Date.now },
        paymentDate: Date,
        completedDate: Date,

        // PDF Agreement
        pdfAgreementUrl: String,
        agreementGenerated: { type: Boolean, default: false },

        // Offer/negotiation used
        offer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Offer',
        },
        agreedRent: Number,   // the final negotiated rent

        // Timeline events for tracker
        timeline: [
            {
                event: {
                    type: String,
                    enum: ['request_sent', 'payment_done', 'approved', 'active', 'completed', 'rejected', 'refunded', 'cancelled'],
                },
                timestamp: { type: Date, default: Date.now },
                note: String,
            },
        ],

        notes: String,
    },
    { timestamps: true }
);

bookingSchema.index({ user: 1 });
bookingSchema.index({ manager: 1 });
bookingSchema.index({ property: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ escrowStatus: 1 });

export default mongoose.model('Booking', bookingSchema);
