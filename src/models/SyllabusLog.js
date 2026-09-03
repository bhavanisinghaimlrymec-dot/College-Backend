const mongoose = require('mongoose');

// One faculty's daily coverage log for a canonical subject.
// Progress per subject = distinct moduleNo logged / subject.totalModules.
const syllabusLogSchema = new mongoose.Schema({
  branch: { type: String, required: true },
  sem: { type: Number, required: true, min: 1, max: 8 },
  subject: { type: String, required: true, uppercase: true, trim: true }, // subjectCode
  subjectName: { type: String, required: true },
  date: { type: Date, required: true }, // normalized to midnight UTC
  topicCovered: { type: String, required: true },
  moduleNo: { type: Number, required: true, min: 1 },
  periodsUsed: { type: Number, default: 1, min: 1 },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  facultyName: { type: String, required: true },
}, { timestamps: true });

// One log per faculty + subject + day (edit the same-day entry instead).
syllabusLogSchema.index({ faculty: 1, subject: 1, date: 1 }, { unique: true });
syllabusLogSchema.index({ branch: 1, sem: 1, subject: 1, date: -1 });

module.exports = mongoose.model('SyllabusLog', syllabusLogSchema);
