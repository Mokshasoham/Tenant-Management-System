import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
            maxlength: 1000,
        },
        // Breakdown ratings
        cleanliness: { type: Number, min: 1, max: 5 },
        location: { type: Number, min: 1, max: 5 },
        value: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },

        managerReply: {
            text: String,
            repliedAt: Date,
        },
        verifiedStay: { type: Boolean, default: false },
        helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        helpfulCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

reviewSchema.index({ property: 1 });
reviewSchema.index({ author: 1 });
reviewSchema.index({ rating: 1 });

export default mongoose.model('Review', reviewSchema);
