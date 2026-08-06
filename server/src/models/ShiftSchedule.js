/**
 * server/src/models/ShiftSchedule.js
 * Model for Workforce Scheduling, Shift Management, Leave Requests & Dispatch Timelines.
 */

import mongoose from 'mongoose';

const shiftScheduleSchema = new mongoose.Schema(
  {
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['shift', 'leave', 'template', 'dispatch'],
      required: true,
      default: 'shift'
    },
    title: { type: String, required: true },
    shiftName: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'split_shift', 'custom'],
      default: 'morning'
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    leaveType: {
      type: String,
      enum: ['annual', 'sick', 'emergency', 'training', 'holiday'],
    },
    leaveStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    managerNote: { type: String, default: '' },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Maintenance'
    },
    travelTimeMinutes: { type: Number, default: 15 },
    distanceKm: { type: Number, default: 5 },
    routeOrder: { type: Number, default: 1 },
    calendarSync: {
      googleEventId: { type: String, default: null },
      outlookEventId: { type: String, default: null },
      icsUid: { type: String, default: null },
      lastSyncedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

shiftScheduleSchema.index({ technician: 1, startDate: 1, endDate: 1 });

export default mongoose.model('ShiftSchedule', shiftScheduleSchema);
