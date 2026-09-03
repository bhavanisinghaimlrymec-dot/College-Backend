const mongoose = require('mongoose');

// Timetable slot owned by a single faculty member.
// Field names mirror the Flutter TimetableSlotModel keys
// (day, startTime, endTime, subject, branch, room) so the
// frontend can deserialise responses without remapping.
const timetableSlotSchema = new mongoose.Schema({
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  startTime: { type: String, required: true }, // 'HH:mm' 24-hour
  endTime: { type: String, required: true },   // 'HH:mm' 24-hour
  subject: { type: String, required: true },
  branch: { type: String, default: '' },
  room: { type: String, default: '' },
}, { timestamps: true });

// Speed up the per-faculty day-scoped queries used by every endpoint below.
timetableSlotSchema.index({ faculty: 1, day: 1 });

// Expose `id` alongside `_id` for Flutter clients that read json['id'].
timetableSlotSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  },
});

module.exports = mongoose.model('TimetableSlot', timetableSlotSchema);
