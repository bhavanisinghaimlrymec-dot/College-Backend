const mongoose = require('mongoose');

// In-app notification inbox item. Audience is one of:
//  - personal:  toUser set
//  - broadcast: toRole 'all' (+ optional branch scope)
//  - role-wide: toRole set (+ optional branch scope, 'All' = every branch)
const notificationSchema = new mongoose.Schema({
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  toRole: {
    type: String,
    enum: ['all', 'admin', 'principal', 'hod', 'faculty', 'student'],
  },
  branch: { type: String, default: 'All' },
  type: {
    type: String,
    enum: [
      'post', 'broadcast', 'assignment', 'submission',
      'marks', 'attendance', 'leave', 'exam', 'fee', 'system',
    ],
    default: 'system',
  },
  title: { type: String, required: true },
  body: { type: String },
  refId: { type: mongoose.Schema.Types.ObjectId },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Inbox queries always filter by audience + recency.
notificationSchema.index({ toUser: 1, createdAt: -1 });
notificationSchema.index({ toRole: 1, branch: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
