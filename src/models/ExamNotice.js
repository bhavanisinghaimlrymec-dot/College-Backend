const mongoose = require('mongoose');

// Exam hall-ticket notice. The app NEVER issues hall tickets — collection
// happens offline at the office. This record only drives:
//  1. the student exam list (what/when), and
//  2. the "hall tickets released — collect from X" notification + reminder.
// Seating arrangements are published separately as a feed image.
const examNoticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  examType: {
    type: String,
    enum: ['IA-1', 'IA-2', 'SEE', 'Supplementary', 'Other'],
    default: 'SEE',
  },
  branch: { type: String, required: true },
  sem: { type: Number, required: true, min: 1, max: 8 },
  subject: { type: String, uppercase: true, trim: true },
  subjectName: { type: String },
  date: { type: Date, required: true },
  startTime: { type: String },
  noticeReleased: { type: Boolean, default: false },
  collectionPoint: { type: String, default: '' },
  releasedAt: { type: Date },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

examNoticeSchema.index({ branch: 1, sem: 1, date: 1 });

module.exports = mongoose.model('ExamNotice', examNoticeSchema);
