const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  subject: { type: String, required: true },
  assessmentName: { type: String, required: true }, // e.g., 'IA-1', 'IA-2'
  marksObtained: { type: Number, required: true },
  maxMarks: { type: Number, default: 20 },
  faculty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { timestamps: true });

// Ensure a student only has one marks entry per subject per assessment
marksSchema.index({ student: 1, subject: 1, assessmentName: 1 }, { unique: true });

module.exports = mongoose.model('Marks', marksSchema);