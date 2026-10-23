import mongoose from 'mongoose';
import { isSlotExpired } from '../utils/visitTimeHelper.js';

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
        slotStartTime: {
            type: Date,
            index: true,
        },
        slotEndTime: {
            type: Date,
        },
        timezone: {
            type: String,
            default: 'Asia/Kolkata',
        },
        originalVisitDate: {
            type: Date,
        },
        originalTimeSlot: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'rescheduled', 'reschedule_pending'],
            default: 'pending',
        },
        rescheduledSlot: {
            visitDate: { type: Date },
            timeSlot: { type: String },
            slotStartTime: { type: Date },
            slotEndTime: { type: Date },
            proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            proposedAt: { type: Date, default: Date.now },
            status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
            note: { type: String }
        },
        rescheduleHistory: [
            {
                previousVisitDate: { type: Date },
                previousTimeSlot: { type: String },
                proposedVisitDate: { type: Date },
                proposedTimeSlot: { type: String },
                action: { type: String, enum: ['proposed', 'accepted', 'declined'] },
                actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                actionAt: { type: Date, default: Date.now },
                note: { type: String }
            }
        ],
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
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

propertyVisitSchema.index({ property: 1 });
propertyVisitSchema.index({ tenant: 1 });
propertyVisitSchema.index({ manager: 1 });
propertyVisitSchema.index({ status: 1 });
propertyVisitSchema.index({ slotStartTime: 1 });

// Virtual to determine if the scheduled slot has passed
propertyVisitSchema.virtual('isExpired').get(function () {
    if (this.slotStartTime) {
        return this.slotStartTime.getTime() <= Date.now();
    }
    if (this.visitDate && this.timeSlot) {
        return isSlotExpired({ visitDate: this.visitDate, timeSlot: this.timeSlot, timezone: this.timezone });
    }
    return false;
});

// Virtual to determine if an active reschedule proposal has passed
propertyVisitSchema.virtual('isRescheduleExpired').get(function () {
    if (this.status !== 'reschedule_pending' || !this.rescheduledSlot) return false;
    if (this.rescheduledSlot.slotStartTime) {
        return this.rescheduledSlot.slotStartTime.getTime() <= Date.now();
    }
    if (this.rescheduledSlot.visitDate && this.rescheduledSlot.timeSlot) {
        return isSlotExpired({
            visitDate: this.rescheduledSlot.visitDate,
            timeSlot: this.rescheduledSlot.timeSlot,
            timezone: this.timezone
        });
    }
    return false;
});

export default mongoose.model('PropertyVisit', propertyVisitSchema);
