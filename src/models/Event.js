const mongoose = require('mongoose');

// Academic calendar event. Visible to a branch + everyone on 'All'.
// Drives the month-view calendar in the app (previously hardcoded).
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true }, // normalized to midnight UTC
  endDate: { type: Date }, // multi-day events (holidays, fests)
  branch: { type: String, default: 'All' },
  eventType: {
    type: String,
    enum: ['holiday', 'exam', 'event', 'meeting', 'deadline'],
    default: 'event',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

eventSchema.index({ branch: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
