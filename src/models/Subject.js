const mongoose = require('mongoose');

// Canonical subject offering for one branch + semester, created once per
// term by admin/HOD. Marks uploads and syllabus logs must reference one of
// these (by subjectCode within the faculty's own branch) — this replaces
// free-text subject codes and the typos they caused.
const subjectSchema = new mongoose.Schema({
  branch: { type: String, required: true },
  sem: { type: Number, required: true, min: 1, max: 8 },
  subjectCode: { type: String, required: true, uppercase: true, trim: true },
  subjectName: { type: String, required: true },
  totalModules: { type: Number, required: true, min: 1, default: 5 },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  facultyName: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// One offering per code per branch+sem.
subjectSchema.index({ branch: 1, sem: 1, subjectCode: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
